import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  backTo?: { to: string; label: string }
}

/** Header fijo, presente en todas las pantallas autenticadas. Reemplaza la
 * tarjeta blanca "Hola, X / Cerrar sesión" que se repetía en cada archivo. */
export default function AppHeader({ backTo }: Props) {
  const { user, logout } = useAuth()

  return (
    <header className="bg-ink text-paper">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl">Campus</span>
          {user && (
            <span className="hidden sm:inline text-xs text-paper/50 border border-paper/20 rounded-full px-2 py-0.5 capitalize">
              {user.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {backTo && (
            <Link to={backTo.to} className="text-paper/70 hover:text-paper transition-colors">
              ← {backTo.label}
            </Link>
          )}
          {user && (
            <>
              <span className="text-paper/70 hidden sm:inline">{user.full_name}</span>
              <button onClick={logout} className="text-paper/70 hover:text-paper transition-colors">
                Salir
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
