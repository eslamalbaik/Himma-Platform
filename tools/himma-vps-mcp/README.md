# himma-vps-mcp

Local stdio MCP server that gives Claude access to Hinnah's production VPS (hinnah.ae) over SSH.
Registered in the repo's `.mcp.json` as `himma-vps` (internal name, kept as is).

## Setup

```bash
npm install
cp env.example .env   # fill in host, user, absolute key path
npm run check         # SSH, sudo and database-tunnel check, outside MCP
```

## Tools

| Tool | What it does |
| --- | --- |
| `remote_exec` | Shell command over SSH. Destructive patterns (`rm -rf`, `systemctl stop`, ...) need `confirm: true`. |
| `remote_read_file` / `remote_write_file` / `remote_list_dir` | SFTP. Every write keeps a `.bak-<time>` copy; `/etc/*` and env files need `confirm: true`. |
| `db_query` / `db_execute` | MySQL through the SSH tunnel, credentials read from the server's `backend/.env`. `db_query` is read-only; writes without `WHERE`, DDL and grants need `confirm: true`. |
| `hinnah_status` | Services (`hinnah-web`, `hinnah-queue`, `hinnah-scheduler`, PHP-FPM, nginx), HTTP status of `/`, `/en` and `/api/public/broadcasts` for both communities, latest releases, disk, memory and the last errors in `laravel.log`. Read-only. |
| `hinnah_artisan` | `php artisan ...` in `backend/` as the `hinnah` user, arguments passed without a shell. `migrate*`, `db:seed`, `db:wipe`, `down`, `tinker`, cache/queue flushes need `confirm: true`. |
| `hinnah_overview` | Counts per language community (`ar` / `en`) for users, organizations, join requests, articles, events, issues and smart cards by status, plus the home page's live broadcasts (live, upcoming, recordings, same rules as `Site\BroadcastReadController`). Warns when production has not run the communities migration yet. Read-only. |

Every call is appended to `audit.log` (gitignored).
