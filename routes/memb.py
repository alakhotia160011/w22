from flask import Blueprint, jsonify
import yfinance as yf

memb_bp = Blueprint('memb', __name__)

@memb_bp.route('/api/memb/<ticker>')
def memb(ticker):
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        if info.get('quoteType') != 'ETF':
            return jsonify({'error': f'{ticker} is not an ETF'})

        fd = t.funds_data
        result = {
            'ticker': ticker,
            'name': info.get('longName') or info.get('shortName') or ticker,
            'category': None,
            'family': None,
            'description': None,
            'expenseRatio': None,
            'holdings': [],
            'sectors': [],
            'assetClasses': {},
            'equityStats': {},
        }

        if fd:
            # fund overview
            ov = fd.fund_overview
            if ov:
                result['category'] = ov.get('categoryName')
                result['family'] = ov.get('family')
            result['description'] = fd.description

            # top holdings
            try:
                h = fd.top_holdings
                if h is not None and not h.empty:
                    for sym, row in h.iterrows():
                        result['holdings'].append({
                            'symbol': sym,
                            'name': row.get('Name', ''),
                            'weight': round(float(row.get('Holding Percent', 0)) * 100, 2),
                        })
            except Exception:
                pass

            # sector weightings
            try:
                sw = fd.sector_weightings
                if sw:
                    for sector, weight in sw.items():
                        if weight and weight > 0:
                            name = sector.replace('_', ' ').title()
                            result['sectors'].append({
                                'sector': name,
                                'weight': round(float(weight) * 100, 2),
                            })
                    result['sectors'].sort(key=lambda x: -x['weight'])
            except Exception:
                pass

            # asset classes
            try:
                ac = fd.asset_classes
                if ac:
                    result['assetClasses'] = {
                        'stock': round(float(ac.get('stockPosition', 0)) * 100, 2),
                        'bond': round(float(ac.get('bondPosition', 0)) * 100, 2),
                        'cash': round(float(ac.get('cashPosition', 0)) * 100, 2),
                        'other': round(float(ac.get('otherPosition', 0)) * 100, 2),
                    }
            except Exception:
                pass

            # fund operations (expense ratio)
            try:
                ops = fd.fund_operations
                if ops is not None and not ops.empty:
                    er = ops.loc['Annual Report Expense Ratio', ticker]
                    if er == er:  # NaN check
                        result['expenseRatio'] = round(float(er) * 100, 3)
            except Exception:
                pass

            # equity holdings stats
            try:
                eh = fd.equity_holdings
                if eh is not None and not eh.empty:
                    for idx, row in eh.iterrows():
                        val = row.iloc[0]
                        if val == val:  # NaN check
                            result['equityStats'][idx] = round(float(val), 4)
            except Exception:
                pass

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)})
