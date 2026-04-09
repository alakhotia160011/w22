from flask import Blueprint, jsonify, request
import requests as _requests
import yfinance as yf
import time as _time
import re as _re
import json as _json

screener_bp = Blueprint('screener', __name__)

# ---------------------------------------------------------------------------
# Caches
# ---------------------------------------------------------------------------
_most_cache = {'ts': 0, 'data': None}
_comp_cache = {}   # ticker -> (ts, data)
_cacs_cache = {}   # ticker -> (ts, data)
_srch_cache = {}   # cache_key -> (ts, data)

_UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

# ---------------------------------------------------------------------------
# 1. GET /api/most  –  Top movers (gainers / losers / most active)
# ---------------------------------------------------------------------------

_MOST_FIELDS = [
    'symbol', 'shortName', 'regularMarketPrice', 'regularMarketChange',
    'regularMarketChangePercent', 'regularMarketVolume', 'marketCap',
]


def _extract_quotes(raw_json, fields=_MOST_FIELDS):
    """Pull selected fields from Yahoo screener response."""
    try:
        quotes = raw_json['finance']['result'][0]['quotes']
    except (KeyError, IndexError, TypeError):
        return []
    out = []
    for q in quotes:
        item = {}
        for f in fields:
            item[f] = q.get(f)
        out.append(item)
    return out


@screener_bp.route('/api/most')
def most():
    if _most_cache['data'] and _time.time() - _most_cache['ts'] < 30:
        return jsonify(_most_cache['data'])

    base = 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved'
    categories = {
        'gainers': 'day_gainers',
        'losers': 'day_losers',
        'active': 'most_actives',
    }
    result = {}
    try:
        for key, scr_id in categories.items():
            r = _requests.get(base, params={'scrIds': scr_id, 'count': 20},
                              headers=_UA, timeout=10)
            if r.status_code == 200:
                result[key] = _extract_quotes(r.json())
            else:
                result[key] = []
    except Exception as ex:
        if _most_cache['data']:
            return jsonify({**_most_cache['data'], 'cached': True})
        return jsonify({'error': str(ex)})

    _most_cache['ts'] = _time.time()
    _most_cache['data'] = result
    return jsonify(result)


# ---------------------------------------------------------------------------
# 2. GET /api/comp/<ticker>  –  Comparable companies
# ---------------------------------------------------------------------------

_PEER_MAP = {
    'Consumer Electronics': ['AAPL', 'SONY', 'SSNLF'],
    'Semiconductors': ['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'TXN', 'MU'],
    'Internet Content & Information': ['GOOG', 'META', 'SNAP', 'PINS', 'TWTR'],
    'Software—Application': ['CRM', 'ADBE', 'NOW', 'INTU', 'WDAY'],
    'Software—Infrastructure': ['MSFT', 'ORCL', 'PLTR', 'SNOW', 'DDOG'],
    'Auto Manufacturers': ['TSLA', 'F', 'GM', 'TM', 'RIVN'],
    'Specialty Retail': ['AMZN', 'HD', 'LOW', 'TJX', 'ROST'],
    'Internet Retail': ['AMZN', 'BABA', 'JD', 'MELI', 'SHOP'],
    'Drug Manufacturers': ['LLY', 'JNJ', 'PFE', 'MRK', 'ABBV', 'NVO'],
    'Banks—Diversified': ['JPM', 'BAC', 'C', 'WFC', 'GS', 'MS'],
    'Oil & Gas Integrated': ['XOM', 'CVX', 'COP', 'BP', 'SHEL'],
}

_COMP_INFO_FIELDS = [
    'symbol', 'shortName', 'marketCap', 'trailingPE', 'forwardPE',
    'priceToBook', 'priceToSalesTrailing12Months', 'enterpriseToEbitda',
    'enterpriseToRevenue', 'profitMargins', 'operatingMargins', 'grossMargins',
    'returnOnEquity', 'returnOnAssets', 'revenueGrowth', 'earningsGrowth',
    'dividendYield', 'debtToEquity', 'currentRatio', 'beta',
]

# Sector-level fallback tickers (used when industry is not in _PEER_MAP)
_SECTOR_DEFAULTS = {
    'Technology': ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'META', 'CRM', 'ADBE'],
    'Healthcare': ['UNH', 'JNJ', 'LLY', 'PFE', 'MRK', 'ABBV', 'TMO'],
    'Financial Services': ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'BLK', 'SPGI'],
    'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW'],
    'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'PM', 'CL'],
    'Communication Services': ['GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ'],
    'Industrials': ['GE', 'CAT', 'UNP', 'RTX', 'HON', 'BA', 'DE'],
    'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX'],
    'Basic Materials': ['LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'NUE'],
    'Real Estate': ['PLD', 'AMT', 'EQIX', 'SPG', 'O', 'PSA', 'DLR'],
    'Utilities': ['NEE', 'SO', 'DUK', 'CEG', 'SRE', 'AEP', 'D'],
}


