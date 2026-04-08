# W22 Terminal

Bloomberg-style market terminal built with Flask + vanilla JS. Live data from Yahoo Finance.

## Commands

| Command | Description |
|---------|-------------|
| `W` | Watchlist - editable worksheet with live quotes, RSI, charts |
| `WIRP` | Fed & BoJ rate expectations from futures |
| `ECO` | US economic calendar (CPI, NFP, GDP...) |
| `WEI` | World equity indices (US, Europe, Asia, Americas) |
| `WEIF` | Equity index futures (ES, NQ, YM, RTY, Nikkei) |
| `FX` | FX monitor (G10, EM, crosses, DXY, crypto) |
| `GLCO` | Global commodities (energy, metals, agriculture) |
| `HEAT` | Sector heatmap (S&P 500 / NASDAQ) |
| `HS AAPL MSFT` | Historical spread - compare 2 tickers |
| `TOP` | News feed (DealBook, FT, WSJ, Economist, CNBC, BBC, Axios, MarketWatch) |
| `NEWS` | Newsletters pulled from your Gmail inbox |

### Security Commands

Type any ticker (e.g. `AAPL`) to load it, then:

| Command | Description |
|---------|-------------|
| `GP` | Price chart (1D to MAX, norm 100 / $ price, multi-ticker overlay) |
| `DES` | Company description, sector, industry, HQ |
| `FA` | Fundamental analysis - valuation, profitability, IS / BS / CF |
| `EVT` | Events & earnings history (EPS beat/miss) |
| `CN` | Company news |

Or go direct: `FA NVDA`, `DES TSLA`, `CN AAPL`

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

Open http://localhost:5001

### Environment Variables (for Railway / production)

```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Gmail app password is required for the `NEWS` command. Generate one at myaccount.google.com > Security > App Passwords.

## Structure

```
w22/
├── app.py              # Flask backend (Yahoo Finance, IMAP, RSS)
├── static/
│   └── index.html      # Single-page frontend
├── requirements.txt
├── Procfile            # Railway deployment
├── .env                # Gmail credentials (gitignored)
└── .gitignore
```

## Data Sources

- **Yahoo Finance** (via yfinance) - quotes, charts, financials, indices, FX, commodities, futures
- **Finviz** - economic calendar
- **RSS feeds** - DealBook, FT, WSJ, CNBC, BBC, Axios, MarketWatch
- **Gmail IMAP** - newsletter content (Money Stuff, TLDR, Endpoints, etc.)
- **Fed funds futures** (ZQ) - FOMC rate pricing
- **TONA futures** - BoJ rate pricing
