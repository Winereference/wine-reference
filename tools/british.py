#!/usr/bin/env python3
"""British English for The Wine Reference.

Usage: python3 tools/british.py [--check] FILE_OR_DIR ...

Converts American spellings to British ones in the text people read (flavor -> flavour,
color -> colour, center -> centre, caramelized -> caramelised ...), in .html, .xml and .js
data. It leaves code alone: <style> blocks, style="" attributes, URLs (href, src, data-*),
CSS properties (color:, text-align:center), JS properties (.color, block:"center") and
anything that is a whole quoted keyword. Runs on the repo and again on _site at publish
time, so new daily content stays British too. --check only reports.
"""
import os, re, sys

W = {  # American -> British (lower case; case is kept)
 'flavor':'flavour','flavors':'flavours','flavored':'flavoured','flavorful':'flavourful','flavoring':'flavouring','flavorings':'flavourings','flavorsome':'flavoursome','flavorless':'flavourless',
 'color':'colour','colors':'colours','colored':'coloured','colorful':'colourful','coloring':'colouring','colorless':'colourless',
 'favorite':'favourite','favorites':'favourites','favor':'favour','favors':'favours','favored':'favoured','favorable':'favourable',
 'savory':'savoury','savor':'savour','savoring':'savouring','honor':'honour','honors':'honours','honored':'honoured',
 'harbor':'harbour','harbors':'harbours','neighbor':'neighbour','neighbors':'neighbours','neighboring':'neighbouring','neighborhood':'neighbourhood',
 'odor':'odour','odors':'odours','humor':'humour','labor':'labour','vigor':'vigour','rumor':'rumour','rumors':'rumours','splendor':'splendour',
 'center':'centre','centers':'centres','centered':'centred','liter':'litre','liters':'litres','milliliter':'millilitre','milliliters':'millilitres','centiliter':'centilitre',
 'theater':'theatre','fiber':'fibre','meager':'meagre','somber':'sombre','luster':'lustre',
 'gray':'grey','grayish':'greyish','aging':'ageing','aluminum':'aluminium','mold':'mould','molds':'moulds','moldy':'mouldy',
 'catalog':'catalogue','analyze':'analyse','analyzed':'analysed','analyzing':'analysing','paralyze':'paralyse',
 'jewelry':'jewellery','traveler':'traveller','travelers':'travellers','traveled':'travelled','traveling':'travelling',
 'labeled':'labelled','labeling':'labelling','modeled':'modelled','fueled':'fuelled','canceled':'cancelled','marvelous':'marvellous',
 'skillful':'skilful','enrollment':'enrolment','fulfill':'fulfil','defense':'defence','offense':'offence','pretense':'pretence',
 'plow':'plough','plowed':'ploughed','cozy':'cosy','mustache':'moustache','artifact':'artefact','artifacts':'artefacts',
 'whiskey-barrel':'whisky-barrel','sulfur':'sulphur','sulfurous':'sulphurous','sulfite':'sulphite','sulfites':'sulphites','sulfide':'sulphide',
 'appetizer':'appetiser','appetizers':'appetisers','yogurt':'yoghurt','eggplant':'aubergine','zucchini':'courgette','arugula':'rocket',
}
STEMS = ['caramel','recogn','organ','special','character','emphas','minim','maxim','optim','summar','categor','standard','modern','harmon',
 'real','util','critic','apolog','memor','author','symbol','crystal','oxid','steril','stabil','neutral','revolution','popular','commercial',
 'industrial','central','legal','global','visual','personal','prior','fertil','pasteur','homogen','aromat','glamor','civil','colon','fossil',
 'tantal','sympath','energ','tenderiz','carbon','vapor','ion','mobil','capital','miner','emphas','fantas','agon','mechan','urban','social','local']
IZE = re.compile(r'\b(' + '|'.join(sorted(set(STEMS), key=len, reverse=True)) + r')iz(e|ed|es|ing|ation|ations|er|ers)\b', re.I)
WORD = re.compile(r'\b(' + '|'.join(sorted(map(re.escape, W), key=len, reverse=True)) + r')\b', re.I)
SKIP_BLOCK = re.compile(r'<style[\s\S]*?</style>|\sstyle="[^"]*"|\s(?:href|src|srcset|poster|action|content|data-[\w-]+|id|class|for|name)="[^"]*"|https?://[^\s"\'<>)]+', re.I)

def case(src, rep):
    if src.isupper(): return rep.upper()
    if src[0].isupper(): return rep[0].upper() + rep[1:]
    return rep

def fix_text(t, hits):
    def ok(m):
        a, b = m.start(), m.end()
        before, after = t[max(0, a-1):a], t[b:b+1]
        if before in '-./_#$' or after in '-=(_/': return False       # CSS/JS/URL/slug
        if after == ':' and t[b+1:b+2] not in (' ', '<'): return False  # color:red, but 'Flavors: x' is prose
        if before in '"\'`' and after in '"\'`': return False           # "center" keyword
        if t[b:b+2] == '":' or t[b:b+2] == "':": return False           # object key
        return True
    def r1(m):
        if not ok(m): return m.group(0)
        hits.append(m.group(0)); return case(m.group(0), W[m.group(0).lower()])
    def r2(m):
        if not ok(m): return m.group(0)
        hits.append(m.group(0)); s = m.group(0); i = s.lower().rfind('iz')
        return s[:i] + ('IS' if s[i].isupper() else 'is') + s[i+2:]
    return IZE.sub(r2, WORD.sub(r1, t))

KEEP = ['La Favorite', "Favorite Christmas Drink", 'Enology Center', 'Center for', 'Research Center', 'Wine Center', 'Visitor Center', 'Rockefeller Center']
def fix(s):
    masks = {}
    for i, k in enumerate(KEEP):
        if k in s:
            tok = f'\x00K{i}\x00'; masks[tok] = k; s = s.replace(k, tok)
    n, hits = _fix(s)
    for tok, k in masks.items(): n = n.replace(tok, k)
    return n, hits

def _fix(s):
    hits, out, pos = [], [], 0
    for m in SKIP_BLOCK.finditer(s):
        out.append(fix_text(s[pos:m.start()], hits)); out.append(m.group(0)); pos = m.end()
    out.append(fix_text(s[pos:], hits))
    return ''.join(out), hits

def files(args):
    for a in args:
        if os.path.isdir(a):
            for d, _, fs in os.walk(a):
                if '/.git' in d or '/node_modules' in d: continue
                for f in fs:
                    if f.endswith(('.html', '.xml')): yield os.path.join(d, f)
        else: yield a

if __name__ == '__main__':
    check = '--check' in sys.argv; args = [a for a in sys.argv[1:] if a != '--check']
    total = 0; seen = {}
    for f in files(args):
        s = open(f, encoding='utf-8').read(); n, hits = fix(s)
        if hits:
            total += len(hits)
            for h in hits: seen[h] = seen.get(h, 0) + 1
            if not check: open(f, 'w', encoding='utf-8').write(n)
    print(f"{'would change' if check else 'changed'} {total} words:", ', '.join(f'{k}×{v}' for k, v in sorted(seen.items(), key=lambda x: -x[1])[:40]))
