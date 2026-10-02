import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, getErrorMessage } from '../lib/api'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import AppHeader from '../components/AppHeader'

function MapFocus({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 18, { duration: 0.8 })
  }, [map, position])
  return null
}

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

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

function locationIcon(tipo: string) {
  return L.divIcon({
    html: `
      <div style="
        width: 32px; height: 32px;
        background: white;
        border: 2px solid #48aeb0;
        border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(48,56,58,0.22);
      ">${TIPO_EMOJI[tipo] ?? '📍'}</div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const userLocationIcon = L.divIcon({
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.2),0 2px 8px rgba(0,0,0,.35)"></div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function CampusMap() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<CampusMapData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('destino') ?? '')
  const [category, setCategory] = useState('todos')
  const [focusPosition, setFocusPosition] = useState<[number, number] | null>(null)
  const [userPosition, setUserPosition] = useState<{ coords: [number, number]; accuracy: number } | null>(null)
  const [trackingLocation, setTrackingLocation] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const watchId = useRef<number | null>(null)

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
  }, [])

  const toggleLocation = () => {
    if (trackingLocation) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
      setTrackingLocation(false)
      setLocationLoading(false)
      setUserPosition(null)
      setLocationError('')
      return
    }
    if (!navigator.geolocation) {
      setLocationError('Este navegador no permite acceder a la ubicación.')
      return
    }

    setLocationError('')
    setLocationLoading(true)
    setTrackingLocation(true)
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserPosition({ coords, accuracy: position.coords.accuracy })
        setFocusPosition(coords)
        setLocationLoading(false)
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'No se concedió permiso de ubicación. Podés habilitarlo desde los ajustes del navegador.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'El dispositivo no pudo determinar la ubicación. Probá al aire libre o revisá el GPS.'
            : 'La ubicación tardó demasiado en responder. Intentá nuevamente.'
        setLocationError(message)
        setLocationLoading(false)
        setTrackingLocation(false)
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    )
  }

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

  useEffect(() => {
    const destination = searchParams.get('destino')
    const building = data?.buildings.find((item) => normalizeSearch(item.nombre) === normalizeSearch(destination ?? ''))
    if (building && building.latitude !== null && building.longitude !== null) {
      setFocusPosition([building.latitude, building.longitude])
    }
  }, [data, searchParams])

  const buildingsWithCoords = data?.buildings.filter(
    (b) => b.latitude !== null && b.longitude !== null
  ) ?? []
  const buildingsWithoutCoords = data?.buildings.filter(
    (b) => b.latitude === null || b.longitude === null
  ) ?? []

  const normalizedQuery = normalizeSearch(query.trim())
  const visibleBuildings = useMemo(() => (data?.buildings ?? []).filter((building) => {
    if (category !== 'todos' && category !== 'edificios') return false
    const classroomText = building.classrooms.map((classroom) => classroom.codigo).join(' ')
    return normalizeSearch(`${building.nombre} ${classroomText}`).includes(normalizedQuery)
  }), [data, category, normalizedQuery])
  const visibleLocations = useMemo(() => (data?.locations ?? []).filter((location) => {
    if (category === 'edificios' || (category !== 'todos' && category !== location.tipo)) return false
    return normalizeSearch(`${location.nombre} ${location.descripcion ?? ''} ${location.tipo}`).includes(normalizedQuery)
  }), [data, category, normalizedQuery])

  const focusBuilding = (building: MapBuilding) => {
    if (building.latitude !== null && building.longitude !== null) setFocusPosition([building.latitude, building.longitude])
  }
  const directionsUrl = (latitude: number, longitude: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`

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
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">Explorá tu universidad</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Mapa del campus</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink/50">Encontrá edificios y espacios útiles para acompañar tu día en la universidad.</p>
          </div>
          {data && <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white px-3 py-2 text-ink/60 shadow-sm">{visibleBuildings.length} edificios</span>
            <span className="rounded-full bg-white px-3 py-2 text-ink/60 shadow-sm">{visibleLocations.length} espacios</span>
          </div>}
        </section>

        {!loading && !error && data && <section className="grid grid-cols-1 gap-3 rounded-3xl border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
          <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/45">Buscar en el campus</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Edificio, aula o espacio…"
              className="w-full rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-cobalt focus:ring-4 focus:ring-cobalt/10" />
          </label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/45">Categoría</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-cobalt">
              <option value="todos">Todos los lugares</option><option value="edificios">Edificios y aulas</option>
              {[...new Set(data.locations.map((location) => location.tipo))].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
            </select>
          </label>
        </section>}

        {loading && <Spinner label="Cargando el mapa..." />}
        {error && <ErrorMessage message={error} onRetry={load} />}

        {!loading && !error && data && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 px-5 py-4 sm:px-6">
                <div><p className="font-display font-extrabold text-ink">Vista general</p><p className="text-xs text-ink/45">Seleccioná un marcador para ver más información.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={toggleLocation} className={`rounded-full px-4 py-2 text-xs font-bold transition ${trackingLocation ? 'border border-cobalt/20 bg-cobalt-soft text-cobalt' : 'bg-cobalt text-white hover:bg-ink'}`}>
                    {locationLoading ? 'Buscando ubicación…' : trackingLocation ? 'Dejar de localizarme' : '◎ Usar mi ubicación'}
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-full bg-cobalt-soft px-3 py-1.5 text-xs font-bold text-ink/65"><span className="h-2 w-2 rounded-full bg-cobalt" />OpenStreetMap</span>
                </div>
              </div>
              {locationError && <p role="status" className="border-b border-ink/5 bg-amber-soft px-5 py-3 text-sm text-ink/75 sm:px-6">{locationError}</p>}
              {userPosition && <p role="status" className="border-b border-ink/5 px-5 py-2 text-xs text-ink/50 sm:px-6">Ubicación activa · precisión aproximada ±{Math.round(userPosition.accuracy)} m. La posición se actualiza mientras esta pantalla está abierta.</p>}
              <MapContainer center={center} zoom={17} style={{ height: 'min(68vh, 640px)', minHeight: '420px', width: '100%' }}>
                <MapFocus position={focusPosition} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userPosition && <Marker position={userPosition.coords} icon={userLocationIcon} zIndexOffset={1000}>
                  <Popup>Tu ubicación actual · precisión aproximada ±{Math.round(userPosition.accuracy)} m</Popup>
                </Marker>}

                {visibleBuildings.filter((building) => building.latitude !== null && building.longitude !== null).map((b) => (
                  <Marker key={b.id} position={[b.latitude as number, b.longitude as number]}>
                    <Popup>
                      <strong>{b.nombre}</strong>
                      {b.classrooms.length > 0 && <p className="mt-1 text-sm">Aulas: {b.classrooms.map((c) => c.codigo).join(', ')}</p>}
                    </Popup>
                  </Marker>
                ))}

                {visibleLocations.map((loc) => (
                  <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={locationIcon(loc.tipo)}>
                    <Popup>
                      <strong>{TIPO_EMOJI[loc.tipo] ?? '📍'} {loc.nombre}</strong>
                      {loc.descripcion && <p className="mt-1 text-sm">{loc.descripcion}</p>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </section>

            <aside className="flex flex-col gap-4">
              <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
                <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[.15em] text-cobalt">Puntos de interés</p><h2 className="mt-1 font-display text-lg font-extrabold text-ink">Espacios del campus</h2></div>
                {visibleLocations.length === 0 ? <p className="text-sm text-ink/45">No encontramos espacios con esos filtros.</p> : (
                  <ul className="max-h-[320px] divide-y divide-ink/5 overflow-y-auto">
                    {visibleLocations.map((loc) => <li key={loc.id} className="flex items-start gap-3 py-3 first:pt-1">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-base">{TIPO_EMOJI[loc.tipo] ?? '📍'}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{loc.nombre}</p><p className="mt-0.5 text-xs capitalize text-ink/45">{loc.tipo.replace('_', ' ')}</p><button onClick={() => setFocusPosition([loc.latitude, loc.longitude])} className="mt-1 text-xs font-bold text-cobalt hover:underline">Ver en el mapa</button></div>
                      <a href={directionsUrl(loc.latitude, loc.longitude)} target="_blank" rel="noreferrer" className="shrink-0 self-center text-xs font-bold text-cobalt hover:underline">Cómo llegar ↗</a>
                    </li>)}
                  </ul>
                )}
              </section>
              <section className="rounded-3xl bg-ink p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8bd2cf]">Edificios</p>
                <ul className="mt-3 divide-y divide-white/10">
                  {visibleBuildings.map((building) => <li key={building.id} className="flex items-center justify-between gap-3 py-3 first:pt-1">
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{building.nombre}</p><p className="text-xs text-white/45">{building.classrooms.length} aulas</p></div>
                    <div className="flex items-center gap-2">
                      {building.latitude !== null && building.longitude !== null && <><button onClick={() => focusBuilding(building)} className="text-xs font-bold text-[#8bd2cf] hover:underline">Ver</button><a href={directionsUrl(building.latitude, building.longitude)} target="_blank" rel="noreferrer" className="text-xs font-bold text-white hover:underline">Cómo llegar ↗</a></>}
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${building.latitude !== null && building.longitude !== null ? 'bg-[#8bd2cf]' : 'bg-amber'}`} title={building.latitude !== null && building.longitude !== null ? 'Ubicado en el mapa' : 'Sin coordenadas'} />
                    </div>
                  </li>)}
                </ul>
              </section>
            </aside>
          </div>
        )}

        {!loading && buildingsWithoutCoords.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber-soft p-4">
            <span className="font-bold text-amber">i</span><p className="text-sm text-ink/65">
              Edificios sin coordenadas (no aparecen en el mapa):{' '}
              {buildingsWithoutCoords.map((b) => b.nombre).join(', ')}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
