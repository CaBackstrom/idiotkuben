import { useRef, useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { track } from '../utils/telemetry'
import { sounds } from '../utils/sounds'

export type TutorContext = {
  phase: number
  phaseName: string
  currentMove: string
  explanation: string
  mode?: 'guided' | 'quick'
  moveIndex?: number
  totalMoves?: number
}

type Props = {
  context: TutorContext
  autoQuestion?: string
  onAutoQuestionHandled?: () => void
  preFill?: { text: string; seq: number }
}

const tutorUrl = (import.meta.env.VITE_TUTOR_URL as string | undefined) ?? ''

export default function TutorPanel({ context, autoQuestion, onAutoQuestionHandled, preFill }: Props) {
  const { t, lang } = useLanguage()
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [question, setQuestion] = useState('')
  const timestampsRef = useRef<number[]>([])
  const autoHandledRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle proactive auto-question from parent
  useEffect(() => {
    if (autoQuestion && !autoHandledRef.current) {
      autoHandledRef.current = true
      onAutoQuestionHandled?.()
      ask(autoQuestion)
    }
  // ask is defined below in this same scope — eslint-disable is needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuestion])

  // Handle "Stuck?" pre-fill trigger
  useEffect(() => {
    if (preFill) {
      setQuestion(preFill.text)
      inputRef.current?.focus()
    }
  }, [preFill])

  if (!tutorUrl) return null

  async function ask(q: string) {
    const now = Date.now()
    const recent = timestampsRef.current.filter(ts => now - ts < 60_000)
    if (recent.length >= 3) {
      setRateLimited(true)
      return
    }
    setRateLimited(false)
    timestampsRef.current = [...recent, now]

    setLoading(true)
    setError(false)
    setResponse(null)

    try {
      const res = await fetch(tutorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: { ...context, language: lang } }),
      })
      if (!res.ok) throw new Error('server error')
      const data = (await res.json()) as { answer: string }
      setResponse(data.answer)
      sounds.tutorPing()
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function handleAsk() {
    const q = question.trim()
    if (!q) return
    setQuestion('')
    track('tutor_asked', { type: 'free_text' })
    ask(q)
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 bg-white space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { track('tutor_asked', { type: 'explain_simpler' }); ask(t('tutor.explainQ')) }}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('tutor.explainSimpler')}
        </button>
        <button
          onClick={() => { track('tutor_asked', { type: 'why_move' }); ask(t('tutor.whyQ')) }}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('tutor.whyThisMove')}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAsk() }}
          placeholder={t('tutor.askPlaceholder')}
          disabled={loading}
          className="flex-1 text-sm border border-[var(--border)] rounded px-3 py-2 bg-white focus:outline-none focus:border-[var(--fg)] disabled:opacity-40"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-3 py-2 text-sm font-medium bg-[var(--fg)] text-white rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {t('tutor.ask')}
        </button>
      </div>

      {loading && (
        <p className="text-sm text-[var(--muted)]">{t('tutor.thinking')}</p>
      )}
      {!loading && rateLimited && (
        <p className="text-sm text-[var(--muted)]">{t('tutor.rateLimitMsg')}</p>
      )}
      {!loading && error && (
        <p className="text-sm text-[var(--muted)]">{t('tutor.errorMsg')}</p>
      )}
      {!loading && !error && !rateLimited && !response && (
        <p className="text-xs text-[var(--muted)] italic">{t('tutor.emptyState')}</p>
      )}
      {!loading && response && (
        <p className="text-sm text-[var(--fg)] leading-relaxed">{response}</p>
      )}
    </div>
  )
}
