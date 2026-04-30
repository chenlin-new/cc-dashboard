import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { messages, type Locale } from '../i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem('cc-locale') as Locale) || 'zh'
  })

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('cc-locale', l)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const msg = messages[locale]?.[key]
    if (!msg) return key
    if (!params) return msg
    return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
