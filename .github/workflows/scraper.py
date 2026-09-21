import requests
from bs4 import BeautifulSoup
import json
import time
import os

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
}

def scrape_like_manga(max_pages=3):
    print("[+] جاري كشط موقع Like-Manga...")
    manhwas = []
    for page in range(1, max_pages + 1):
        url = f"https://like-manga.net/manga-genre/%D9%85%D8%A7%D9%8BD9%87%D9%88%D8%A7/page/{page}/"
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code != 200:
                break
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.select('.page-item-detail, .manga-item, .badge-pos-1')
            if not items:
                items = soup.select('.col-6.col-md-3, .item-summary')
                
            for item in items:
                title_el = item.select_one('.post-title a, .manga-name a, h3 a, a[title]')
                img_el = item.select_one('img')
                if title_el:
                    title = title_el.text.strip()
                    link = title_el.get('href', '')
                    img_src = ''
                    if img_el:
                        img_src = img_el.get('data-src') or img_el.get('src') or ''
                    
                    if title and link:
                        manhwas.append({
                            'title': title,
                            'link': link,
                            'cover': img_src,
                            'source': 'Like-Manga'
                        })
            time.sleep(1)
        except Exception as e:
            print(f"خطأ في Like-Manga صفحة {page}: {e}")
            break
    return manhwas

def scrape_meshmanga():
    print("[+] جاري كشط موقع MeshManga...")
    manhwas = []
    url = "https://meshmanga.com/"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.select('.bsx, .utao, .page-item-detail, article')
            for item in items:
                a_tag = item.select_one('a')
                img_tag = item.select_one('img')
                title_tag = item.select_one('.tt, .post-title, h3, h4')
                
                title = title_tag.text.strip() if title_tag else (a_tag.get('title', '').strip() if a_tag else '')
                link = a_tag.get('href', '') if a_tag else ''
                cover = img_tag.get('data-src') or img_tag.get('src') if img_tag else ''
                
                if title and link:
                    manhwas.append({
                        'title': title,
                        'link': link,
                        'cover': cover,
                        'source': 'MeshManga'
                    })
    except Exception as e:
        print(f"خطأ في MeshManga: {e}")
    return manhwas

def scrape_olympustaff():
    print("[+] جاري كشط موقع Olympus Staff...")
    manhwas = []
    url = "https://olympustaff.com/"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.select('a[href*="/series/"]')
            for a in items:
                title = a.text.strip()
                link = a.get('href', '')
                if title and len(title) > 2 and link not in [m['link'] for m in manhwas]:
                    manhwas.append({
                        'title': title,
                        'link': link,
                        'cover': '',
                        'source': 'OlympusStaff'
                    })
    except Exception as e:
        print(f"خطأ في OlympusStaff: {e}")
    return manhwas

if __name__ == "__main__":
    results = []
    results.extend(scrape_like_manga())
    results.extend(scrape_meshmanga())
    results.extend(scrape_olympustaff())

    # إزالة التكرار بناءً على الرابط
    unique_manhwas = list({m['link']: m for m in results}.values())

    # حفظ البيانات في ملف JSON لتقرأها واجهة المستخدم
    with open('manhwas.json', 'w', encoding='utf-8') as f:
        json.dump(unique_manhwas, f, ensure_ascii=False, indent=4)

    print(f"[✔] تم جلب وحفظ {len(unique_manhwas)} مانهوا بنجاح في ملف manhwas.json!")
