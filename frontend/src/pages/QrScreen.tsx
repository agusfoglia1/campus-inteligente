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

  const fetchToken = useCallback(async () => {
    try {
      setError('')
      const { data } = await api.post<QrTokenResponse>('/qr/token')
      setToken(data.token)
      setSecondsLeft(data.expires_in)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar el QR.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchToken()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchToken])

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Dashboard' }} />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1fr_.8fr] lg:items-center lg:px-8">
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
              <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-cobalt/35 via-transparent to-amber/10" />
              <div className="relative flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl bg-white p-4 shadow-lg">
            {loading ? (
              <p className="text-sm text-ink/40">Generando código…</p>
            ) : token ? (
              <QRCodeSVG value={token} size={240} level="M" marginSize={1} />
            ) : (
              <p className="text-brick text-sm text-center px-2">{error}</p>
            )}
              </div>
            </div>

            {!loading && token && (
              <div className="px-1 pt-5">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-ink/50">
                  <span>El código se actualiza en</span><span className="tabular-nums text-ink">00:{String(secondsLeft).padStart(2, '0')}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-gradient-to-r from-cobalt to-[#8bd2cf] transition-all duration-1000 ease-linear" style={{ width: `${(secondsLeft / 25) * 100}%` }} />
                </div>
                {error && <p className="mt-3 text-center text-xs text-amber">No se pudo renovar el código. Reintentando…</p>}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
