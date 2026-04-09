from flask import Blueprint, jsonify, request
import yfinance as yf
import time as _time

heat_bp = Blueprint('heat', __name__)

_heat_cache = {}


@heat_bp.route('/api/heat')
def heat():
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
