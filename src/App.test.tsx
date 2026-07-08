import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App', () => {
  // Tests run without VITE_SUPABASE_* set, so the app is in local demo mode.
  it('shows the demo-mode banner when Supabase is not configured', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Demo mode — sample data only/)).toBeInTheDocument()
    expect(await screen.findByText('New Arrivals')).toBeInTheDocument()
  })
})
