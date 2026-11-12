"""Regenerate sitemap.xml: the home page (with image entries for every region/grape photo in PH)
plus every generated page folder (grapes/, regions/, spirits/, stories/, wine-library/, food-pairing/, glossary/ ...)
that contains an index.html, with that page's main image.
Run from the repo root after adding photos or rebuilding pages: python3 tools/make_sitemap.py
(node tools/build_pages.js runs it automatically.)"""
import re,os,datetime
from xml.sax.saxutils import escape
U='https://thewinereference.co.uk/'
today=datetime.date.today().isoformat()
s=open('index.html',encoding='utf-8').read()
ph=re.search(r'const PH=\{(.*?)\n\};',s,re.S).group(1)
ent=re.findall(r'^"([^"]+)":\["([^"]+)", "[^"]*", "[^"]*", "([^"]*)"\]',ph,re.M)
imgs=''.join(f'\n    <image:image><image:loc>{U}img/p/{escape(f)}</image:loc><image:title>{escape(k)}</image:title><image:caption>{escape(a)}</image:caption></image:image>' for k,f,a in ent)
urls=[f'''  <url>
    <loc>{U}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image><image:loc>{U}img/og-wine-reference-douro-vineyards.jpg</image:loc><image:title>The Wine Reference</image:title></image:image>{imgs}
  </url>''']
pages=[]
for root,dirs,files in os.walk('.'):
    dirs[:]=[d for d in dirs if not d.startswith('.') and d not in ('node_modules','img','tools','assets')]
    if root!='.' and 'index.html' in files:
        pages.append(root[2:].replace(os.sep,'/')+'/')
for rel in sorted(pages,key=lambda r:(r.count('/'),r)):
    h=open(os.path.join(rel,'index.html'),encoding='utf-8').read()
    m=re.search(r'<meta property="og:image" content="([^"]+)"',h)
    im=f'\n    <image:image><image:loc>{escape(m.group(1))}</image:loc></image:image>' if m and 'og-wine-reference' not in m.group(1) else ''
    hub=rel.count('/')==1
    urls.append(f'''  <url>
    <loc>{U}{escape(rel)}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{'daily' if hub else 'weekly'}</changefreq>
    <priority>{'0.8' if hub else '0.6'}</priority>{im}
  </url>''')
x='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+'\n'.join(urls)+'\n</urlset>\n'
open('sitemap.xml','w',encoding='utf-8').write(x)
print('sitemap: home +',len(pages),'pages,',len(ent)+1,'home images')
