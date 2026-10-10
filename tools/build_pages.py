#!/usr/bin/env python3
"""index.html の各セクションから個別ページ（/indigo/ など）を作るスクリプト。

index.html の内容（価格・診療時間など）を変えたら、このスクリプトを実行し直すと
個別ページにも反映されます:  python3 tools/build_pages.py
個別ページは Google 広告のサイトリンクのリンク先として使っています。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://arpeggio-dog.github.io"
src = (ROOT / "index.html").read_text(encoding="utf-8")

PAGES = [
    {
        "slug": "indigo", "anchor": "shop", "sections": ["shop", "access"],
        "nav": "藍染ウェア", "h1": "阿波藍のドッグウェア",
        "title": "阿波藍のドッグウェア ARPEGGIO indigo｜ARPEGGIO（アルペジオ）徳島・上板町",
        "desc": "徳島の伝統工芸「阿波藍」で職人が一枚ずつ手染めする、世界に一着のドッグウェア。ドッグシャツ¥8,800〜、ドッグパーカー¥12,000〜。上板町のドッグカフェ ARPEGGIOで店頭オーダー受付中。",
        "lead": "上板町の藍染工房「WATANABE'S」と仕立てる、世界に一着のオリジナルウェア。",
        "image": "indigo-wear.jpg",
    },
    {
        "slug": "clinic", "anchor": "clinic", "sections": ["clinic", "access"],
        "nav": "動物病院", "h1": "併設の動物病院",
        "title": "動物病院（毎週日曜診療）｜ARPEGGIO（アルペジオ）徳島・上板町",
        "desc": "ドッグカフェ ARPEGGIOの店内に併設の動物病院。毎週日曜10:00〜17:00、健康診断・ワクチン接種など。ご予約はお電話（088-661-3377）またはInstagramのDMで。",
        "lead": "毎週日曜 10:00〜17:00。健康診断・ワクチン接種などに対応しています。",
        "image": "oxygen.jpg",
    },
    {
        "slug": "photo", "anchor": "photo", "sections": ["photo", "access"],
        "nav": "フォトスペース", "h1": "季節のフォトスペース",
        "title": "季節のフォトスペース｜ARPEGGIO（アルペジオ）徳島・上板町のドッグカフェ",
        "desc": "季節ごとにテーマが変わる、ARPEGGIOのフォトスペース。春のお花、夏のひまわり、秋のハロウィン、冬のクリスマスやお正月。どなたでも無料でご利用いただけます。",
        "lead": "季節ごとにテーマが変わります。どなたでも無料でご利用いただけます。",
        "image": "ps-autumn-5.jpg",
    },
    {
        "slug": "cafe", "anchor": "cafe", "sections": ["cafe", "concept", "access"],
        "nav": "カフェ", "h1": "カフェ",
        "title": "カフェメニュー・店内のご案内｜ARPEGGIO（アルペジオ）徳島・上板町のドッグカフェ",
        "desc": "コーヒー、すだちソーダ、ソフトクリーム。店内すべて愛犬と同伴OKのバリアフリーなドッグカフェです。酸素ボックスや季節のフォトスペースも。徳島県上板町。",
        "lead": "店内すべて愛犬と同伴OK。犬を飼っていない方も、どうぞ気軽にお立ち寄りください。",
        "image": "cafe-cups.jpg",
    },
    {
        "slug": "rules", "anchor": "rules", "sections": ["rules", "access"],
        "nav": "ご来店の方へ", "h1": "ご来店の方へ",
        "title": "愛犬とのご来店ルール｜ARPEGGIO（アルペジオ）徳島・上板町のドッグカフェ",
        "desc": "ARPEGGIOへ愛犬とご来店いただく際のお願い。ワクチン接種証明のご提示、おむつ（マナーパンツ・マナーベルト）の着用、小型の室内犬に限らせていただいております。",
        "lead": "初めての方は、ご来店前にご確認ください。",
        "image": "interior.jpg",
    },
    {
        "slug": "access", "anchor": "access", "sections": ["access"],
        "nav": "アクセス", "h1": "アクセス・営業時間",
        "title": "アクセス・営業時間｜ARPEGGIO（アルペジオ）徳島・上板町のドッグカフェ",
        "desc": "ARPEGGIO（アルペジオ）徳島県板野郡上板町椎本字椎ノ宮231-1。県道34号沿い、イオンタウン上板のすぐ北。営業11:00〜17:00、火・水・木定休、駐車場約10台。",
        "lead": "11:00〜17:00（火・水・木 定休）。イオンタウン上板のすぐ北です。",
        "image": "map.jpg",
    },
]
PAGE_BY_ANCHOR = {p["anchor"]: p for p in PAGES}


def section(sid):
    m = re.search(r'<section id="%s"[^>]*>.*?</section>' % sid, src, re.S)
    if not m:
        raise SystemExit("section not found: " + sid)
    return m.group(0)


def between(start, end):
    i = src.index(start)
    return src[i:src.index(end, i) + len(end)]


def fix_links(html, on_page):
    def repl(m):
        a = m.group(1)
        if a in on_page:
            return 'href="#%s"' % a
        if a in ("top", "main-content"):
            return 'href="/"'
        if a in PAGE_BY_ANCHOR:
            return 'href="/%s/"' % PAGE_BY_ANCHOR[a]["slug"]
        return 'href="/#%s"' % a
    html = re.sub(r'href="#([\w-]+)"', repl, html)
    html = re.sub(r'(src|href)="(images|styles|scripts)/', r'\1="/\2/', html)
    html = re.sub(r'(<p class="label">)\d\d / ', r'\1', html)  # 「03 / 」などの通し番号を外す
    return html


head_common = between('<link rel="icon"', '</script>\n</head>')[: -len('\n</head>')]
header = between("<header>", "</header>")
footer = between("<footer>", "</footer>")
mobile = between('<div class="mobile-actions"', "</div>")

for p in PAGES:
    on_page = set(p["sections"])
    url = "%s/%s/" % (SITE, p["slug"])
    nav = fix_links(header, on_page)
    nav = nav.replace('aria-label="ページ内メニュー"', 'aria-label="メニュー"')
    nav = nav.replace('href="#%s"' % p["anchor"], 'href="#%s" aria-current="page"' % p["anchor"], 1)
    body = "\n\n".join(fix_links(section(s), on_page) for s in p["sections"])
    breadcrumb_ld = (
        '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":['
        '{"@type":"ListItem","position":1,"name":"ARPEGGIO","item":"%s/"},'
        '{"@type":"ListItem","position":2,"name":"%s","item":"%s"}]}' % (SITE, p["h1"], url)
    )
    html = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{p["title"]}</title>
<meta name="description" content="{p["desc"]}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ARPEGGIO">
<meta property="og:title" content="{p["title"]}">
<meta property="og:description" content="{p["desc"]}">
<meta property="og:image" content="{SITE}/images/{p["image"]}">
<meta property="og:url" content="{url}">
<link rel="canonical" href="{url}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ARPEGGIO_dog">
<script type="application/ld+json">{breadcrumb_ld}</script>
{fix_links(head_common, on_page)}
</head>
<body class="subpage">
<a class="skip-link" href="#main-content">本文へ移動</a>
{nav}
<main id="top">
  <div class="page-intro" id="main-content" tabindex="-1">
    <div class="wrap">
      <div class="breadcrumb" role="navigation" aria-label="現在地"><ol><li><a href="/">ARPEGGIO</a></li><li aria-current="page">{p["nav"]}</li></ol></div>
      <p class="label">ARPEGGIO — Kamiita, Tokushima</p>
      <h1>{p["h1"]}</h1>
      <p class="lead">{p["lead"]}</p>
    </div>
  </div>

{body}

  <div class="page-back"><div class="wrap"><a class="text-link" href="/">ARPEGGIOのトップページへ <span aria-hidden="true">↗</span></a></div></div>
</main>
{fix_links(footer, on_page)}
{fix_links(mobile, on_page)}
<script src="/scripts/main.js" defer></script>
</body>
</html>
"""
    out = ROOT / p["slug"] / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print("wrote", out.relative_to(ROOT))

# sitemap
urls = [SITE + "/"] + ["%s/%s/" % (SITE, p["slug"]) for p in PAGES]
lastmod = __import__("datetime").date.today().isoformat()
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u in urls:
    sm += ["  <url>", f"    <loc>{u}</loc>", f"    <lastmod>{lastmod}</lastmod>",
           f"    <changefreq>{'weekly' if u == SITE + '/' else 'monthly'}</changefreq>", "  </url>"]
sm.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
print("wrote sitemap.xml")
