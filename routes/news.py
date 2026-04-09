from flask import Blueprint, jsonify
import requests
import time as _time

news_bp = Blueprint('news', __name__)

_news_cache = {'ts': 0, 'data': None}


@news_bp.route('/api/news')
def news():
    import imaplib
    import email as _email
    from email.header import decode_header
    import re as _re
    import os

    if _news_cache['data'] and _time.time() - _news_cache['ts'] < 300:
        return jsonify(_news_cache['data'])

    user = os.environ.get('GMAIL_USER', '')
    pw = os.environ.get('GMAIL_APP_PASSWORD', '')
    if not user or not pw:
        return jsonify({'error': 'Gmail credentials not configured'})

    newsletters = [
        {'id': 'money-stuff', 'name': 'Money Stuff', 'author': 'Matt Levine', 'search': 'FROM "noreply@news.bloomberg.com" SUBJECT "Money Stuff"'},
        {'id': 'dealbook', 'name': 'DealBook', 'author': 'Andrew Ross Sorkin', 'search': 'FROM "nytdirect@nytimes.com" SUBJECT "DealBook"'},
        {'id': 'tldr', 'name': 'TLDR', 'author': 'Dan Ni', 'search': 'FROM "tldrnewsletter.com"'},
        {'id': 'endpoints', 'name': 'Endpoints News', 'author': 'Endpoints', 'search': 'FROM "news@endpointsnews.com"'},
        {'id': 'endpoints-pharma', 'name': 'Endpoints Pharma', 'author': 'Endpoints', 'search': 'FROM "pharma@endpointsnews.com"'},
        {'id': 'latam', 'name': 'LatAm Briefing', 'author': 'Latin America Daily', 'search': 'FROM "latinamericadailybriefing"'},
        {'id': 'athletic', 'name': 'The Athletic', 'author': 'The Athletic', 'search': 'FROM "TheAthletic@e1.theathletic.com"'},
        {'id': 'gzero', 'name': 'GZERO Daily', 'author': 'GZERO Media', 'search': 'FROM "gzeromedia.com"'},
    ]

    results = []
    try:
        m = imaplib.IMAP4_SSL('imap.gmail.com')
        m.login(user, pw)
        m.select('INBOX', readonly=True)

        for nl in newsletters:
            try:
                status, msgs = m.search(None, nl['search'])
                ids = msgs[0].split()
                if not ids:
                    continue
                # get latest email
                latest_id = ids[-1]
                status, data = m.fetch(latest_id, '(RFC822)')
                raw = data[0][1]
                msg = _email.message_from_bytes(raw)

                # decode subject
                subj_parts = decode_header(msg.get('Subject', ''))
                subject = ''
                for part, enc in subj_parts:
                    if isinstance(part, bytes):
                        subject += part.decode(enc or 'utf-8', errors='replace')
                    else:
                        subject += part
                date_str = msg.get('Date', '')

                # extract text content
                body = ''
                plain = ''
                html_body = ''
                if msg.is_multipart():
                    for part in msg.walk():
                        ct = part.get_content_type()
                        payload = part.get_payload(decode=True)
                        if not payload:
                            continue
                        charset = part.get_content_charset() or 'utf-8'
                        text = payload.decode(charset, errors='replace')
                        if ct == 'text/plain' and not plain:
                            plain = text
                        elif ct == 'text/html' and not html_body:
                            html_body = text
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        charset = msg.get_content_charset() or 'utf-8'
                        ct = msg.get_content_type()
                        if ct == 'text/plain':
                            plain = payload.decode(charset, errors='replace')
                        else:
                            html_body = payload.decode(charset, errors='replace')

                # prefer plain text, fall back to HTML
                if plain:
                    body = plain
                elif html_body:
                    body = html_body

                # clean up the body
                def clean_body(text, is_html=False):
                    if is_html:
                        text = _re.sub(r'<style[^>]*>.*?</style>', '', text, flags=_re.DOTALL)
                        text = _re.sub(r'<script[^>]*>.*?</script>', '', text, flags=_re.DOTALL)
                        text = _re.sub(r'<br\s*/?>','\n', text, flags=_re.I)
                        text = _re.sub(r'</(p|div|tr|li|h[1-6])>', '\n', text, flags=_re.I)
                        text = _re.sub(r'<[^>]+>', '', text)
                        text = _re.sub(r'&nbsp;', ' ', text)
                        text = _re.sub(r'&amp;', '&', text)
                        text = _re.sub(r'&lt;', '<', text)
                        text = _re.sub(r'&gt;', '>', text)
                        text = _re.sub(r'&#\d+;', '', text)
                        text = _re.sub(r'&\w+;', '', text)
                    # decode remaining HTML entities
                    import html as _html
                    text = _html.unescape(text)
                    # remove all URLs (tracking, inline, bracketed)
                    text = _re.sub(r'<https?://[^>]+>', '', text)
                    text = _re.sub(r'\[https?://[^\]]+\]', '', text)
                    text = _re.sub(r'\(https?://[^\)]+\)', '', text)
                    text = _re.sub(r'https?://\S+', '', text)
                    # remove [number] and [text] reference markers
                    text = _re.sub(r'\[\d+\]', '', text)
                    text = _re.sub(r'\[Metronome\]', '', text)
                    # remove invisible/special spacing
                    text = _re.sub(r'[\u200c\u200b\u00a0\u2002\u2003]+', ' ', text)
                    text = _re.sub(r' \u200c ', ' ', text)
                    # remove boilerplate lines
                    boilerplate = [
                        r'^.*View in browser.*$', r'^.*Sign Up.*$', r'^.*Advertise.*$',
                        r'^.*Unsubscribe.*$', r'^.*TOGETHER WITH.*$', r'^.*SPONSOR.*$',
                        r'^.*View Online.*$', r'^.*Read in browser.*$', r'^.*UPGRADE.*$',
                        r'^.*Update your profile.*$', r'^.*email preferences.*$',
                        r'^.*Forward this email.*$', r'^.*Share this newsletter.*$',
                        r'^.*Terms of Service.*$', r'^.*Privacy Policy.*$',
                        r'^.*All rights reserved.*$', r'^.*©.*$',
                        r'^.*basic Subscription.*$', r'^.*Thank you for reading.*$',
                        r'^.*nytimes\.com$', r'^.*bloomberg\.com$',
                    ]
                    lines = text.split('\n')
                    for bp in boilerplate:
                        lines = [l for l in lines if not _re.match(bp, l.strip(), _re.I)]
                    # remove lines that are just whitespace or very short noise
                    lines = [l for l in lines if len(l.strip()) > 1 or l.strip() == '']
                    text = '\n'.join(lines)
                    # collapse whitespace
                    text = _re.sub(r'[ \t]+', ' ', text)
                    text = _re.sub(r'\n[ \t]+', '\n', text)
                    text = _re.sub(r'\n{3,}', '\n\n', text)
                    return text.strip()

                import html as _html
                is_html = not plain and bool(html_body)
                # normalize line endings
                body = body.replace('\r\n', '\n').replace('\r', '\n')
                body = clean_body(body, is_html)
                body = _html.unescape(body)

                # per-newsletter cleaning
                nlid = nl['id']
                # --- per-newsletter cleaning ---
                def dedup_lines(text, min_len=20):
                    lines = text.split('\n')
                    seen = set()
                    out = []
                    for line in lines:
                        key = _re.sub(r'^[\s\-*#>]+', '', line.strip())
                        if key and key in seen and len(key) >= min_len:
                            continue
                        if key:
                            seen.add(key)
                        out.append(line)
                    return '\n'.join(out)

                if nlid == 'money-stuff':
                    # remove the title echo (already in header)
                    body = _re.sub(r'^Money Stuff\s*\n', '', body)
                    body = _re.sub(r'^[A-Z][A-Za-z, .]+\.\s*\n', '', body, count=1)  # subtitle line
                elif nlid == 'dealbook':
                    body = _re.sub(r'^\d{1,3}\s*$', '', body, flags=_re.M)
                    body = _re.sub(r'^DealBook:.*$', '', body, flags=_re.M, count=1)
                elif nlid == 'economist':
                    body = _re.sub(r'^<link.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^The Economist\s*$', '', body, flags=_re.M)
                    body = _re.sub(r'^The Economist Today\s*$', '', body, flags=_re.M)
                    body = _re.sub(r'^Our best journalism.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^.*Senior digital editor.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^Bo Franklin\s*$', '', body, flags=_re.M)
                    body = _re.sub(r'^April \d+.*\d{4}\s*$', '', body, flags=_re.M)
                    # merge fragmented paragraphs: join short lines that don't end with period
                    lines = body.split('\n')
                    merged = []
                    buf = ''
                    for line in lines:
                        line = line.strip()
                        if not line:
                            if buf:
                                merged.append(buf)
                                buf = ''
                            merged.append('')
                        else:
                            if buf:
                                buf += ' ' + line
                            else:
                                buf = line
                            # if line ends with period, question mark, or is very long, flush
                            if line.endswith(('.', '?', '!', '"', '\u201d')) or len(buf) > 300:
                                merged.append(buf)
                                buf = ''
                    if buf:
                        merged.append(buf)
                    body = '\n'.join(merged)
                elif nlid == 'tldr':
                    idx = body.find('HEADLINES & LAUNCHES')
                    if idx > 0:
                        body = body[idx:]
                    body = _re.sub(r'(?si)AI isn.t just upending.*?frameworks\.\s*', '', body)
                    body = _re.sub(r'(?si)THE PODCAST.*?queue\s*', '', body)
                    body = _re.sub(r'(?si)Listen to learn:.*?queue\s*', '', body)
                    body = _re.sub(r'^.*SPONSOR.*$', '', body, flags=_re.M)
                    body = _re.sub(r'\n(?=MINUTE READ\))', ' ', body)
                    body = _re.sub(r'\n(?=READ\))', ' ', body)
                elif nlid in ('endpoints', 'endpoints-pharma', 'endpoints-early'):
                    body = body.replace('\u00ad', '')
                    body = _re.sub(r'Click here to continue reading\s*', '\n\n', body)
                    body = _re.sub(r'^\.\s+', '', body, flags=_re.M)
                    body = _re.sub(r'\s+\d+\s+(?=[A-Z])', '\n\n', body)
                    body = _re.sub(r'^.*Becker Drive.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^.*Privacy and deletion.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^Endpoints Webinars.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^.*help@endpointsnews.*$', '', body, flags=_re.M)
                    body = _re.sub(r'^@\w+\s*$', '', body, flags=_re.M)
                elif nlid == 'latam':
                    body = _re.sub(r'^View this post on the web at\s*$', '', body, flags=_re.M)
                    body = _re.sub(r'\[\s*\]', '', body)
                    # insert blank lines before country/section headers
                    headers = ['More Regional', 'Regional Relations', 'Brazil', 'Mexico',
                               'Venezuela', 'Colombia', 'Argentina', 'Chile', 'Peru', 'Ecuador',
                               'Bolivia', 'Cuba', 'Haiti', 'Migration', 'Culture Corner',
                               'Central America', 'Guatemala', 'Honduras', 'El Salvador',
                               'Nicaragua', 'Panama', 'Costa Rica', 'Dominican Republic',
                               'Paraguay', 'Uruguay', 'Puerto Rico', 'Security', 'Economy']
                    for h in headers:
                        body = _re.sub(r'^(' + _re.escape(h) + r')\s*$', '\n\n\\1', body, flags=_re.M)
                elif nlid == 'athletic':
                    body = _re.sub(r'^.*READ NOW.*$', '', body, flags=_re.M)
                elif nlid == 'gzero':
                    body = _re.sub(r'Dear\s*\n?\s*friend,?\s*\n?', '', body)
                    body = _re.sub(r'^-+\s*$', '', body, flags=_re.M)
                    body = dedup_lines(body)

                # final cleanup for all
                body = _re.sub(r'\n{3,}', '\n\n', body).strip()
                body = body[:12000]

                results.append({
                    'id': nl['id'],
                    'name': nl['name'],
                    'author': nl['author'],
                    'subject': subject,
                    'date': date_str,
                    'body': body,
                })
            except Exception:
                pass

        m.logout()
    except Exception as e:
        return jsonify({'error': str(e)})

    resp = {'newsletters': results}
    _news_cache['ts'] = _time.time()
    _news_cache['data'] = resp
    return jsonify(resp)


