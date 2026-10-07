import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const canonical = () =>
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href

describe('App', () => {
  // Tests run without VITE_SUPABASE_* set, so the app is in local demo mode.
  it('shows the demo-mode banner when Supabase is not configured', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Demo mode — sample data only/)).toBeInTheDocument()
    expect(await screen.findByLabelText('Highlights')).toBeInTheDocument()
  })
})

describe('canonical URL', () => {
  afterEach(() => {
    document.querySelector('link[rel="canonical"]')?.remove()
  })

  // A canonical pointing at the homepage from every route tells crawlers to
  // drop product pages as duplicates — the bug this replaced.
  it.each([
    ['/', 'https://manjree.online/'],
    ['/policies', 'https://manjree.online/policies'],
    ['/product/abc-123', 'https://manjree.online/product/abc-123'],
    ['/install', 'https://manjree.online/'], // renders Home; must not compete with /
    ['/policies/', 'https://manjree.online/policies'], // trailing slash normalised
  ])('points %s at %s', (path, expected) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
    expect(canonical()).toBe(expected)
  })

  it('reuses the existing tag instead of appending duplicates', () => {
    render(
      <MemoryRouter initialEntries={['/policies']}>
        <App />
      </MemoryRouter>,
    )
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })
})
