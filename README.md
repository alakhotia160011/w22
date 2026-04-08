# W22 Terminal

Bloomberg-style market terminal built with Flask + vanilla JS. Live data from Yahoo Finance.

## Commands

| Command | Description |
|---------|-------------|
| `W` | Watchlist - editable worksheet with live quotes, RSI 9/14, charts |
| `WIRP` | Fed & BoJ rate expectations from futures |
| `ECO` | US economic calendar with surprise index |
| `WEI` | World equity indices (US, Europe, Asia, Americas) |
| `WEIF` | Equity index futures (ES, NQ, YM, RTY, Nikkei) |
| `FX` | FX monitor (G10, EM, crosses, DXY, crypto) |
| `GLCO` | Global commodities (energy, metals, agriculture, livestock) |
| `HEAT` | Sector heatmap (S&P 500 / NASDAQ, 200+ stocks) |
| `HS T1 T2` | Historical spread - compare 2 tickers (subtract, ratio, residual) |
| `PRED` | Prediction markets (Polymarket - geopolitics, politics, crypto, sports) |
| `TOP` | News feed (DealBook, FT, WSJ, CNBC, BBC, Axios, MarketWatch) |
| `NEWS` | Newsletters from your Gmail (Money Stuff, TLDR, Endpoints, GZERO...) |
| `CHAT` | AI chatbot (Claude) with live market context |

### Security Commands

Type any ticker or company name (e.g. `AAPL` or `apple`) to load it, then:

| Command | Description |
|---------|-------------|
| `GP` | Price chart (1D-MAX, norm 100 / $ price, multi-ticker overlay) |
| `DES` | Company description, sector, industry, HQ |
| `FA` | Fundamental analysis - valuation, profitability, IS / BS / CF |
| `EVT` | Events & earnings history (EPS beat/miss) |
| `CN` | Company news |

Or go direct: `FA NVDA`, `DES TSLA`, `CN AAPL`

Use `LOAD <ticker>` to explicitly load a ticker that conflicts with a command name.

### Features

- **Ticker autocomplete** - type company names anywhere, get suggestions from Yahoo search
- **15-second auto-refresh** on all live data pages with flash animations
- **Clickable charts** on WEI, WEIF, FX, GLCO, HEAT (global chart overlay)
- **NYSE bell** - plays opening (9:30 ET) and closing (4:00 ET) bell sound
- **All timestamps in EST**
- **localStorage persistence** for watchlist edits
- **dd-Mmm-YY date format** throughout (Bloomberg style)

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:5001

### Environment Variables

```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
ANTHROPIC_API_KEY=sk-ant-...
```

- **GMAIL** - required for `NEWS` command. Generate app password at myaccount.google.com > Security > App Passwords
- **ANTHROPIC** - required for `CHAT` command. Get key at console.anthropic.com

### Deploy (Railway)

Connect GitHub repo, set env vars, deploy. `Procfile` and `gunicorn` are included.

## Structure

```
w22/
├── app.py              # Flask backend
├── static/
│   └── index.html      # Single-page frontend (~4000 lines)
├── requirements.txt    # flask, yfinance, anthropic, gunicorn
├── Procfile            # Railway deployment
├── .env                # Credentials (gitignored)
└── .gitignore
```

## Data Sources

| Source | Used For |
|--------|----------|
| **Yahoo Finance** (yfinance) | Quotes, charts, financials, indices, FX, commodities, futures |
| **Finviz** | Economic calendar (embedded TradingEconomics data) |
| **Polymarket** (gamma + CLOB APIs) | Prediction markets, price history |
| **RSS feeds** | DealBook, FT, WSJ, CNBC, BBC, Axios, MarketWatch |
| **Gmail IMAP** | Newsletter content (Money Stuff, TLDR, Endpoints, etc.) |
| **Fed funds futures** (ZQ) | FOMC rate pricing |
| **TONA futures** | BoJ rate pricing |
| **Anthropic API** | Claude chatbot |
