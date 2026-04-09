from flask import Blueprint, jsonify, request
import yfinance as yf
import requests

from helpers import flatten_df

quotes_bp = Blueprint('quotes', __name__)

YAHOO_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search'


@quotes_bp.route('/api/quotes', methods=['POST'])
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


@quotes_bp.route('/api/quote/<ticker>')
def quote(ticker):
    try:
        df = yf.download(ticker, period='5d', interval='1d', progress=False)
        df = flatten_df(df)
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


@quotes_bp.route('/api/candles/<ticker>')
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
            df = flatten_df(df)
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
        df = flatten_df(df)
        df = df.dropna(subset=['Close'])
        return jsonify({
            'c': df['Close'].tolist(), 'o': df['Open'].tolist(),
            'h': df['High'].tolist(), 'l': df['Low'].tolist(),
            'v': [int(x) if x == x else 0 for x in df['Volume'].tolist()],
            't': [int(ts.timestamp()) for ts in df.index], 's': 'ok'
        })
    except Exception as e:
        return jsonify({'s': 'no_data', 'error': str(e)})


@quotes_bp.route('/api/search/<query>')
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
