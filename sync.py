"""MQJ Manhwa synchronizer.

For content you are authorized to reproduce. Supports catalog discovery and,
when MIRROR_MEDIA=true, copying chapter images to Cloudflare R2/S3-compatible
storage. It never bypasses login, CAPTCHA, paywalls, or anti-bot controls.
"""
import os, re, json, time, hashlib
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

HEADERS={'User-Agent': os.getenv('MQJ_USER_AGENT','MQJ-Manhwa-Sync/2.0 (+authorized-content)')}
SOURCES={
 'olympus': os.getenv('OLYMPUS_URL','https://olympustaff.com/'),
 'mesh': os.getenv('MESH_URL','https://meshmanga.com/')
}
MAX_SERIES=int(os.getenv('MAX_SERIES','0'))
MAX_CHAPTERS=int(os.getenv('MAX_CHAPTERS','0'))
MIRROR=os.getenv('MIRROR_MEDIA','false').lower()=='true'
ASSET_PREFIX=os.getenv('ASSET_PREFIX','mqj')

session=requests.Session(); session.headers.update(HEADERS)

def get(url, binary=False):
    r=session.get(url,timeout=30)
    r.raise_for_status()
    return r.content if binary else r.text

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def samehost(a,b): return urlparse(a).netloc==urlparse(b).netloc

def sitemap_urls(base, depth=0):
    if depth>2: return []
    found=[]
    for path in ('sitemap.xml','sitemap_index.xml','wp-sitemap.xml'):
        try:
            xml=get(urljoin(base,path))
            locs=re.findall(r'<loc>\s*(.*?)\s*</loc>',xml,re.I)
            for u in locs:
                if u.lower().endswith('.xml') and samehost(u,base):
                    found.extend(sitemap_urls(u,depth+1))
                else: found.append(u.strip())
        except Exception: pass
    return list(dict.fromkeys(found))

def discover_series(base):
    urls=sitemap_urls(base)
    series=[u for u in urls if re.search(r'/(?:series|manga|manhwa|comic|title)/',u,re.I)]
    if series: return sorted(set(series))[:MAX_SERIES or None]
    try:
        soup=BeautifulSoup(get(base),'html.parser')
        out=[]
        for a in soup.select('a[href]'):
            u=urljoin(base,a.get('href')); t=clean(a.get_text(' ',strip=True))
            if samehost(u,base) and t and re.search(r'/(?:series|manga|manhwa|comic|title)/',u,re.I): out.append(u)
        return sorted(set(out))[:MAX_SERIES or None]
    except Exception: return []

def parse_series(url,source_id):
    soup=BeautifulSoup(get(url),'html.parser')
    h=soup.select_one('h1,h2')
    title=clean(h.get_text(' ',strip=True) if h else '')
    if not title: return None
    og=soup.select_one('meta[property="og:image"]'); cover=urljoin(url,og.get('content')) if og and og.get('content') else ''
    md=soup.select_one('meta[property="og:description"]'); desc=clean(md.get('content')) if md else ''
    genres=[]
    for a in soup.select('a[href]'):
        t=clean(a.get_text(' ',strip=True))
        if 1 < len(t) < 30 and t in {'أكشن','فانتازيا','دراما','رومانسية','كوميديا','رعب','غموض','مغامرات','شونين','ويب تون','Manhwa','Manga'}: genres.append(t)
    chapters=[]; seen=set()
    for a in soup.select('a[href]'):
        href=urljoin(url,a.get('href')); txt=clean(a.get_text(' ',strip=True))
        if not samehost(href,url): continue
        m=re.search(r'(?:الفصل|chapter|chap)\s*#?\s*([0-9]+(?:\.[0-9]+)?)',txt,re.I)
        if not m: continue
        if href in seen: continue
        seen.add(href); n=m.group(1)
        chapters.append({'id':hashlib.sha1(href.encode()).hexdigest()[:16],'number':n,'title':txt,'url':href})
    chapters=chapters[:MAX_CHAPTERS or None]
    if not chapters: return None
    sid=hashlib.sha1((source_id+'|'+url).encode()).hexdigest()[:16]
    return {'id':sid,'title':title,'description':desc,'genres':sorted(set(genres)),'updated':time.strftime('%Y-%m-%d'),'cover':cover,'source':source_id,'sourceName':'Olympus / Team-X' if source_id=='olympus' else 'MeshManga','chapterCount':len(chapters),'chapters':chapters}

