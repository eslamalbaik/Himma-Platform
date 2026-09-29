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
- **API errors are codes, not sentences.** Return `{ error: { code } }` (`src/server/http.js`) and let the
  browser translate `errors.<code>`.
- **Data that users write has both languages where it names something shared**: e.g. `nameAr`/`nameEn` on
  users, tenants, plans, sections, tags. Articles themselves carry a `language` field instead.
- The platform name is **همّة / Himma** only.

## Architecture
- Next.js 15 (pages router) + MUI (Vuexy template). The backend lives in the same app: API routes in
  `src/pages/api`, server-only code in `src/server`, database through Prisma (`prisma/schema.prisma`).
  SQLite in development, MySQL planned for production.
- Two dashboards: the **super admin** dashboard (`/admin`, platform team) and, later, a **client (tenant)**
  dashboard. Specs: `/mnt/project-files/himma/super-admin-dashboard.md`, `admin-dashboard-analysis.md`,
  `live-broadcast-requirements.md`; business requirements in `REQUIREMENTS.md`.
- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. The session is a signed JWT in
  the httpOnly `himma_session` cookie (`src/server/session.js`); the browser never stores tokens.
- **Permissions:** roles and their rules live in `src/configs/roles.js` and are shared by the UI (CASL,
  `src/configs/acl.js`) and the API (`requireAbility` in `src/server/authorize.js`). Every API route that
  reads or changes data must call `requireAbility` — hiding a button is not a permission check.
- **Audit:** every sign-in and every change to data writes a row with `audit()` (`src/server/audit.js`).
  The `AuditLog` table is append-only: never update or delete rows.
- Sidebar: `src/navigation/vertical/index.js`. Each item has a translation key and the CASL subject that
  gates it. Sections without a page yet render `src/pages/admin/[...slug].js`.
- The remaining Vuexy demo pages (`/apps/*`, `/dashboards/*`, `/ui/*`, ...) are reference only and are
  reachable by `super_admin` alone. `src/@fake-db` still mocks their data; never use it for Himma features.

## Commands
- `npm run dev` — development server
- `npm run db:migrate` — apply schema changes (creates a migration)
- `npm run db:seed` — create the first super admin from `SEED_ADMIN_*` in `.env`
- `npx prettier --write <files>` — format. `npm run lint` / `npm run build` currently fail on a Babel version
  mismatch inherited from the template (see SETUP.md).
