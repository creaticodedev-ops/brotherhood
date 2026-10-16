# US Bonds

Website for US Bonds — gold trading, investment opportunities, trading education and market analysis.

**Phase 1:** public landing page with a live market terminal and a registration request form, plus a password-protected admin dashboard to review applications (no client accounts or payments). Local development only.

## Structure

| Folder | Purpose |
| --- | --- |
| `client/` | Landing page — Vite + React, plain CSS design system (black · white · green), FR / EN / AR (RTL) |
| `server/` | Express API + MongoDB (market data proxy, registration requests) |
| `scripts/dev.mjs` | Starts both for local development |

## Getting started

Requirements: Node.js 20+, MongoDB running locally (MongoDB Compass can connect to the same URI).

```bash
npm run setup                          # installs client/ and server/ dependencies
copy server\.env.example server\.env   # Windows (cp on macOS/Linux)
npm run dev
```

- Website: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin (also reachable from the discreet "Admin Panel" button in the footer)
- API health check: http://localhost:3000/api/health (proxied to the API on port 5000)

Other scripts: `npm run build`, `npm run lint`, `npm run dev:client`, `npm run dev:server`.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | API and database status |
| `GET /api/market/instruments` | Instrument catalogue (metals, forex, indices, stocks, commodities, crypto, bonds) |
| `GET /api/market/quote?symbol=` | Live quote (bid, ask, spread, session open / high / low, previous close) — `symbol` defaults to `XAUUSD` |
| `GET /api/market/candles?symbol=&tf=` | OHLCV candles — `tf` is one of `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w` |
| `GET /api/market/overview?category=` or `?ids=` | Watchlist rows: price, change versus previous close, 24-hour sparkline |
| `GET /api/news?lang=` | Latest financial headlines (`fr`, `en` or `ar`), newest first, deduplicated |
| `POST /api/registrations` | Registration request (`offer`, `firstName`, `lastName`, `city`, `email`, `phone` + `phoneCountry` (validated with libphonenumber-js and stored in E.164, e.g. `+212612345678`), `amount`, `duration` = `15d` or `1m`, `locale`) |

The catalogue lives in `server/services/instruments.js` (Dukascopy code, precision, currency). Market data comes from public, unauthenticated feeds, cached and throttled server-side:

- Real-time quotes: Swissquote public quotes feed for metals and forex, Dukascopy public tick feed for indices, stocks, commodities, crypto and bonds.
- Candles and history: Dukascopy public chart feed (bid side). The current bar is rebuilt from 1-minute data.
- Headlines: public RSS feeds from Investing.com (forex, commodities, stocks, crypto, economy — in French, English and Arabic), plus FXStreet and investingLive in English. Each feed is refreshed at most once a minute; headlines link to the original articles.

These feeds are not officially documented and carry no availability guarantee. Use a licensed market-data provider before any public launch.

Registration requests are stored in the `registrations` collection. The endpoint is rate limited to 5 requests per 10 minutes per IP. Each new request also creates an entry in the `notifications` collection and is pushed live to open admin sessions.

## Admin dashboard

`/admin` — overview (statistics computed from the database), applications list (search, filters, sorting, pagination), detailed profile with status history, and a notification centre with real-time alerts.

The administrator account lives in the `adminaccounts` collection. On first start it is created from `ADMIN_PASSWORD` (12 characters minimum), which is hashed with scrypt immediately; the variable can then be removed from `server/.env`. Passwords are never stored in plain text. The session is an HMAC-signed, httpOnly, SameSite=Strict cookie valid for 12 hours; failed sign-ins are throttled per IP. Without an account the admin API answers `503`.

Password reset ("Forgot password?" on the login page): a single-use token valid 30 minutes is generated and only its SHA-256 hash is stored. The link (`/admin/reset#token=…`, the token stays in the URL fragment) is e-mailed to `ADMIN_EMAIL` when SMTP is configured, otherwise printed in the API server terminal. Setting the new password (confirmation required, at least 3 character types) rotates the session secret and signs out every session.

Change password (dashboard → Settings, `/admin/settings`): requires the current password, then the new one twice (same rules). The new hash replaces the old one, any pending reset link is cancelled and the other sessions are signed out; the current session stays open.

