// Minimal .env loader so the ops scripts work on any Node version (the
// --env-file family of flags is too new to rely on). Real environment
// variables always win over .env values.
//
// Returns { path, found, keys } so callers can print useful diagnostics
// when a required variable is missing.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// The repo root (next to package.json), independent of the caller's cwd.
export const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')

export function loadDotEnv(path = envPath) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return { path, found: false, keys: [] }
  }
  const keys = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    const quote = value[0]
    if (quote === '"' || quote === "'") {
      const end = value.indexOf(quote, 1)
      if (end !== -1) value = value.slice(1, end)
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }
    keys.push(match[1])
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
  return { path, found: true, keys }
}

// Shared diagnostic for scripts that need variables from .env: explains
// whether the file was found and what it contained, without printing values.
export function explainMissing(varName, envInfo) {
  const lines = [`${varName} is not set.`]
  if (!envInfo.found) {
    lines.push(
      `No .env file found at ${envInfo.path}`,
      'Create it by copying the template:  cp .env.example .env',
      '(the file must be named exactly ".env" — some editors save it as "env" or ".env.txt")',
    )
  } else if (envInfo.keys.length === 0) {
    lines.push(`Found ${envInfo.path} but could not parse any KEY=value lines from it.`)
  } else {
    lines.push(
      `Found ${envInfo.path} with: ${envInfo.keys.join(', ')}`,
      `…but no ${varName} line. Check it isn't commented out with a leading #.`,
    )
  }
  return lines.join('\n')
}
