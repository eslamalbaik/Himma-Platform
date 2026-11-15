#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import * as vps from './vps.js'
import { screenCommand, screenSql, isReadOnlySql, stripSqlComments, audit } from './guards.js'
import { registerHinnahTools } from './hinnah.js'

// A dump or a full log would otherwise eat the whole context window.
const MAX_OUTPUT = 100_000

function text(s) {
  const body =
    s.length > MAX_OUTPUT
      ? `${s.slice(0, MAX_OUTPUT)}\n\n…[truncated ${s.length - MAX_OUTPUT} more characters]`
      : s
  return { content: [{ type: 'text', text: body }] }
}

function fail(s) {
  return { isError: true, content: [{ type: 'text', text: s }] }
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`
}

function needsConfirm(reason, what) {
  return fail(
    `Blocked: this ${what} looks destructive (${reason}) and targets a live server.\n` +
      `Re-run with confirm: true if that is genuinely intended.`,
  )
}

const server = new McpServer({ name: 'himma-vps', version: '1.1.0' })

server.registerTool(
  'remote_exec',
  {
    title: 'Run a shell command on the remote server',
    description:
      'Execute a shell command over SSH and return stdout, stderr and the exit code. ' +
      'Use for diagnostics (tail logs, systemctl status, ls), deploys, and service ' +
      'restarts. Commands matching a destructive pattern require confirm: true. sudo ' +
      'without passwordless access will hang until the timeout. Prefer remote_read_file ' +
      'to read a whole file.',
    inputSchema: {
      command: z.string().describe('Shell command, e.g. "tail -50 /var/log/nginx/error.log"'),
      confirm: z.boolean().optional().describe('Set true to allow a destructive command'),
      timeout_ms: z.number().int().optional().describe('Kill after this many ms (default 120000)'),
      cwd: z.string().optional().describe('Directory to cd into first'),
    },
  },
  async ({ command, confirm, timeout_ms, cwd }) => {
    const reason = screenCommand(command)
    if (reason && !confirm) {
      audit('remote_exec', { command }, { blocked: reason })
      return needsConfirm(reason, 'command')
    }

    const full = cwd ? `cd ${shellQuote(cwd)} && ${command}` : command

    try {
      const r = await vps.exec(full, { timeoutMs: timeout_ms ?? 120_000 })
      audit('remote_exec', { command: full, confirmed: !!confirm }, { exit: r.code })

      const parts = [`exit code: ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}`]
      if (r.stdout) parts.push(`--- stdout ---\n${r.stdout}`)
      if (r.stderr) parts.push(`--- stderr ---\n${r.stderr}`)
      if (!r.stdout && !r.stderr) parts.push('(no output)')
      return text(parts.join('\n'))
    } catch (e) {
      audit('remote_exec', { command: full }, { error: e.message })
      return fail(`SSH exec failed: ${e.message}`)
    }
  },
)

server.registerTool(
  'remote_read_file',
  {
    title: 'Read a file from the remote server',
    description:
      'Read a text file over SFTP. Use for config files and source files. For very large ' +
      'logs, prefer remote_exec with tail/grep.',
    inputSchema: { path: z.string().describe('Absolute path') },
  },
  async ({ path }) => {
    try {
      const content = await vps.readFile(path)
      audit('remote_read_file', { path }, { bytes: content.length })
      return text(content)
    } catch (e) {
      audit('remote_read_file', { path }, { error: e.message })
      return fail(`Could not read ${path}: ${e.message}`)
    }
  },
)

server.registerTool(
  'remote_write_file',
  {
    title: 'Write a file on the remote server',
    description:
      'Overwrite a file. The existing file is always copied to <path>.bak-<timestamp> ' +
      'first, so a bad edit can be reverted. Paths under /etc, and any env file, require ' +
      'confirm: true.',
    inputSchema: {
      path: z.string().describe('Absolute destination path'),
      content: z.string().describe('Full new contents (replaces the file)'),
      confirm: z.boolean().optional().describe('Required for /etc/* and env files'),
    },
  },
  async ({ path, content, confirm }) => {
    const sensitive = /^\/etc\//.test(path) || /\.env$/.test(path)
    if (sensitive && !confirm) {
      audit('remote_write_file', { path }, { blocked: 'sensitive path' })
      return needsConfirm('system config or environment file', 'write')
    }

    try {
      let backup = null
      if (await vps.stat(path)) {
        backup = `${path}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
        const cp = await vps.exec(`cp -p ${shellQuote(path)} ${shellQuote(backup)}`)
        // Writing without a verified backup removes the only way back.
        if (cp.code !== 0) {
          audit('remote_write_file', { path }, { error: `backup failed: ${cp.stderr}` })
          return fail(`Refusing to write — backup failed: ${cp.stderr.trim()}`)
        }
      }

      await vps.writeFile(path, content)
      audit('remote_write_file', { path, confirmed: !!confirm }, { bytes: content.length, backup })

      return text(
        `Wrote ${content.length} bytes to ${path}.\n` +
          (backup ? `Previous version saved at ${backup}` : '(new file — no previous version)'),
      )
    } catch (e) {
      audit('remote_write_file', { path }, { error: e.message })
      return fail(`Could not write ${path}: ${e.message}`)
    }
  },
)

