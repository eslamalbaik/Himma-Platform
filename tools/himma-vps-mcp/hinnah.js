// Hinnah-specific tools on top of the generic SSH/SFTP/DB ones in index.js: the state of the
// production services, Laravel artisan with guards, and per-community figures (ar / en).
import { z } from 'zod'

import * as vps from './vps.js'
import { audit } from './guards.js'

const PUBLIC_URL = (process.env.HINNAH_PUBLIC_URL || 'https://hinnah.ae').replace(/\/$/, '')
const APP_USER = process.env.HINNAH_APP_USER || 'hinnah'
const SERVICES = ['hinnah-web', 'hinnah-queue', 'hinnah-scheduler', 'php8.3-fpm', 'nginx']
const COMMUNITIES = ['ar', 'en']

// Artisan commands that wipe data, take the site down or fill production with demo accounts.
// A match only requires confirm: true, as in guards.js.
const RISKY_ARTISAN = [
  [/^migrate(:fresh|:refresh|:reset|:rollback)?$/, 'changes the database schema'],
  [/^db:(wipe|seed)$/, 'wipes the database or adds demo data'],
  [/^(down|key:generate|queue:flush|queue:clear|cache:clear)$/, 'takes the site down or drops state'],
  [/^tinker$/, 'runs arbitrary PHP'],
]

const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`

function text(s) {
  return { content: [{ type: 'text', text: s }] }
}

function fail(s) {
  return { isError: true, content: [{ type: 'text', text: s }] }
}

async function rows(sql, params = []) {
  return (await vps.query(sql, params)).rows
}

/** Columns of the given tables, so a query can skip what production has not migrated yet. */
async function columns(tables) {
  const found = await rows(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${tables.map(() => '?').join(',')})`,
    tables,
  )
  const map = {}
  for (const { t, c } of found) (map[t] ??= new Set()).add(c)
  return map
}

