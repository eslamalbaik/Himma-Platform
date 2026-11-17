# Hinnah (هنّة) — working rules for this repository

## Every change is bilingual: Arabic and English (قرار المالك)
Hinnah ships in two languages. Any code you add or change must work in both:

- **No hard-coded UI text.** Put every visible string (labels, buttons, menu titles, placeholders, validation
  messages, errors, empty states, emails) in both `public/locales/ar.json` and `public/locales/en.json`
  and render it with `t('key')` from `react-i18next`. Use dotted keys grouped by area (`nav.*`, `login.*`,
  `errors.*`, `admin.*`). A key added to one file must be added to the other in the same change.
- **Arabic is the default and is right-to-left; English is left-to-right.** The layout direction follows the
  language (`LanguageDropdown.js`, `src/configs/i18n.js`, `themeConfig.direction`). Use logical spacing and
  alignment (`start`/`end`, MUI's RTL-aware props) instead of fixed `left`/`right`.
- **API errors are codes, not sentences.** Return `{ error: { code } }` and let the browser translate
  `errors.<code>`. Every new code goes into both locale files.
- **Data that users write has both languages where it names something shared**: e.g. `nameAr`/`nameEn` on
  users, tenants, plans, sections, tags. Articles themselves carry a `language` field instead.
- The platform name is **هنّة / Hinnah** only (renamed from همّة / Himma on 2026-10-12). Internal identifiers that still say
  `himma` (`himma_test`, `himma_session`, `@himma.local`, `icons-himma`) are not shown to users and stay as they are.

## Architecture
- **Frontend:** Next.js 15 (pages router) + MUI (Vuexy template). `next.config.js` proxies `/api/*` to the
  backend, so the browser only talks to the frontend's origin.
- **Backend:** Laravel 11 in `backend/` (MySQL, Redis for sessions/cache/queue). Routes: `backend/routes/api.php`.
- Two dashboards: the **super admin** dashboard (`/admin`, platform team) and, later, a **client (tenant)**
  dashboard. Business requirements: `REQUIREMENTS.md`.
- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Laravel session in the httpOnly
  `himma_session` cookie; the browser never stores tokens. Changing a password bumps `users.token_version`,
  which ends that account's other sessions (`EnsureApiUser`).
- **Every API route declares its guards in `routes/api.php`:** `auth.api` (signed in), `ability:<action>,<subject>`
  (permission), `same_origin` (on every write), `not_maintenance`. Hiding a button is not a permission check.
- **Permissions:** roles and rules live in `backend/config/roles.php` (checked by `App\Support\Ability`) and are
  mirrored in `src/configs/roles.js` for the UI (CASL, `src/configs/acl.js`). Change both together.
- **Input checks:** a `FormRequest` extending `App\Http\Requests\ApiRequest`; `codes()` maps each field (or
  `field.rule`) to its error code. Responses: list `{data, meta:{total, perPage, currentPage, lastPage}}`,
  item `{data}`, delete `{ok:true}` (helpers in `App\Http\Controllers\Controller`). JSON keys are camelCase,
  columns snake_case, public ids are the `cuid` column (`HasCuid`), never the numeric id.
- **Audit:** every sign-in and every change to data writes a row with `Audit::log()` (`backend/app/Support/Audit.php`).
  The `audit_logs` table is append-only: never update or delete rows.
- **Billing alerts:** `App\Billing\BillingNotifier` emails the client (one email in both languages, texts
  `email.*` in `public/locales`, read on the server by `App\Support\Locales`) and alerts staff who `manage,billing`
  in the dashboard bell (Laravel database notifications, `GET /api/admin/notifications`). Each alert is sent once
  (`billing_notices`, unique on kind + subject). Recipients: the client's `billing_email`, else its active users.
  Which alerts and the reminder days: Settings → Notifications (`Setting` group `notifications`). Mail goes to the
  log until `MAIL_*` is set in `backend/.env`.
- **Invoice PDF:** `App\Billing\InvoicePdf` (mPDF, Arabic and English on one document, texts `pdf.invoice.*`),
  served by `GET /api/admin/billing/invoices/{id}/pdf` and attached to the invoice issued, payment received and
  overdue emails.
- **Private messages (MSG-01..06):** one conversation per pair of users (`conversations.pair_key`), `/admin/messages`.
  Only the two participants can open a conversation (404 for anyone else, staff included). Moderators see a message
  only when it is reported (`message_reports`), and opening the reports list is audited. Audit rows for sent
  messages never hold the text. Blocks (`user_blocks`) stop messages both ways.
- **Smart cards (NFC + QR):** `smart_cards` (subject `cards`, `/admin/cards`). The NFC tag and the printed QR code both
  open `/c/{slug}` (`?src=nfc` / `?src=qr` feed the open counters), so details change without reprinting. Books (ISBN),
  events (with a minute-by-minute programme) and links are JSON on the card; each book and event keeps its `id` across
  saves, and every event has its own landing page `/c/{slug}/events/{id}`. Readers ask for a digital dedication or a
  signed copy (`smart_card_requests`, bell alert `card_request` to staff who `update,cards`) and subscribe to news
  (`smart_card_subscribers`). Drafts answer 404 publicly. QR images are drawn in the browser (`qrcode` package).
  Audit rows for readers' requests never hold their name or address.
- **Language communities (قرار المالك، 2026-11-15):** Hinnah is two communities, like Quora's language sites:
  Arabic at `/`, English at `/en/...` (Next.js `i18n` routing in `next.config.js`; the path is both the interface
  language and the community, in the dashboard too: the English community's dashboard is `/en/admin`, in English).
  Every API call sends the path's language as `X-Community` (`src/configs/community.js`); in `/admin` the top-bar
  `CommunitySwitcher` replaces the language menu and reloads the page on the other path. The server reads it with
  `App\Support\Community::current()`. `community` (`ar|en`) is on tenants, users, tenant requests,
  events, issues (numbers count per community) and smart cards; an article's `language` is its community.
  Billing, plans, sections, tags, landing, settings and the audit log are shared. A member account belongs to one
  community (signing up or a join request from `/en` makes an English one; the other community needs a new
  account); members follow and message only inside it, and their stories take its language. Staff have
  `community` null (both) or are limited to one in Users; limited staff always get theirs, and `EnsureCommunity`
  (`community` middleware on `/api/admin`) answers 404 for a record of the other one. A new dashboard list must
  call `Community::scope()` and a new record must take `Community::current()`. Forms ask for names and texts in
  the community's language only (no "name in English" field on the Arabic side): show `inLanguage('name', lang)`
  with `formLanguage(record)` and send `onlyLanguage(...)` (`src/configs/community.js`); the FormRequest lists
  the field in `BILINGUAL` and `ApiRequest` copies it into the other language.
- **Production MCP server:** `tools/himma-vps-mcp` (`himma-vps` in `.mcp.json`, README there): SSH, SFTP and the
  database of hinnah.ae, plus `hinnah_status` (services, `/` and `/en`, public API, log errors), `hinnah_artisan`
  (risky commands need `confirm: true`) and `hinnah_overview` (figures per community and the live broadcasts). When a
  new table gets `community`, or the broadcast rules in `BroadcastReadController` change, update `hinnah.js` too.
- **Tests:** every route gets Feature tests in `backend/tests/Feature` (401, 403, 422 code, success, audit row).
  They run against the separate `himma_test` database.
- **Public landing page** at `/` (`src/pages/index.js`, sections in `src/views/landing`, texts `landing.*`), ported
  from the `hemma-ideas-hub` prototype and rebuilt with MUI so it uses the dashboard's theme, fonts and RTL/LTR.
  It is the only page with `authGuard = false` besides the auth pages: guests see **دخول الجهات** (organization
  sign-in, `/login?portal=entity`, which only changes the login subtitle), signed-in users see a link to their
  dashboard. After sign-in (and when a signed-in user opens a guest page) users go to `getHomeRoute()` (`/admin`),
  never back to `/`. "Request to join" is a mailto to `contactEmail` in `src/configs/landing.js` until a public
  join form exists. Numbers in the hero's dashboard preview are illustrative; the facts strip comes from
  `REQUIREMENTS.md`.
- **Plans on the home page (قرار المالك، 2026-11-17):** priced in UAE dirhams (AED), monthly: the free plan, the
  basic plan (individuals and writers, 100 / 1,200 a year), the professional plan (authors, researchers and content
  creators, 199 / 1,990 a year) and the institutions plan (1,500, monthly only, services and target audiences).
  Content in both languages is in `LandingSeeder::plans()`, applied once with prices by the migration
  `2026_11_17_000000_add_yearly_price_to_plans`. `plans.yearly_price` is display only (the "or … a year" line,
  edited in Landing page → Plans); billing still charges `price` per `interval`.
- **Live broadcasts on the home page:** `src/views/site/HomeBroadcasts.js`, above the feed for everyone (hidden
  while searching or when empty), from `GET /api/public/broadcasts` (`Site\BroadcastReadController`): public
  online/hybrid events of the request's community, `{live, upcoming, recordings}`, each with its organization (null
  = the platform). Stream link only while live, recording only after it ended (`ProfileController::broadcastArray`).
  Texts `site.broadcasts.*`.
- Icons used by Hinnah code are bundled into `src/iconify-bundle/icons-himma.js`; run `npm run build:icons:himma`
  after adding an icon (the source folders are listed in `bundle-himma-icons.js`).
- Sidebar: `src/navigation/vertical/index.js`. Each item has a translation key and the CASL subject that
  gates it. Sections without a page yet render `src/pages/admin/[...slug].js`.
- The remaining Vuexy demo pages (`/apps/*`, `/dashboards/*`, `/ui/*`, ...) are reference only and are
  reachable by `super_admin` alone. `src/@fake-db` still mocks their data; never use it for Hinnah features.

## Commands
Frontend (repo root):
- `npm run dev` — Next.js on http://localhost:3000. On the owner's machine (project on a hard disk) dev mode
  compiles each page on first visit: ~60 s to start and ~50 s for the first `/admin` page.
- `npm run fast` — builds once into `.next-prod` (~4–5 min, lint skipped) then serves it with `next start`;
  every page opens in ~0.01 s. Use this to *use* the dashboard; rerun it after code changes. `next.config.js`
  picks the folder by phase, so the dev server's `.next` cache is never overwritten. Demo pages that call the
  mocked API in `getStatic*` import `src/@fake-db` themselves, because `next build` runs them without `_app.js`.
- `npx prettier --write <files>` — format. `npm run lint` / `npm run build` currently fail on a Babel version
  mismatch inherited from the template (see SETUP.md).

Backend (`backend/`, needs MySQL and Redis running):
- `composer dev` — API on http://127.0.0.1:8000 + queue worker + scheduler
- `php artisan migrate` — apply schema changes; `php artisan make:migration <name>` to add one
- `php artisan db:seed` — create the first super admin from `SEED_ADMIN_*` in `backend/.env`, plus local test
  data for every section (safe to rerun; `EnglishCommunitySeeder` adds the English community's `en-*@hinnah.test`
  accounts and content): clients, join requests, one staff account per role
  (`sales|finance|editor|broadcast|support|auditor@himma.local`, password `SEED_DEMO_PASSWORD` or else
  `SEED_ADMIN_PASSWORD`), client users, plans, subscriptions in every state, invoices, payments, bell alerts,
  content and events. Billing rows are created directly, so seeding sends no emails.
- `php artisan test` — run the tests (database `himma_test`)
- `vendor/bin/pint <files>` — format PHP
