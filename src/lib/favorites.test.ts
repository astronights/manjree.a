import { favoriteIds, isFavorite, toggleFavorite } from './favorites'

describe('favorites (device-local)', () => {
  it('toggles on and off', () => {
    expect(isFavorite('p1')).toBe(false)
    expect(toggleFavorite('p1')).toBe(true)
    expect(isFavorite('p1')).toBe(true)
    expect(Object.keys(favoriteIds())).toEqual(['p1'])
    expect(toggleFavorite('p1')).toBe(false)
    expect(isFavorite('p1')).toBe(false)
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('manjrees.favorites', '{broken')
    expect(isFavorite('p1')).toBe(false)
    expect(toggleFavorite('p1')).toBe(true)
  })
})
