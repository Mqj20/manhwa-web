import requests
from bs4 import BeautifulSoup
import json
import time
import re

# ==========================================================
#   جمع المانهوا من manhwaarab.com (لا يحتاج JavaScript)
# ==========================================================
def scrape_manhwaarab():
    print("🚀 جمع من ManhwaArab...")
    results = []
    base = "https://manhwaarab.com"
    
    for page in range(1, 60):  # حتى 60 صفحة
        try:
            url = f"{base}/manga?page={page}"
            print(f"   صفحة {page}...")
            r = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if r.status_code != 200:
                break
            
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # البحث عن بطاقات المانهوا
            cards = soup.select('div.manga-item, div.item, div.card, article')
            if not cards:
                # محاولة بديلة
                cards = soup.find_all('a', href=re.compile(r'/manga/'))
            
            new_count = 0
            for card in cards:
                try:
                    link = card if card.name == 'a' else card.find('a', href=True)
                    if not link: continue
                    href = link.get('href', '')
                    if '/manga/' not in href: continue
                    
                    if not href.startswith('http'):
                        href = base + href
                    
                    # تجنب التكرار
                    if any(x['url'] == href for x in results): continue
                    
                    title_tag = card.find(['h3', 'h2', 'h4', 'span'], class_=re.compile('title|name', re.I))
                    title = title_tag.get_text(strip=True) if title_tag else link.get_text(strip=True)
                    if not title or len(title) < 2: continue
                    
                    img = card.find('img')
                    cover = ""
                    if img:
                        cover = img.get('src') or img.get('data-src') or ""
                    
                    results.append({
                        "id": abs(hash(href)) % 1000000,
                        "title": title,
                        "title_ar": title,
                        "cover": cover,
                        "summary": "",
                        "status": "ongoing",
                        "genres": [],
                        "latest_chapter": 0,
                        "rating": 8.0,
                        "url": href
                    })
                    new_count += 1
                except:
                    continue
            
            print(f"   ✅ {new_count} جديد، الإجمالي: {len(results)}")
            if new_count == 0 and page > 2:
                break
            time.sleep(1)
        except Exception as e:
            print(f"   خطأ: {e}")
            break
    
    return results

# ==========================================================
#   جمع المانهوا من olympustaff.com
# ==========================================================
def scrape_olympustaff():
    print("\n🚀 جمع من Olympustaff...")
    results = []
    base = "https://olympustaff.com"
    
    for page in range(1, 130):
        try:
            url = f"{base}/series?page={page}"
            print(f"   صفحة {page}...")
            r = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if r.status_code != 200:
                break
            
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.select('div.manga-item, div.series-item, div.item, article, div.card')
            
            new_count = 0
            for card in cards:
                try:
                    link = card.find('a', href=True)
                    if not link: continue
                    href = link.get('href', '')
                    if not href.startswith('http'):
                        href = base + href
                    
                    if any(x['url'] == href for x in results): continue
                    
                    title_tag = card.find(['h3', 'h2', 'h4'])
                    title = title_tag.get_text(strip=True) if title_tag else link.get_text(strip=True)
                    if not title or len(title) < 2: continue
                    
                    img = card.find('img')
                    cover = ""
                    if img:
                        cover = img.get('src') or img.get('data-src') or ""
                        if cover and not cover.startswith('http'):
                            cover = base + cover
                    
                    results.append({
                        "id": abs(hash(href)) % 1000000,
                        "title": title,
                        "title_ar": title,
                        "cover": cover,
                        "summary": "",
                        "status": "ongoing",
                        "genres": [],
                        "latest_chapter": 0,
                        "rating": 8.0,
                        "url": href
                    })
                    new_count += 1
                except:
                    continue
            
            print(f"   ✅ {new_count} جديد، الإجمالي: {len(results)}")
            if new_count == 0 and page > 2:
                break
            time.sleep(1)
        except Exception as e:
            print(f"   خطأ: {e}")
            break
    
    return results

# ==========================================================
#   الدالة الرئيسية
# ==========================================================
def main():
    print("="*60)
    print("🎯 بدء جمع البيانات")
    print("="*60)
    
    all_data = []
    
    # جمع من الموقعين
    try:
        all_data.extend(scrape_manhwaarab())
    except Exception as e:
        print(f"فشل ManhwaArab: {e}")
    
    try:
        all_data.extend(scrape_olympustaff())
    except Exception as e:
        print(f"فشل Olympustaff: {e}")
    
    # إزالة التكرار
    seen = set()
    unique = []
    for item in all_data:
        if item['url'] not in seen:
            seen.add(item['url'])
            unique.append(item)
    
    # الحفظ
    with open('manhwa.json', 'w', encoding='utf-8') as f:
        json.dump({"manhwa": unique}, f, ensure_ascii=False, indent=2)
    
    print(f"\n🎉 تم! الإجمالي: {len(unique)} مانهوا")

if __name__ == "__main__":
    main()
