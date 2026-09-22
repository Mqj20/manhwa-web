"""MQJ MANHWA catalog synchronizer.

Use only with sources/content you are authorized to index and display.
This script does not bypass login, CAPTCHA, paywalls, anti-bot controls, DRM,
or other access restrictions. It only follows publicly reachable pages.

The synchronizer writes catalog.json and sync_status.json at the repository root.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MQJ-Manhwa-Sync/4.2; +https://github.com/)"
}
TIMEOUT = 30
MAX_PAGES_PER_SOURCE = int(os.getenv("MQJ_MAX_LIST_PAGES", "130"))
MAX_SERIES_PER_SOURCE = int(os.getenv("MQJ_MAX_SERIES", "1500"))
MAX_CHAPTERS_PER_SERIES = int(os.getenv("MQJ_MAX_CHAPTERS", "200"))

SOURCES = {
    "olympus": {
        "name": "Olympus / Team-X",
        "base": "https://olympustaff.com/",
        "list_pages": ["https://olympustaff.com/series"],
        "series_patterns": [r"/series/"],
    },
    "mesh": {
        "name": "MeshManga",
        "base": "https://meshmanga.com/",
        "list_pages": ["https://meshmanga.com/type/manga", "https://meshmanga.com/menu/type/comic"],
        "series_patterns": [r"/series/"],
    },
}

session = requests.Session()
session.headers.update(HEADERS)


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def same_host(a: str, b: str) -> bool:
    return urlparse(a).netloc.lower() == urlparse(b).netloc.lower()


def get(url: str) -> str:
    last = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=TIMEOUT, allow_redirects=True)
            r.raise_for_status()
            return r.text
        except requests.RequestException as exc:
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last  # type: ignore[misc]


def abs_url(base: str, href: str | None) -> str:
    return urljoin(base, href or "")


def is_series_url(url: str, cfg: dict) -> bool:
    p = urlparse(url).path.lower()
    return any(re.search(pattern, p, re.I) for pattern in cfg["series_patterns"])


def sitemap_urls(base: str) -> list[str]:
    """Read normal sitemap XML and simple sitemap indexes without bypassing anything."""
    found: list[str] = []
    queue = [urljoin(base, "sitemap.xml"), urljoin(base, "sitemap_index.xml")]
    seen = set()
    while queue and len(seen) < 20:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        try:
            xml = get(sm)
        except Exception:
            continue
        locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", xml, flags=re.I | re.S)
        for loc in locs:
            loc = clean(loc)
            if not loc:
                continue
            if loc.lower().endswith(".xml") or "sitemap" in loc.lower():
                if len(queue) < 50:
                    queue.append(loc)
            else:
                found.append(loc)
    return list(dict.fromkeys(found))


def pagination_urls(page_url: str, soup: BeautifulSoup, base: str) -> list[str]:
    out = []
    for a in soup.select("a[href]"):
        u = abs_url(page_url, a.get("href"))
        if not same_host(u, base):
            continue
        text = clean(a.get_text(" ", strip=True)).lower()
        path = urlparse(u).path.lower()
        query = urlparse(u).query.lower()
        if (
            "page=" in query
            or "/page/" in path
            or text in {"›", "»", "next", "التالي", "التالية"}
            or re.fullmatch(r"\d+", text or "")
        ):
            out.append(u)
    return list(dict.fromkeys(out))


def discover_series(cfg: dict) -> list[str]:
    base = cfg["base"]
    series: set[str] = set()

    # 1) Public sitemap, when available.
    for u in sitemap_urls(base):
        if is_series_url(u, cfg):
            series.add(u)
            if len(series) >= MAX_SERIES_PER_SOURCE:
                return sorted(series)

    # 2) Public series/list pages with pagination.
    queue = list(cfg["list_pages"])
    seen_pages: set[str] = set()
    while queue and len(seen_pages) < MAX_PAGES_PER_SOURCE and len(series) < MAX_SERIES_PER_SOURCE:
        page = queue.pop(0)
        if page in seen_pages:
            continue
        seen_pages.add(page)
        try:
            html = get(page)
        except Exception as exc:
            print("list page failed", page, exc)
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select("a[href]"):
            u = abs_url(page, a.get("href"))
            if same_host(u, base) and is_series_url(u, cfg):
                series.add(u.split("#", 1)[0])
                if len(series) >= MAX_SERIES_PER_SOURCE:
                    break
        for nxt in pagination_urls(page, soup, base):
            if nxt not in seen_pages and len(seen_pages) + len(queue) < MAX_PAGES_PER_SOURCE:
                queue.append(nxt)

    # 3) Homepage fallback for installations where list pages are rendered dynamically.
    if not series:
        try:
            soup = BeautifulSoup(get(base), "html.parser")
            for a in soup.select("a[href]"):
                u = abs_url(base, a.get("href"))
                if same_host(u, base) and is_series_url(u, cfg):
                    series.add(u.split("#", 1)[0])
        except Exception as exc:
            print("homepage failed", base, exc)

    return sorted(series)


def image_from_meta(soup: BeautifulSoup, page_url: str) -> str:
    for selector in (
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
    ):
        tag = soup.select_one(selector)
        if tag and tag.get("content"):
            return abs_url(page_url, tag["content"])
    return ""


def parse_series(url: str, source_id: str, cfg: dict) -> dict | None:
    soup = BeautifulSoup(get(url), "html.parser")
    h = soup.select_one("h1") or soup.select_one("h2")
    title = clean(h.get_text(" ", strip=True) if h else "")
    if not title:
        title = clean((soup.select_one('meta[property="og:title"]') or {}).get("content", ""))
    if not title:
        return None

    cover = image_from_meta(soup, url)
    md = soup.select_one('meta[property="og:description"]')
    desc = clean(md.get("content") if md else "")

    genres = []
    genre_words = {
        "أكشن", "فانتازيا", "دراما", "رومانسية", "كوميديا", "رعب", "غموض",
        "مغامرات", "شونين", "ويب تون", "مانهوا", "مانها", "مانجا", "Action",
        "Fantasy", "Drama", "Romance", "Comedy", "Horror"
    }
    for a in soup.select("a[href]"):
        t = clean(a.get_text(" ", strip=True))
        if t in genre_words:
            genres.append(t)

    chapters = []
    for a in soup.select("a[href]"):
        href = abs_url(url, a.get("href"))
        txt = clean(a.get_text(" ", strip=True))
        if not href or not same_host(href, url):
            continue
        # Chapter links are intentionally restricted to public source pages.
        m = re.search(r"(?:الفصل(?:\s+رقم)?|chapter)\s*#?\s*([0-9]+(?:\.[0-9]+)?)", txt, re.I)
        if not m:
            # Some pages expose only a numeric chapter title.
            path = urlparse(href).path
            m = re.search(r"(?:chapter|chap|الفصل)[/_-]*([0-9]+(?:\.[0-9]+)?)", path, re.I)
        if not m:
            continue
        # Do not import clearly marked paid chapters.
        marker = f"{txt} {href}".lower()
        if any(x in marker for x in ("مدفوع", "paid", "premium", "شراء")):
            continue
        number = m.group(1)
        cid = hashlib.sha1(href.encode()).hexdigest()[:16]
        chapters.append({"id": cid, "number": number, "title": txt, "url": href})

    # De-duplicate and keep a deterministic order.
    dedup = {}
    for ch in chapters:
        dedup[ch["url"]] = ch
    chapters = list(dedup.values())
    chapters.sort(key=lambda c: float(c["number"]) if c["number"].replace('.', '', 1).isdigit() else 0)
    chapters = chapters[-MAX_CHAPTERS_PER_SERIES:]

    if not chapters:
        return None

    sid = hashlib.sha1((source_id + "|" + url).encode()).hexdigest()[:16]
    return {
        "id": sid,
        "title": title,
        "description": desc,
        "genres": sorted(set(genres)),
        "updated": time.strftime("%Y-%m-%d"),
        "cover": cover,
        "source": source_id,
        "sourceName": cfg["name"],
        "chapterCount": len(chapters),
        "chapters": chapters,
    }


def page_urls_from_srcset(value: str, page_url: str) -> list[str]:
    out = []
    for part in (value or "").split(","):
        u = part.strip().split(" ", 1)[0]
        if u:
            out.append(abs_url(page_url, u))
    return out


def enrich_chapter(ch: dict) -> dict:
    try:
        soup = BeautifulSoup(get(ch["url"]), "html.parser")
    except Exception as exc:
        ch["pages"] = []
        ch["readerError"] = str(exc)[:180]
        return ch

    urls = []
    for img in soup.select("img"):
        for attr in ("data-src", "data-original", "data-lazy-src", "data-lazy", "src"):
            val = img.get(attr)
            if val:
                urls.append(abs_url(ch["url"], val))
        if img.get("srcset"):
            urls.extend(page_urls_from_srcset(img.get("srcset"), ch["url"]))

    # Some readers expose image URLs in JSON-LD.
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        for u in re.findall(r"https?://[^\"'<>\\s]+", raw or ""):
            if re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)", u, re.I):
                urls.append(u)

    clean_urls = []
    for u in urls:
        if not u or u.startswith("data:"):
            continue
        if not re.match(r"^https?://", u, re.I):
            continue
        if re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)", u, re.I) or any(k in u.lower() for k in ("image", "chapter", "uploads")):
            if not re.search(r"(logo|avatar|icon|favicon|sprite|emoji)", u, re.I):
                clean_urls.append(u)

    ch["pages"] = list(dict.fromkeys(clean_urls))
    return ch


def write_status(status: dict):
    with open("sync_status.json", "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


def main():
    started = time.time()
    all_items = []
    status = {
        "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sources": {},
        "limits": {
            "listPages": MAX_PAGES_PER_SOURCE,
            "series": MAX_SERIES_PER_SOURCE,
            "chaptersPerSeries": MAX_CHAPTERS_PER_SERIES,
        },
    }

    for sid, cfg in SOURCES.items():
        source_status = {"seriesDiscovered": 0, "titlesWritten": 0, "errors": []}
        try:
            series = discover_series(cfg)
            source_status["seriesDiscovered"] = len(series)
        except Exception as exc:
            source_status["errors"].append(f"discover: {exc}")
            series = []

        print(sid, "series", len(series))
        for u in series:
            try:
                item = parse_series(u, sid, cfg)
                if not item:
                    continue
                enriched = []
                for ch in item["chapters"]:
                    enriched.append(enrich_chapter(ch))
                    time.sleep(0.08)
                item["chapters"] = enriched
                item["chapterCount"] = len(enriched)
                all_items.append(item)
                source_status["titlesWritten"] += 1
            except Exception as exc:
                msg = f"{u}: {exc}"
                print("skip", msg)
                source_status["errors"].append(msg[:300])
            time.sleep(0.05)

        status["sources"][sid] = source_status

    # Safety: never replace a previously working catalog with an empty catalog.
    if not all_items and os.path.exists("catalog.json"):
        try:
            with open("catalog.json", "r", encoding="utf-8") as f:
                previous = json.load(f)
            previous_items = previous.get("items", []) if isinstance(previous, dict) else []
        except Exception:
            previous_items = []
        if previous_items:
            status["preservedPreviousCatalog"] = True
            status["finalItemCount"] = len(previous_items)
            status["durationSeconds"] = round(time.time() - started, 2)
            write_status(status)
            print("No new items found; preserved existing catalog with", len(previous_items), "titles")
            return

    all_items.sort(key=lambda x: (x["source"], x["title"].lower()))
    catalog = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": all_items,
    }
    with open("catalog.json", "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))

    status["preservedPreviousCatalog"] = False
    status["finalItemCount"] = len(all_items)
    status["finalChapterCount"] = sum(len(x.get("chapters", [])) for x in all_items)
    status["durationSeconds"] = round(time.time() - started, 2)
    write_status(status)
    print("wrote", len(all_items), "titles")


if __name__ == "__main__":
    main()
