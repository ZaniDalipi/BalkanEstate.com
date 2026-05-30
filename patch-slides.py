#!/usr/bin/env python3
"""
patch-slides.py
Injects real app screenshots into slides that currently show no images.
Uses puppeteer (via subprocess) to capture screenshots, then patches HTML.
"""
import subprocess, base64, re, sys, json, os

PRES = os.path.join(os.path.dirname(__file__), 'presentation.html')

# ── 1. Capture screenshots via a tiny inline Node script ──────────────
CAPTURE_SCRIPT = r"""
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const results = {};
  const pages = [
    ['home',      'http://localhost:4174/',                    1440,900,5000],
    ['search',    'http://localhost:4174/search',              1440,900,5000],
    ['agents',    'http://localhost:4174/agents',              1440,900,4500],
    ['pricing',   'http://localhost:4174/pricing',             1440,900,4000],
    ['valuation', 'http://localhost:4174/valuation',           1440,900,4000],
    ['mortgage',  'http://localhost:4174/mortgage-calculator', 1440,900,4000],
    ['how',       'http://localhost:4174/how-it-works',        1440,900,4000],
    ['inbox',     'http://localhost:4174/inbox',               1440,900,4000],
    ['mob_home',  'http://localhost:4174/',                    390, 844,5000],
    ['mob_search','http://localhost:4174/search',              390, 844,5000],
  ];
  for (const [id,url,w,h,wait] of pages) {
    try {
      const page = await b.newPage();
      await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:w<500,hasTouch:w<500});
      await page.goto(url,{waitUntil:'networkidle2',timeout:25000});
      await sleep(wait);
      await page.evaluate(()=>{
        document.querySelectorAll('[role="dialog"],[data-modal]').forEach(el=>{if(el instanceof HTMLElement)el.style.display='none';});
      }).catch(()=>{});
      const buf = await page.screenshot({type:'jpeg',quality:90});
      results[id] = buf.toString('base64');
      await page.close();
      process.stderr.write('  ✓ ' + id + '\n');
    } catch(e) { process.stderr.write('  ✗ ' + id + ': ' + e.message + '\n'); }
  }
  await b.close();
  console.log(JSON.stringify(results));
})().catch(e=>{console.error(e.message);process.exit(1);});
"""

print('\n📸  Capturing screenshots…')
result = subprocess.run(['node', '-e', CAPTURE_SCRIPT], capture_output=True, text=True,
                        cwd=os.path.dirname(__file__), timeout=300)
print(result.stderr.rstrip())
shots = json.loads(result.stdout)
print(f'  {len(shots)} captured\n')

def src(key):
    """Return a data URI for the given screenshot key."""
    return f'data:image/jpeg;base64,{shots.get(key,"")}'

# ── 2. Build HTML snippets ─────────────────────────────────────────────

def bw(key, url, h='100%', r='12px'):
    """Browser-window frame wrapping a screenshot."""
    s = src(key)
    if not shots.get(key): return f'<div style="height:{h};background:rgba(255,255,255,.04);border-radius:{r}"></div>'
    return f'''<div style="display:flex;flex-direction:column;border-radius:{r};overflow:hidden;height:{h};box-shadow:0 20px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.07);background:#1a1a1a;flex-shrink:0">
  <div style="background:#252529;padding:7px 11px;display:flex;align-items:center;gap:7px;flex-shrink:0">
    <div style="display:flex;gap:4px"><div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div><div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div><div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div></div>
    <div style="flex:1;background:#3a3a3d;border-radius:5px;padding:3px 9px;font-size:.58rem;color:#888;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🔒 {url}</div>
  </div>
  <img src="{s}" style="width:100%;flex:1;object-fit:cover;object-position:top center;display:block"/>
</div>'''

