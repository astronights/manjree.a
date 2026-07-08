// Minimal .env loader so the ops scripts work on any Node version (the
// --env-file family of flags is too new to rely on). Real environment
// variables always win over .env values.
import { readFileSync } from 'node:fs'

export function loadDotEnv(path = '.env') {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return // no .env — rely on the real environment
  }
  for (const line of text.split('\n')) {
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
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
}
