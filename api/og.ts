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
  // Crawlers index on body content, so this response mirrors what a visitor
  // sees in the React page. An empty body reads as a thin page and risks
  // "Crawled - currently not indexed".
  let body = `<h1>Manjree's — Ethnic Wear</h1>
<p>${escapeHtml(description)}</p>
<p><a href="/">Browse the catalog</a></p>`
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
          sku: id,
          image: (product.images as string[]).filter((u: string) => /^https?:\/\//.test(u)),
          ...(product.description ? { description: String(product.description).slice(0, 500) } : {}),
          brand: { '@type': 'Brand', name: "Manjree's" },
          category: product.category,
          size: product.sizes,
          offers: {
            '@type': 'Offer',
            url: productUrl,
            availability: stockMap[product.stock_status] ?? 'https://schema.org/InStock',
            ...(product.show_price
              ? { priceCurrency: 'INR', price: String(product.sale_price ?? product.price) }
              : {}),
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
            },
          },
        }
        jsonLd = JSON.stringify(ld)

        const stockLabels: Record<string, string> = {
          in_stock: 'In stock',
          sold_out: 'Sold out',
          on_order: 'Made to order',
        }
        const sizes = (product.sizes as string[] | null) ?? []
        const photos = (product.images as string[]).filter((u: string) => /^https?:\/\//.test(u))
        const priceLine = product.show_price
          ? `₹${product.sale_price ?? product.price}`
          : 'Price on request — ask on WhatsApp'

        body = `<article>
<h1>${escapeHtml(product.title)}</h1>
${product.category ? `<p>Category: ${escapeHtml(String(product.category))}</p>` : ''}
<p>${escapeHtml(priceLine)}</p>
<p>${escapeHtml(stockLabels[product.stock_status] ?? 'In stock')}</p>
${sizes.length ? `<p>Available sizes: ${escapeHtml(sizes.join(', '))}</p>` : ''}
${product.description ? `<p style="white-space:pre-line">${escapeHtml(String(product.description))}</p>` : ''}
${photos
  .map(
    (u: string, i: number) =>
      `<img src="${escapeHtml(u)}" alt="${escapeHtml(product.title)} — photo ${i + 1}" width="400">`,
  )
  .join('\n')}
</article>
<nav>
<a href="/">All pieces</a> ·
<a href="/policies">Shipping &amp; returns</a>
</nav>`
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
<link rel="canonical" href="${escapeHtml(productUrl)}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body>${body}</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
