import { useState } from 'react'
import { sv } from '../i18n/sv'

const BANNER_KEY = 'idiotkuben:banner-dismissed'

export default function StorageBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(BANNER_KEY) === null
    } catch {
      return false
    }
  })

  if (!visible) return null

  function dismiss() {
    try {
      localStorage.setItem(BANNER_KEY, '1')
    } catch {
      // ignore storage errors
    }
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-3 flex items-center justify-between gap-4">
      <span>{sv.banner.storage}</span>
      <button
        onClick={dismiss}
        className="shrink-0 px-3 py-1 rounded border border-white/30 hover:bg-white/10 transition-colors"
      >
        {sv.banner.ok}
      </button>
    </div>
  )
}
