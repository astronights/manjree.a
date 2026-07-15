import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { shop } from '../config'
import InstallGuide from './InstallGuide'
import SettingsSheet from './SettingsSheet'

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-1.5-.5 11.5 11.5 0 0 1-4.4-3.9c-.5-.7-1-1.6-1-2.5 0-.9.4-1.4.6-1.6.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.1 1.5 1.8 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.7-.8c.2-.3.4-.2.6-.1l1.7.8c.3.1.4.2.5.3 0 .2 0 .5-.2.9z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-gradient)" />
      <circle cx="12" cy="12" r="4" stroke="url(#ig-gradient)" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="#DD2A7B" stroke="none" />
    </svg>
  )
}

export default function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname === '/install') setInstallOpen(true)
  }, [location.pathname])

  const handleInstallClose = () => {
    setInstallOpen(false)
    if (location.pathname === '/install') navigate('/', { replace: true })
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-cream-300/60 bg-cream-100/90 backdrop-blur dark:border-night-700 dark:bg-night-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/icon-512.png"
              alt="Manjree's"
              className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm"
            />
            <span>
              <span className="block font-display text-xl font-semibold text-night-800 dark:text-cream-100">
                {shop.name}
              </span>
              <span className="hidden text-[11px] tracking-wide text-night-700/85 sm:block dark:text-cream-300/70">
                {shop.tagline}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <a
              href={`https://wa.me/${shop.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
            >
              <WhatsAppIcon />
            </a>
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
              onClick={() => setSettingsOpen(true)}
              aria-label="Preferences"
              className="rounded-full p-2 text-night-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-night-800"
            >
              <GearIcon />
            </button>
          </div>
        </div>
      </header>
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onGetApp={() => setInstallOpen(true)}
      />
      <InstallGuide open={installOpen} onClose={handleInstallClose} />
    </>
  )
}
