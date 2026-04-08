from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import requests
import yfinance as yf
import os

# load .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

app = Flask(__name__, static_folder='static')
CORS(app)

YAHOO_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search'

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/quotes', methods=['POST'])
def quotes():
    tickers = request.json.get('tickers', [])
    results = {}
    try:
        hist = yf.download(tickers, period='3mo', interval='1d', progress=False)
        if hist.empty:
            return jsonify(results)
        for t in tickers:
            try:
                close = hist['Close'][t].dropna()
                vol = hist['Volume'][t].dropna()
                high_s = hist['High'][t].dropna()
                low_s = hist['Low'][t].dropna()
                if close.empty or len(close) < 2:
                    continue
                last = float(close.iloc[-1])
                prev = float(close.iloc[-2])
                d = round(last - prev, 2)
                dp = round((d / prev) * 100, 3)
                results[t] = {
                    'c': round(last, 2),
                    'd': d,
                    'dp': dp,
                    'h': round(float(high_s.iloc[-1]), 2),
                    'l': round(float(low_s.iloc[-1]), 2),
                    'pc': round(prev, 2),
                    'v': int(vol.iloc[-1]) if not vol.empty else 0,
                    'p5d': round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None,
                    'p1m': round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None,
                    'p3m': round(((last / float(close.iloc[0])) - 1) * 100, 2),
                }
            except Exception:
                pass
    except Exception as e:
        return jsonify({'error': str(e)})
    return jsonify(results)

