import { DashboardSkeleton, Skeleton } from './ui'

export default function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return label.toLocaleLowerCase('es').includes('dashboard') || label === 'Cargando...' ? <DashboardSkeleton /> : (
    <div className="grid gap-3 py-4" role="status" aria-label={label}>
      <Skeleton className="h-8 w-2/5 rounded-xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