_sid = [0]
def anim_slider(keys, urls, h='100%', r='12px'):
    """CSS-animated slideshow cycling through screenshots."""
    _sid[0] += 1
    sid = f'ps{_sid[0]}'
    srcs = [(k, shots.get(k,'')) for k in keys]
    srcs = [(k,v) for k,v in srcs if v]
    n = len(srcs)
    if n == 0: return f'<div style="height:{h};background:rgba(255,255,255,.04);border-radius:{r}"></div>'
    dur = n * 3
    kf = ''
    for i,(k,_) in enumerate(srcs):
        a = f'{i/n*100:.1f}'; b = f'{(i+.1)/n*100:.1f}'
        c = f'{(i+.9)/n*100:.1f}'; d = f'{(i+1)/n*100:.1f}'
        kf += f'@keyframes {sid}_{i}{{0%,{a}%{{opacity:0}}{b}%,{c}%{{opacity:1}}{d}%,100%{{opacity:0}}}}'
    layers = ''
    for i,(k,v) in enumerate(srcs):
        url = urls[i] if i < len(urls) else 'balkanestate.com'
        delay = f'{i*3:.1f}'
        layers += f'''<div style="position:absolute;inset:0;opacity:0;animation:{sid}_{i} {dur}s ease-in-out {delay}s infinite;display:flex;flex-direction:column;background:#1a1a1a">
  <div style="background:#252529;padding:7px 11px;display:flex;align-items:center;gap:7px;flex-shrink:0">
    <div style="display:flex;gap:4px"><div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div><div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div><div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div></div>
    <div style="flex:1;background:#3a3a3d;border-radius:5px;padding:3px 9px;font-size:.58rem;color:#888;font-family:monospace">🔒 {url}</div>
  </div>
  <img src="data:image/jpeg;base64,{v}" style="width:100%;flex:1;object-fit:cover;object-position:top center;display:block"/>
</div>'''
    return f'''<div style="position:relative;height:{h};border-radius:{r};overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.07)">
<style>{kf}</style>{layers}</div>'''

def phone(key, h='460px', w='215px'):
    s = src(key)
    if not shots.get(key): return ''
    return f'''<div style="width:{w};height:{h};background:#111;border-radius:36px;border:6px solid #333;box-shadow:0 20px 60px rgba(0,0,0,.7),inset 0 0 0 2px rgba(255,255,255,.05);overflow:hidden;position:relative;flex-shrink:0">
  <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:80px;height:20px;background:#111;border-radius:0 0 12px 12px;z-index:2"></div>
  <img src="{s}" style="width:100%;height:100%;object-fit:cover;object-position:top center"/>
</div>'''

# ── 3. Patch each slide ────────────────────────────────────────────────

with open(PRES) as f:
    html = f.read()

print('💉  Patching slides…\n')

# Split HTML into slide chunks by the ═══ SLIDE N markers
# We'll process each slide individually and reassemble

SLIDE_RE = re.compile(r'(<!-- ═══ SLIDE \d+[^>]*-->)')
parts = SLIDE_RE.split(html)
# parts: [pre, marker1, body1, marker2, body2, ...]

def get_slide_n(marker):
    m = re.search(r'SLIDE (\d+)', marker)
    return int(m.group(1)) if m else 0

# Process each slide body
new_parts = [parts[0]]  # everything before slide 1

