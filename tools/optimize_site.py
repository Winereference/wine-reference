"""Publish-time speed optimisation. Run by .github/workflows/pages.yml on every push to main; it only changes the
published copy, never the repo, so index.html stays the single source of truth and the daily tasks keep editing it.

What it does to the published copy of index.html:
1. From the first large inline <script> in <body> onwards, every inline script (the ~1.5 MB of site data and the
   code that uses it) is moved, in the same order, into its own file under assets/js/ (file name = content hash,
   so browsers can cache it). A tiny loader adds them back just after the first paint, with async=false so they
   still run one after another in the original order. The page therefore shows its content straight away
   instead of waiting for all the data.
2. The home "Wine of the Day" card is filled immediately from a few days of picks inlined into the page.
Small inline scripts before the first large one (and all <head> scripts: consent, analytics, AdSense) stay as
they are.
Usage: python3 tools/optimize_site.py <src_dir> <out_dir>"""
import sys, os, re, shutil, hashlib, json, datetime

src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out):
    shutil.rmtree(out)
shutil.copytree(src, out, ignore=shutil.ignore_patterns('.git', '.github', 'node_modules', 'tools'))

p = os.path.join(out, 'index.html')
s = open(p, encoding='utf-8').read()
b = s.find('<body')
head, body = s[:b], s[b:]
os.makedirs(os.path.join(out, 'assets', 'js'), exist_ok=True)

LARGE = 2000
files, moved = [], 0
started = False

def rep(m):
    global started, moved
    attrs, code = m.group(1), m.group(2)
    if 'src=' in attrs or 'ld+json' in attrs or 'application/json' in attrs or not code.strip():
        return m.group(0)
    if not started and len(code) < LARGE:
        return m.group(0)          # small script before the data: keep inline, it runs during parsing as before
    started = True
    h = hashlib.sha1(code.encode()).hexdigest()[:10]
    name = f'assets/js/app-{len(files)+1:02d}-{h}.js'
    open(os.path.join(out, name), 'w', encoding='utf-8').write(code)
    files.append(name)
    moved += len(code.encode())
    return ''

body = re.sub(r'<script([^>]*)>(.*?)</script>', rep, body, flags=re.S)

# Fill the home "Wine of the Day" card straight away (largest element on phones).
m = re.search(r'const WD=\{(.*?)\n\};', s, re.S)
if m and 'id="wotdh"' in body:
    t = datetime.date.today()
    keep = {(t + datetime.timedelta(days=d)).isoformat() for d in range(-1, 6)}
    D = {}
    for line in m.group(1).split('\n'):
        mm = re.match(r'\s*"(\d{4}-\d{2}-\d{2})":(\[.*\]),?\s*$', line)
        if mm and mm.group(1) in keep:
            try:
                D[mm.group(1)] = json.loads(mm.group(2))
            except Exception:
                pass
    if D:
        mini = ('<script>(function(){var D=' + json.dumps(D, ensure_ascii=False).replace('</', '<\\/') +
                ';var t=new Date(),k=t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),'
                'w=D[k],h=document.getElementById("wotdh");if(!w||!h)return;'
                'var e=function(x){return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;"}[c]})};'
                'h.innerHTML="<small>Wine of the Day</small><b>"+e(w[8])+"</b><span>"+e(w[0])+" · "+e(w[2])+"</span>"})()</script>')
        i = body.find('id="wotdh"')
        j = body.find('</a>', i) + 4
        body = body[:j] + mini + body[j:]

if files:
    loader = ('<script>(function(){var f=' + json.dumps(files) + ';function go(){f.forEach(function(u){'
              'var s=document.createElement("script");s.src=u;s.async=false;document.body.appendChild(s)})}'
              'if(window.requestAnimationFrame)requestAnimationFrame(function(){setTimeout(go,0)});else setTimeout(go,0)})()</script>')
    k = body.rfind('</body>')
    body = body[:k] + loader + body[k:]

s = head + body
open(p, 'w', encoding='utf-8').write(s)
print(f'index.html: {len(s.encode())//1024} KB; {len(files)} scripts moved to assets/js ({moved//1024} KB)')
