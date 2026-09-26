import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Agrega el token guardado a cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el backend responde 401 (sesión vencida/inválida), limpiamos la
// sesión guardada. La redirección a /login la maneja el AuthContext.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_role')
    }
    return Promise.reject(error)
  }
)

/**
 * Traduce un error de axios a un mensaje en español entendible para
 * mostrar en pantalla, distinguiendo los casos más comunes (sesión
 * vencida, sin permiso, no encontrado, sin conexión, error del servidor).
 */
export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!axios.isAxiosError(err)) return fallback
  const error = err as AxiosError<{ detail?: string }>

  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión o que el backend esté corriendo.'
  }

  const { status, data } = error.response
  if (status === 401) return 'Tu sesión venció. Iniciá sesión de nuevo.'
  if (status === 403) return 'No tenés permiso para ver esta información.'
  if (status === 404) return data?.detail ?? 'No se encontró lo que buscabas.'
  if (status >= 500) return 'Hubo un problema en el servidor. Intentá de nuevo en un momento.'
  return data?.detail ?? fallback
}
