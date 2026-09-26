import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../lib/api'

interface QrTokenResponse {
  token: string
  expires_in: number // segundos
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
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow p-6 sm:p-8 flex flex-col items-center gap-4 max-w-sm w-full">
        <h1 className="text-xl font-bold text-blue-600">Mi QR de acceso</h1>
        <p className="text-slate-500 text-sm text-center">
          Mostrá este código en la puerta del aula para registrar tu ingreso
        </p>

        <div className="w-56 h-56 flex items-center justify-center border-4 border-blue-100 rounded-xl">
          {loading ? (
            <p className="text-slate-400 text-sm">Generando...</p>
          ) : token ? (
            <QRCodeSVG value={token} size={200} />
          ) : (
            <p className="text-red-500 text-sm text-center px-4">{error}</p>
          )}
        </div>

        {!loading && token && (
          <div className="w-full">
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 25) * 100}%` }}
              />
            </div>
            <p className="text-center text-slate-500 text-sm mt-2">
              Se renueva en {secondsLeft}s
            </p>
          </div>
        )}

        {error && !loading && token && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
      </div>

      <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">
        ← Volver al dashboard
      </Link>
    </div>
  )
}
