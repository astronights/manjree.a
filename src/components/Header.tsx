import { Link } from 'react-router-dom'
import { shop } from '../config'
import { useTheme } from '../hooks/useTheme'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default function Header() {
  const { toggle } = useTheme()
  return (
    <header className="sticky top-0 z-20 border-b border-cream-300/60 bg-cream-100/90 backdrop-blur dark:border-night-700 dark:bg-night-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marigold-400 font-display text-lg font-bold text-night-900 shadow-sm">
            M
          </span>
          <span>
            <span className="block font-display text-xl font-semibold text-night-800 dark:text-cream-100">
              {shop.name}
            </span>
            <span className="block text-[11px] tracking-wide text-night-700/85 dark:text-cream-300/70">
              {shop.tagline}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <a
            href={shop.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
          >
            <InstagramIcon />
          </a>
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
          >
            <span className="dark:hidden"><MoonIcon /></span>
            <span className="hidden dark:inline"><SunIcon /></span>
          </button>
        </div>
      </div>
    </header>
  )
}
