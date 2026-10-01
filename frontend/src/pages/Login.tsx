import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Email o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="bg-ink text-paper flex-1 flex items-center px-8 py-16 md:py-0">
        <div className="max-w-sm mx-auto md:mx-0 md:ml-auto md:mr-16">
          <p className="font-display text-5xl leading-tight">
            Campus
            <br />
            Inteligente
          </p>
          <p className="mt-5 text-paper/60 leading-relaxed">
            Un QR por clase, una asistencia registrada. Entrá para ver tu
            horario, tu próxima clase y tu código de acceso del día.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-paper px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl text-ink">Iniciar sesión</h1>
            <p className="text-ink/50 text-sm mt-1">Usá tu cuenta del campus</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink/70">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink/70">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-ink/15 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt"
            />
          </div>

          {error && <p className="text-brick text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-cobalt text-white rounded-lg py-2.5 font-medium hover:bg-ink transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
