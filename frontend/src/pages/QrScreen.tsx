import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api, getErrorMessage } from '../lib/api'
import AppHeader from '../components/AppHeader'

interface QrTokenResponse {
  token: string
  expires_in: number
}

export default function QrScreen() {
  const [token, setToken] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const { data } = await api.post<QrTokenResponse>('/qr/token')
      setToken(data.token)
      setSecondsLeft(data.expires_in)
    } catch (err) {
      setToken(null)
      setError(getErrorMessage(err, 'No se pudo generar el QR.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    let active = true
    const requestWakeLock = async () => {
      const manager = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      if (!manager || document.visibilityState !== 'visible') return
      try {
        const lock = await manager.request('screen')
        if (active) wakeLockRef.current = lock
        else await lock.release()
      } catch { /* El navegador puede denegar Wake Lock; el QR sigue disponible. */ }
    }
    void requestWakeLock()
    const onVisibility = () => { if (document.visibilityState === 'visible') void requestWakeLock() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      if (wakeLockRef.current) void wakeLockRef.current.release()
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(() => setSecondsLeft((prev) => Math.max(0, prev - 1)), 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchToken])

  useEffect(() => {
    if (token && secondsLeft === 0 && !loading) {
      setToken(null)
      void fetchToken()
    }
  }, [fetchToken, loading, secondsLeft, token])

  useEffect(() => {
    if (!error || token) return
    retryTimerRef.current = window.setTimeout(() => void fetchToken(), 5000)
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current) }
  }, [error, fetchToken, token])

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Inicio' }} />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-7 pb-28 sm:px-6 sm:py-10 sm:pb-10 lg:grid-cols-[1fr_.8fr] lg:items-center lg:px-8">
        <section className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Acceso digital</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Tu código de acceso</h1>
          <p className="mt-3 max-w-lg text-base leading-7 text-ink/55">Mostrá este código en la puerta del aula para registrar tu ingreso a clase.</p>
          <div className="mt-8 flex flex-col gap-3 sm:max-w-lg">
            <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cobalt-soft font-bold text-cobalt">1</span>
              <p className="pt-1 text-sm leading-5 text-ink/65">Acercá la pantalla a la cámara ubicada en la entrada del aula.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft font-bold text-ink">2</span>
              <p className="pt-1 text-sm leading-5 text-ink/65">El código se renueva automáticamente para proteger tu acceso.</p>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-ink/40"><span className="h-2 w-2 rounded-full bg-signal" /> Sesión segura · No compartas una captura del código</p>
        </section>

        <section className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 rounded-[36px] bg-cobalt/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-ink/10 bg-white p-4 shadow-xl shadow-ink/10 sm:p-6">
            <div className="flex items-center justify-between px-1 pb-4">
              <div><p className="font-display font-extrabold text-ink">Pase de asistencia</p><p className="text-xs text-ink/45">Campus Inteligente · UNRaf</p></div>
              <span className="rounded-full bg-signal-soft px-3 py-1 text-xs font-bold text-signal">En vivo</span>
            </div>
            <div className="campus-grid relative flex items-center justify-center rounded-[26px] bg-ink p-5 sm:p-7">
              <div className="relative flex aspect-square w-full max-w-[300px] items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(255 255 255 / .18)" strokeWidth="1.2" />
                <circle cx="50" cy="50" r="47" fill="none" stroke={secondsLeft <= 5 ? '#d4a92f' : '#8bd2cf'} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="295.3" strokeDashoffset={`${295.3 * (1 - secondsLeft / 25)}`} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
              </svg>
              <div className="relative z-10 flex aspect-square w-[82%] items-center justify-center rounded-2xl bg-white p-3 shadow-lg sm:p-4">
            {loading ? (
              <div className="grid w-full gap-3"><div className="ui-skeleton h-4 rounded-full"/><div className="ui-skeleton aspect-square rounded-xl"/><p className="text-center text-xs text-ink/50">Generando código…</p></div>
            ) : token ? (
              <div key={token} className="qr-code-enter flex h-full w-full items-center justify-center"><QRCodeSVG value={token} size={240} level="M" marginSize={2} style={{ width: '100%', height: '100%', maxWidth: 240, maxHeight: 240 }} /></div>
            ) : (
              <div className="px-2 text-center"><p className="text-sm font-semibold text-brick">{error}</p><button type="button" onClick={() => void fetchToken()} className="mt-3 min-h-11 rounded-full bg-ink px-4 text-xs font-bold text-white">Reintentar conexión</button></div>
            )}
              </div>
              </div>
            </div>

            {!loading && token && (
              <div className="px-1 pt-5">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-ink/50">
                  <span>{secondsLeft <= 5 ? 'Renovando en unos segundos' : 'El código se actualiza en'}</span><span className="tabular-nums text-ink">00:{String(secondsLeft).padStart(2, '0')}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-gradient-to-r from-cobalt to-[#8bd2cf] transition-all duration-1000 ease-linear" style={{ width: `${(secondsLeft / 25) * 100}%` }} />
                </div>
                {error && <p role="status" className="mt-3 text-center text-xs text-brick">Se perdió la conexión. <button type="button" className="font-bold underline" onClick={() => void fetchToken()}>Reintentar</button></p>}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
