import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

async function ready() {
  return await screen.findByRole('button', { name: /New Arrivals/ })
}

describe('Home', () => {
  it('defaults to the New Arrivals tab, showing each new piece once', async () => {
    renderHome()
    await ready()
    expect(screen.getAllByText('Marigold Anarkali Kurti')).toHaveLength(1)
    expect(screen.getByText('Fuchsia Chanderi Suit Set')).toBeInTheDocument()
    // Non-new pieces stay behind the All tab
    expect(screen.queryByText('Leaf Green Cotton Saree')).not.toBeInTheDocument()
  })

  it('shows the full catalog under All, with stock bands', async () => {
    renderHome()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.getByText('Available on order')).toBeInTheDocument()
  })

  it('shows collection chips and filters by collection', async () => {
    renderHome()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.click(screen.getByRole('button', { name: /Festive Edit/ }))
    expect(screen.queryByText('Leaf Green Cotton Saree')).not.toBeInTheDocument()
    expect(screen.getByText('Fuchsia Chanderi Suit Set')).toBeInTheDocument()
    // Tapping again clears the collection filter
    fireEvent.click(screen.getByRole('button', { name: /Festive Edit/ }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
  })

  it('filters the grid by category', async () => {
    renderHome()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Saree' }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
    expect(screen.queryByText('Cream Chikankari Kurti')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Cream Chikankari Kurti')).toBeInTheDocument()
  })
})
