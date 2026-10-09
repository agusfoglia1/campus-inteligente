import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import InstallAppButton from './InstallAppButton'
import CampusIcon from './CampusIcon'

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
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (user?.role !== 'student') return
    document.body.classList.add('has-student-nav')
    return () => document.body.classList.remove('has-student-nav')
  }, [user?.role])

  useEffect(() => {
    if (!accountOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  const navLink = (active: boolean) => `rounded-full px-3 py-2 text-sm font-semibold transition ${active ? 'bg-cobalt-soft text-ink' : 'text-ink/60 hover:bg-cobalt-soft hover:text-ink'}`

  return (
    <>
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

        <nav className={`order-3 w-full items-center gap-1 overflow-x-auto border-t border-ink/5 pt-2 sm:order-none sm:flex sm:w-auto sm:border-0 sm:pt-0 ${user?.role === 'student' ? 'hidden sm:flex' : 'flex'}`} aria-label="Navegación principal">
          {backTo ? (
            <Link to={backTo.to} aria-current={pathname === backTo.to ? 'page' : undefined} className={navLink(pathname === backTo.to)}>← {backTo.label}</Link>
          ) : (
            <Link to="/dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined} className={navLink(pathname === '/dashboard')}>Inicio</Link>
          )}
          {user?.role === 'student' && <Link to="/materias" aria-current={pathname === '/materias' ? 'page' : undefined} className={navLink(pathname === '/materias')}>Mis materias</Link>}
          {user?.role === 'student' && <Link to="/perfil" aria-current={pathname === '/perfil' ? 'page' : undefined} className={navLink(pathname === '/perfil')}>Mi perfil</Link>}
          {user?.role === 'student' && <Link to="/qr" aria-current={pathname === '/qr' ? 'page' : undefined} className={navLink(pathname === '/qr')}>Mi QR</Link>}
          <Link to="/mapa" aria-current={pathname === '/mapa' ? 'page' : undefined} className={navLink(pathname === '/mapa')}>Mapa del campus</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
          <InstallAppButton />
          {user && <div className="relative" ref={accountRef}>
            <button
              ref={accountButtonRef}
              type="button"
              aria-label={`Cuenta de ${user.full_name}`}
              aria-haspopup="true"
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              onClick={() => setAccountOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-ink/10 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink transition hover:border-cobalt/40 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-strong"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-soft text-sm font-bold uppercase text-ink" aria-hidden="true">{user.full_name.slice(0, 1)}</span>
              <span className="hidden max-w-36 truncate sm:inline">{user.full_name}</span>
              <span className="sm:hidden">Cuenta</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 text-ink/45 transition-transform ${accountOpen ? 'rotate-180' : ''}`}><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {accountOpen && <div id="account-menu" aria-label="Opciones de cuenta" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl shadow-ink/10">
              <div className="border-b border-ink/10 px-3 py-3">
                <p className="truncate text-sm font-bold text-ink">{user.full_name}</p>
                <p className="mt-0.5 text-xs capitalize text-ink/50">{user.role === 'admin' ? 'Administración' : user.role === 'teacher' ? 'Docencia' : 'Estudiante'}</p>
              </div>
              <button type="button" onClick={() => { setAccountOpen(false); logout() }} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-brick transition hover:bg-brick-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5"><path d="M8 3.5H4.5v13H8M11.5 6.5l3.5 3.5-3.5 3.5M7 10h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Cerrar sesión
              </button>
            </div>}
          </div>}
        </div>
      </div>
    </header>
      {user?.role === 'student' && <nav className="mobile-bottom-nav sm:hidden" aria-label="Navegación principal">
        {[
          { to: '/dashboard', label: 'Inicio', icon: 'home' as const },
          { to: '/qr', label: 'Mi QR', icon: 'qr' as const, qr: true },
          { to: '/materias', label: 'Materias', icon: 'bookOpen' as const },
          { to: '/mapa', label: 'Mapa', icon: 'map' as const },
        ].map((item) => <Link key={item.to} to={item.to} aria-current={pathname === item.to ? 'page' : undefined} className={`mobile-bottom-link ${item.qr ? 'mobile-bottom-link-qr' : ''}`}>
          <CampusIcon name={item.icon} className="h-5 w-5" /><span>{item.label}</span>
        </Link>)}
      </nav>}
    </>
  )
}
