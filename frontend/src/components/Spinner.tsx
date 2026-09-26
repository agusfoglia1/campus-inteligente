export default function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
