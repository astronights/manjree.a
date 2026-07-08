// Applies supabase/migrations/*.sql to the database, in filename order,
// tracking what has already run in a schema_migrations table — so it is safe
// to run repeatedly and on every deploy.
//
//   npm run db:migrate
//
// Requires SUPABASE_DB_URL in .env (Supabase dashboard → Connect → URI,
// "Session pooler"). Plain JS on purpose: ops scripts run with node directly,
// no build step.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error(
    'SUPABASE_DB_URL is not set.\n' +
      'Copy the "Session pooler" connection string from the Supabase dashboard\n' +
      '(Connect → URI) into .env, e.g.\n' +
      '  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres',
  )
  process.exit(1)
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

const sql = postgres(dbUrl, { max: 1, ssl: 'require', prepare: false, onnotice: () => {} })

try {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name))

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`↷ ${file} (already applied)`)
      continue
    }
    const body = readFileSync(join(migrationsDir, file), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(body)
      await tx`insert into schema_migrations (name) values (${file})`
    })
    console.log(`✓ ${file}`)
  }
  console.log('Database is up to date.')
} finally {
  await sql.end()
}
