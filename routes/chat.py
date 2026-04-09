from flask import Blueprint, jsonify, request, Response, stream_with_context
import yfinance as yf
import requests
import os

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    import anthropic

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'Anthropic API key not configured'})

    messages = request.json.get('messages', [])
    if not messages:
        return jsonify({'error': 'No messages'})

    client = anthropic.Anthropic(api_key=api_key)

    # gather live market context
    market_context = ""
    try:
        # quick snapshot of key indices and FX
        snapshot_tickers = ['^GSPC','^DJI','^IXIC','^VIX','^N225','^HSI','^STOXX50E',
                           'EURUSD=X','USDJPY=X','GC=F','CL=F','BTC-USD','ES=F','NQ=F']
        snap = yf.download(snapshot_tickers, period='5d', interval='1d', progress=False)
        if not snap.empty:
            lines = []
            for t in snapshot_tickers:
                try:
                    c = snap['Close'][t].dropna()
                    if len(c) >= 2:
                        last = float(c.iloc[-1])
                        prev = float(c.iloc[-2])
                        chg = round(((last - prev) / prev) * 100, 2)
                        name = t.replace('^','').replace('=X','').replace('=F','')
                        lines.append(f"{name}: {last:.2f} ({'+' if chg>=0 else ''}{chg}%)")
                except: pass
            if lines:
                market_context = "\n\nLIVE MARKET DATA (as of now):\n" + "\n".join(lines)
    except: pass

    # get today's top headlines
    news_context = ""
    try:
        import xml.etree.ElementTree as _ET
        r = requests.get('https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
            headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        if r.status_code == 200:
            root = _ET.fromstring(r.text)
            headlines = [item.findtext('title','') for item in root.findall('.//item')[:5]]
            if headlines:
                news_context = "\n\nTODAY'S TOP HEADLINES:\n" + "\n".join(f"- {h}" for h in headlines)
    except: pass

    system = f"""You are a general-purpose AI chatbot. Answer any question the user asks - markets, finance, science, history, coding, life advice, whatever. Be helpful, clear, and concise. If market data is relevant, here's a live snapshot:
{market_context}{news_context}"""

    def generate():
        try:
            with client.messages.stream(
                model='claude-sonnet-4-20250514',
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    # escape newlines so SSE doesn't break
                    escaped = text.replace('\n', '\\n')
                    yield f"data: {escaped}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')
