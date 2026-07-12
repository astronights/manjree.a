import { notePieceViewed, piecesViewed } from './push'

describe('piecesViewed (opt-in timing)', () => {
  it('starts at zero', () => {
    expect(piecesViewed()).toBe(0)
  })

  it('counts each distinct piece once', () => {
    notePieceViewed('a')
    notePieceViewed('a') // same piece again — no double count
    notePieceViewed('b')
    expect(piecesViewed()).toBe(2)
  })
})
