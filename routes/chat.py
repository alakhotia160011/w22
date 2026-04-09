from flask import Blueprint, jsonify, request, Response, stream_with_context
import os
import time

chat_bp = Blueprint('chat', __name__)

# cache market context so we don't fetch on every message
_market_ctx_cache = {'ts': 0, 'text': ''}

def _get_market_context():
    """Get cached market context, refresh every 5 minutes."""
    if time.time() - _market_ctx_cache['ts'] < 300 and _market_ctx_cache['text']:
        return _market_ctx_cache['text']

    ctx = ""
    try:
        import yfinance as yf
        tickers = ['^GSPC','^DJI','^IXIC','^VIX','GC=F','CL=F','BTC-USD']
        snap = yf.download(tickers, period='5d', interval='1d', progress=False)
        if not snap.empty:
            lines = []
            for t in tickers:
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
                ctx = "\n\nLIVE MARKET DATA:\n" + "\n".join(lines)
    except: pass

    _market_ctx_cache['ts'] = time.time()
    _market_ctx_cache['text'] = ctx
    return ctx


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
    market_context = _market_ctx_cache.get('text', '')  # use cached, don't block

    system = f"""You are a general-purpose AI chatbot. Answer any question the user asks - markets, finance, science, history, coding, life advice, whatever. Be helpful, clear, and concise.{market_context}"""

    def generate():
        yield "data: ...\n\n"
        got_text = False
        try:
            response = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=1024,
                system=system,
                messages=messages,
                stream=True,
            )
            for event in response:
                if event.type == 'content_block_delta' and hasattr(event.delta, 'text'):
                    text = event.delta.text
                    escaped = text.replace('\n', '\\n')
                    yield f"data: {escaped}\n\n"
                    got_text = True
            if not got_text:
                yield "data: [No content in response]\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {type(e).__name__}: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive'})
