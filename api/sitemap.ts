// Vercel serverless function: returns an XML sitemap for all published products.
// Accessible at /sitemap.xml via the vercel.json rewrite.

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req: any, res: any) {
  const host = (req.headers.host as string) || 'manjree.online'
  const origin = `https://${host}`

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${origin}/` }]

  try {
    if (supabaseUrl && anonKey) {
      const apiRes = await fetch(
        `${supabaseUrl}/rest/v1/products?is_draft=eq.false&select=id,updated_at`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      )
      const rows = await apiRes.json()
      for (const row of rows ?? []) {
        urls.push({
          loc: `${origin}/product/${encodeURIComponent(row.id)}`,
          lastmod: row.updated_at ? String(row.updated_at).slice(0, 10) : undefined,
        })
      }
    }
  } catch {
    // Fall through — return sitemap with just the homepage
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
  res.status(200).send(xml)
}
