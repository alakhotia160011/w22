from flask import Blueprint, jsonify, request
import requests
import time as _time

eco_bp = Blueprint('eco', __name__)

_eco_cache = {}  # key -> (timestamp, events)


@eco_bp.route('/api/eco')
def eco():
    import re as _re
    import json as _json

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
