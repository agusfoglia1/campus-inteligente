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
      <div className="max-w-sm mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-display text-2xl text-ink">Tu código de acceso</h1>
          <p className="text-ink/50 text-sm mt-1">
            Mostralo en la puerta del aula para registrar tu ingreso
          </p>
        </div>

        <div className="bg-ink rounded-2xl p-6 w-full flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 w-56 h-56 flex items-center justify-center">
            {loading ? (
              <p className="text-ink/30 text-sm">Generando...</p>
            ) : token ? (
              <QRCodeSVG value={token} size={200} />
            ) : (
              <p className="text-brick text-sm text-center px-2">{error}</p>
            )}
          </div>
        </div>

        {!loading && token && (
          <div className="w-full">
            <div className="w-full bg-ink/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cobalt h-1.5 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 25) * 100}%` }}
              />
            </div>
            <p className="text-center text-ink/50 text-sm mt-2">Se renueva en {secondsLeft}s</p>
          </div>
        )}

        {error && !loading && token && (
          <p className="text-brick text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
