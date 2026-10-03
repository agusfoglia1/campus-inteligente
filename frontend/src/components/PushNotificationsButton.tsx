import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function decodeBase64Url(value: string): ArrayBuffer {
  const padded = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(padded)
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return buffer
}

export default function PushNotificationsButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(available)
    if (available) {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setSubscribed(!!subscription))
        .catch(() => setSupported(false))
    }
  }, [])

  if (!supported) return null

  async function toggleSubscription() {
    setBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        await api.delete('/push/subscribe', { params: { endpoint: existing.endpoint } })
        await existing.unsubscribe()
        setSubscribed(false)
        setMessage('Avisos desactivados en este dispositivo.')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('No se habilitó el permiso de notificaciones en el navegador.')
        return
      }
      const { data } = await api.get<{ public_key: string }>('/push/public-key')
      if (!data.public_key) throw new Error('Las notificaciones todavía no están configuradas en el servidor.')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(data.public_key),
      })
      await api.post('/push/subscribe', subscription.toJSON())
      setSubscribed(true)
      setMessage('Listo. Vas a recibir comunicados de la universidad en este dispositivo.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo configurar la notificación push.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="font-display font-bold text-ink">Avisos en tu dispositivo</p>
        <p className="mt-1 text-sm text-ink/55">Recibí una notificación cuando se publique un comunicado.</p>
        {message && <p role="status" className="mt-2 text-xs text-cobalt">{message}</p>}
      </div>
      <button type="button" disabled={busy} onClick={toggleSubscription} className="shrink-0 rounded-full border border-cobalt/30 px-4 py-2 text-sm font-bold text-cobalt transition hover:bg-cobalt hover:text-white disabled:opacity-50">
        {busy ? 'Un momento…' : subscribed ? 'Desactivar avisos' : 'Activar avisos push'}
      </button>
    </section>
  )
}
