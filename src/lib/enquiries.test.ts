import { enquiredAt, markEnquired } from './enquiries'

describe('enquiries (device-local)', () => {
  it('is empty until the customer enquires', () => {
    expect(enquiredAt('p1')).toBeNull()
  })

  it('remembers when a piece was enquired about', () => {
    markEnquired('p1')
    const stamp = enquiredAt('p1')
    expect(stamp).toBeTruthy()
    expect(new Date(stamp!).getTime()).toBeGreaterThan(Date.now() - 5000)
    expect(enquiredAt('p2')).toBeNull()
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('manjrees.enquired', 'not json')
    expect(enquiredAt('p1')).toBeNull()
    markEnquired('p1')
    expect(enquiredAt('p1')).toBeTruthy()
  })
})
