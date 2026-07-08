import { useEffect, useState } from 'react'

const KEY = 'manjrees.theme'

type Theme = 'light' | 'dark' | 'system'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme) || 'system')

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
    const next: Theme = dark ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    setTheme(next)
  }

  return { theme, toggle }
}
