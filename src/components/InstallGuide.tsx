import { useEffect, useRef, useState } from 'react'

type Platform = 'ios' | 'android'

function detectPlatform(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'android'
}

function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as unknown as Record<string, unknown>).standalone)
  )
}

// ── SVG Illustrations ─────────────────────────────────────────────────────────
// These depict the relevant portion of each browser's UI so users know
// exactly which button to tap.

function SafariToolbarIllustration() {
  return (
    <svg viewBox="0 0 320 68" className="w-full rounded-xl" aria-hidden="true">
      <rect width="320" height="68" rx="12" fill="#f2f2f7" />
      <line x1="12" y1="1" x2="308" y2="1" stroke="#d1d1d6" strokeWidth="1" />
      {/* Back: ← blue */}
      <path d="M44 34 L36 26 L44 18" stroke="#007aff" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Forward: → greyed */}
      <path d="M76 18 L84 26 L76 34" stroke="#d1d1d6" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Share button – marigold ring */}
      <circle cx="160" cy="26" r="22" fill="#fef9ee" />
      <circle cx="160" cy="26" r="22" fill="none" stroke="#f59e0b" strokeWidth="2" />
      {/* Box outline */}
      <rect x="150" y="20" width="20" height="15" rx="2.5" stroke="#1c1917" strokeWidth="2" fill="none" />
      {/* Arrow shaft */}
      <line x1="160" y1="20" x2="160" y2="11" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
      {/* Arrow head */}
      <path d="M155.5 15 L160 10 L164.5 15" stroke="#1c1917" strokeWidth="2" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Bookmark: greyed ribbon */}
      <path d="M243 17 L243 38 L250 33.5 L257 38 L257 17 Z" stroke="#d1d1d6"
        strokeWidth="2" fill="none" strokeLinejoin="round" />
      {/* Tabs: greyed square + "1" */}
      <rect x="273" y="18" width="18" height="16" rx="3.5" stroke="#d1d1d6" strokeWidth="2" fill="none" />
      <text x="282" y="30" textAnchor="middle" fill="#d1d1d6" fontSize="8" fontWeight="700"
        fontFamily="system-ui,-apple-system,sans-serif">1</text>
      {/* Label */}
      <text x="160" y="60" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif">tap this button</text>
    </svg>
  )
}

function SafariShareSheetIllustration() {
  return (
    <svg viewBox="0 0 320 134" className="w-full rounded-xl" aria-hidden="true">
      <rect width="320" height="134" rx="12" fill="#f2f2f7" />
      {/* Header */}
      <text x="18" y="26" fill="#007aff" fontSize="15" fontFamily="system-ui,-apple-system,sans-serif">Cancel</text>
      <text x="160" y="26" textAnchor="middle" fill="#000" fontSize="15" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif">Share</text>
      <line x1="0" y1="38" x2="320" y2="38" stroke="#c7c7cc" strokeWidth="0.5" />
      {/* Copy row */}
      <rect x="0" y="38" width="320" height="46" fill="white" />
      {/* Copy icon: two overlapping rects */}
      <rect x="30" y="51" width="13" height="13" rx="2" stroke="#6c6c70" strokeWidth="1.5" fill="none" />
      <rect x="25" y="46" width="13" height="13" rx="2" stroke="#6c6c70" strokeWidth="1.5" fill="white" />
      <text x="56" y="67" fill="#000" fontSize="14" fontFamily="system-ui,-apple-system,sans-serif">Copy</text>
      <line x1="16" y1="84" x2="320" y2="84" stroke="#c7c7cc" strokeWidth="0.5" />
      {/* Add to Home Screen row – highlighted */}
      <rect x="0" y="84" width="320" height="50" rx="0" fill="#fef9ee" />
      {/* rounded bottom only */}
      <path d="M0 84 h320 v38 q0 12 -12 12 h-296 q-12 0 -12 -12 Z" fill="#fef9ee" />
      {/* Plus-in-square icon (marigold) */}
      <rect x="20" y="97" width="26" height="26" rx="7" fill="#f59e0b" />
      <line x1="33" y1="105" x2="33" y2="119" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="112" x2="40" y2="112" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <text x="58" y="112" fill="#1c1917" fontSize="14" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif">Add to Home Screen</text>
      <text x="58" y="127" fill="#a8a29e" fontSize="11"
        fontFamily="system-ui,-apple-system,sans-serif">then tap Add in the corner ↗</text>
    </svg>
  )
}

