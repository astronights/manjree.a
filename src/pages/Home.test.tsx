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

describe('Home', () => {
  it('shows the seeded catalog with a New Arrivals row', async () => {
    renderHome()
    expect(await screen.findByText('New Arrivals')).toBeInTheDocument()
    // Pinned new arrival appears twice: once featured, once in the grid
    expect(screen.getAllByText('Marigold Anarkali Kurti').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
  })

  it('marks sold-out pieces', async () => {
    renderHome()
    await screen.findByText('New Arrivals')
    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  it('filters the grid by category', async () => {
    renderHome()
    await screen.findByText('New Arrivals')
    fireEvent.click(screen.getByRole('button', { name: 'Saree' }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
    expect(screen.queryByText('Cream Chikankari Kurti')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Cream Chikankari Kurti')).toBeInTheDocument()
  })
})