def ext_for(url, content_type=''):
    p=urlparse(url).path.lower()
    m=re.search(r'\.(jpe?g|png|webp|gif)$',p)
    if m: return '.'+m.group(1).replace('jpeg','jpg')
    if 'png' in content_type: return '.png'
    if 'webp' in content_type: return '.webp'
    return '.jpg'

def mirror_bytes(url, source_id, series_id, chapter_id, index):
    """Mirror to R2 if configured. Returns public URL, otherwise empty."""
    if not MIRROR: return ''
    endpoint=os.getenv('R2_ENDPOINT'); bucket=os.getenv('R2_BUCKET'); public=os.getenv('R2_PUBLIC_BASE')
    if not all([endpoint,bucket,public]):
        raise RuntimeError('MIRROR_MEDIA=true requires R2_ENDPOINT, R2_BUCKET and R2_PUBLIC_BASE')
    try:
        import boto3
        body=get(url,binary=True)
        ct=session.head(url,timeout=20).headers.get('content-type','image/jpeg')
        ext=ext_for(url,ct)
        key=f"{ASSET_PREFIX}/{source_id}/{series_id}/{chapter_id}/{index:04d}{ext}"
        s3=boto3.client('s3',endpoint_url=endpoint,aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'])
        s3.put_object(Bucket=bucket,Key=key,Body=body,ContentType=ct,CacheControl='public,max-age=31536000,immutable')
        return public.rstrip('/')+'/'+key
    except Exception as e:
        print('mirror failed',url,e); return ''

def enrich_chapter(ch,source_id,series_id):
    try: soup=BeautifulSoup(get(ch['url']),'html.parser')
    except Exception: return ch
    urls=[]
    for img in soup.select('img[src],img[data-src],img[data-lazy-src],img[data-original]'):
        u=img.get('data-src') or img.get('data-lazy-src') or img.get('data-original') or img.get('src')
        if not u: continue
        u=urljoin(ch['url'],u)
        if u.startswith('data:') or re.search(r'(logo|avatar|icon|favicon)',u,re.I): continue
        if re.search(r'\.(?:jpe?g|png|webp|gif)(?:\?|$)',u,re.I) or 'image' in u.lower(): urls.append(u)
    urls=list(dict.fromkeys(urls))
    pages=[]
    for i,u in enumerate(urls,1):
        mirrored=mirror_bytes(u,source_id,series_id,ch['id'],i)
        pages.append(mirrored or u)
        time.sleep(.05)
    ch['pages']=pages
    ch['mirrored']=bool(MIRROR and pages and all(not p.startswith(('http://','https://')) for p in pages))
    return ch

def main():
    all_items=[]
    for sid,base in SOURCES.items():
        try: series=discover_series(base)
        except Exception as e: print('source failed',sid,e); continue
        print(sid,'series',len(series))
        for u in series:
            try:
                item=parse_series(u,sid)
                if not item: continue
                item['chapters']=[enrich_chapter(c,sid,item['id']) for c in item['chapters']]
                item['chapterCount']=len(item['chapters'])
                all_items.append(item)
            except Exception as e: print('skip',u,e)
    with open('catalog.json','w',encoding='utf-8') as f:
        json.dump({'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'mirrorMedia':MIRROR,'items':all_items},f,ensure_ascii=False,separators=(',',':'))
    print('wrote',len(all_items),'titles')
if __name__=='__main__': main()