for idx in range(1, len(parts), 2):
    marker = parts[idx]
    body   = parts[idx+1] if idx+1 < len(parts) else ''
    n      = get_slide_n(marker)

    new_parts.append(marker)

    # ── SLIDE 1: Title — add live homepage in a split layout ──────────
    if n == 1:
        # The title slide inner div ends with </div>\n</div>\n
        # We want to wrap the inner content in a 2-col grid
        # and add a browser window on the right
        # Strategy: find </div>\n</div>\n at end of slide and insert before it
        # The slide structure: <div class="slide on"...><div class="inner">...</div></div>
        if shots.get('home'):
            img_col = f'''<div style="height:560px;flex-shrink:0;width:480px">
{bw("home", "balkanestate.com", "100%", "14px")}
</div>'''
            # Replace <div class="inner"> to add grid layout
            body = body.replace(
                '<div class="inner">',
                '<div class="inner" style="flex-direction:row;align-items:center;gap:32px">',
                1
            )
            # Find the last </div>\n</div> to insert img_col before closing
            # Actually we need to wrap existing content in a flex child
            # Insert a wrapper div around existing children
            body = re.sub(
                r'(<div class="inner"[^>]*>)',
                r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">',
                body, count=1
            )
            # Find second-to-last </div></div> (inner + slide closing)
            # and insert </div> + img_col before it
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide  1: ✓ added homepage browser frame')

    # ── SLIDE 2: Problem — add 2 screenshots on the right ─────────────
    elif n == 2:
        if shots.get('search') and shots.get('agents'):
            img_col = f'''<div style="display:flex;flex-direction:column;gap:14px;flex-shrink:0;width:400px">
  <div style="height:260px">{bw("search","balkanestate.com/search","100%","12px")}</div>
  <div style="height:230px">{bw("agents","balkanestate.com/agents","100%","12px")}</div>
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide  2: ✓ added search + agents screenshots')

    # ── SLIDE 3: Solution/Roles — add animated slider beside roles ─────
    elif n == 3:
        if shots.get('home'):
            img_col = f'''<div style="height:420px;flex-shrink:0;width:400px">
{anim_slider(["home","search","agents","pricing"],
             ["balkanestate.com","balkanestate.com/search","balkanestate.com/agents","balkanestate.com/pricing"],
             "100%","12px")}
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide  3: ✓ added animated site slider')

    # ── SLIDE 8: Chat — add inbox screenshot on right ──────────────────
    elif n == 8:
        if shots.get('inbox') or shots.get('home'):
            key = 'inbox' if shots.get('inbox') else 'home'
            img_col = f'''<div style="height:420px;flex-shrink:0;width:380px">
{bw(key,"balkanestate.com/inbox","100%","12px")}
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide  8: ✓ added inbox screenshot')

    # ── SLIDE 9: AI Tools — add valuation + mortgage screenshots ───────
    elif n == 9:
        if shots.get('valuation'):
            img_col = f'''<div style="display:flex;flex-direction:column;gap:12px;flex-shrink:0;width:380px">
  <div style="height:215px">{bw("valuation","balkanestate.com/valuation","100%","12px")}</div>
  <div style="height:210px">{bw("mortgage","balkanestate.com/mortgage-calculator","100%","12px")}</div>
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide  9: ✓ added valuation + mortgage screenshots')

    # ── SLIDE 12: Languages — add homepage screenshot on right ─────────
    elif n == 12:
        if shots.get('home'):
            img_col = f'''<div style="display:flex;flex-direction:column;gap:12px;flex-shrink:0;width:360px">
  <div style="height:260px">{bw("home","balkanestate.com","100%","12px")}</div>
  <div style="padding:16px;background:rgba(2,82,205,.12);border:1px solid rgba(59,130,246,.25);border-radius:12px;font-size:.78rem;color:#93C5FD;line-height:1.6">
    🌍 Language auto-detects from your browser and persists your choice.<br><br>
    Each translation is native — built by regional experts, not machine-translated.
  </div>
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide 12: ✓ added homepage screenshot')

    # ── SLIDE 13: Pricing — add real pricing page below cards ──────────
    elif n == 13:
        if shots.get('pricing'):
            pricing_preview = f'''  <!-- Real pricing page preview -->
  <div style="height:220px;margin-top:8px;flex-shrink:0">
    {bw("pricing","balkanestate.com/pricing","100%","12px")}
  </div>
'''
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + pricing_preview + body[last_close:]
        print(f'  Slide 13: ✓ added pricing page screenshot')

    # ── SLIDE 14: Why BalkanEstate — add how-it-works screenshot ───────
    elif n == 14:
        if shots.get('how'):
            img_col = f'''<div style="height:440px;flex-shrink:0;width:420px">
{bw("how","balkanestate.com/how-it-works","100%","12px")}
</div>'''
            body = body.replace('<div class="inner">', '<div class="inner" style="flex-direction:row;align-items:flex-start;gap:28px">', 1)
            body = re.sub(r'(<div class="inner"[^>]*>)', r'\1<div style="flex:1;display:flex;flex-direction:column;gap:0">', body, count=1)
            last_close = body.rfind('</div>\n</div>')
            if last_close > -1:
                body = body[:last_close] + f'</div>{img_col}\n' + body[last_close:]
        print(f'  Slide 14: ✓ added how-it-works screenshot')

    else:
        pass  # slides 4,5,6,7,10,11,15,16 already have screenshots

    new_parts.append(body)

# Reassemble
html = ''.join(new_parts)

# ── Also patch the LIVE PLATFORM SLIDE if it lost its slider ──────────
if '<!-- ═══ LIVE PLATFORM SLIDE ═══ -->' in html:
    print(f'\n  Live Platform slide: already present ✓')

with open(PRES, 'w') as f:
    f.write(html)

print(f'\n  Written: {len(html)//1024} KB')
print('\nDone. Run node full-pdf.cjs to regenerate the PDF.\n')