export function registerHinnahTools(server) {
  server.registerTool(
    'hinnah_status',
    {
      title: 'Health of Hinnah in production',
      description:
        'One call that shows whether Hinnah is up: its systemd services (web, queue, scheduler, ' +
        'PHP-FPM, nginx), the HTTP status of the Arabic (/) and English (/en) communities and of ' +
        'the public API, the latest release folder, disk and memory, and the last errors in ' +
        "Laravel's log. Read-only.",
      inputSchema: {
        log_lines: z.number().int().optional().describe('Error lines from laravel.log (default 20)'),
      },
    },
    async ({ log_lines }) => {
      const dir = vps.appDir()
      const urls = [
        ['/ (ar)', `${PUBLIC_URL}/`, 'ar'],
        ['/en (en)', `${PUBLIC_URL}/en`, 'en'],
        ['/api/public/broadcasts (ar)', `${PUBLIC_URL}/api/public/broadcasts`, 'ar'],
        ['/api/public/broadcasts (en)', `${PUBLIC_URL}/api/public/broadcasts`, 'en'],
      ]
      const script = [
        `echo '## services'`,
        ...SERVICES.map(s => `printf '%-18s %s\\n' ${q(s)} "$(systemctl is-active ${q(s)} 2>&1)"`),
        `echo; echo '## http'`,
        ...urls.map(
          ([label, url, c]) =>
            `printf '%-32s %s\\n' ${q(label)} "$(curl -sL -o /dev/null -m 15 -w '%{http_code} %{time_total}s' -H 'X-Community: ${c}' ${q(url)})"`,
        ),
        `echo; echo '## latest release'`,
        `ls -1t ${q(`${dir}/releases`)} 2>/dev/null | head -3 || echo '(no releases folder)'`,
        `echo; echo '## disk and memory'`,
        `df -h ${q(dir)} | tail -1; free -m | sed -n '1,2p'`,
        `echo; echo '## laravel.log errors'`,
        `grep -E '\\.(ERROR|CRITICAL|ALERT|EMERGENCY):' ${q(`${dir}/backend/storage/logs/laravel.log`)} 2>/dev/null | tail -${Number(log_lines ?? 20)} || true`,
      ].join('\n')

      try {
        const r = await vps.exec(script, { timeoutMs: 90_000 })
        audit('hinnah_status', {}, { exit: r.code })
        return text(r.stdout + (r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''))
      } catch (e) {
        audit('hinnah_status', {}, { error: e.message })
        return fail(`Status check failed: ${e.message}`)
      }
    },
  )

  server.registerTool(
    'hinnah_artisan',
    {
      title: 'Run a Laravel artisan command in production',
      description:
        `Run "php artisan <args>" in ${vps.appDir()}/backend as the ${APP_USER} user, e.g. ` +
        '["migrate:status"], ["queue:failed"], ["optimize"], ["schedule:list"]. Arguments are passed ' +
        'one by one, never through a shell. migrate, db:seed / db:wipe, down, tinker and other ' +
        'commands that change the schema, wipe data or take the site down require confirm: true; ' +
        'migrate in production also needs "--force" in args.',
      inputSchema: {
        args: z.array(z.string()).min(1).describe('Command and its arguments, e.g. ["migrate:status"]'),
        confirm: z.boolean().optional().describe('Required for the risky commands listed above'),
        timeout_ms: z.number().int().optional().describe('Kill after this many ms (default 300000)'),
      },
    },
    async ({ args, confirm, timeout_ms }) => {
      const name = args[0]
      const risk = RISKY_ARTISAN.find(([re]) => re.test(name))
      if (risk && !confirm) {
        audit('hinnah_artisan', { args }, { blocked: risk[1] })
        return fail(
          `Blocked: "artisan ${name}" ${risk[1]} on the live server.\n` +
            'Re-run with confirm: true if that is genuinely intended.',
        )
      }

      const command =
        `cd ${q(`${vps.appDir()}/backend`)} && ` +
        `sudo -n -u ${q(APP_USER)} php artisan ${args.map(q).join(' ')} --no-interaction`

      try {
        const r = await vps.exec(command, { timeoutMs: timeout_ms ?? 300_000 })
        audit('hinnah_artisan', { args, confirmed: !!confirm }, { exit: r.code })
        const parts = [`exit code: ${r.code}`]
        if (r.stdout) parts.push(r.stdout)
        if (r.stderr) parts.push(`--- stderr ---\n${r.stderr}`)
        return text(parts.join('\n'))
      } catch (e) {
        audit('hinnah_artisan', { args }, { error: e.message })
        return fail(`artisan failed: ${e.message}`)
      }
    },
  )

  server.registerTool(
    'hinnah_overview',
    {
      title: 'Hinnah figures per language community',
      description:
        'Counts in the production database split by community (ar = Arabic at /, en = English at ' +
        '/en): users (null = staff who see both), organizations, join requests, articles (by ' +
        'language), events, magazine issues and smart cards, each by status; plus the live ' +
        'broadcasts shown on the home page (live now, upcoming, latest recordings). Read-only.',
      inputSchema: {
        community: z.enum(COMMUNITIES).optional().describe('Only this community (default: both)'),
      },
    },
    async ({ community }) => {
      // [table, community column, status column]
      const sets = [
        ['users', 'community', 'status'],
        ['tenants', 'community', 'status'],
        ['tenant_requests', 'community', 'status'],
        ['articles', 'language', 'status'],
        ['events', 'community', 'status'],
        ['issues', 'community', 'status'],
        ['smart_cards', 'community', 'status'],
        ['library_items', 'community', 'status'],
      ]

      try {
        const cols = await columns(sets.map(([t]) => t))
        const notMigrated = !cols.tenants?.has('community')
        const out = { community: community ?? 'both' }
        if (notMigrated) {
          out.warning =
            'Production has not run the language-communities migration yet ' +
            '(2026_11_15_000000_add_language_communities): every record is Arabic.'
        }

        for (const [table, cc, sc] of sets) {
          const have = cols[table]
          if (!have) continue
          const c = have.has(cc) ? cc : null
          if (community && !c) continue
          const where = []
          const params = []
          if (have.has('deleted_at')) where.push('deleted_at IS NULL')
          if (community) { where.push(`${c} = ?`); params.push(community) }
          out[table] = await rows(
            `SELECT ${c ? `${c} AS community, ` : ''}${sc} AS status, COUNT(*) AS total FROM ${table}` +
              (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
              ` GROUP BY ${c ? `${c}, ` : ''}${sc} ORDER BY ${c ? `${c}, ` : ''}${sc}`,
            params,
          )
        }

        // Same rules as Site\BroadcastReadController: public online/hybrid events of active
        // organizations (or the platform itself).
        const ev = cols.events
        const cfilter = community && ev.has('community') ? ' AND e.community = ?' : ''
        const cparams = cfilter ? [community] : []
        const base =
          `SELECT e.cuid, ${ev.has('community') ? 'e.community, ' : ''}e.title_ar, e.title_en, e.format, ` +
          `e.status, e.starts_at, e.ends_at, t.slug AS organization ` +
          `FROM events e LEFT JOIN tenants t ON t.id = e.tenant_id ` +
          `WHERE e.visibility = 'public' AND e.format IN ('online','hybrid') ` +
          `AND (e.tenant_id IS NULL OR t.status = 'active')` +
          (ev.has('deleted_at') ? ' AND e.deleted_at IS NULL' : '') +
          cfilter
        out.broadcasts = {
          live: await rows(`${base} AND e.status = 'live' ORDER BY e.starts_at LIMIT 12`, cparams),
          upcoming: await rows(
            `${base} AND e.status = 'scheduled' AND e.starts_at >= NOW() - INTERVAL 2 HOUR ORDER BY e.starts_at LIMIT 12`,
            cparams,
          ),
          recordings: await rows(
            `${base} AND e.status = 'ended' AND e.recording_url IS NOT NULL ORDER BY e.starts_at DESC LIMIT 6`,
            cparams,
          ),
        }

        audit('hinnah_overview', { community: community ?? null }, { ok: true })
        return text(JSON.stringify(out, null, 2))
      } catch (e) {
        audit('hinnah_overview', { community: community ?? null }, { error: e.message })
        return fail(`Overview failed: ${e.message}`)
      }
    },
  )
}
