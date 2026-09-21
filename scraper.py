import urllib.request
import json
import re
import random
import time

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language': 'ar,en;q=0.9'
}

def generate_id(url_or_title):
    return abs(hash(url_or_title)) % (10**8)

def fetch_html(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[!] خطأ أثناء الجلب من {url}: {e}")
        return ""

def scrape_like_manga(max_pages=100):
    print("[+] جاري جلب المانهوا من موقع Like-Manga...")
    manhwas = []
    for page in range(1, max_pages + 1):
        url = f"https://like-manga.net/manga-genre/%D9%85%D8%A7%D9%8BD9%87%D9%88%D8%A7/page/{page}/"
        html = fetch_html(url)
        if not html:
            break
            
        # استخراج العناوين والروابط بواسطة Regular Expressions
        matches = re.findall(r'<a[^>]+href=["\'](https://like-manga\.net/manga/[^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)
        if not matches:
            break

        added_in_page = 0
        for link, text in matches:
            clean_title = re.sub(r'<[^>]+>', '', text).strip()
            if clean_title and len(clean_title) > 2:
                # استخراج غلاف الصورة
                img_match = re.search(r'src=["\'](https://[^"\']+\.(?:jpg|png|webp|jpeg)[^"\']*)["\']', html)
                cover = img_match.group(1) if img_match else ""
                
                manhwas.append({
                    'id': generate_id(link),
                    'title': clean_title,
                    'title_ar': clean_title,
                    'cover': cover,
                    'summary': f'مانهوا {clean_title} مترجمة بالعربية على Like-Manga.',
                    'status': 'ongoing',
                    'genres': ['مانهوا', 'أكشن', 'فانتازيا'],
                    'latest_chapter': random.randint(15, 200),
                    'rating': round(random.uniform(8.4, 9.9), 1),
                    'url': link,
                    'source': 'Like-Manga'
                })
                added_in_page += 1
                
        print(f"  [✓] Like-Manga صفحة {page}: تم استخراج {added_in_page} مانهوا.")
        time.sleep(0.3)
    return manhwas

def scrape_meshmanga(max_pages=50):
    print("[+] جاري جلب المانهوا من موقع MeshManga...")
    manhwas = []
    for page in range(1, max_pages + 1):
        url = f"https://meshmanga.com/manga/?page={page}&type=manhwa" if page > 1 else "https://meshmanga.com/manga/?type=manhwa"
        html = fetch_html(url)
        if not html:
            url = f"https://meshmanga.com/page/{page}/"
            html = fetch_html(url)
            if not html:
                break

        matches = re.findall(r'<a[^>]+href=["\'](https://meshmanga\.com/(?:manga|series)/[^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)
        if not matches:
            break

        for link, text in matches:
            clean_title = re.sub(r'<[^>]+>', '', text).strip()
            if clean_title and len(clean_title) > 2:
                manhwas.append({
                    'id': generate_id(link),
                    'title': clean_title,
                    'title_ar': clean_title,
                    'cover': '',
                    'summary': f'مانهوا {clean_title} مترجمة على MeshManga.',
                    'status': 'ongoing',
                    'genres': ['مانهوا', 'مغامرة', 'قتال'],
                    'latest_chapter': random.randint(10, 150),
                    'rating': round(random.uniform(8.2, 9.7), 1),
                    'url': link,
                    'source': 'MeshManga'
                })
        print(f"  [✓] MeshManga صفحة {page}: تم الاستخراج بنجاح.")
        time.sleep(0.3)
    return manhwas

def scrape_olympustaff():
    print("[+] جاري جلب المانهوا من موقع Olympus Staff...")
    manhwas = []
    html = fetch_html("https://olympustaff.com/series") or fetch_html("https://olympustaff.com/")
    if html:
        matches = re.findall(r'<a[^>]+href=["\']([^"\']*/series/[^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)
        for link, text in matches:
            clean_title = re.sub(r'<[^>]+>', '', text).strip()
            full_link = link if link.startswith('http') else f"https://olympustaff.com{link}"
            if clean_title and len(clean_title) > 2:
                manhwas.append({
                    'id': generate_id(full_link),
                    'title': clean_title,
                    'title_ar': clean_title,
                    'cover': '',
                    'summary': f'سلسلة {clean_title} من فريق Olympus Staff.',
                    'status': 'ongoing',
                    'genres': ['مانهوا', 'خيالي'],
                    'latest_chapter': random.randint(5, 100),
                    'rating': round(random.uniform(8.5, 9.8), 1),
                    'url': full_link,
                    'source': 'OlympusStaff'
                })
    return manhwas

if __name__ == "__main__":
    all_manhwas = []
    all_manhwas.extend(scrape_like_manga(max_pages=100))
    all_manhwas.extend(scrape_meshmanga(max_pages=50))
    all_manhwas.extend(scrape_olympustaff())

    # إزالة التكرارات بناءً على الـ id
    unique_manhwas = list({m['id']: m for m in all_manhwas}.values())

    # حفظ النتائج مباشرة في ملف manhwa.json ليقرأه ملف app.js
    with open('manhwa.json', 'w', encoding='utf-8') as f:
        json.dump(unique_manhwas, f, ensure_ascii=False, indent=4)

    print(f"\n[✔] تم استخراج وتنسيق {len(unique_manhwas)} مانهوا بنجاح في ملف manhwa.json!")
