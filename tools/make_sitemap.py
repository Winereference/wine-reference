"""Regenerate sitemap.xml (home page + image entries for every region/grape photo in PH).
Run from the repo root after adding photos: python3 tools/make_sitemap.py"""
import re,datetime
from xml.sax.saxutils import escape
U='https://wine-reference.netlify.app/'
s=open('index.html',encoding='utf-8').read()
ph=re.search(r'const PH=\{(.*?)\n\};',s,re.S).group(1)
ent=re.findall(r'^"([^"]+)":\["([^"]+)", "[^"]*", "[^"]*", "([^"]*)"\]',ph,re.M)
imgs=''.join(f'\n    <image:image><image:loc>{U}img/p/{escape(f)}</image:loc><image:title>{escape(k)}</image:title><image:caption>{escape(a)}</image:caption></image:image>' for k,f,a in ent)
x=f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>{U}</loc>
    <lastmod>{datetime.date.today().isoformat()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image><image:loc>{U}img/og-wine-reference-douro-vineyards.jpg</image:loc><image:title>The Wine Reference</image:title></image:image>{imgs}
  </url>
</urlset>
'''
open('sitemap.xml','w',encoding='utf-8').write(x)
print('sitemap images:',len(ent)+1)
