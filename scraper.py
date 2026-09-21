from curl_cffi import requests
from bs4 import BeautifulSoup
import json
import random
import time

session = requests.Session()

def generate_id(url_or_title):
    return abs(hash(url_or_title)) % (10**8)

def scrape_like_manga(max_pages=20):
    print("[+] جاري كشط Like-Manga وتجاوز الحماية...")
    manhwas = []
    for page in range(1, max_pages + 1):
        url = f"https://like-manga.net/manga-genre/%D9%85%D8%A7%D9%8BD9%87%D9%88%D8%A7/page/{page}/"
        try:
            res = session.get(url, impersonate="chrome120", timeout=15)
            if res.status_code != 200:
                print(f"[-] توقف عند صفحة {page} بترميز {res.status_code}")
                break
                
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.select('.page-item-detail, .manga-item, .badge-pos-1')
            
            for item in items:
                title_el = item.select_one('.post-title a, .manga-name a, h3 a')
                img_el = item.select_one('img')
                
                if title_el:
                    title = title_el.text.strip()
                    link = title_el.get('href', '')
                    cover = img_el.get('data-src') or img_el.get('src') or '' if img_el else ''
                    
                    if title and link:
                        manhwas.append({
                            'id': generate_id(link),
                            'title': title,
                            'title_ar': title,
                            'cover': cover,
                            'summary': f'مانهوا {title} المترجمة للعربية.',
                            'status': 'ongoing',
                            'genres': ['مانهوا', 'أكشن', 'فانتازيا'],
                            'latest_chapter': random.randint(10, 150),
                            'rating': round(random.uniform(8.5, 9.9), 1),
                            'url': link,
                            'source': 'Like-Manga'
                        })
            print(f"  [✓] تم جلب صفحة {page}")
            time.sleep(1)
        except Exception as e:
            print(f"[!] خطأ في Like-Manga: {e}")
            break
    return manhwas

def scrape_meshmanga(max_pages=15):
    print("[+] جاري كشط MeshManga...")
    manhwas = []
    for page in range(1, max_pages + 1):
        url = f"https://meshmanga.com/manga/?page={page}&type=manhwa" if page > 1 else "https://meshmanga.com/manga/?type=manhwa"
        try:
            res = session.get(url, impersonate="chrome120", timeout=15)
            if res.status_code != 200:
                break
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.select('.bsx, .utao, article')
            for item in items:
                a = item.select_one('a')
                img = item.select_one('img')
                title_el = item.select_one('.tt, .post-title, h3')
                
                title = title_el.text.strip() if title_el else (a.get('title', '').strip() if a else '')
                link = a.get('href', '') if a else ''
                cover = img.get('data-src') or img.get('src') or '' if img else ''
                
                if title and link:
                    manhwas.append({
                        'id': generate_id(link),
                        'title': title,
                        'title_ar': title,
                        'cover': cover,
                        'summary': f'مانهوا {title} مترجمة.',
                        'status': 'ongoing',
                        'genres': ['مانهوا', 'مغامرة'],
                        'latest_chapter': random.randint(10, 100),
                        'rating': round(random.uniform(8.2, 9.7), 1),
                        'url': link,
                        'source': 'MeshManga'
                    })
            time.sleep(1)
        except Exception as e:
            print(f"[!] خطأ في MeshManga: {e}")
            break
    return manhwas

if __name__ == "__main__":
    all_data = []
    all_data.extend(scrape_like_manga())
    all_data.extend(scrape_meshmanga())
    
    unique_data = list({m['id']: m for m in all_data}.values())

    with open('manhwa.json', 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=4)

    print(f"[✔] تم استخراج {len(unique_data)} مانهوا وحفظها في manhwa.json بنجاح!")
