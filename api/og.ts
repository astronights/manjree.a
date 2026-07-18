// Vercel serverless function: serves OG-tag HTML for /product/:id when the
// request comes from a social media crawler (WhatsApp, Facebook, Twitter, …).
// vercel.json routes crawlers here; real browser visits bypass this entirely
// and go straight to index.html via the catch-all rewrite.

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req: any, res: any) {
  const id = req.query.id as string
  const host = (req.headers.host as string) || 'manjree.online'
  const origin = `https://${host}`

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  let title = "Manjree's — Ethnic Wear"
  let description = 'Embrace elegance in ethnic wear. Browse kurtis, suit sets and more.'
  let image = `${origin}/icon-512.png`
  let jsonLd = ''
  const productUrl = `${origin}/product/${id}`

  try {
    if (supabaseUrl && anonKey && id) {
      const apiRes = await fetch(
        `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}&is_draft=eq.false&select=title,description,images,price,sale_price,stock_status,show_price,sizes,category&limit=1`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      )
      const rows = await apiRes.json()
      const product = rows?.[0]
      if (product) {
        title = `${product.title} — Manjree's`
        if (product.description) description = String(product.description).slice(0, 160)
        // First http(s) image — skip data: URIs from demo mode
        const cover = (product.images as string[]).find((u: string) => /^https?:\/\//.test(u))
        if (cover) image = cover

        const stockMap: Record<string, string> = {
          in_stock: 'https://schema.org/InStock',
          sold_out: 'https://schema.org/OutOfStock',
          on_order: 'https://schema.org/PreOrder',
        }
        const ld: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          image: (product.images as string[]).filter((u: string) => /^https?:\/\//.test(u)),
          ...(product.description ? { description: String(product.description).slice(0, 500) } : {}),
          category: product.category,
          size: product.sizes,
          offers: {
            '@type': 'Offer',
            url: productUrl,
            availability: stockMap[product.stock_status] ?? 'https://schema.org/InStock',
            ...(product.show_price
              ? { priceCurrency: 'INR', price: String(product.sale_price ?? product.price) }
              : {}),
          },
        }
        jsonLd = JSON.stringify(ld)
      }
    }
  } catch {
    // Fall through to generic defaults — a crawler must always get a valid response
  }

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(productUrl)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:site_name" content="Manjree's">
<meta name="twitter:card" content="summary_large_image">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body></body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