@app.route('/api/quote/<ticker>')
def quote(ticker):
    try:
        df = yf.download(ticker, period='5d', interval='1d', progress=False)
        if hasattr(df.columns, 'droplevel'):
            try: df = df.droplevel('Ticker', axis=1)
            except (KeyError, ValueError): pass
        if df.empty or len(df) < 2:
            return jsonify({'error': 'no data'})
        last = float(df['Close'].iloc[-1])
        prev = float(df['Close'].iloc[-2])
        d = round(last - prev, 2)
        return jsonify({
            'c': round(last, 2),
            'd': d,
            'dp': round((d / prev) * 100, 3),
            'h': round(float(df['High'].iloc[-1]), 2),
            'l': round(float(df['Low'].iloc[-1]), 2),
            'pc': round(prev, 2),
            'v': int(df['Volume'].iloc[-1]),
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/candles/<ticker>')
def candles(ticker):
    p = request.args.get('p', '3m')
    start = request.args.get('start')  # YYYY-MM-DD
    end = request.args.get('end')      # YYYY-MM-DD

    if start and end:
        # custom date range - pick interval based on span
        from datetime import datetime
        d0 = datetime.strptime(start, '%Y-%m-%d')
        d1 = datetime.strptime(end, '%Y-%m-%d')
        span = (d1 - d0).days
        if span <= 5:
            interval = '5m'
        elif span <= 60:
            interval = '1h'
        elif span <= 730:
            interval = '1d'
        else:
            interval = '1wk'
        try:
            df = yf.download(ticker, start=start, end=end, interval=interval, progress=False)
            if df.empty:
                return jsonify({'s': 'no_data'})
            if hasattr(df.columns, 'droplevel'):
                try: df = df.droplevel('Ticker', axis=1)
                except (KeyError, ValueError): pass
            df = df.dropna(subset=['Close'])
            return jsonify({
                'c': df['Close'].tolist(), 'o': df['Open'].tolist(),
                'h': df['High'].tolist(), 'l': df['Low'].tolist(),
                'v': [int(x) if x == x else 0 for x in df['Volume'].tolist()],
                't': [int(ts.timestamp()) for ts in df.index], 's': 'ok'
            })
        except Exception as e:
            return jsonify({'s': 'no_data', 'error': str(e)})

    period_config = {
        '1d':  ('1d',  '1m'),
        '3d':  ('5d',  '5m'),
        '1w':  ('5d',  '5m'),
        '1m':  ('1mo', '1h'),
        '3m':  ('3mo', '1d'),
        '6m':  ('6mo', '1d'),
        '1y':  ('1y',  '1d'),
        '5y':  ('5y',  '1wk'),
        'max': ('max', '1wk'),
    }
    yf_period, yf_interval = period_config.get(p, ('3mo', '1d'))
    try:
        df = yf.download(ticker, period=yf_period, interval=yf_interval, progress=False)
        if df.empty:
            return jsonify({'s': 'no_data'})
        if p == '3d' and len(df) > 0:
            dates = df.index.normalize().unique()
            if len(dates) > 3:
                df = df[df.index >= dates[-3]]
        if hasattr(df.columns, 'droplevel'):
            try: df = df.droplevel('Ticker', axis=1)
            except (KeyError, ValueError): pass
        df = df.dropna(subset=['Close'])
        return jsonify({
            'c': df['Close'].tolist(), 'o': df['Open'].tolist(),
            'h': df['High'].tolist(), 'l': df['Low'].tolist(),
            'v': [int(x) if x == x else 0 for x in df['Volume'].tolist()],
            't': [int(ts.timestamp()) for ts in df.index], 's': 'ok'
        })
    except Exception as e:
        return jsonify({'s': 'no_data', 'error': str(e)})

@app.route('/api/wirp')
def wirp():
    cb = request.args.get('cb', 'fed')
    if cb == 'boj':
        return wirp_boj()
    return wirp_fed()

def wirp_fed():
    from datetime import datetime, date
    fomc_meetings = [
        ('2026-05-06', 'May 2026'),
        ('2026-06-17', 'Jun 2026'),
        ('2026-07-29', 'Jul 2026'),
        ('2026-09-16', 'Sep 2026'),
        ('2026-10-28', 'Oct 2026'),
        ('2026-12-16', 'Dec 2026'),
        ('2027-01-27', 'Jan 2027'),
        ('2027-03-17', 'Mar 2027'),
        ('2027-05-05', 'May 2027'),
        ('2027-06-16', 'Jun 2027'),
        ('2027-07-28', 'Jul 2027'),
        ('2027-09-15', 'Sep 2027'),
        ('2027-10-27', 'Oct 2027'),
        ('2027-12-15', 'Dec 2027'),
    ]
    mcodes = {1:'F',2:'G',3:'H',4:'J',5:'K',6:'M',7:'N',8:'Q',9:'U',10:'V',11:'X',12:'Z'}
    today = date.today()
    current_ticker = f'ZQ{mcodes[today.month]}{str(today.year)[2:]}.CBT'
    current_rate = None
    try:
        t = yf.Ticker(current_ticker)
        p = t.fast_info.get('lastPrice') or t.fast_info.get('previousClose')
        if p and p > 0:
            current_rate = round(100 - p, 4)
    except Exception:
        pass
    if current_rate is None:
        for offset in range(1, 4):
            m = (today.month + offset - 1) % 12 + 1
            y = today.year + (1 if today.month + offset > 12 else 0)
            try:
                t = yf.Ticker(f'ZQ{mcodes[m]}{str(y)[2:]}.CBT')
                p = t.fast_info.get('lastPrice') or t.fast_info.get('previousClose')
                if p and p > 0:
                    current_rate = round(100 - p, 4)
                    break
            except Exception:
                continue
    if current_rate is None:
        return jsonify({'error': 'Could not determine current rate'})

    meetings = []
    for meeting_date, label in fomc_meetings:
        md = datetime.strptime(meeting_date, '%Y-%m-%d').date()
        if md <= today:
            continue
        next_m = md.month % 12 + 1
        next_y = md.year + (1 if md.month == 12 else 0)
        ticker = f'ZQ{mcodes[next_m]}{str(next_y)[2:]}.CBT'
        try:
            t = yf.Ticker(ticker)
            p = t.fast_info.get('lastPrice') or t.fast_info.get('previousClose')
            if p and p > 0:
                implied = round(100 - p, 4)
                cuts_25bp = round((current_rate - implied) / 0.25, 2)
                meetings.append({
                    'date': meeting_date, 'label': label, 'ticker': ticker,
                    'implied_rate': implied, 'cuts': cuts_25bp,
                })
        except Exception:
            pass

    return jsonify({
        'cb': 'fed', 'name': 'Federal Reserve (FOMC)',
        'currency': 'USD', 'step_bp': 25,
        'current_rate': current_rate, 'meetings': meetings,
    })

def wirp_boj():
    from datetime import datetime, date
    # BoJ Monetary Policy Meeting dates 2026-2027
    boj_meetings = [
        ('2026-05-01', 'May 2026'),
        ('2026-06-13', 'Jun 2026'),
        ('2026-07-17', 'Jul 2026'),
        ('2026-09-18', 'Sep 2026'),
        ('2026-10-30', 'Oct 2026'),
        ('2026-12-18', 'Dec 2026'),
        ('2027-01-22', 'Jan 2027'),
        ('2027-03-16', 'Mar 2027'),
        ('2027-04-28', 'Apr 2027'),
        ('2027-06-15', 'Jun 2027'),
        ('2027-07-16', 'Jul 2027'),
        ('2027-09-17', 'Sep 2027'),
    ]
    # TONA 3M quarterly futures: H=Mar, M=Jun, U=Sep, Z=Dec
    # map each meeting to the next quarterly contract after it
    q_codes = [(3,'H'),(6,'M'),(9,'U'),(12,'Z')]
    today = date.today()

    # current rate from nearest TONA contract
    current_rate = None
    for qm, qc in q_codes:
        for yr in [26, 27]:
            ticker = f'TONA-{qc}{yr}.SI'
            try:
                t = yf.Ticker(ticker)
                p = t.fast_info.get('lastPrice') or t.fast_info.get('previousClose')
                if p and p > 0:
                    current_rate = round(100 - p, 4)
                    break
            except Exception:
                continue
        if current_rate is not None:
            break

    if current_rate is None:
        return jsonify({'error': 'Could not determine current BoJ rate'})

    def next_quarterly(md):
        """Find the next quarterly TONA contract after a meeting date."""
        for qm, qc in q_codes:
            if md.month <= qm:
                yr = md.year
                return f'TONA-{qc}{str(yr)[2:]}.SI', qm, yr
        # wrap to next year Q1
        return f'TONA-H{str(md.year+1)[2:]}.SI', 3, md.year+1

    meetings = []
    for meeting_date, label in boj_meetings:
        md = datetime.strptime(meeting_date, '%Y-%m-%d').date()
        if md <= today:
            continue
        ticker, _, _ = next_quarterly(md)
        try:
            t = yf.Ticker(ticker)
            p = t.fast_info.get('lastPrice') or t.fast_info.get('previousClose')
            if p and p > 0:
                implied = round(100 - p, 4)
                # BoJ typically moves in 10bp or 25bp increments
                hikes_10bp = round((implied - current_rate) / 0.10, 2)
                meetings.append({
                    'date': meeting_date, 'label': label, 'ticker': ticker,
                    'implied_rate': implied, 'cuts': round((current_rate - implied) / 0.10, 2),
                })
        except Exception:
            pass

    return jsonify({
        'cb': 'boj', 'name': 'Bank of Japan (BoJ)',
        'currency': 'JPY', 'step_bp': 10,
        'current_rate': current_rate, 'meetings': meetings,
    })

_wei_cache = {'ts': 0, 'data': None}

@app.route('/api/wei')
def wei():
    import time as _time
    if _wei_cache['data'] and _time.time() - _wei_cache['ts'] < 15:
        return jsonify(_wei_cache['data'])

    indices = [
        # region, ticker, name
        ('US', '^GSPC', 'S&P 500'), ('US', '^DJI', 'Dow Jones'), ('US', '^IXIC', 'NASDAQ'),
        ('US', '^RUT', 'Russell 2000'), ('US', '^VIX', 'VIX'),
        ('Europe', '^STOXX50E', 'Euro Stoxx 50'), ('Europe', '^FTSE', 'FTSE 100'),
        ('Europe', '^GDAXI', 'DAX'), ('Europe', '^FCHI', 'CAC 40'), ('Europe', '^IBEX', 'IBEX 35'),
        ('Asia', '^N225', 'Nikkei 225'), ('Asia', '^HSI', 'Hang Seng'),
        ('Asia', '000001.SS', 'Shanghai Composite'), ('Asia', '^KS11', 'KOSPI'),
        ('Asia', '^BSESN', 'Sensex'), ('Asia', '^AXJO', 'ASX 200'),
        ('Americas', '^BVSP', 'Bovespa'), ('Americas', '^MXX', 'IPC Mexico'),
        ('Americas', '^GSPTSE', 'TSX Canada'),
    ]
    tickers = [t for _, t, _ in indices]
    results = []
    try:
        hist = yf.download(tickers, period='1y', interval='1d', progress=False)
        if hist.empty:
            return jsonify({'error': 'No data'})
        # fetch live intraday prices for currently-open markets
        live_prices = {}
        try:
            intra = yf.download(tickers, period='1d', interval='1m', progress=False)
            if not intra.empty:
                for t in tickers:
                    try:
                        c = intra['Close'][t].dropna()
                        if not c.empty:
                            live_prices[t] = float(c.iloc[-1])
                    except Exception:
                        pass
        except Exception:
            pass

        for region, ticker, name in indices:
            try:
                close = hist['Close'][ticker].dropna()
                high_s = hist['High'][ticker].dropna()
                low_s = hist['Low'][ticker].dropna()
                if close.empty or len(close) < 2:
                    continue
                last = live_prices.get(ticker, float(close.iloc[-1]))
                prev = float(close.iloc[-2])
                d = round(last - prev, 2)
                dp = round((d / prev) * 100, 3)

                # period returns
                p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
                p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
                p3m = round(((last / float(close.iloc[-66])) - 1) * 100, 2) if len(close) >= 66 else None

                # YTD
                yr = close.index[-1].year
                ytd_data = close[close.index.year == yr]
                ytd = round(((last / float(ytd_data.iloc[0])) - 1) * 100, 2) if len(ytd_data) > 1 else None
                ytd_high_data = high_s[high_s.index.year == yr]
                ytd_low_data = low_s[low_s.index.year == yr]
                ytd_high = round(float(ytd_high_data.max()), 2) if not ytd_high_data.empty else None
                ytd_low = round(float(ytd_low_data.min()), 2) if not ytd_low_data.empty else None

                # RSI 9 and 14
                def calc_rsi(closes, period):
                    if len(closes) < period + 1:
                        return None
                    g = l = 0
                    for i in range(len(closes) - period, len(closes)):
                        dd = closes[i] - closes[i - 1]
                        if dd > 0: g += dd
                        else: l += abs(dd)
                    ag, al = g / period, l / period
                    if al == 0: return 100
                    return round(100 - (100 / (1 + ag / al)), 1)

                c_list = close.tolist()
                rsi9 = calc_rsi(c_list, 9)
                rsi14 = calc_rsi(c_list, 14)

                results.append({
                    'region': region, 'ticker': ticker, 'name': name,
                    'c': round(last, 2), 'd': d, 'dp': dp,
                    'p5d': p5d, 'p1m': p1m, 'p3m': p3m, 'ytd': ytd,
                    'ytd_high': ytd_high, 'ytd_low': ytd_low,
                    'rsi9': rsi9, 'rsi14': rsi14,
                })
            except Exception:
                pass
    except Exception as e:
        return jsonify({'error': str(e)})

    resp = {'indices': results}
    _wei_cache['ts'] = _time.time()
    _wei_cache['data'] = resp
    return jsonify(resp)

_weif_cache = {'ts': 0, 'data': None}

@app.route('/api/weif')
def weif():
    import time as _time
    if _weif_cache['data'] and _time.time() - _weif_cache['ts'] < 15:
        return jsonify(_weif_cache['data'])

    futures = [
        ('US', 'ES=F', 'E-mini S&P 500'),
        ('US', 'NQ=F', 'E-mini NASDAQ 100'),
        ('US', 'YM=F', 'E-mini Dow'),
        ('US', 'RTY=F', 'E-mini Russell 2000'),
        ('Japan', 'NIY=F', 'Nikkei 225 (JPY)'),
        ('Japan', 'NKD=F', 'Nikkei 225 (USD)'),
        ('Global', 'EEM=F', 'MSCI Emerging Mkts'),
    ]
    tickers = [t for _, t, _ in futures]
    results = []
    try:
        hist = yf.download(tickers, period='1y', interval='1d', progress=False)
        if hist.empty:
            return jsonify({'error': 'No data'})
        for region, ticker, name in futures:
            try:
                close = hist['Close'][ticker].dropna()
                high_s = hist['High'][ticker].dropna()
                low_s = hist['Low'][ticker].dropna()
                if close.empty or len(close) < 2:
                    continue
                last = float(close.iloc[-1])
                prev = float(close.iloc[-2])
                d = round(last - prev, 2)
                dp = round((d / prev) * 100, 3)
                p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
                p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
                p3m = round(((last / float(close.iloc[-66])) - 1) * 100, 2) if len(close) >= 66 else None
                yr = close.index[-1].year
                ytd_data = close[close.index.year == yr]
                ytd = round(((last / float(ytd_data.iloc[0])) - 1) * 100, 2) if len(ytd_data) > 1 else None
                ytd_high_data = high_s[high_s.index.year == yr]
                ytd_low_data = low_s[low_s.index.year == yr]
                ytd_high = round(float(ytd_high_data.max()), 2) if not ytd_high_data.empty else None
                ytd_low = round(float(ytd_low_data.min()), 2) if not ytd_low_data.empty else None
                def calc_rsi(closes, period):
                    if len(closes) < period + 1: return None
                    g = l = 0
                    for i in range(len(closes) - period, len(closes)):
                        dd = closes[i] - closes[i - 1]
                        if dd > 0: g += dd
                        else: l += abs(dd)
                    ag, al = g / period, l / period
                    if al == 0: return 100
                    return round(100 - (100 / (1 + ag / al)), 1)
                c_list = close.tolist()
                results.append({
                    'region': region, 'ticker': ticker, 'name': name,
                    'c': round(last, 2), 'd': d, 'dp': dp,
                    'p5d': p5d, 'p1m': p1m, 'p3m': p3m, 'ytd': ytd,
                    'ytd_high': ytd_high, 'ytd_low': ytd_low,
                    'rsi9': calc_rsi(c_list, 9), 'rsi14': calc_rsi(c_list, 14),
                })
            except Exception:
                pass
    except Exception as e:
        return jsonify({'error': str(e)})
    resp = {'futures': results}
    _weif_cache['ts'] = _time.time()
    _weif_cache['data'] = resp
    return jsonify(resp)

_news_cache = {'ts': 0, 'data': None}

@app.route('/api/news')
def news():
    import imaplib
    import email as _email
    from email.header import decode_header
    import re as _re
    import time as _time
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
                    text = _re.sub(r' ‌ ', ' ', text)
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

@app.route('/api/top')
def top():
    import xml.etree.ElementTree as ET
    from datetime import datetime
    import time as _time

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

@app.route('/api/chat', methods=['POST'])
def chat():
    from flask import Response, stream_with_context
    import anthropic

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'Anthropic API key not configured'})

    messages = request.json.get('messages', [])
    if not messages:
        return jsonify({'error': 'No messages'})

    client = anthropic.Anthropic(api_key=api_key)

    # gather live market context
    market_context = ""
    try:
        # quick snapshot of key indices and FX
        snapshot_tickers = ['^GSPC','^DJI','^IXIC','^VIX','^N225','^HSI','^STOXX50E',
                           'EURUSD=X','USDJPY=X','GC=F','CL=F','BTC-USD','ES=F','NQ=F']
        snap = yf.download(snapshot_tickers, period='5d', interval='1d', progress=False)
        if not snap.empty:
            lines = []
            for t in snapshot_tickers:
                try:
                    c = snap['Close'][t].dropna()
                    if len(c) >= 2:
                        last = float(c.iloc[-1])
                        prev = float(c.iloc[-2])
                        chg = round(((last - prev) / prev) * 100, 2)
                        name = t.replace('^','').replace('=X','').replace('=F','')
                        lines.append(f"{name}: {last:.2f} ({'+' if chg>=0 else ''}{chg}%)")
                except: pass
            if lines:
                market_context = "\n\nLIVE MARKET DATA (as of now):\n" + "\n".join(lines)
    except: pass

    # get today's top headlines
    news_context = ""
    try:
        import xml.etree.ElementTree as _ET
        r = requests.get('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        if r.status_code == 200:
            root = _ET.fromstring(r.text)
            headlines = [item.findtext('title','') for item in root.findall('.//item')[:5]]
            if headlines:
                news_context = "\n\nTODAY'S TOP HEADLINES:\n" + "\n".join(f"- {h}" for h in headlines)
    except: pass

    system = f"""You are a general-purpose AI chatbot. Answer any question the user asks - markets, finance, science, history, coding, life advice, whatever. Be helpful, clear, and concise. If market data is relevant, here's a live snapshot:
{market_context}{news_context}"""

    def generate():
        try:
            with client.messages.stream(
                model='claude-sonnet-4-20250514',
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    # escape newlines so SSE doesn't break
                    escaped = text.replace('\n', '\\n')
                    yield f"data: {escaped}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

_fit_cache = {'ts': 0, 'data': None}

@app.route('/api/fit')
def fit():
    import time as _time
    if _fit_cache['data'] and _time.time() - _fit_cache['ts'] < 15:
        return jsonify(_fit_cache['data'])

    yields_tickers = ['^IRX', '^FVX', '^TNX', '^TYX']
    futures_tickers = ['ZT=F', 'ZF=F', 'ZN=F', 'ZB=F', 'UB=F']
    etf_tickers = ['SHV', 'SHY', 'IEI', 'IEF', 'TLT']
    all_tickers = yields_tickers + futures_tickers + etf_tickers

    yields_meta = {
        '^IRX': {'name': '3-Month T-Bill', 'tenor': '3M', 'months': 3},
        '^FVX': {'name': '5-Year Note', 'tenor': '5Y', 'months': 60},
        '^TNX': {'name': '10-Year Note', 'tenor': '10Y', 'months': 120},
        '^TYX': {'name': '30-Year Bond', 'tenor': '30Y', 'months': 360},
    }
    futures_meta = {
        'ZT=F': {'name': '2-Year Note Futures', 'tenor': '2Y'},
        'ZF=F': {'name': '5-Year Note Futures', 'tenor': '5Y'},
        'ZN=F': {'name': '10-Year Note Futures', 'tenor': '10Y'},
        'ZB=F': {'name': '30-Year Bond Futures', 'tenor': '30Y'},
        'UB=F': {'name': 'Ultra Bond Futures', 'tenor': 'Ultra'},
    }
    etf_meta = {
        'SHV': {'name': 'Short Treasury ETF', 'tenor': '0-1Y'},
        'SHY': {'name': '1-3 Year Treasury ETF', 'tenor': '1-3Y'},
        'IEI': {'name': '3-7 Year Treasury ETF', 'tenor': '3-7Y'},
        'IEF': {'name': '7-10 Year Treasury ETF', 'tenor': '7-10Y'},
        'TLT': {'name': '20+ Year Treasury ETF', 'tenor': '20+Y'},
    }

    try:
        hist = yf.download(all_tickers, period='3mo', interval='1d', progress=False)
        live = {}
        try:
            intra = yf.download(all_tickers, period='1d', interval='1m', progress=False)
            if not intra.empty:
                for t in all_tickers:
                    try:
                        c = intra['Close'][t].dropna()
                        if not c.empty:
                            live[t] = float(c.iloc[-1])
                    except: pass
        except: pass

        if hist.empty:
            return jsonify({'error': 'No data'})

        def build_item(ticker, meta, group):
            try:
                close = hist['Close'][ticker].dropna()
                if close.empty or len(close) < 2:
                    return None
                last = live.get(ticker, float(close.iloc[-1]))
                prev = float(close.iloc[-2])
                d = round(last - prev, 3)
                dp = round((d / prev) * 100, 3) if prev else 0
                p5d = round(last - float(close.iloc[-6]), 3) if len(close) >= 6 else None
                p1m = round(last - float(close.iloc[-22]), 3) if len(close) >= 22 else None
                p3m = round(last - float(close.iloc[0]), 3) if len(close) >= 2 else None
                return {
                    'ticker': ticker, 'group': group,
                    'name': meta['name'], 'tenor': meta['tenor'],
                    'c': round(last, 3), 'd': d, 'dp': dp,
                    'p5d': p5d, 'p1m': p1m, 'p3m': p3m,
                }
            except:
                return None

        yields_data = []
        for t in yields_tickers:
            item = build_item(t, yields_meta[t], 'yields')
            if item:
                yields_data.append(item)

        futures_data = []
        for t in futures_tickers:
            item = build_item(t, futures_meta[t], 'futures')
            if item:
                futures_data.append(item)

        etf_data = []
        for t in etf_tickers:
            item = build_item(t, etf_meta[t], 'etfs')
            if item:
                etf_data.append(item)

        # yield curve data points
        curve = []
        for t in yields_tickers:
            m = yields_meta[t]
            item = next((y for y in yields_data if y['ticker'] == t), None)
            if item:
                curve.append({'tenor': m['tenor'], 'months': m['months'], 'yield': item['c']})

        resp = {'yields': yields_data, 'futures': futures_data, 'etfs': etf_data, 'curve': curve}
        _fit_cache['ts'] = _time.time()
        _fit_cache['data'] = resp
        return jsonify(resp)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/pred')
def pred():
    import ast
    cat = request.args.get('cat', '')
    limit = int(request.args.get('limit', 30))
    try:
        params = {'limit': 100, 'active': 'true', 'order': 'volume24hr', 'ascending': 'false'}
        if cat:
            params['tag'] = cat
        r = requests.get('https://gamma-api.polymarket.com/markets', params=params,
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        raw = r.json()
        markets = []
        for m in raw:
            outcomes = m.get('outcomes', '[]')
            prices = m.get('outcomePrices', '[]')
            if isinstance(outcomes, str):
                try: outcomes = ast.literal_eval(outcomes)
                except: outcomes = []
            if isinstance(prices, str):
                try: prices = ast.literal_eval(prices)
                except: prices = []
            token_ids = m.get('clobTokenIds', '[]')
            if isinstance(token_ids, str):
                try: token_ids = ast.literal_eval(token_ids)
                except: token_ids = []
                # classify by keyword
            q = m.get('question', '').lower()
            if any(w in q for w in ['iran','israel','war','military','invade','ceasefire','regime','strait','kharg','strike','conflict']):
                category = 'Geopolitics'
            elif any(w in q for w in ['fed ','interest rate','bps','rate ']):
                category = 'Rates & Macro'
            elif any(w in q for w in ['bitcoin','btc','eth','crypto','solana']):
                category = 'Crypto'
            elif any(w in q for w in ['oil','wti','crude','commodity','gold']):
                category = 'Commodities'
            elif any(w in q for w in ['trump','president','election','democrat','republican','nomination','governor','prime minister','confirm','congress','senate']):
                category = 'Politics'
            elif any(w in q for w in ['fifa','nba','nfl','win on','world cup','tennis','masters','lol:','counter-strike','fc ','champions','league','game 1','game 2','bo3']):
                category = 'Sports'
            else:
                category = 'Other'

            markets.append({
                'id': m.get('id'),
                'question': m.get('question', ''),
                'category': category,
                'slug': m.get('slug', ''),
                'outcomes': outcomes,
                'prices': [float(p) for p in prices] if prices else [],
                'volume24h': m.get('volume24hr', 0),
                'volume': m.get('volumeNum', 0),
                'liquidity': m.get('liquidityNum', 0),
                'endDate': m.get('endDateIso', ''),
                'image': m.get('image', ''),
                'oneDayChange': m.get('oneDayPriceChange', 0),
                'oneWeekChange': m.get('oneWeekPriceChange', 0),
                'tokenIds': token_ids,
            })
        return jsonify({'markets': markets})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/pred/events')
def pred_events():
    try:
        r = requests.get('https://gamma-api.polymarket.com/events',
            params={'limit': 20, 'active': 'true', 'order': 'volume24hr', 'ascending': 'false'},
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        raw = r.json()
        events = []
        for e in raw:
            events.append({
                'id': e.get('id'),
                'title': e.get('title', ''),
                'category': e.get('category', ''),
                'marketCount': len(e.get('markets', [])),
                'volume': e.get('volume', 0),
                'image': e.get('image', ''),
            })
        return jsonify({'events': events})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/pred/history/<token_id>')
def pred_history(token_id):
    try:
        r = requests.get(f'https://clob.polymarket.com/prices-history',
            params={'market': token_id, 'interval': 'max', 'fidelity': 120},
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        data = r.json()
        history = data.get('history', [])
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/hs')
def hs():
    tickers_str = request.args.get('tickers', '')
    p = request.args.get('p', '1y')
    tickers = [t.strip() for t in tickers_str.split(',') if t.strip()]
    if not tickers:
        return jsonify({'error': 'No tickers provided'})

    period_map = {
        '1m': '1mo', '3m': '3mo', '6m': '6mo',
        '1y': '1y', '2y': '2y', '5y': '5y', 'max': 'max',
    }
    yf_period = period_map.get(p, '1y')
    try:
        df = yf.download(tickers, period=yf_period, interval='1d', progress=False)
        if df.empty:
            return jsonify({'error': 'No data'})
        result = {'tickers': tickers, 'period': p, 'series': {}}
        # get close prices for each ticker, align on common dates
        closes = {}
        for t in tickers:
            try:
                c = df['Close'][t].dropna() if len(tickers) > 1 else df['Close'].dropna()
                if not c.empty:
                    closes[t] = c
            except:
                pass
        if not closes:
            return jsonify({'error': 'No price data'})
        # align to common dates
        import pandas as pd
        aligned = pd.DataFrame(closes).dropna()
        if aligned.empty:
            return jsonify({'error': 'No overlapping dates'})
        timestamps = [int(ts.timestamp()) for ts in aligned.index]
        for t in aligned.columns:
            raw = aligned[t].tolist()
            base = raw[0]
            norm = [round((v / base) * 100, 2) for v in raw]
            result['series'][t] = {'raw': [round(v, 4) for v in raw], 'norm': norm}
        result['timestamps'] = timestamps
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/cn/<ticker>')
def cn(ticker):
    import re as _re
    try:
        t = yf.Ticker(ticker)
        news = t.news or []
        articles = []
        for n in news:
            c = n.get('content') or {}
            title = c.get('title', '')
            if not title:
                continue
            prov = c.get('provider') or {}
            provider = prov.get('displayName', '') if isinstance(prov, dict) else ''
            pub = c.get('pubDate', '')
            ctu = c.get('clickThroughUrl') or {}
            url = ctu.get('url', '') if isinstance(ctu, dict) else ''
            summary = c.get('summary', '') or ''
            summary = _re.sub(r'<[^>]+>', '', summary)[:300]
            articles.append({
                'title': title, 'source': provider, 'date': pub,
                'url': url, 'summary': summary,
            })
        return jsonify({'ticker': ticker, 'articles': articles})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/des/<ticker>')
def des(ticker):
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        def g(k): return info.get(k)
        return jsonify({
            'ticker': ticker,
            'name': g('longName') or g('shortName') or ticker,
            'sector': g('sector'), 'industry': g('industry'),
            'description': g('longBusinessSummary') or '',
            'website': g('website'), 'city': g('city'), 'state': g('state'),
            'country': g('country'), 'employees': g('fullTimeEmployees'),
            'marketCap': g('marketCap'), 'exchange': g('exchange'),
            'currency': g('currency'), 'quoteType': g('quoteType'),
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/evt/<ticker>')
def evt(ticker):
    try:
        t = yf.Ticker(ticker)
        cal = t.calendar
        earnings = {}
        if cal is not None:
            if isinstance(cal, dict):
                earnings = {k: str(v) for k, v in cal.items()}
            else:
                earnings = cal.to_dict() if hasattr(cal, 'to_dict') else {}
        # upcoming earnings
        info = t.info or {}
        result = {
            'ticker': ticker,
            'name': info.get('longName') or info.get('shortName') or ticker,
            'earningsDate': None,
            'exDividendDate': str(info.get('exDividendDate', '')) if info.get('exDividendDate') else None,
            'dividendDate': str(info.get('dividendDate', '')) if info.get('dividendDate') else None,
            'calendar': earnings,
        }
        # earnings dates
        ed = info.get('earningsTimestamp') or info.get('earningsTimestampStart')
        if ed:
            from datetime import datetime
            result['earningsDate'] = datetime.utcfromtimestamp(ed).strftime('%Y-%m-%d')
        # earnings history
        try:
            eh = t.earnings_dates
            if eh is not None and not eh.empty:
                hist = []
                for idx, row in eh.head(8).iterrows():
                    hist.append({
                        'date': str(idx.date()) if hasattr(idx, 'date') else str(idx),
                        'epsEstimate': float(row.get('EPS Estimate', 0)) if row.get('EPS Estimate') == row.get('EPS Estimate') else None,
                        'epsActual': float(row.get('Reported EPS', 0)) if row.get('Reported EPS') == row.get('Reported EPS') else None,
                        'surprise': float(row.get('Surprise(%)', 0)) if row.get('Surprise(%)') == row.get('Surprise(%)') else None,
                    })
                result['earningsHistory'] = hist
        except: pass
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/fa/<ticker>')
def fa(ticker):
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        # key ratios
        def g(k):
            v = info.get(k)
            if v is None: return None
            return v

        ratios = {
            'name': g('longName') or g('shortName') or ticker,
            'sector': g('sector'), 'industry': g('industry'),
            'marketCap': g('marketCap'), 'employees': g('fullTimeEmployees'),
            'trailingPE': g('trailingPE'), 'forwardPE': g('forwardPE'),
            'priceToBook': g('priceToBook'), 'priceToSales': g('priceToSalesTrailing12Months'),
            'evToEbitda': g('enterpriseToEbitda'), 'evToRevenue': g('enterpriseToRevenue'),
            'dividendYield': g('dividendYield'),
            'revenueGrowth': g('revenueGrowth'), 'earningsGrowth': g('earningsGrowth'),
            'profitMargins': g('profitMargins'), 'operatingMargins': g('operatingMargins'),
            'grossMargins': g('grossMargins'),
            'returnOnEquity': g('returnOnEquity'), 'returnOnAssets': g('returnOnAssets'),
            'debtToEquity': g('debtToEquity'),
            'currentRatio': g('currentRatio'), 'quickRatio': g('quickRatio'),
            'freeCashflow': g('freeCashflow'),
            'totalRevenue': g('totalRevenue'), 'ebitda': g('ebitda'),
            'netIncome': g('netIncomeToCommon'),
            'totalDebt': g('totalDebt'), 'totalCash': g('totalCash'),
            'beta': g('beta'),
            'fiftyTwoWeekHigh': g('fiftyTwoWeekHigh'), 'fiftyTwoWeekLow': g('fiftyTwoWeekLow'),
        }

        # financial statements
        def stmt_to_dict(df):
            if df is None or df.empty:
                return {}
            result = {}
            cols = [str(c.date()) for c in df.columns[:4]]
            for row in df.index:
                vals = []
                for c in df.columns[:4]:
                    v = df.loc[row, c]
                    if v != v:  # NaN
                        vals.append(None)
                    else:
                        vals.append(float(v))
                result[row] = vals
            return {'dates': cols, 'data': result}

        income = stmt_to_dict(t.financials)
        balance = stmt_to_dict(t.balance_sheet)
        cashflow = stmt_to_dict(t.cashflow)

        return jsonify({
            'ticker': ticker, 'ratios': ratios,
            'income': income, 'balance': balance, 'cashflow': cashflow,
        })
    except Exception as e:
        return jsonify({'error': str(e)})

_heat_cache = {}

@app.route('/api/heat')
def heat():
    import time as _time
    idx = request.args.get('idx', 'sp500')

    if idx in _heat_cache and _time.time() - _heat_cache[idx]['ts'] < 30:
        return jsonify(_heat_cache[idx]['data'])

    indices = {
        'sp500': {
            'name': 'S&P 500',
            'sectors': {
                'Technology': ['AAPL','MSFT','NVDA','AVGO','CRM','ADBE','CSCO','ACN','ORCL','INTC','AMD','AMAT','LRCX','KLAC','SNPS','CDNS','NOW','PLTR','PANW','CRWD'],
                'Financials': ['BRK-B','JPM','V','MA','BAC','GS','MS','SPGI','BLK','AXP','C','WFC','SCHW','CB','MMC','PGR','AIG','MET','TFC','USB'],
                'Healthcare': ['UNH','JNJ','LLY','ABT','PFE','TMO','MRK','ABBV','DHR','AMGN','ISRG','VRTX','GILD','REGN','BSX','MDT','SYK','CI','ELV','HCA'],
                'Energy': ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HES','DVN','HAL','FANG','KMI','WMB','BKR','CTRA','MRO','OVV','APA'],
                'Comm Services': ['META','GOOG','NFLX','DIS','CMCSA','T','VZ','TMUS','EA','TTWO','CHTR','WBD','LYV','MTCH','PARA','OMC','IPG','FOXA'],
                'Industrials': ['GE','CAT','UNP','RTX','HON','BA','DE','LMT','UPS','MMM','GD','NOC','WM','ETN','ITW','EMR','CARR','FDX','CSX','NSC'],
                'Cons Discretionary': ['AMZN','TSLA','HD','MCD','NKE','LOW','SBUX','TJX','BKNG','ORLY','MAR','HLT','CMG','ROST','DHI','LEN','GM','F','YUM','DPZ'],
                'Cons Staples': ['PG','KO','PEP','COST','WMT','PM','MO','CL','MDLZ','KHC','GIS','HSY','SJM','K','CLX','CHD','MKC','TSN','CAG','KR'],
                'Real Estate': ['PLD','AMT','EQIX','SPG','O','PSA','DLR','WELL','AVB','EQR','VICI','IRM','SBAC','WY','MAA','UDR','KIM','REG','CPT','ESS'],
                'Utilities': ['NEE','SO','DUK','CEG','SRE','AEP','D','EXC','XEL','WEC','ED','AWK','ES','DTE','FE','PPL','CMS','EVRG','ATO','NI'],
                'Materials': ['LIN','APD','SHW','ECL','FCX','NEM','NUE','VMC','MLM','DOW','DD','PPG','CE','CF','MOS','ALB','BALL','IP','PKG','EMN'],
            }
        },
        'nasdaq': {
            'name': 'NASDAQ 100',
            'sectors': {
                'Mega Cap Tech': ['AAPL','MSFT','NVDA','AMZN','META','GOOG','TSLA'],
                'Semis': ['AVGO','AMD','QCOM','TXN','MU','MRVL','LRCX','KLAC','AMAT','ON','NXPI','MPWR','SWKS','MCHP'],
                'Software': ['CRM','ADBE','INTU','PANW','SNPS','CDNS','CRWD','FTNT','DDOG','NOW','PLTR','WDAY','ZS','NET','TEAM'],
                'Internet': ['NFLX','BKNG','ABNB','MELI','PYPL','CPRT','DASH','TTD','ZM','PINS','SNAP','ROKU'],
                'Healthcare': ['AMGN','GILD','ISRG','VRTX','REGN','ILMN','DXCM','MRNA','BIIB','IDXX','GEHC'],
                'Consumer': ['COST','PEP','SBUX','HON','ADP','CSX','CEG','KDP','MNST','LULU','ROST','ODFL','FAST','PAYX','CTAS'],
            }
        },
    }

    config = indices.get(idx)
    if not config:
        return jsonify({'error': f'Unknown index: {idx}'})

    all_tickers = []
    for stocks in config['sectors'].values():
        all_tickers.extend(stocks)

    try:
        hist = yf.download(all_tickers, period='3mo', interval='1d', progress=False)
        live = {}
        try:
            intra = yf.download(all_tickers, period='1d', interval='1m', progress=False)
            if not intra.empty:
                for t in all_tickers:
                    try:
                        c = intra['Close'][t].dropna()
                        if not c.empty:
                            live[t] = float(c.iloc[-1])
                    except: pass
        except: pass

        if hist.empty:
            return jsonify({'error': 'No data'})

        sectors = []
        for sector_name, tickers in config['sectors'].items():
            stocks = []
            sector_chg = []
            for t in tickers:
                try:
                    close = hist['Close'][t].dropna()
                    if close.empty or len(close) < 2:
                        continue
                    last = live.get(t, float(close.iloc[-1]))
                    prev = float(close.iloc[-2])
                    dp = round(((last - prev) / prev) * 100, 2)
                    p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
                    p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
                    p3m = round(((last / float(close.iloc[0])) - 1) * 100, 2) if len(close) >= 2 else None
                    stocks.append({
                        'ticker': t, 'c': round(last, 2), 'dp': dp,
                        'p5d': p5d, 'p1m': p1m, 'p3m': p3m,
                    })
                    sector_chg.append(dp)
                except: pass
            avg = round(sum(sector_chg) / len(sector_chg), 2) if sector_chg else 0
            sectors.append({'name': sector_name, 'dp': avg, 'stocks': stocks})

        resp = {'idx': idx, 'name': config['name'], 'sectors': sectors}
        _heat_cache[idx] = {'ts': _time.time(), 'data': resp}
        return jsonify(resp)
    except Exception as e:
        return jsonify({'error': str(e)})

_glco_cache = {'ts': 0, 'data': None}

@app.route('/api/glco')
def glco():
    import time as _time
    if _glco_cache['data'] and _time.time() - _glco_cache['ts'] < 15:
        return jsonify(_glco_cache['data'])
    commodities = [
        ('Energy', 'CL=F', 'WTI Crude Oil'), ('Energy', 'BZ=F', 'Brent Crude'),
        ('Energy', 'NG=F', 'Natural Gas'), ('Energy', 'HO=F', 'Heating Oil'),
        ('Energy', 'RB=F', 'RBOB Gasoline'),
        ('Precious Metals', 'GC=F', 'Gold'), ('Precious Metals', 'SI=F', 'Silver'),
        ('Precious Metals', 'PL=F', 'Platinum'), ('Precious Metals', 'PA=F', 'Palladium'),
        ('Base Metals', 'HG=F', 'Copper'),
        ('Agriculture', 'ZC=F', 'Corn'), ('Agriculture', 'ZW=F', 'Wheat'),
        ('Agriculture', 'ZS=F', 'Soybeans'), ('Agriculture', 'KC=F', 'Coffee'),
        ('Agriculture', 'SB=F', 'Sugar'), ('Agriculture', 'CC=F', 'Cocoa'),
        ('Agriculture', 'CT=F', 'Cotton'),
        ('Livestock', 'LE=F', 'Live Cattle'), ('Livestock', 'HE=F', 'Lean Hogs'),
    ]
    tickers = [t for _, t, _ in commodities]
    results = []
    try:
        hist = yf.download(tickers, period='1y', interval='1d', progress=False)
        live_prices = {}
        try:
            intra = yf.download(tickers, period='1d', interval='1m', progress=False)
            if not intra.empty:
                for t in tickers:
                    try:
                        c = intra['Close'][t].dropna()
                        if not c.empty: live_prices[t] = float(c.iloc[-1])
                    except Exception: pass
        except Exception: pass
        if hist.empty:
            return jsonify({'error': 'No data'})
        for group, ticker, name in commodities:
            try:
                close = hist['Close'][ticker].dropna()
                high_s = hist['High'][ticker].dropna()
                low_s = hist['Low'][ticker].dropna()
                if close.empty or len(close) < 2: continue
                last = live_prices.get(ticker, float(close.iloc[-1]))
                prev = float(close.iloc[-2])
                d = round(last - prev, 2)
                dp = round((d / prev) * 100, 3)
                p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
                p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
                p3m = round(((last / float(close.iloc[-66])) - 1) * 100, 2) if len(close) >= 66 else None
                yr = close.index[-1].year
                ytd_data = close[close.index.year == yr]
                ytd = round(((last / float(ytd_data.iloc[0])) - 1) * 100, 2) if len(ytd_data) > 1 else None
                ytd_high_data = high_s[high_s.index.year == yr]
                ytd_low_data = low_s[low_s.index.year == yr]
                ytd_high = round(float(ytd_high_data.max()), 2) if not ytd_high_data.empty else None
                ytd_low = round(float(ytd_low_data.min()), 2) if not ytd_low_data.empty else None
                def calc_rsi(closes, period):
                    if len(closes) < period + 1: return None
                    g = l = 0
                    for i in range(len(closes) - period, len(closes)):
                        dd = closes[i] - closes[i - 1]
                        if dd > 0: g += dd
                        else: l += abs(dd)
                    ag, al = g / period, l / period
                    if al == 0: return 100
                    return round(100 - (100 / (1 + ag / al)), 1)
                c_list = close.tolist()
                results.append({
                    'group': group, 'ticker': ticker, 'name': name,
                    'c': round(last, 2), 'd': d, 'dp': dp,
                    'p5d': p5d, 'p1m': p1m, 'p3m': p3m, 'ytd': ytd,
                    'ytd_high': ytd_high, 'ytd_low': ytd_low,
                    'rsi9': calc_rsi(c_list, 9), 'rsi14': calc_rsi(c_list, 14),
                })
            except Exception: pass
    except Exception as e:
        return jsonify({'error': str(e)})
    resp = {'commodities': results}
    _glco_cache['ts'] = _time.time()
    _glco_cache['data'] = resp
    return jsonify(resp)

_fx_cache = {'ts': 0, 'data': None}

@app.route('/api/fx')
def fx():
    import time as _time
    if _fx_cache['data'] and _time.time() - _fx_cache['ts'] < 15:
        return jsonify(_fx_cache['data'])

    pairs = [
        ('G10', 'EURUSD=X', 'EUR/USD'), ('G10', 'GBPUSD=X', 'GBP/USD'),
        ('G10', 'USDJPY=X', 'USD/JPY'), ('G10', 'USDCHF=X', 'USD/CHF'),
        ('G10', 'AUDUSD=X', 'AUD/USD'), ('G10', 'USDCAD=X', 'USD/CAD'),
        ('G10', 'NZDUSD=X', 'NZD/USD'),
        ('Crosses', 'EURGBP=X', 'EUR/GBP'), ('Crosses', 'EURJPY=X', 'EUR/JPY'),
        ('Crosses', 'GBPJPY=X', 'GBP/JPY'),
        ('EM', 'USDCNY=X', 'USD/CNY'), ('EM', 'USDINR=X', 'USD/INR'),
        ('EM', 'USDBRL=X', 'USD/BRL'), ('EM', 'USDMXN=X', 'USD/MXN'),
        ('EM', 'USDZAR=X', 'USD/ZAR'), ('EM', 'USDTRY=X', 'USD/TRY'),
        ('Index', 'DX-Y.NYB', 'DXY (Dollar Index)'),
        ('Crypto', 'BTC-USD', 'Bitcoin'), ('Crypto', 'ETH-USD', 'Ethereum'),
    ]
    tickers = [t for _, t, _ in pairs]
    results = []
    try:
        hist = yf.download(tickers, period='3mo', interval='1d', progress=False)
        live_prices = {}
        try:
            intra = yf.download(tickers, period='1d', interval='1m', progress=False)
            if not intra.empty:
                for t in tickers:
                    try:
                        c = intra['Close'][t].dropna()
                        if not c.empty:
                            live_prices[t] = float(c.iloc[-1])
                    except Exception:
                        pass
        except Exception:
            pass

        if hist.empty:
            return jsonify({'error': 'No data'})
        for group, ticker, name in pairs:
            try:
                close = hist['Close'][ticker].dropna()
                if close.empty or len(close) < 2:
                    continue
                last = live_prices.get(ticker, float(close.iloc[-1]))
                prev = float(close.iloc[-2])
                d = round(last - prev, 4)
                dp = round((d / prev) * 100, 3)
                p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
                p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
                p3m = round(((last / float(close.iloc[0])) - 1) * 100, 2) if len(close) >= 2 else None
                def calc_rsi(closes, period):
                    if len(closes) < period + 1: return None
                    g = l = 0
                    for i in range(len(closes) - period, len(closes)):
                        dd = closes[i] - closes[i - 1]
                        if dd > 0: g += dd
                        else: l += abs(dd)
                    ag, al = g / period, l / period
                    if al == 0: return 100
                    return round(100 - (100 / (1 + ag / al)), 1)
                c_list = close.tolist()
                # FX needs more decimal places
                dp_fmt = 4 if last < 10 else 2
                results.append({
                    'group': group, 'ticker': ticker, 'name': name,
                    'c': round(last, dp_fmt), 'd': round(d, dp_fmt), 'dp': dp,
                    'p5d': p5d, 'p1m': p1m, 'p3m': p3m,
                    'rsi9': calc_rsi(c_list, 9), 'rsi14': calc_rsi(c_list, 14),
                })
            except Exception:
                pass
    except Exception as e:
        return jsonify({'error': str(e)})
    resp = {'pairs': results}
    _fx_cache['ts'] = _time.time()
    _fx_cache['data'] = resp
    return jsonify(resp)

_eco_cache = {}  # key -> (timestamp, events)

@app.route('/api/eco')
def eco():
    import re as _re
    import json as _json
    import time as _time

    week = request.args.get('week', 'this')
    cache_key = f'finviz_{week}'
    if cache_key in _eco_cache:
        ts, cached_events = _eco_cache[cache_key]
        if _time.time() - ts < 300:
            return jsonify({'week': week, 'events': cached_events, 'cached': True})

    url_param = '' if week == 'this' else '?week=next'
    try:
        r = requests.get(f'https://finviz.com/calendar.ashx{url_param}',
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'},
            timeout=15)
        if r.status_code != 200:
            if cache_key in _eco_cache:
                return jsonify({'events': _eco_cache[cache_key][1], 'cached': True})
            return jsonify({'error': f'Finviz returned {r.status_code}'})

        # extract embedded JSON array of events
        text = r.text
        first = text.find('"calendarId"')
        if first < 0:
            return jsonify({'error': 'Could not find calendar data'})
        arr_start = text.rfind('[', max(0, first - 100), first)
        depth = 0
        end = arr_start
        for i in range(arr_start, len(text)):
            if text[i] == '[': depth += 1
            elif text[i] == ']':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        raw = _json.loads(text[arr_start:end])

        events = []
        for e in raw:
            date_str = e.get('date', '')
            iso_date = date_str[:10] if date_str else ''
            time_str = date_str[11:16] if len(date_str) >= 16 else ''
            imp = e.get('importance', 0)
            impact = 'High' if imp >= 3 else 'Medium' if imp == 2 else 'Low'
            if e.get('allDay'):
                impact = 'Holiday'
            # normalize None to empty string
            def s(v):
                return '' if v is None else str(v)
            events.append({
                'date': iso_date,
                'time': time_str,
                'country': 'USD',
                'event': s(e.get('event', '')),
                'impact': impact,
                'forecast': s(e.get('forecast', '')),
                'actual': s(e.get('actual', '')),
                'previous': s(e.get('previous', '')),
                'reference': s(e.get('reference', '')),
                'higherPositive': e.get('isHigherPositive', 0),
            })
        _eco_cache[cache_key] = (_time.time(), events)
        return jsonify({'week': week, 'events': events})
    except Exception as ex:
        if cache_key in _eco_cache:
            return jsonify({'events': _eco_cache[cache_key][1], 'cached': True})
        return jsonify({'error': str(ex)})

@app.route('/api/search/<query>')
def search(query):
    try:
        r = requests.get(YAHOO_SEARCH, params={
            'q': query, 'quotesCount': 8, 'newsCount': 0, 'listsCount': 0
        }, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        data = r.json()
        results = []
        for item in data.get('quotes', []):
            sym = item.get('symbol', '')
            if '.' not in sym and item.get('quoteType') in ('EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY', ''):
                results.append({'symbol': sym, 'name': item.get('shortname') or item.get('longname', '')})
        return jsonify(results[:8])
    except Exception:
        return jsonify([])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
