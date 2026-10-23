import { httpClient } from '@/shared/api/client'

/** Extensions the internal alta accepts. The multipart field names stay `archivo` and `campo`. */
const EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'])

export const ACCEPT_DOCUMENTS = '.pdf,.doc,.docx,.png,.jpg,.jpeg'

export const FILE_TYPE_MESSAGE = 'Solo se aceptan archivos pdf, doc, docx, png, jpg o jpeg.'

export const fileAllowed = (archivo: File): boolean => {
  const name = archivo.name.trim().toLowerCase()
  const punto = name.lastIndexOf('.')
  if (punto <= 0 || punto === name.length - 1) return false
  return EXTENSIONS.has(name.slice(punto + 1))
}

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { detail?: unknown; message?: unknown } } })?.response?.data
  const detail = data?.detail ?? data?.message
  if (typeof detail === 'string' && detail.trim()) return detail.trim()
  if (Array.isArray(detail)) {
    const partes = detail.map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg).trim()
      return ''
    }).filter(Boolean)
    if (partes.length) return partes.join(' ')
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = String((detail as { message: unknown }).message ?? '').trim()
    if (message) return message
  }
  return fallback
}

/** POST /api/v1/clientes/{id}/documentos — `archivo` is the file, `campo` is the field code. */
export const uploadClientDocument = (clientId: string, field: string, archivo: File) => {
  const body = new FormData()
  body.append('archivo', archivo)
  body.append('campo', field)
  return httpClient.post(
    `/clientes/${encodeURIComponent(clientId)}/documentos`,
    body,
    {
      // The shared client sends JSON by default. Clearing this header lets the
      // browser attach the multipart boundary; a bare multipart type is rejected.
      transformRequest: [(data, headers) => {
        headers.setContentType(false)
        return data
      }],
    },
  ).then(r => r.data)
}
