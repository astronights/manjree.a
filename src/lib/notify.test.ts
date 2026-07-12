import { notifyDefaults } from './notify'

describe('notifyDefaults', () => {
  it('deep-links "new" arrivals to the New highlight', () => {
    const d = notifyDefaults('new')
    expect(d.url).toBe('/?hl=new')
    expect(d.title).toBeTruthy()
    expect(d.body).toBeTruthy()
  })

  it('deep-links "sale" to the Sale highlight', () => {
    expect(notifyDefaults('sale').url).toBe('/?hl=sale')
  })

  it('deep-links a collection to its encoded name', () => {
    const d = notifyDefaults('collection', 'Festive Edit')
    expect(d.url).toBe('/?hl=c%3AFestive+Edit')
    expect(d.title).toContain('Festive Edit')
  })

  it('falls back gracefully when no collection is given', () => {
    const d = notifyDefaults('collection', '   ')
    expect(d.url).toBe('/?hl=c%3Aour+latest')
    expect(d.title).toContain('our latest')
  })
})