@screener_bp.route('/api/comp/<ticker>')
def comp(ticker):
    ticker = ticker.upper()
    if ticker in _comp_cache:
        ts, cached = _comp_cache[ticker]
        if _time.time() - ts < 60:
            return jsonify({**cached, 'cached': True})

    try:
        info = yf.Ticker(ticker).info or {}
        industry = info.get('industry', '')
        sector = info.get('sector', '')

        # Determine peer list
        peers = list(_PEER_MAP.get(industry, []))
        if not peers:
            peers = list(_SECTOR_DEFAULTS.get(sector, []))
        if not peers:
            peers = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META']

        # Ensure the requested ticker is included
        if ticker not in peers:
            peers.insert(0, ticker)

        # Batch-download recent prices for speed
        try:
            yf.download(peers, period='5d', progress=False)
        except Exception:
            pass

        # Fetch fundamental info for each peer
        peer_data = []
        for p in peers:
            try:
                p_info = yf.Ticker(p).info or {}
                item = {}
                for f in _COMP_INFO_FIELDS:
                    item[f] = p_info.get(f)
                peer_data.append(item)
            except Exception:
                pass

        result = {'ticker': ticker, 'industry': industry, 'peers': peer_data}
        _comp_cache[ticker] = (_time.time(), result)
        return jsonify(result)
    except Exception as ex:
        if ticker in _comp_cache:
            return jsonify({**_comp_cache[ticker][1], 'cached': True})
        return jsonify({'error': str(ex)})


# ---------------------------------------------------------------------------
# 3. GET /api/cacs/<ticker>  –  Corporate actions
# ---------------------------------------------------------------------------

@screener_bp.route('/api/cacs/<ticker>')
def cacs(ticker):
    ticker = ticker.upper()
    if ticker in _cacs_cache:
        ts, cached = _cacs_cache[ticker]
        if _time.time() - ts < 60:
            return jsonify({**cached, 'cached': True})

    try:
        t_obj = yf.Ticker(ticker)

        # Dividends – last 12
        divs_raw = t_obj.dividends
        divs = []
        if divs_raw is not None and not divs_raw.empty:
            last12 = divs_raw.tail(12)
            for dt, amt in last12.items():
                divs.append({'date': str(dt.date()), 'amount': round(float(amt), 4)})

        # Splits – all
        splits_raw = t_obj.splits
        splits = []
        if splits_raw is not None and not splits_raw.empty:
            for dt, ratio in splits_raw.items():
                splits.append({'date': str(dt.date()), 'ratio': str(ratio)})

        # Upcoming / info fields
        info = t_obj.info or {}
        upcoming = {}
        for f in ['exDividendDate', 'dividendDate', 'dividendYield',
                   'dividendRate', 'payoutRatio']:
            val = info.get(f)
            if val is not None:
                upcoming[f] = val

        # Calendar
        try:
            cal = t_obj.calendar
            if cal is not None:
                if isinstance(cal, dict):
                    upcoming['calendar'] = cal
                else:
                    upcoming['calendar'] = cal.to_dict()
        except Exception:
            pass

        result = {'ticker': ticker, 'dividends': divs, 'splits': splits,
                  'upcoming': upcoming}
        _cacs_cache[ticker] = (_time.time(), result)
        return jsonify(result)
    except Exception as ex:
        if ticker in _cacs_cache:
            return jsonify({**_cacs_cache[ticker][1], 'cached': True})
        return jsonify({'error': str(ex)})


# ---------------------------------------------------------------------------
# 4. GET /api/srch  –  Equity screener (Finviz-based)
# ---------------------------------------------------------------------------

_CAP_MAP = {
    'nano': 'nano',        # under 50M
    'micro': 'micro',      # 50M - 300M
    'small': 'small',      # 300M - 2B
    'mid': 'mid',          # 2B - 10B
    'large': 'large',      # 10B - 200B
    'mega': 'mega',        # 200B+
}

_PE_MAP = {
    'low': 'low',          # under 15
    'profitable': 'profitable',
    'high': 'high',        # over 50
}


