import time as _time
from functools import wraps


def calc_rsi(closes, period):
    """Calculate RSI for a list of close prices."""
    if len(closes) < period + 1:
        return None
    g = l = 0
    for i in range(len(closes) - period, len(closes)):
        dd = closes[i] - closes[i - 1]
        if dd > 0:
            g += dd
        else:
            l += abs(dd)
    ag, al = g / period, l / period
    if al == 0:
        return 100
    return round(100 - (100 / (1 + ag / al)), 1)


def build_market_item(hist, live_prices, ticker, name, region_or_group, include_ytd=False):
    """
    Build a standard market data dict from hist DataFrame.
    Returns None if data is insufficient.
    """
    try:
        close = hist['Close'][ticker].dropna()
        high_s = hist['High'][ticker].dropna()
        low_s = hist['Low'][ticker].dropna()
        if close.empty or len(close) < 2:
            return None
        last = live_prices.get(ticker, float(close.iloc[-1]))
        prev = float(close.iloc[-2])
        d = round(last - prev, 2)
        dp = round((d / prev) * 100, 3)
        p5d = round(((last / float(close.iloc[-6])) - 1) * 100, 2) if len(close) >= 6 else None
        p1m = round(((last / float(close.iloc[-22])) - 1) * 100, 2) if len(close) >= 22 else None
        p3m = round(((last / float(close.iloc[-66])) - 1) * 100, 2) if len(close) >= 66 else None

        c_list = close.tolist()
        rsi9 = calc_rsi(c_list, 9)
        rsi14 = calc_rsi(c_list, 14)

        item = {
            'ticker': ticker, 'name': name,
            'c': round(last, 2), 'd': d, 'dp': dp,
            'p5d': p5d, 'p1m': p1m, 'p3m': p3m,
            'rsi9': rsi9, 'rsi14': rsi14,
        }

        if include_ytd:
            yr = close.index[-1].year
            ytd_data = close[close.index.year == yr]
            ytd = round(((last / float(ytd_data.iloc[0])) - 1) * 100, 2) if len(ytd_data) > 1 else None
            ytd_high_data = high_s[high_s.index.year == yr]
            ytd_low_data = low_s[low_s.index.year == yr]
            ytd_high = round(float(ytd_high_data.max()), 2) if not ytd_high_data.empty else None
            ytd_low = round(float(ytd_low_data.min()), 2) if not ytd_low_data.empty else None
            item['ytd'] = ytd
            item['ytd_high'] = ytd_high
            item['ytd_low'] = ytd_low

        return item
    except Exception:
        return None


def flatten_df(df):
    """Drop the 'Ticker' level from a MultiIndex column DataFrame."""
    if hasattr(df.columns, 'droplevel'):
        try:
            df = df.droplevel('Ticker', axis=1)
        except (KeyError, ValueError):
            pass
    return df


def timed_cache(seconds):
    """Decorator that caches the return value for `seconds` seconds."""
    def decorator(fn):
        cache = {'ts': 0, 'data': None}

        @wraps(fn)
        def wrapper(*args, **kwargs):
            if cache['data'] is not None and _time.time() - cache['ts'] < seconds:
                return cache['data']
            result = fn(*args, **kwargs)
            cache['data'] = result
            cache['ts'] = _time.time()
            return result
        return wrapper
    return decorator
