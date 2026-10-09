import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminCaption from './AdminCaption'
import { listProducts } from '../../lib/store'
import { suggestCaptions } from '../../lib/ai'

vi.mock('../../lib/ai', () => ({
  suggestCaptions: vi.fn(async () => ({
    captions: ['First option', 'Second option'],
    hashtags: ['#kurti', 'anarkali'],
  })),
}))

function renderCaption(path = '/admin/caption') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/caption" element={<AdminCaption />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await listProducts()
  vi.mocked(suggestCaptions).mockClear()
})

describe('AdminCaption', () => {
  it('captions a piece with its sizes, ref code and hashtags', async () => {
    renderCaption('/admin/caption?piece=demo-anarkali-marigold')
    await screen.findByText('Marigold Anarkali Kurti')
    expect(screen.getByText('Ref: DEMO-ANA')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Generate captions/ }))
    await screen.findByDisplayValue('First option')

    const [, , piece] = vi.mocked(suggestCaptions).mock.calls[0]
    expect(piece?.title).toBe('Marigold Anarkali Kurti')

    const preview = screen.getByText(/Sizes Available/)
    expect(preview.textContent).toContain('First option')
    expect(preview.textContent).toContain('Sizes Available: 38 | 40 | 42 | 44')
    expect(preview.textContent).toContain('Ref: DEMO-ANA')
    expect(preview.textContent).toContain('#kurti #anarkali')
    expect(preview.textContent).not.toContain('Made to order')
    expect(preview.textContent).not.toMatch(/₹|1,450/)

    // Pick the second option, switch on made to order, drop the ref.
    fireEvent.click(screen.getByRole('button', { name: /Second option/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Made to order/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Ref code/ }))
    const updated = screen.getByText(/Sizes Available/)
    expect(updated.textContent).toContain('Second option')
    expect(updated.textContent).toContain('Made to order — DM to place yours')
    expect(updated.textContent).not.toContain('Ref:')
  })

  it('switching to uploads clears the picked piece', async () => {
    renderCaption('/admin/caption?piece=demo-anarkali-marigold')
    await screen.findByText('Marigold Anarkali Kurti')
    fireEvent.click(screen.getByRole('button', { name: 'Upload photos' }))
    expect(screen.queryByText('Marigold Anarkali Kurti')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generate captions/ })).not.toBeInTheDocument()
    expect(screen.getByText('Add photos')).toBeInTheDocument()
  })
})