WhatsApp number: the registration form has a country selector (flags, search by name or dialing code, Morocco by default). The number is entered in national format, validated for the selected country and stored as the complete international number.

WhatsApp confirmation: approving an application opens WhatsApp (`wa.me`) on the number submitted in the form, with a confirmation message in the applicant's language (name, offer, amount, duration). The message can be edited and re-sent from the application drawer; the admin presses Send in WhatsApp.

Statuses: `pending` → `approved` / `rejected`, `approved` → `active` (or back to `pending` / `rejected`), `rejected` → `pending`, `active` → `completed`, `completed` → `active`. Every change is recorded in the application's `history`. Legacy statuses are migrated on start-up (`new` / `contacted` → `pending`, `closed` → `completed`).

| Route (all under `/api/admin`, session required except `/session`) | Purpose |
| --- | --- |
| `GET` / `POST` / `DELETE /session` | Session status, sign in (`{ password }`), sign out |
| `POST /password/forgot` | Issues a reset link (`{ locale }`), answers `202` with the delivery channel |
| `POST /password/verify` | Checks a reset token (`{ token }`) — `410` if invalid or expired |
| `POST /password/reset` | Sets the new password (`{ token, password, confirm }`) — `422` with field errors |
| `POST /password/change` | Signed in: changes the password (`{ current, password, confirm }`) — `422` with field errors |
| `GET /stream` | Server-Sent Events: `registration`, `application`, `notifications` |
| `GET /registrations?q=&status=&offer=&duration=&sort=&order=&page=&limit=` | Paginated applications, with per-status counts |
| `GET /registrations/:id` | Application detail and allowed transitions |
| `PATCH /registrations/:id` | Status change (`{ status }`) — `409` if the transition is not allowed |
| `GET /stats?tz=` | Totals, per-status / offer / duration breakdowns, last 30 days, latest applications |
| `GET /notifications?filter=unread&limit=` | Notifications with unread count |
| `POST /notifications/read` | Mark as read (`{ ids }` or `{ all: true }`) |
| `PATCH /notifications/:id` | Mark one as read or unread (`{ read }`) |

## Configuration

`server/.env`

| Variable | Default |
| --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/udbonds` |
| `PORT` | `5000` |
| `ADMIN_PASSWORD` | — (initial password only, hashed into the database on first start, then removable) |
| `ADMIN_SESSION_SECRET` | Optional — a random secret stored with the account is used when empty |
| `ADMIN_APP_URL` | `http://localhost:3000` (base of the reset link) |
| `ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional — e-mail delivery of the reset link |

`client/.env` (optional — empty values are not displayed)

| Variable | Purpose |
| --- | --- |
| `VITE_SITE_URL` | Public site URL |
| `VITE_CONTACT_EMAIL` | Contact e-mail (used by "Nous contacter") |
| `VITE_CONTACT_PHONE` | Contact phone |
| `VITE_CONTACT_WHATSAPP` | WhatsApp number |
| `VITE_COMPANY_ADDRESS` | Company address |
| `VITE_SOCIAL_INSTAGRAM`, `VITE_SOCIAL_TIKTOK`, `VITE_SOCIAL_TELEGRAM` | Official social profiles (full `https://` URLs). Until set, the icons are shown as "coming soon" in the footer and the mobile menu |

The `udbonds` database and its `registrations` collection appear in MongoDB Compass once the first registration request is submitted.

## Content

- Translations: `client/src/i18n/dictionaries/{fr,en,ar}.js`
- Offer levels (placeholders, no figures): `client/src/config/offers.js`
- Landing sections: `client/src/landing/sections/`
- Navigation: `NAV_ITEMS` in `client/src/config/site.js` (one entry per section anchor, in page order). Entries marked `primary` appear in the desktop bar and the footer "Navigation" column; the others go to the "Plus" menu and the "Entreprise" column. The mobile menu lists them all
- Market terminal: `client/src/market/` (charts by TradingView Lightweight Charts™)
- Reviews carousel: `reviews.items` in the dictionaries — the current entries are illustrative placeholders, labelled as such on the page, and must be replaced with real, verifiable reviews
- Brand assets: `npm run brand:assets --prefix client` regenerates the trimmed logo, favicons and social image from `client/brand/usbonds-logo-official.png`
