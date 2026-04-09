from flask import Blueprint, jsonify
import yfinance as yf
import time as _time

from helpers import build_market_item, calc_rsi, timed_cache

markets_bp = Blueprint('markets', __name__)

_wei_cache = {'ts': 0, 'data': None}


@markets_bp.route('/api/wei')
def wei():
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
            item = build_market_item(hist, live_prices, ticker, name, region, include_ytd=True)
            if item:
                item['region'] = region
                results.append(item)
    except Exception as e:
        return jsonify({'error': str(e)})

    resp = {'indices': results}
    _wei_cache['ts'] = _time.time()
    _wei_cache['data'] = resp
    return jsonify(resp)


_weif_cache = {'ts': 0, 'data': None}


@markets_bp.route('/api/weif')
def weif():
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


_fx_cache = {'ts': 0, 'data': None}


@markets_bp.route('/api/fx')
def fx():
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


_glco_cache = {'ts': 0, 'data': None}


@markets_bp.route('/api/glco')
def glco():
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
                        if not c.empty:
                            live_prices[t] = float(c.iloc[-1])
                    except Exception:
                        pass
        except Exception:
            pass
        if hist.empty:
            return jsonify({'error': 'No data'})
        for group, ticker, name in commodities:
            item = build_market_item(hist, live_prices, ticker, name, group, include_ytd=True)
            if item:
                item['group'] = group
                results.append(item)
    except Exception as e:
        return jsonify({'error': str(e)})
    resp = {'commodities': results}
    _glco_cache['ts'] = _time.time()
    _glco_cache['data'] = resp
    return jsonify(resp)
