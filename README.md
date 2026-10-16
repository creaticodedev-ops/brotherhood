# The Brotherhood

Official site for The Brotherhood, a youth solidarity group in Asfi: public identity, mission archive, activities, creative gallery, social profiles, and a membership application reviewed in the admin dashboard.

The public site does not ask visitors to register before they can read it. Recruitment lives at `/join`.

## Structure

| Folder | Purpose |
| --- | --- |
| `client/` | Vite + React. Public pages in `client/src/site/`. Admin dashboard in `client/src/admin/`. |
| `server/` | Express API + MongoDB. Stories, membership applications, admin session. |
| `shared/catalog.js` | Archive seeded from the supplied photographs. Dates and impact figures are omitted when the images do not show them. |
| `client/public/media/` | Optimized photographs and the logo. |

The earlier market-data routes remain mounted (`/api/market`, `/api/news`) so that code is not thrown away. The public site does not use them.

## Getting started

Requirements: Node.js 20+, MongoDB running locally.

```bash
npm run setup
copy server\.env.example server\.env
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin
- API health: http://localhost:3000/api/health

`PORT` in `server/.env` is the API port (default `5000`). The Vite dev server proxies `/api` to that same value. If something else on the machine already uses `5000`, set another port, for example `5050`.

Set `ADMIN_PASSWORD` (12 characters minimum) in `server/.env` before the first start. It is hashed into the database and can then be removed. Without it, the admin API answers `503`.

On a connected database with an empty `stories` collection, the API inserts the archive from `shared/catalog.js`. Later edits in **Administration → Archives** are kept.

If the API is down, the public pages fall back to that same catalog so the archive still renders. A membership application is stored only when `POST /api/registrations` returns `201`. The form says so when the database is unavailable.

## Public routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | The group |
| `/missions`, `/missions/:slug` | Mission archive and story |
| `/activities`, `/activities/:slug` | Activities |
| `/creative` | Gallery |
| `/social` | Instagram, Facebook, TikTok |
| `/join` | Membership application |
| `/privacy` | What the application stores |
| `/admin` | Dashboard |

Language is French, English, or Arabic (the switch in the navigation). Story texts are written in French and edited as French in the archive. Interface chrome follows the selected language.

## Social profiles

Configured in `client/src/config/site.js`, overridable with:

| Variable | Default |
| --- | --- |
| `VITE_SOCIAL_INSTAGRAM` | `https://www.instagram.com/the_brotherhood07` |
| `VITE_SOCIAL_FACEBOOK` | `https://www.facebook.com/share/1HU15v79vN` |
| `VITE_SOCIAL_TIKTOK` | `https://www.tiktok.com/@brotherhood.safi07` |

The Facebook address is the share link that was supplied. Replace it in `.env` or `site.js` if the permanent page URL is different. The site does not scrape feeds.

Contact email, phone, and address stay empty until `VITE_CONTACT_*` is set. Nothing is invented.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | API and database status |
| `GET /api/stories` | Published stories. Query: `kind=mission\|activity`, `q`, `category`, `year`, `featured=1`, `page`, `limit` |
| `GET /api/stories/:slug` | One published story and related stories |
| `POST /api/registrations` | Legacy investment request, or `{ "kind": "membership", ... }` for a Brotherhood application |
| `/api/admin/*` | Session, applications, story CRUD, notifications (session cookie required, except sign-in and password reset) |

Membership fields: `firstName`, `lastName`, `age`, `city`, `email`, `phone`, `phoneCountry`, `organization`, `domain`, `motivation`, `contribution`, `squads`, `challenges`, `practical`, `locale`.

Squads: `communication`, `design`, `photo`, `events`, `partners`.

`PATCH /api/admin/registrations/:id` accepts `{ "status" }` and/or `{ "notes" }`.

Story writes: `GET|POST /api/admin/stories`, `PATCH|DELETE /api/admin/stories/:id`. Image paths must look like `/media/name.jpg`.

Rate limit on public registration: 5 requests per 10 minutes per IP.

## Photographs

`node scripts/optimize-media.mjs` rebuilds `client/public/media` from the original files (Sharp, max width 1800). Captions describe what is visible. They do not name people or add statistics.

## Checks

```bash
node --test server/test/membership.test.mjs
npm run lint
npm run build
```

## Deployment

- Build the client with `npm run build` (`client/dist`).
- Serve `client/dist` as a single-page app: unknown paths must return `index.html`. Keep `/admin` and `/missions/:slug` on that fallback.
- Run `server/server.js` with `MONGODB_URI`, `ADMIN_PASSWORD` (first boot only), and `ADMIN_APP_URL` set to the public origin.
- Proxy `/api` to the API.
- Put the public origin in `VITE_SITE_URL` before building if you want absolute canonical URLs. `client/public/sitemap.xml` lists paths; prefix them with the real domain when the host is known.
- `robots.txt` disallows `/admin`.
