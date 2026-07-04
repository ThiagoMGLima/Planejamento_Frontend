import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Tema claro/escuro. A fonte da verdade é o atributo `data-theme` no `<html>`
 * (lido pelas custom properties em tokens.css) + persistência em localStorage.
 *
 * Vive num Provider porque há consumidores em JS (ex.: EventBlock deriva a cor
 * da classe pelo tema, já que a cor é aplicada por style inline e não por CSS).
 * Estado isolado por componente não serviria: só quem alternou re-renderizaria.
 *
 * `getInitialTheme`/`applyTheme` são chamados também no `main.jsx` ANTES do
 * render para não haver flash de tema errado no primeiro paint.
 */
export const THEME_KEY = 'planejador:theme'

// Provider + helpers no mesmo módulo, de propósito (padrão dos stores).
// eslint-disable-next-line react-refresh/only-export-components
export function getInitialTheme() {
  try {
    const salvo = localStorage.getItem(THEME_KEY)
    if (salvo === 'light' || salvo === 'dark') return salvo
  } catch {
    /* localStorage indisponível — cai na preferência do SO */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// eslint-disable-next-line react-refresh/only-export-components
export function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

const ThemeContext = createContext(null)

// Fallback p/ consumidores fora do Provider (ex.: testes de unidade): tema claro
// e toggle inócuo. Assim componentes seguem renderizáveis isoladamente.
const FALLBACK = { theme: 'light', toggleTheme: () => {} }

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext) ?? FALLBACK
}
