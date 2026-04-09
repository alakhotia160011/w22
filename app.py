from flask import Flask, send_from_directory
from flask_cors import CORS
import os

# load .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

app = Flask(__name__, static_folder='static')
CORS(app)

# Register blueprints
from routes.quotes import quotes_bp
from routes.market_screens import markets_bp
from routes.fixed_income import fi_bp
from routes.security import security_bp
from routes.news import news_bp
from routes.eco import eco_bp
from routes.pred import pred_bp
from routes.chat import chat_bp
from routes.heat import heat_bp
from routes.screener import screener_bp
from routes.memb import memb_bp

app.register_blueprint(quotes_bp)
app.register_blueprint(markets_bp)
app.register_blueprint(fi_bp)
app.register_blueprint(security_bp)
app.register_blueprint(news_bp)
app.register_blueprint(eco_bp)
app.register_blueprint(pred_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(heat_bp)
app.register_blueprint(screener_bp)
app.register_blueprint(memb_bp)


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