function ChromeBarIllustration() {
  return (
    <svg viewBox="0 0 320 56" className="w-full rounded-xl" aria-hidden="true">
      <rect width="320" height="56" rx="12" fill="white" />
      <line x1="0" y1="55.5" x2="320" y2="55.5" stroke="#e0e0e0" strokeWidth="0.5" />
      {/* Back: ← */}
      <path d="M32 28 L24 20 L32 12" stroke="#5f6368" strokeWidth="2" fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* URL bar */}
      <rect x="48" y="10" width="216" height="36" rx="18" fill="#f1f3f4" />
      {/* Lock icon */}
      <rect x="67" y="21" width="8" height="7" rx="1.5" fill="none" stroke="#80868b" strokeWidth="1.3" />
      <path d="M66 21 Q66 16 71 16 Q76 16 76 21" fill="none" stroke="#80868b" strokeWidth="1.3" />
      <circle cx="71" cy="27" r="1.5" fill="#80868b" />
      <text x="83" y="32" fill="#3c4043" fontSize="13"
        fontFamily="system-ui,-apple-system,sans-serif">manjree.online</text>
      {/* Three-dot menu – marigold ring */}
      <circle cx="291" cy="28" r="22" fill="#fef9ee" />
      <circle cx="291" cy="28" r="22" fill="none" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="291" cy="18" r="2.5" fill="#5f6368" />
      <circle cx="291" cy="28" r="2.5" fill="#5f6368" />
      <circle cx="291" cy="38" r="2.5" fill="#5f6368" />
    </svg>
  )
}

function ChromeMenuIllustration() {
  return (
    <svg viewBox="0 0 230 130" className="ml-auto w-full max-w-[230px] rounded-xl" aria-hidden="true"
      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
      <rect width="230" height="130" rx="8" fill="white" />
      {/* New tab */}
      <text x="18" y="34" fill="#3c4043" fontSize="14"
        fontFamily="system-ui,-apple-system,sans-serif">New tab</text>
      <line x1="0" y1="50" x2="230" y2="50" stroke="#e0e0e0" strokeWidth="0.5" />
      {/* History */}
      <text x="18" y="76" fill="#3c4043" fontSize="14"
        fontFamily="system-ui,-apple-system,sans-serif">History</text>
      <line x1="0" y1="90" x2="230" y2="90" stroke="#e0e0e0" strokeWidth="0.5" />
      {/* Install app – highlighted */}
      <rect x="0" y="90" width="230" height="40" rx="0" fill="#fef9ee" />
      <path d="M0 90 h230 v26 q0 14 -8 14 h-214 q-8 0 -8 -14 Z" fill="#fef9ee" />
      <text x="18" y="114" fill="#1c1917" fontSize="14" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif">Install app</text>
    </svg>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  number, title, description, children,
}: {
  number: number
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marigold-400 text-xs font-bold text-white">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-night-800 dark:text-cream-100">{title}</h3>
      </div>
      {children && <div className="mb-2.5">{children}</div>}
      <p className="text-sm leading-relaxed text-night-700/80 dark:text-cream-300/60">{description}</p>
    </div>
  )
}

// ── Platform step sets ────────────────────────────────────────────────────────

