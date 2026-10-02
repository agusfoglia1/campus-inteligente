import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InstallAppButton from './InstallAppButton'

interface Props {
  backTo?: { to: string; label: string }
}

function CampusMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 42" className="h-10 w-10 shrink-0">
      <path d="M21 2.5 26.3 15.7 21 21l-5.3-5.3L21 2.5Z" fill="#48aeb0" />
      <path d="M39.5 21 26.3 26.3 21 21l5.3-5.3L39.5 21Z" fill="#e2c34f" />
      <path d="M21 39.5 15.7 26.3 21 21l5.3 5.3L21 39.5Z" fill="#48aeb0" />
      <path d="M2.5 21 15.7 15.7 21 21l-5.3 5.3L2.5 21Z" fill="#e2c34f" />
      <circle cx="21" cy="21" r="4.2" fill="#30383a" />
    </svg>
  )
}

export { CampusMark }

/** Barra institucional compartida por todas las pantallas autenticadas. */
export default function AppHeader({ backTo }: Props) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const navLink = (active: boolean) => `rounded-full px-3 py-2 text-sm font-semibold transition ${active ? 'bg-cobalt-soft text-ink' : 'text-ink/60 hover:bg-cobalt-soft hover:text-ink'}`

  return (
    <header className="sticky top-0 z-[1000] border-b border-ink/10 bg-white/95 backdrop-blur-md">
      <div className="h-1 bg-gradient-to-r from-cobalt via-[#8ac9c5] to-amber" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Campus Inteligente, inicio">
          <CampusMark />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">Campus</span>
            <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-ink/45">UNRaf · vida universitaria</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-ink/5 pt-2 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
          {backTo ? (
            <Link to={backTo.to} className={navLink(pathname === backTo.to)}>← {backTo.label}</Link>
          ) : (
            <Link to="/dashboard" className={navLink(pathname === '/dashboard')}>Inicio</Link>
          )}
          {user?.role === 'student' && <Link to="/materias" className={navLink(pathname === '/materias')}>Mis materias</Link>}
          {user?.role === 'student' && <Link to="/perfil" className={navLink(pathname === '/perfil')}>Mi perfil</Link>}
          {user?.role === 'student' && <Link to="/qr" className={navLink(pathname === '/qr')}>Mi QR</Link>}
          <Link to="/mapa" className={navLink(pathname === '/mapa')}>Mapa del campus</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
          <InstallAppButton />
          {user && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cobalt-soft text-sm font-bold uppercase text-ink">
                {user.full_name.slice(0, 1)}
              </span>
              <span className="max-w-40 truncate text-sm font-medium text-ink">{user.full_name}</span>
            </div>
          )}
          {user && <button onClick={logout} className="rounded-full border border-ink/15 px-3.5 py-2 text-sm font-semibold text-ink/65 transition hover:border-ink hover:text-ink">Salir</button>}
        </div>
      </div>
    </header>
  )
}
