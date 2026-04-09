from flask import Blueprint, jsonify, request
import yfinance as yf
import time as _time

fi_bp = Blueprint('fixed_income', __name__)

_fit_cache = {'ts': 0, 'data': None}


@fi_bp.route('/api/wirp')
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


@fi_bp.route('/api/fit')
def fit():
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
