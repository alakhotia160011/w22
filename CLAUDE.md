# CLAUDE.md

## Project Overview

W22 is a Bloomberg Terminal-style web application for tracking financial markets. It's a single-page app with a Flask backend and vanilla JS frontend, styled as a dark terminal with an orange accent.

## Architecture

- **Backend**: Flask with Blueprints, split into route files under `routes/`. Shared helpers in `helpers.py`. Entry point is `app.py` (~40 lines).
- **Frontend**: `static/index.html` - HTML + inline JS. CSS extracted to `static/css/` (5 files). Pages toggled via `display:none` using a `page` class system.
- **No build step, no frameworks, no npm**. Just Python + vanilla JS + Chart.js.

### Backend Structure
```
app.py              → Flask init, blueprint registration (~40 lines)
helpers.py          → calc_rsi, build_market_item, flatten_df, timed_cache
routes/
  quotes.py         → /api/quotes, /api/quote, /api/candles, /api/search
  market_screens.py → /api/wei, /api/weif, /api/fx, /api/glco
  fixed_income.py   → /api/wirp, /api/fit
  security.py       → /api/des, /api/evt, /api/fa, /api/cn, /api/hs
  news.py           → /api/news (IMAP), /api/top (RSS)
  eco.py            → /api/eco
  pred.py           → /api/pred, /api/pred/events, /api/pred/history
  chat.py           → /api/chat
  heat.py           → /api/heat
```

### CSS Structure
```
static/css/
  main.css          → variables, reset, animations
  tables.css        → table, rows, groups, data cells
  charts.css        → chart panels, period buttons, stats
  components.css    → command bar, topbar, buttons, home page
  pages.css         → page-specific (FA cards, heatmap, predictions, newsletters, chat)
```

## Command System

The app uses a Bloomberg-style command bar at the top. Users type commands and press Enter:
- Page commands: `W`, `WIRP`, `ECO`, `WEI`, `WEIF`, `FX`, `GLCO`, `HEAT`, `PRED`, `TOP`, `NEWS`, `CHAT`
- Security loading: type a ticker (`AAPL`) or company name (`apple`) to load it, then sub-commands: `GP`, `DES`, `FA`, `EVT`, `CN`
- Composite: `FA AAPL`, `HS AAPL MSFT`

Commands are routed through `execCmd()` in the frontend. The `COMMANDS` object maps command names to page IDs. Security sub-commands check `loadedTicker`.

## Key Patterns

- **Auto-refresh**: Pages in `refreshTargets` object auto-refresh every 15 seconds with countdown display.
- **Caching**: Backend uses dict caches with timestamps (e.g. `_wei_cache`, `_fx_cache`). Frontend caches data in module-level variables.
- **Charts**: Chart.js with custom axis formatting via `buildAxisConfig()`. Global chart overlay for WEI/WEIF/FX/GLCO. GP page has its own full-page chart. WIRP and PRED have specialized charts.
- **Ticker autocomplete**: `initTickerAC()` for HS/GP inputs. Command bar has a custom handler that skips known commands.
- **Flash animations**: CSS classes `fg` (green), `fr` (red), `fu` (amber) applied on data refresh.
- **Newsletters**: Fetched via IMAP from Gmail. Per-newsletter cleaning rules in the backend. Frontend paragraph formatter joins hard-wrapped lines and styles headers/bullets.

## Environment Variables

- `GMAIL_USER` / `GMAIL_APP_PASSWORD` - for NEWS command (IMAP)
- `ANTHROPIC_API_KEY` - for CHAT command (Claude API)
- `PORT` - set by Railway in production

## Date/Time Convention

All timestamps displayed in EST. Use `toEST()`, `estTime()`, `estFull()` helpers. Date format is dd-Mmm-YY (e.g. 7-Apr-26) using the `MON` array and `fmt_dd_mmm_yy()`.

## Adding a New Command

1. Backend: add API endpoint in `app.py`
2. Frontend HTML: add page div with `class="page" id="page-xxx"`
3. Add to `COMMANDS` object
4. Add navigation handler in `navigateTo()`
5. Add home card in `page-home`
6. Add to `refreshTargets` if it needs auto-refresh
7. Add init flag (`xxxInitialized`) to prevent double-loading

## Common Gotchas

- yfinance returns NaN for today's incomplete daily bar - always `dropna(subset=['Close'])` before `.tolist()`
- yfinance multi-ticker downloads have MultiIndex columns - use `df.droplevel('Ticker', axis=1)` 
- Autocomplete dropdown can persist after Enter - `acSuppressed` flag prevents this
- Newsletter plain text has `\r\n` line endings - normalize with `.replace('\r\n','\n').replace('\r','\n')`
- ForexFactory rate-limits aggressively - ECO uses Finviz instead
- Polymarket has no category tags - we classify by keyword matching on question text
