import type { ReactNode } from 'react'

export type BadgeTone = 'signal' | 'amber' | 'brick' | 'cobalt' | 'neutral'

const TONES: Record<BadgeTone, string> = {
  signal: 'bg-signal-soft text-signal',
  amber: 'bg-amber-soft text-amber',
  brick: 'bg-brick-soft text-brick',
  cobalt: 'bg-cobalt-soft text-cobalt',
  neutral: 'bg-ink/5 text-ink/50',
}

/** Traduce un estado del backend (asistencia, inscripción, resultado de
 * escaneo, activo/inactivo) al color semántico que le corresponde. */
export function toneForEstado(estado: string): BadgeTone {
  if (['presente', 'ok', 'activo', 'cursando', 'aprobada'].includes(estado)) return 'signal'
  if (['tarde', 'wrong_classroom', 'no_class_now'].includes(estado)) return 'amber'
  if (['ausente', 'invalid_token', 'replay', 'unknown_student', 'inactivo', 'desaprobada'].includes(estado))
    return 'brick'
  return 'neutral'
}

export default function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
