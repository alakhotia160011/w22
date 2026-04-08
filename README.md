# W22 Watchlist

Bloomberg-style stock watchlist powered by Finnhub.

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Then open http://localhost:5000 in your browser.

## Structure

```
watchlist-app/
├── app.py              # Flask backend (calls Finnhub)
├── requirements.txt    # Python dependencies
├── static/
│   └── index.html      # Frontend dashboard
└── README.md
```

## API Endpoints

- `GET /api/quotes` — All tickers at once
- `GET /api/quote/<ticker>` — Single ticker
- `GET /api/candles/<ticker>?days=90` — Historical OHLCV data

## Claude Code Prompt

Tell Claude Code:
- Add WebSocket for real-time tick updates
- Add portfolio P&L tracking (entry price × shares)
- Add RSI/MACD/Bollinger Band overlays on charts
- Add alerts when RSI crosses 70/30
- Add a second page for portfolio performance over time
