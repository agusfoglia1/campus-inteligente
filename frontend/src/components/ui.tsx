import { useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { ToastContext, type ToastTone } from './toast'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; loading?: boolean }

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-cobalt shadow-sm',
  secondary: 'border border-ink/15 bg-white text-ink hover:border-cobalt hover:text-cobalt',
  ghost: 'text-ink/70 hover:bg-cobalt-soft hover:text-ink',
  danger: 'bg-brick text-white hover:bg-brick/90',
}

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={`ui-button ${buttonStyles[variant]} ${className}`}>
    {loading && <span className="ui-button-spinner" aria-hidden="true" />}{children}
  </button>
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`ui-card ${className}`} />
}

export interface TabItem { id: string; label: string; count?: number }
export function Tabs({ items, value, onChange, label = 'Secciones' }: { items: TabItem[]; value: string; onChange: (value: string) => void; label?: string }) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === value))
  const baseId = useId()
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (activeIndex + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length
    onChange(items[next].id)
    document.getElementById(`${baseId}-${items[next].id}`)?.focus()
  }
  return <div className="ui-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown} style={{ '--tab-count': items.length, '--tab-index': activeIndex } as React.CSSProperties}>
    <span className="ui-tabs-indicator" aria-hidden="true" />
    {items.map((item) => <button key={item.id} id={`${baseId}-${item.id}`} type="button" role="tab" aria-selected={item.id === value} tabIndex={item.id === value ? 0 : -1} className="ui-tab" onClick={() => onChange(item.id)}>
      {item.label}{item.count !== undefined && <span className="ui-tab-count">{item.count}</span>}
    </button>)}
  </div>
}

export function Drawer({ open, title, onClose, children, side = 'right' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; side?: 'right' | 'bottom' }) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const focusable = () => panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    window.requestAnimationFrame(() => (focusable()?.[0] ?? panelRef.current)?.focus())
    const manageKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const controls = [...(focusable() ?? [])]
      if (!controls.length) { event.preventDefault(); panelRef.current?.focus(); return }
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', manageKeys)
    document.body.classList.add('drawer-open')
    return () => { document.removeEventListener('keydown', manageKeys); document.body.classList.remove('drawer-open'); previousFocus?.focus() }
  }, [open])
  if (!open) return null
  return <div className="ui-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={panelRef} tabIndex={-1} className={`ui-drawer ui-drawer-${side}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="ui-drawer-header"><h2 id={titleId}>{title}</h2><button type="button" className="ui-icon-button" aria-label="Cerrar" onClick={onClose}>×</button></header>
      <div className="ui-drawer-content">{children}</div>
    </section>
  </div>
}

interface ToastMessage { id: number; message: string; tone: ToastTone }
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600)
  }, [])
  return <ToastContext.Provider value={notify}>{children}<div className="ui-toasts" aria-live="polite" aria-atomic="false">
    {toasts.map((toast) => <div key={toast.id} className={`ui-toast ui-toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}</span>{toast.message}<button type="button" aria-label="Cerrar aviso" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</button></div>)}
  </div></ToastContext.Provider>
}
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={`ui-skeleton ${className}`} />
}
export function DashboardSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Cargando información">
    <Skeleton className="h-52 rounded-3xl sm:col-span-2" />
    <Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-40 rounded-3xl" />
    <span className="sr-only">Cargando información…</span>
  </div>
}

export function EmptyState({ title, description, action, icon = '✦' }: { title: string; description: string; action?: ReactNode; icon?: string }) {
  return <div className="ui-empty-state"><svg viewBox="0 0 120 90" aria-hidden="true"><path d="M13 69h94M23 69V35l37-22 37 22v34M43 69V48h34v21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="92" cy="20" r="7" fill="currentColor" opacity=".22"/><circle cx="28" cy="20" r="4" fill="currentColor" opacity=".35"/></svg><span className="ui-empty-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function Stat({ label, value, suffix = '', detail, className = '' }: { label: string; value: number | null; suffix?: string; detail?: string; className?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === null || !Number.isFinite(value)) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      const frame = requestAnimationFrame(() => setDisplay(value))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const duration = 700
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <div className={`ui-stat ${className}`}><p>{label}</p><strong>{value === null ? '—' : `${Math.round(display)}${suffix}`}</strong>{detail && <span>{detail}</span>}</div>
}
