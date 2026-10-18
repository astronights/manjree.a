// Edge Middleware: routes crawlers hitting / to the catalog renderer in
// api/og.ts, so their first-pass HTML contains a real link to every product
// rather than an empty <div id="root">.
//
// This cannot be a vercel.json rewrite. Vercel checks the filesystem before
// applying rewrites, and dist/index.html exists, so a rule with "source": "/"
// never fires — the static file wins. (The /product/:id and /sitemap.xml
// rewrites do fire, precisely because no static file matches those paths; the
// catch-all "/((?!api/).*)" likewise only reaches unmatched paths, which is
// why it doesn't swallow /assets/*.js.) Middleware runs ahead of the
// filesystem, so it is the only layer that can intercept /.
//
// Keep the crawler list in step with vercel.json.

import { next, rewrite } from '@vercel/edge'

export const config = { matcher: '/' }

const CRAWLER =
  /Googlebot|Google-InspectionTool|Storebot-Google|GoogleOther|bingbot|WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Applebot/i

export default function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (!CRAWLER.test(ua)) return next()
  return rewrite(new URL('/api/og', request.url))
}
