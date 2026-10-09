import {
  assembleCaption,
  countHashtags,
  defaultCaptionDefaults,
  mergeHashtags,
  normalizeHashtag,
  sanitizeCaptionDefaults,
} from './caption'
import { getSettings, saveSettings } from './settings'

const base = {
  caption: 'A marigold dream.\n\nSoft cotton with mirror work.',
  sizes: ['38', '40'],
  madeToOrder: false,
  madeToOrderLine: 'Made to order — DM to place yours',
  ref: null,
  emoji: '✨',
  contactLine: 'Feel free to message me for pricing and more details',
  hashtags: ['#kurti', '#ethnicwear'],
}

describe('assembleCaption', () => {
  it('puts caption, details and hashtags in order', () => {
    expect(assembleCaption({ ...base, madeToOrder: true, ref: 'AB12CD34' })).toBe(
      [
        'A marigold dream.\n\nSoft cotton with mirror work.',
        [
          'Sizes Available: 38 | 40',
          'Made to order — DM to place yours',
          'Ref: AB12CD34',
          '✨ Feel free to message me for pricing and more details ✨',
        ].join('\n'),
        '#kurti #ethnicwear',
      ].join('\n\n'),
    )
  })

  it('drops switched-off and empty parts', () => {
    const text = assembleCaption({ ...base, sizes: [], emoji: '', hashtags: [] })
    expect(text).toBe(
      'A marigold dream.\n\nSoft cotton with mirror work.\n\nFeel free to message me for pricing and more details',
    )
    expect(text).not.toContain('Sizes')
    expect(text).not.toContain('Ref')
    expect(text).not.toContain('Made to order')
  })
})

describe('hashtags', () => {
  it('normalises to a single leading # without spaces or punctuation', () => {
    expect(normalizeHashtag('Red Kurti!')).toBe('#RedKurti')
    expect(normalizeHashtag('##diwali')).toBe('#diwali')
    expect(normalizeHashtag('  #  ')).toBeNull()
  })

  it('merges lists, dropping case-insensitive duplicates', () => {
    expect(mergeHashtags(['#Kurti', 'saree'], ['#kurti', '#Saree', 'festive'])).toEqual(['#Kurti', '#saree', '#festive'])
  })

  it('counts hashtags in the final text', () => {
    expect(countHashtags('Lovely #piece\n\n#kurti #ethnic_wear')).toBe(3)
  })
})

describe('caption defaults', () => {
  it('falls back to the defaults for missing or blank values', () => {
    expect(sanitizeCaptionDefaults(undefined)).toEqual(defaultCaptionDefaults)
    expect(sanitizeCaptionDefaults({ contact_line: '  ', made_to_order_line: 5 })).toEqual(defaultCaptionDefaults)
  })

  it('keeps a deliberately empty emoji', () => {
    expect(sanitizeCaptionDefaults({ emoji: '' }).emoji).toBe('')
  })

  it('round-trips through shop settings', async () => {
    const s = await getSettings()
    await saveSettings({ ...s, caption: { ...s.caption, hashtags: ['manjreea', '#Manjreea', 'kurti'], emoji: '🌸' } })
    const again = await getSettings()
    expect(again.caption.hashtags).toEqual(['#manjreea', '#kurti'])
    expect(again.caption.emoji).toBe('🌸')
  })
})