_top_cache = {'ts': 0, 'data': None}


@news_bp.route('/api/top')
def top():
    import xml.etree.ElementTree as ET
    from datetime import datetime

    if _top_cache['data'] and _time.time() - _top_cache['ts'] < 300:
        return jsonify(_top_cache['data'])

    feeds = [
        ('DealBook', 'https://rss.nytimes.com/services/xml/rss/nyt/DealBook.xml'),
        ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114'),
        ('MarketWatch', 'https://feeds.marketwatch.com/marketwatch/topstories/'),
        ('FT', 'https://www.ft.com/rss/home'),
        ('WSJ', 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'),
        ('Economist', 'https://www.economist.com/finance-and-economics/rss.xml'),
        ('BBC', 'https://feeds.bbci.co.uk/news/business/rss.xml'),
        ('Axios', 'https://api.axios.com/feed/'),
    ]
    articles = []
    for source, url in feeds:
        try:
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
            if r.status_code != 200:
                continue
            root = ET.fromstring(r.text)
            items = root.findall('.//item')
            for item in items[:15]:
                title = (item.findtext('title') or '').strip()
                link = (item.findtext('link') or '').strip()
                pub = (item.findtext('pubDate') or '').strip()
                desc = (item.findtext('description') or '').strip()
                # clean HTML from description
                import re
                desc = re.sub(r'<[^>]+>', '', desc)[:200]
                # parse date
                iso = ''
                for fmt in ['%a, %d %b %Y %H:%M:%S %z', '%a, %d %b %Y %H:%M:%S %Z',
                            '%a, %d %b %Y %H:%M:%S GMT']:
                    try:
                        dt = datetime.strptime(pub.strip(), fmt)
                        iso = dt.strftime('%Y-%m-%dT%H:%M')
                        break
                    except Exception:
                        continue
                if not iso and pub:
                    iso = pub[:16]
                if title and 'Sign Up' not in title:
                    articles.append({
                        'source': source, 'title': title, 'link': link,
                        'date': iso, 'desc': desc,
                    })
        except Exception:
            pass

    # also fetch Yahoo Finance top news
    try:
        r = requests.get('https://query2.finance.yahoo.com/v1/finance/search?q=stock+market&newsCount=15&quotesCount=0',
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        d = r.json()
        for n in d.get('news', []):
            title = n.get('title', '')
            link = n.get('link', '')
            pub = n.get('providerPublishTime', 0)
            publisher = n.get('publisher', 'Yahoo')
            iso = datetime.utcfromtimestamp(pub).strftime('%Y-%m-%dT%H:%M') if pub else ''
            if title:
                articles.append({
                    'source': publisher, 'title': title, 'link': link,
                    'date': iso, 'desc': '',
                })
    except Exception:
        pass

    # sort by date descending
    articles.sort(key=lambda a: a.get('date', ''), reverse=True)

    resp = {'articles': articles}
    _top_cache['ts'] = _time.time()
    _top_cache['data'] = resp
    return jsonify(resp)
