// Generates the PWA icon set from public/logo.png. Re-run after replacing the
// logo (which can be any square size — 500×500 and up all work):
//   npm run icons
//
// Outputs, all derived from the one circular badge:
//   icon-192.png, icon-512.png   — "any" purpose, logo as-is
//   apple-touch-icon.png (180)   — flattened on cream (iOS ignores alpha)
//   icon-512-maskable.png        — logo at 80% on a transparent safe-zone so
//                                  the wordmark survives Android's adaptive crop
//   favicon.png                  — the logo (browsers scale it down)
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const logo = join(pub, 'logo.png')
const CREAM = '#faf6ee'
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

await sharp(logo).resize(192, 192).png().toFile(join(pub, 'icon-192.png'))
await sharp(logo).resize(512, 512).png().toFile(join(pub, 'icon-512.png'))
await sharp(logo).resize(180, 180).flatten({ background: CREAM }).png().toFile(join(pub, 'apple-touch-icon.png'))

const inner = await sharp(logo).resize(410, 410).png().toBuffer() // 80% of 512
await sharp({ create: { width: 512, height: 512, channels: 4, background: TRANSPARENT } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'icon-512-maskable.png'))

await sharp(logo).resize(180, 180).png().toFile(join(pub, 'favicon.png'))

console.log('Wrote icon-192, icon-512, apple-touch-icon, icon-512-maskable, favicon from logo.png')
