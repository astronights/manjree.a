import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { toggleFavorite } from '../lib/favorites'
import { markEnquired } from '../lib/enquiries'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

async function ready() {
  return await screen.findByLabelText('Highlights')
}

describe('Home', () => {
  it('shows everything by default, smart-ordered with sold-out last', async () => {
    renderHome()
    await ready()
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toHaveLength(5)
    expect(titles[0]).toBe('Marigold Anarkali Kurti') // pinned
    expect(titles[titles.length - 1]).toBe('Cream Chikankari Kurti') // sold out
  })

  it('highlights dropdown filters new arrivals, sale and collections', async () => {
    renderHome()
    await ready()
    fireEvent.change(screen.getByLabelText('Highlights'), { target: { value: 'new' } })
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Highlights'), { target: { value: 'sale' } })
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Highlights'), { target: { value: 'c:Festive Edit' } })
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })

  it('highlight and garment type are orthogonal', async () => {
    renderHome()
    await ready()
    fireEvent.change(screen.getByLabelText('Highlights'), { target: { value: 'c:Festive Edit' } })
    fireEvent.change(screen.getByLabelText('Garment type'), { target: { value: 'Kurti Set' } })
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Fuchsia Chanderi Suit Set'])
  })

  it('My Pieces highlight shows saved + enquired, saved-unenquired first', async () => {
    toggleFavorite('demo-dupatta-sunset') // saved, not enquired
    toggleFavorite('demo-saree-leafgreen') // saved…
    markEnquired('demo-saree-leafgreen') // …and enquired
    markEnquired('demo-kurti-cream') // enquired only
    renderHome()
    await ready()
    fireEvent.change(screen.getByLabelText('Highlights'), { target: { value: 'mine' } })
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual([
      'Sunset Ombre Dupatta',
      'Leaf Green Cotton Saree',
      'Cream Chikankari Kurti',
    ])
  })

  it('hides the My Pieces option when nothing is saved or enquired', async () => {
    renderHome()
    await ready()
    expect(screen.queryByRole('option', { name: /My Pieces/ })).not.toBeInTheDocument()
  })

  it('search narrows the grid', async () => {
    renderHome()
    await ready()
    fireEvent.change(screen.getByPlaceholderText(/Search kurtis/), { target: { value: 'chikankari' } })
    expect(screen.getByText('Cream Chikankari Kurti')).toBeInTheDocument()
    expect(screen.queryByText('Marigold Anarkali Kurti')).not.toBeInTheDocument()
  })

  it('filter sheet: availability filter with clear-all recovery', async () => {
    renderHome()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'On order' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Sunset Ombre Dupatta')).toBeInTheDocument()
    expect(screen.queryByText('Leaf Green Cotton Saree')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /On order ✕/ }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument()
  })

  it('size filter keeps free-size pieces visible', async () => {
    renderHome()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: '38' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Leaf Green Cotton Saree')).toBeInTheDocument() // free-size
    expect(screen.queryByText('Fuchsia Chanderi Suit Set')).not.toBeInTheDocument() // 40-44
  })
})
