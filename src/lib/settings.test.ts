import { defaultCategories, defaultSizes, getSettings, saveSettings } from './settings'

describe('shop settings (local mode)', () => {
  it('returns the defaults when nothing is stored', async () => {
    const s = await getSettings()
    expect(s.categories).toEqual(defaultCategories)
    expect(s.sizes).toEqual(defaultSizes)
  })

  it('has numeric sizes 36–54 in steps of two as defaults', () => {
    expect(defaultSizes).toEqual(['36', '38', '40', '42', '44', '46', '48', '50', '52', '54'])
  })

  it('round-trips saved settings', async () => {
    await saveSettings({ categories: ['Kaftan Set', 'Saree'], sizes: ['38', '40'], new_arrival_days: 7 })
    const s = await getSettings()
    expect(s.categories).toEqual(['Kaftan Set', 'Saree'])
    expect(s.sizes).toEqual(['38', '40'])
    expect(s.new_arrival_days).toBe(7)
  })

  it('clamps nonsense new-arrival durations back to the default', async () => {
    const clean = await saveSettings({ categories: ['Kurti'], sizes: ['40'], new_arrival_days: -5 })
    expect(clean.new_arrival_days).toBe(3)
  })

  it('trims, dedupes and drops empty entries on save', async () => {
    const clean = await saveSettings({ categories: [' Kurti ', 'Kurti', '', 'Saree'], sizes: ['40', ' 40', '42'], new_arrival_days: 3 })
    expect(clean.categories).toEqual(['Kurti', 'Saree'])
    expect(clean.sizes).toEqual(['40', '42'])
  })

  it('falls back to defaults when a list would be empty', async () => {
    await saveSettings({ categories: [], sizes: ['  '], new_arrival_days: 3 })
    const s = await getSettings()
    expect(s.categories).toEqual(defaultCategories)
    expect(s.sizes).toEqual(defaultSizes)
  })
})
