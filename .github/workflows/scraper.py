import requests
from bs4 import BeautifulSoup
import json
import time
import re

def scrape_manhwaarab():
    print("ManhwaArab...")
    results = []
    base = "https://manhwaarab.com"
    for page in range(1, 60):
        try:
            url = base + "/manga?page=" + str(page)
            print("Page " + str(page))
            r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.find_all('a', href=re.compile(r'/manga/'))
            new_count = 0
            for link in cards:
                try:
                    href = link.get('href', '')
                    if '/manga/' not in href:
                        continue
                    if not href.startswith('http'):
                        href = base + href
                    if any(x['url'] == href for x in results):
                        continue
                    title = link.get_text(strip=True)
                    if not title or len(title) < 2:
                        continue
                    img = link.find('img')
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
            print("Added " + str(new_count))
            if new_count == 0 and page > 2:
                break
            time.sleep(1)
        except Exception as e:
            print("Error: " + str(e))
            break
    return results

def scrape_olympustaff():
    print("Olympustaff...")
    results = []
    base = "https://olympustaff.com"
    for page in range(1, 130):
        try:
            url = base + "/series?page=" + str(page)
            print("Page " + str(page))
            r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.find_all('a', href=re.compile(r'/series/'))
            new_count = 0
            for link in cards:
                try:
                    href = link.get('href', '')
                    if not href.startswith('http'):
                        href = base + href
                    if any(x['url'] == href for x in results):
                        continue
                    title = link.get_text(strip=True)
                    if not title or len(title) < 2:
                        continue
                    img = link.find('img')
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
            print("Added " + str(new_count))
            if new_count == 0 and page > 2:
                break
            time.sleep(1)
        except Exception as e:
            print("Error: " + str(e))
            break
    return results

def main():
    all_data = []
    try:
        all_data.extend(scrape_manhwaarab())
    except Exception as e:
        print("ManhwaArab failed: " + str(e))
    try:
        all_data.extend(scrape_olympustaff())
    except Exception as e:
        print("Olympustaff failed: " + str(e))
    
    seen = set()
    unique = []
    for item in all_data:
        if item['url'] not in seen:
            seen.add(item['url'])
            unique.append(item)
    
    with open('manhwa.json', 'w', encoding='utf-8') as f:
        json.dump({"manhwa": unique}, f, ensure_ascii=False, indent=2)
    
    print("Done! Total: " + str(len(unique)))

if __name__ == "__main__":
    main()
