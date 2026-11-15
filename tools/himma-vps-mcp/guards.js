import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const AUDIT_LOG = process.env.HIMMA_VPS_AUDIT_LOG || join(here, 'audit.log')

// Not a blocklist — a match only requires confirm:true. The goal is preventing
// an accident on a production box, not preventing the operation.
const DESTRUCTIVE_COMMANDS = [
  [/\brm\s+(-\w*[rf]\w*\s+)+/, 'recursive/forced delete'],
  [/\bmkfs(\.\w+)?\b/, 'filesystem format'],
  [/\bdd\b[^|]*\bof=/, 'raw disk write'],
  [/>\s*\/dev\/(sd|nvme|vd)/, 'raw device write'],
  [/\b(shutdown|reboot|halt|poweroff)\b/, 'host power state change'],
  [/\bchmod\s+-R\s+777\b/, 'recursive world-writable permissions'],
  [/\bchown\s+-R\b[^|]*\s\/(?:\s|$)/, 'recursive ownership change at filesystem root'],
  [/\b(DROP|TRUNCATE)\s+(DATABASE|SCHEMA|TABLE)\b/i, 'destructive SQL statement'],
  [/:\(\)\s*\{.*\};\s*:/, 'fork bomb'],
  [/\bgit\s+(reset\s+--hard|clean\s+-\w*[fd]|push\s+(-f|--force))/, 'destructive git operation'],
  [/\b(systemctl|service)\s+(stop|disable|mask)\b/, 'service stop/disable'],
  [/\btruncate\b/, 'file truncation'],
]

// DELETE/UPDATE without WHERE hits every row. It is the most common destructive
// mistake in production and it does not look like a mistake when you write it.
const DESTRUCTIVE_SQL = [
  [/^\s*(DROP|TRUNCATE)\s+/i, 'drops or truncates an object'],
  [/^\s*DELETE\s+FROM\s+(?![\s\S]*\bWHERE\b)/i, 'DELETE with no WHERE clause'],
  [/^\s*UPDATE\s+(?![\s\S]*\bWHERE\b)/i, 'UPDATE with no WHERE clause'],
  [/^\s*(ALTER|RENAME)\s+/i, 'schema change'],
  [/\bGRANT\b|\bREVOKE\b|\bSET\s+PASSWORD\b/i, 'privilege change'],
]

const READ_ONLY_SQL = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i

/** @returns {string|null} why the command is destructive, or null */
export function screenCommand(command) {
  for (const [re, why] of DESTRUCTIVE_COMMANDS) if (re.test(command)) return why
  return null
}

/** @returns {string|null} */
export function screenSql(sql) {
  for (const [re, why] of DESTRUCTIVE_SQL) if (re.test(sql)) return why
  return null
}

export function isReadOnlySql(sql) {
  return READ_ONLY_SQL.test(stripSqlComments(sql))
}

export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/#[^\n]*/g, ' ')
}

/** One JSONL line per call. Gitignored — it records paths and query text. */
export function audit(tool, detail, result) {
  try {
    appendFileSync(
      AUDIT_LOG,
      JSON.stringify({ at: new Date().toISOString(), tool, ...detail, ...result }) + '\n',
    )
  } catch {
    // A failed audit write must not fail the operation itself.
  }
}
