import { buildPrompt, suggestCaptions, suggestDetails } from './ai'

const IMAGE = 'data:image/jpeg;base64,QUFBQQ=='

describe('suggestDetails', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the photo and hints to /api/generate and returns the suggestion', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ title: 'Rose Pink Kurti', description: 'Soft cotton.', category: 'Kurti' })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await suggestDetails(IMAGE, { title: 'pink kurti', description: '' })

    expect(result).toEqual({ title: 'Rose Pink Kurti', description: 'Soft cotton.', category: 'Kurti' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/generate')
    const body = JSON.parse(init.body as string)
    expect(body.image).toEqual({ data: 'QUFBQQ==', mimeType: 'image/jpeg' })
    expect(body.title).toBe('pink kurti')
  })

  it('surfaces the server error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Vercel' }), { status: 500 })),
    )
    await expect(suggestDetails(IMAGE, {})).rejects.toThrow('GEMINI_API_KEY is not configured in Vercel')
  })
})

describe('buildPrompt', () => {
  it('includes the seller hints and the category list', () => {
    const prompt = buildPrompt({ title: 'my draft', description: 'my notes' })
    expect(prompt).toContain('my draft')
    expect(prompt).toContain('my notes')
    expect(prompt).toContain('"Kurti"')
  })
})

describe('suggestCaptions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts at most 4 inline photos plus piece details to /api/caption', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ captions: ['One', 'Two'], hashtags: ['#kurti'] })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const media = Array.from({ length: 6 }, () => ({ url: IMAGE, video: false }))

    const out = await suggestCaptions(media, 'cotton', { title: 'Rose Kurti' })

    expect(out).toEqual({ captions: ['One', 'Two'], hashtags: ['#kurti'] })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/caption')
    const body = JSON.parse(init.body as string)
    expect(body.images).toHaveLength(4)
    expect(body.images[0]).toEqual({ data: 'QUFBQQ==', mimeType: 'image/jpeg' })
    expect(body.notes).toBe('cotton')
    expect(body.piece.title).toBe('Rose Kurti')
  })

  it('surfaces the server error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Not authorised' }), { status: 403 })))
    await expect(suggestCaptions([{ url: IMAGE, video: false }], '')).rejects.toThrow('Not authorised')
  })
})
