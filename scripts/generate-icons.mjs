// Generates placeholder PWA icons in the brand palette (marigold badge with
// bougainvillea-pink petals and a leaf accent) using only Node built-ins.
// Replace public/icon-*.png and apple-touch-icon.png with exports from the
// real circular logo once the final file arrives (design doc §8), keeping
// the same file names.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

const CREAM = [250, 246, 238]
const MARIGOLD = [232, 185, 35]
const MAGENTA = [194, 24, 91]
const PINK = [224, 68, 124]
const ORANGE = [239, 108, 0]
const LEAF = [46, 125, 50]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixels) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Signed distance to a circle; smooth edge for cheap anti-aliasing.
function coverage(px, py, cx, cy, r, edge) {
  const d = Math.hypot(px - cx, py - cy) - r
  if (d <= -edge) return 1
  if (d >= edge) return 0
  return (edge - d) / (2 * edge)
}

function mix(base, color, a) {
  return [
    Math.round(base[0] + (color[0] - base[0]) * a),
    Math.round(base[1] + (color[1] - base[1]) * a),
    Math.round(base[2] + (color[2] - base[2]) * a),
  ]
}

function drawIcon(size, { padding }) {
  const pixels = Buffer.alloc(size * size * 3)
  const c = size / 2
  const badgeR = c * (1 - padding)
  const edge = size / 256 + 0.5
  // Bougainvillea cluster: petals around a small center, offset above middle
  const fy = c - badgeR * 0.15
  const petalR = badgeR * 0.22
  const petals = [
    [c - badgeR * 0.3, fy - badgeR * 0.12, MAGENTA],
    [c + badgeR * 0.3, fy - badgeR * 0.12, PINK],
    [c, fy + badgeR * 0.24, ORANGE],
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rgb = CREAM
      rgb = mix(rgb, MARIGOLD, coverage(x, y, c, c, badgeR, edge))
      rgb = mix(rgb, LEAF, coverage(x, y, c + badgeR * 0.42, fy + badgeR * 0.38, petalR * 0.6, edge))
      for (const [px, py, col] of petals) {
        rgb = mix(rgb, col, coverage(x, y, px, py, petalR, edge))
      }
      rgb = mix(rgb, CREAM, coverage(x, y, c, fy + badgeR * 0.02, petalR * 0.32, edge))
      const i = (y * size + x) * 3
      pixels[i] = rgb[0]
      pixels[i + 1] = rgb[1]
      pixels[i + 2] = rgb[2]
    }
  }
  return png(size, pixels)
}

const targets = [
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  // Maskable icons need ~20% safe-zone padding so the badge survives cropping
  ['icon-512-maskable.png', 512, 0.2],
  ['apple-touch-icon.png', 180, 0.02],
]

for (const [name, size, padding] of targets) {
  writeFileSync(join(outDir, name), drawIcon(size, { padding }))
  console.log(`wrote public/${name}`)
}
