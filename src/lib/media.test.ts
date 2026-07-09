import { coverMedia, isVideo } from './media'

describe('isVideo', () => {
  it('recognises video URLs by extension and data-URL prefix', () => {
    expect(isVideo('https://x.supabase.co/storage/v1/object/public/p/a.mp4')).toBe(true)
    expect(isVideo('https://x.supabase.co/storage/a.webm?token=1')).toBe(true)
    expect(isVideo('data:video/mp4;base64,AAAA')).toBe(true)
    expect(isVideo('https://x.supabase.co/storage/a.jpg')).toBe(false)
    expect(isVideo('data:image/jpeg;base64,AAAA')).toBe(false)
  })
})

describe('coverMedia', () => {
  it('prefers the first photo over videos', () => {
    expect(coverMedia(['a.mp4', 'b.jpg', 'c.jpg'])).toBe('b.jpg')
  })
  it('falls back to a video when there are no photos', () => {
    expect(coverMedia(['a.mp4'])).toBe('a.mp4')
  })
  it('is undefined for empty media', () => {
    expect(coverMedia([])).toBeUndefined()
  })
})
