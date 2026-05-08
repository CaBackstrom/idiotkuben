import { createContext, useContext, useState, type ReactNode } from 'react'
import { type Language, t as tFn } from '../i18n/index'

type LanguageContextValue = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('idiotkuben:lang')
      if (saved === 'en' || saved === 'sv') return saved
    } catch {
      // ignore storage errors
    }
    return 'en'
  })

  function setLang(newLang: Language) {
    setLangState(newLang)
    try {
      localStorage.setItem('idiotkuben:lang', newLang)
    } catch {
      // ignore storage errors
    }
  }

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key: string) => tFn(key, lang),
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
