import { useCallback, useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import AppHeader from '../components/AppHeader'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapClassroom {
  id: string
  codigo: string
}

interface MapBuilding {
  id: string
  nombre: string
  latitude: number | null
  longitude: number | null
  classrooms: MapClassroom[]
}

interface CampusLocation {
  id: string
  nombre: string
  tipo: string
  latitude: number
  longitude: number
  descripcion: string | null
  building_id: string | null
}

interface CampusMapData {
  buildings: MapBuilding[]
  locations: CampusLocation[]
}

const TIPO_EMOJI: Record<string, string> = {
  biblioteca: '📚',
  comedor: '🍽️',
  sala_estudio: '📖',
  oficina: '🏢',
  bano: '🚻',
  laboratorio: '🔬',
  otro: '📍',
}

function locationIcon(tipo: string) {
  return L.divIcon({
    html: `
      <div style="
        width: 32px; height: 32px;
        background: white;
        border: 2px solid #2b4fd6;
        border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
        box-shadow: 0 1px 4px rgba(20,24,43,0.35);
      ">${TIPO_EMOJI[tipo] ?? '📍'}</div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function CampusMap() {
  const [data, setData] = useState<CampusMapData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get<CampusMapData>('/campus/map')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el mapa del campus.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const buildingsWithCoords = data?.buildings.filter(
    (b) => b.latitude !== null && b.longitude !== null
  ) ?? []
  const buildingsWithoutCoords = data?.buildings.filter(
    (b) => b.latitude === null || b.longitude === null
  ) ?? []

  const allPoints: [number, number][] = [
    ...buildingsWithCoords.map((b) => [b.latitude as number, b.longitude as number] as [number, number]),
    ...(data?.locations.map((l) => [l.latitude, l.longitude] as [number, number]) ?? []),
  ]
  const center: [number, number] =
    allPoints.length > 0
      ? [
          allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length,
          allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length,
        ]
      : [-31.2503, -61.4867]

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader backTo={{ to: '/dashboard', label: 'Dashboard' }} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <h1 className="font-display text-2xl text-ink">Mapa del campus</h1>

        {loading && <Spinner label="Cargando el mapa..." />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && data && (
          <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
            <MapContainer center={center} zoom={17} style={{ height: '450px', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {buildingsWithCoords.map((b) => (
                <Marker key={b.id} position={[b.latitude as number, b.longitude as number]}>
                  <Popup>
                    <strong>{b.nombre}</strong>
                    {b.classrooms.length > 0 && (
                      <p className="text-sm mt-1">
                        Aulas: {b.classrooms.map((c) => c.codigo).join(', ')}
                      </p>
                    )}
                  </Popup>
                </Marker>
              ))}

              {data.locations.map((loc) => (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={locationIcon(loc.tipo)}
                >
                  <Popup>
                    <strong>
                      {TIPO_EMOJI[loc.tipo] ?? '📍'} {loc.nombre}
                    </strong>
                    {loc.descripcion && <p className="text-sm mt-1">{loc.descripcion}</p>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {!loading && buildingsWithoutCoords.length > 0 && (
          <div className="border-l-4 border-amber bg-white rounded-r-xl p-4">
            <p className="text-ink/60 text-sm">
              Edificios sin coordenadas cargadas todavía (no aparecen en el mapa):{' '}
              {buildingsWithoutCoords.map((b) => b.nombre).join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