function IOSSteps() {
  return (
    <>
      <StepCard number={1} title="Open this page in Safari"
        description="Add to Home Screen only works in Safari — not Chrome, Firefox, or in-app browsers (WhatsApp, Instagram). If you're in one of those, copy the link and paste it into Safari.">
        <div className="flex items-center gap-3 rounded-xl bg-[#f2f2f7] px-4 py-3">
          {/* Safari icon */}
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
            <circle cx="20" cy="20" r="20" fill="#1a7fca" />
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            {/* Compass tick marks */}
            {[0,45,90,135,180,225,270,315].map((deg) => {
              const r = deg % 90 === 0 ? 14 : 15.5
              const len = deg % 90 === 0 ? 2.5 : 1.5
              const rad = (deg * Math.PI) / 180
              const x1 = 20 + r * Math.sin(rad)
              const y1 = 20 - r * Math.cos(rad)
              const x2 = 20 + (r - len) * Math.sin(rad)
              const y2 = 20 - (r - len) * Math.cos(rad)
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />
            })}
            {/* Compass needle: red (N) + white (S) */}
            <polygon points="20,8 22,19 20,17 18,19" fill="#ff3b30" />
            <polygon points="20,32 22,21 20,23 18,21" fill="white" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#1c1c1e]">Open in Safari</p>
            <p className="text-xs text-[#6c6c70]">The default browser on iPhone and iPad</p>
          </div>
        </div>
      </StepCard>

      <StepCard number={2} title="Tap the Share button"
        description="The Share button is at the bottom of Safari — a square with an arrow pointing up.">
        <SafariToolbarIllustration />
      </StepCard>

      <StepCard number={3} title='Tap "Add to Home Screen"'
        description='Scroll down the share sheet and tap "Add to Home Screen". Then tap "Add" in the top-right corner to confirm.'>
        <SafariShareSheetIllustration />
      </StepCard>
    </>
  )
}

function AndroidSteps() {
  return (
    <>
      <StepCard number={1} title="Tap the menu in Chrome"
        description='Tap the three dots (⋮) in the top-right corner of Chrome.'>
        <ChromeBarIllustration />
      </StepCard>

      <StepCard number={2} title='Tap "Install app"'
        description='Tap "Install app" from the menu — this gives you the full app experience. If you see "Add to Home Screen" or "Create shortcut" instead, those work too but open inside the browser.'>
        <ChromeMenuIllustration />
      </StepCard>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export default function InstallGuide({ open, onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>(detectPlatform)
  const sheetRef = useRef<HTMLDivElement>(null)
  const installed = isAlreadyInstalled()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop — sits above SettingsSheet (z-40) */}
      <div
        className={`fixed inset-0 z-50 bg-night-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add to Home Screen guide"
        className={`fixed bottom-0 left-0 right-0 z-[60] max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-cream-50 shadow-2xl transition-transform duration-300 ease-out dark:border-t dark:border-night-700 dark:bg-night-900 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-cream-50 dark:bg-night-900">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-night-700/20 dark:bg-cream-300/20" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-base font-semibold text-night-800 dark:text-cream-100">
              Get the App
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-night-700 hover:bg-cream-300 dark:bg-night-700 dark:text-cream-300 dark:hover:bg-night-600"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M1 1 L9 9 M9 1 L1 9" />
              </svg>
            </button>
          </div>

          {/* Platform tabs */}
          {!installed && (
            <div className="flex gap-1.5 px-5 pb-3">
              {(['ios', 'android'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    platform === p
                      ? 'bg-night-800 text-cream-50 dark:bg-cream-100 dark:text-night-900'
                      : 'bg-cream-200 text-night-700/80 hover:bg-cream-300 dark:bg-night-700 dark:text-cream-300 dark:hover:bg-night-600'
                  }`}
                >
                  {p === 'ios' ? 'iPhone / iPad' : 'Android'}
                </button>
              ))}
            </div>
          )}

          <div className="h-px bg-cream-200 dark:bg-night-700" />
        </div>

        {/* Content */}
        <div className="px-5 pb-10 pt-5">
          {installed ? (
            <div className="py-10 text-center">
              <div className="mb-3 text-5xl">✓</div>
              <p className="text-base font-semibold text-night-800 dark:text-cream-100">
                Already on your home screen
              </p>
              <p className="mt-1.5 text-sm text-night-700/70 dark:text-cream-300/60">
                Manjree is installed. You're all set.
              </p>
            </div>
          ) : platform === 'ios' ? (
            <IOSSteps />
          ) : (
            <AndroidSteps />
          )}
        </div>
      </div>
    </>
  )
}
