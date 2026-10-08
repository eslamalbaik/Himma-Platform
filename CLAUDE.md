# Himma (همّة) — working rules for this repository

## Every change is bilingual: Arabic and English (قرار المالك)
Himma ships in two languages. Any code you add or change must work in both:

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
- The platform name is **همّة / Himma** only.

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
- **Tests:** every route gets Feature tests in `backend/tests/Feature` (401, 403, 422 code, success, audit row).
  They run against the separate `himma_test` database.
- Sidebar: `src/navigation/vertical/index.js`. Each item has a translation key and the CASL subject that
  gates it. Sections without a page yet render `src/pages/admin/[...slug].js`.
- The remaining Vuexy demo pages (`/apps/*`, `/dashboards/*`, `/ui/*`, ...) are reference only and are
  reachable by `super_admin` alone. `src/@fake-db` still mocks their data; never use it for Himma features.

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
  data for every section (safe to rerun): clients, join requests, one staff account per role
  (`sales|finance|editor|broadcast|support|auditor@himma.local`, password `SEED_DEMO_PASSWORD` or else
  `SEED_ADMIN_PASSWORD`), client users, plans, subscriptions in every state, invoices, payments, bell alerts,
  content and events. Billing rows are created directly, so seeding sends no emails.
- `php artisan test` — run the tests (database `himma_test`)
- `vendor/bin/pint <files>` — format PHP
