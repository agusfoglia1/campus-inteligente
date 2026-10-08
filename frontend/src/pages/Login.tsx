import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CampusMark } from '../components/AppHeader'
import { Button } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative isolate flex min-h-[390px] overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="campus-grid absolute inset-0 -z-10 opacity-30" />
        <div className="absolute -right-24 -top-28 -z-10 h-[420px] w-[420px] rounded-full border border-white/10" />
        <div className="absolute -right-4 -top-8 -z-10 h-[280px] w-[280px] rounded-full border border-cobalt/50" />
        <div className="absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-cobalt/25 blur-3xl" />
        <div className="mx-auto flex w-full max-w-xl flex-col lg:mx-0 lg:my-auto">
          <div className="flex items-center gap-3">
            <CampusMark />
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight">Campus Inteligente</p>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/55">Universidad Nacional de Rafaela</p>
            </div>
          </div>

          <div className="mt-12 max-w-lg sm:mt-16 lg:mt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-white/75">
              <span className="h-2 w-2 rounded-full bg-amber" /> Tu espacio en la universidad
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Todo tu campus,<br />
              <span className="text-[#8bd2cf]">más cerca.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/65 sm:text-lg">
              Tus clases, tus espacios y tu vida académica reunidos en un solo lugar.
            </p>
          </div>

          <div className="mt-10 flex max-w-lg flex-wrap gap-2 lg:mt-16">
            {['Tu horario', 'Acceso con QR', 'Mapa del campus'].map((item) => (
              <span key={item} className="rounded-full border border-white/15 bg-white/[.06] px-3.5 py-2 text-sm text-white/75">{item}</span>
            ))}
          </div>
          <p className="mt-10 text-xs tracking-wide text-white/35 lg:mt-auto lg:pt-20">UNRaf · Campus Inteligente</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-cobalt">Portal universitario</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Te damos la bienvenida</h2>
          <p className="mt-3 text-ink/55">Ingresá con tu cuenta para continuar.</p>

          <div className="mt-9 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-ink">Correo electrónico</label>
              <input id="email" type="email" autoComplete="username" required value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }} onBlur={(e) => { if (e.target.value && !e.currentTarget.validity.valid) setError('Revisá el formato del correo electrónico.') }} aria-invalid={!!error && !email.includes('@')}
                placeholder="nombre@universidad.edu.ar"
                className="rounded-xl border border-ink/15 bg-paper/60 px-4 py-3.5 text-ink outline-none transition placeholder:text-ink/30 focus:border-cobalt focus:bg-white focus:ring-4 focus:ring-cobalt/10" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-ink">Contraseña</label>
              <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={1} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Ingresá tu contraseña"
                className="w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3.5 pr-24 text-ink outline-none transition placeholder:text-ink/30 focus:border-cobalt focus:bg-white focus:ring-4 focus:ring-cobalt/10" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 min-h-10 -translate-y-1/2 rounded-lg px-3 text-xs font-bold text-ink/60 hover:bg-cobalt-soft" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl border border-brick/15 bg-brick-soft px-4 py-3 text-sm text-brick">{error}</p>}
          <Button type="submit" loading={loading} className="mt-7 w-full rounded-xl bg-ink px-5 py-4 font-semibold text-white shadow-lg shadow-ink/10 hover:bg-cobalt focus:outline-none focus:ring-4 focus:ring-cobalt/20">
            {loading ? 'Ingresando…' : 'Ingresar al campus'}
            {!loading && <span aria-hidden="true">→</span>}
          </Button>
          <p className="mt-7 text-center text-xs leading-5 text-ink/40">Acceso exclusivo para estudiantes, docentes y personal de la universidad.</p>
        </form>
      </section>
    </main>
  )
}