server.registerTool(
  'remote_list_dir',
  {
    title: 'List a directory on the remote server',
    description:
      'List entries with size, mode and mtime. More structured than parsing ls -la.',
    inputSchema: { path: z.string().describe('Absolute directory path') },
  },
  async ({ path }) => {
    try {
      const list = await vps.listDir(path)
      audit('remote_list_dir', { path }, { entries: list.length })
      const rows = list
        .map(e => {
          const a = e.attrs
          const kind = a.isDirectory() ? 'd' : a.isSymbolicLink() ? 'l' : '-'
          const mode = (a.mode & 0o777).toString(8).padStart(3, '0')
          const mtime = new Date(a.mtime * 1000).toISOString().slice(0, 19).replace('T', ' ')
          return `${kind} ${mode} ${String(a.size).padStart(10)} ${mtime}  ${e.filename}`
        })
        .sort()
      return text(rows.join('\n') || '(empty directory)')
    } catch (e) {
      audit('remote_list_dir', { path }, { error: e.message })
      return fail(`Could not list ${path}: ${e.message}`)
    }
  },
)

server.registerTool(
  'db_query',
  {
    title: 'Run a read-only query on the remote database',
    description:
      'Run a SELECT/SHOW/DESCRIBE/EXPLAIN query (tunnelled over SSH) and return rows as ' +
      'JSON. Anything that writes is rejected — use db_execute for that. Prefer ' +
      'placeholders (?) with the params array over concatenating values into the SQL.',
    inputSchema: {
      sql: z.string().describe('A single read-only statement'),
      params: z
        .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe('Values bound to ? placeholders, in order'),
      limit: z.number().int().optional().describe('Max rows to render (default 200)'),
    },
  },
  async ({ sql, params, limit }) => {
    if (!isReadOnlySql(sql)) {
      audit('db_query', { sql }, { blocked: 'not read-only' })
      return fail(
        'db_query accepts only SELECT / SHOW / DESCRIBE / EXPLAIN / WITH. ' +
          'Use db_execute for statements that modify data.',
      )
    }

    try {
      const { rows } = await vps.query(sql, params ?? [])
      const cap = limit ?? 200
      const shown = Array.isArray(rows) ? rows.slice(0, cap) : rows
      audit('db_query', { sql }, { rows: Array.isArray(rows) ? rows.length : 1 })

      const note =
        Array.isArray(rows) && rows.length > cap
          ? `\n\n…showing ${cap} of ${rows.length} rows (raise limit to see more)`
          : ''
      return text(JSON.stringify(shown, null, 2) + note)
    } catch (e) {
      audit('db_query', { sql }, { error: e.message })
      return fail(`Query failed: ${e.message}`)
    }
  },
)

server.registerTool(
  'db_execute',
  {
    title: 'Run a writing SQL statement on the remote database',
    description:
      'Run INSERT/UPDATE/DELETE/DDL and return the affected row count. Statements that ' +
      'drop or truncate, change schema or privileges, or UPDATE/DELETE without a WHERE ' +
      'clause require confirm: true. Take a backup first for anything non-trivial.',
    inputSchema: {
      sql: z.string().describe('A single writing statement'),
      params: z
        .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe('Values bound to ? placeholders, in order'),
      confirm: z.boolean().optional().describe('Required for destructive statements'),
    },
  },
  async ({ sql, params, confirm }) => {
    const reason = screenSql(stripSqlComments(sql))
    if (reason && !confirm) {
      audit('db_execute', { sql }, { blocked: reason })
      return needsConfirm(reason, 'statement')
    }

    try {
      const { rows } = await vps.query(sql, params ?? [])
      audit('db_execute', { sql, confirmed: !!confirm }, { result: rows?.affectedRows ?? null })
      return text(JSON.stringify(rows, null, 2))
    } catch (e) {
      audit('db_execute', { sql }, { error: e.message })
      return fail(`Statement failed: ${e.message}`)
    }
  },
)

registerHinnahTools(server)

// stdout is reserved entirely for MCP protocol messages — a single console.log
// here corrupts the stream and the server dies with no useful error.
process.on('unhandledRejection', err => {
  console.error('[himma-vps] unhandled rejection:', err)
})

await server.connect(new StdioServerTransport())
console.error('[himma-vps] ready')
