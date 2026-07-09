// Product media are stored as one list of URLs; videos are recognised by
// file extension (Supabase storage keeps it) or data-URL mime prefix.

const VIDEO_RE = /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i

export function isVideo(url: string): boolean {
  return url.startsWith('data:video/') || VIDEO_RE.test(url)
}

// Prefer a photo as the cover/thumbnail; fall back to the first item.
export function coverMedia(media: string[]): string | undefined {
  return media.find((m) => !isVideo(m)) ?? media[0]
}
