import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProductDetail from './ProductDetail'
import { fetchEvents } from '../lib/analytics'
import { enquiredAt } from '../lib/enquiries'
import { listProducts, saveProduct } from '../lib/store'
import { seedProducts } from '../lib/seed'

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/product/${id}`]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Seed localStorage before rendering so getProduct finds the demo pieces.
beforeEach(async () => {
  await listProducts()
})

describe('ProductDetail', () => {
  it('renders the piece with price, sizes and a wa.me enquiry link', async () => {
    renderDetail('demo-anarkali-marigold')
    await screen.findByRole('heading', { name: 'Marigold Anarkali Kurti' })
    expect(screen.getByText('₹1,450')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '40' })).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Enquire on WhatsApp/ })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+\?text=/)
  })

  it('adds the selected size to the WhatsApp message', async () => {
    renderDetail('demo-anarkali-marigold')
    await screen.findByRole('heading', { name: 'Marigold Anarkali Kurti' })
    fireEvent.click(screen.getByRole('button', { name: '42' }))
    const href = screen.getByRole('link', { name: /Enquire on WhatsApp/ }).getAttribute('href')!
    expect(decodeURIComponent(href)).toContain('Size: 42')
  })

  it('records one view per session', async () => {
    renderDetail('demo-anarkali-marigold')
    await screen.findByRole('heading', { name: 'Marigold Anarkali Kurti' })
    const views = (await fetchEvents()).filter((e) => e.event_type === 'view')
    expect(views).toHaveLength(1)
    expect(views[0].product_id).toBe('demo-anarkali-marigold')
  })

  it('records the enquiry and remembers it on this device', async () => {
    renderDetail('demo-anarkali-marigold')
    await screen.findByRole('heading', { name: 'Marigold Anarkali Kurti' })

    const link = screen.getByRole('link', { name: /Enquire on WhatsApp/ })
    link.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(link)

    expect(await screen.findByText(/You enquired about this/)).toBeInTheDocument()
    expect(enquiredAt('demo-anarkali-marigold')).toBeTruthy()
    expect((await fetchEvents()).filter((e) => e.event_type === 'enquiry')).toHaveLength(1)
  })

  it('hides the price when show_price is off', async () => {
    await saveProduct({ ...seedProducts[0], id: undefined, created_at: undefined, title: 'Secret Price Kurti', show_price: false })
    const saved = (await listProducts()).find((p) => p.title === 'Secret Price Kurti')!
    renderDetail(saved.id)
    await screen.findByRole('heading', { name: 'Secret Price Kurti' })
    expect(screen.getByText(/Price on request/)).toBeInTheDocument()
    expect(screen.queryByText('₹1,450')).not.toBeInTheDocument()
  })

  it('shows the sold-out notice', async () => {
    renderDetail('demo-kurti-cream')
    await screen.findByRole('heading', { name: 'Cream Chikankari Kurti' })
    expect(screen.getByText(/Currently sold out/)).toBeInTheDocument()
  })

  it('shows a friendly message for unknown pieces', async () => {
    renderDetail('does-not-exist')
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument()
  })
})
