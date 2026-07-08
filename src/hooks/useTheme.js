import { useEffect, useState } from 'react'

const KEY = 'manjrees.theme'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'system')

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const toggle = () => {
    const dark = document.documentElement.classList.contains('dark')
    const next = dark ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    setTheme(next)
  }

  return { theme, toggle }
}