def _parse_finviz_table(html):
    """Extract stock rows from Finviz screener HTML."""
    stocks = []
    # Finviz uses styled-row class for data rows
    # v=152 columns: No(0), Ticker(1), Company(2), Sector(3), Industry(4),
    #   Country(5), MktCap(6), P/E(7), Volume(8), Price(9), Change(10)
    row_pattern = _re.compile(r'<tr[^>]*class="styled-row[^"]*"[^>]*>(.*?)</tr>', _re.DOTALL)
    td_pattern = _re.compile(r'<td[^>]*>(.*?)</td>', _re.DOTALL)
    tag_strip = _re.compile(r'<[^>]+>')

    rows = row_pattern.findall(html)
    for row in rows:
        cells = td_pattern.findall(row)
        cells = [tag_strip.sub('', c).strip() for c in cells]
        if len(cells) >= 11:
            try:
                stocks.append({
                    'symbol': cells[1],
                    'name': cells[2],
                    'sector': cells[3],
                    'industry': cells[4],
                    'country': cells[5],
                    'marketCap': cells[6],
                    'pe': cells[7],
                    'price': cells[9],
                    'change': cells[10],
                    'volume': cells[8],
                })
            except Exception:
                pass

    return stocks


@screener_bp.route('/api/srch')
def srch():
    # Build Finviz filter string
    filters = []

    min_cap = request.args.get('min_cap', '')
    max_cap = request.args.get('max_cap', '')
    if min_cap or max_cap:
        # map to Finviz cap filters
        cap_val = max_cap or min_cap
        cap_key = _CAP_MAP.get(cap_val.lower(), '')
        if cap_key:
            filters.append(f'cap_{cap_key}')

    min_pe = request.args.get('min_pe', '')
    max_pe = request.args.get('max_pe', '')
    if min_pe or max_pe:
        pe_val = min_pe or max_pe
        pe_key = _PE_MAP.get(pe_val.lower(), '')
        if pe_key:
            filters.append(f'fa_pe_{pe_key}')
        else:
            # Try numeric: e.g. fa_pe_u15 (under 15), fa_pe_o50 (over 50)
            try:
                pv = float(max_pe) if max_pe else None
                if pv and pv <= 15:
                    filters.append('fa_pe_u15')
                elif pv and pv <= 20:
                    filters.append('fa_pe_u20')
                elif pv and pv <= 30:
                    filters.append('fa_pe_u30')
                elif pv and pv <= 50:
                    filters.append('fa_pe_u50')
            except ValueError:
                pass
            try:
                pv = float(min_pe) if min_pe else None
                if pv and pv >= 50:
                    filters.append('fa_pe_o50')
                elif pv and pv >= 30:
                    filters.append('fa_pe_o30')
                elif pv and pv >= 15:
                    filters.append('fa_pe_o15')
                elif pv and pv >= 5:
                    filters.append('fa_pe_o5')
            except ValueError:
                pass

    sector = request.args.get('sector', '')
    if sector:
        # Finviz sector filter: sec_technology, sec_healthcare, etc.
        filters.append(f'sec_{sector.lower().replace(" ", "")}')

    min_yield = request.args.get('min_yield', '')
    if min_yield:
        try:
            yv = float(min_yield)
            if yv >= 5:
                filters.append('fa_div_o5')
            elif yv >= 3:
                filters.append('fa_div_o3')
            elif yv >= 2:
                filters.append('fa_div_o2')
            elif yv >= 1:
                filters.append('fa_div_o1')
            else:
                filters.append('fa_div_pos')
        except ValueError:
            pass

    max_yield = request.args.get('max_yield', '')

    sort_by = request.args.get('sort_by', '')
    limit = request.args.get('limit', '50')
    try:
        limit = min(int(limit), 200)
    except ValueError:
        limit = 50

    filter_str = ','.join(filters) if filters else ''
    url = f'https://finviz.com/screener.ashx?v=152&f={filter_str}&ft=4'
    if sort_by:
        url += f'&o={sort_by}'

    cache_key = url
    if cache_key in _srch_cache:
        ts, cached = _srch_cache[cache_key]
        if _time.time() - ts < 60:
            return jsonify({**cached, 'cached': True})

    try:
        r = _requests.get(url, headers=_UA, timeout=15)
        if r.status_code != 200:
            if cache_key in _srch_cache:
                return jsonify({**_srch_cache[cache_key][1], 'cached': True})
            return jsonify({'error': f'Finviz returned {r.status_code}'})

        stocks = _parse_finviz_table(r.text)
        stocks = stocks[:limit]

        result = {'stocks': stocks, 'count': len(stocks)}
        _srch_cache[cache_key] = (_time.time(), result)
        return jsonify(result)
    except Exception as ex:
        if cache_key in _srch_cache:
            return jsonify({**_srch_cache[cache_key][1], 'cached': True})
        return jsonify({'error': str(ex)})
