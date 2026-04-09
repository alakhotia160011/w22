from flask import Blueprint, jsonify, request
import requests
import ast

pred_bp = Blueprint('pred', __name__)


@pred_bp.route('/api/pred')
def pred():
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


@pred_bp.route('/api/pred/events')
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


@pred_bp.route('/api/pred/history/<token_id>')
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
