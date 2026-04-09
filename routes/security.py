from flask import Blueprint, jsonify, request
import yfinance as yf
import pandas as pd
import re as _re

security_bp = Blueprint('security', __name__)


@security_bp.route('/api/des/<ticker>')
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


@security_bp.route('/api/evt/<ticker>')
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


@security_bp.route('/api/fa/<ticker>')
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


@security_bp.route('/api/cn/<ticker>')
def cn(ticker):
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


@security_bp.route('/api/hs')
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
