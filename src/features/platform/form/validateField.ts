/**
 * Validación de un campo del formulario publicado.
 * Devuelve el mensaje en español, o null si el valor se puede guardar.
 * Un campo opcional vacío no es un error. "No" en un sí/no tampoco.
 */

import type { FormField } from './types'

const RIF_RE = /^[JGVEP]-\d{8,9}-\d$/
const CEDULA_RE = /^(?:[VE]-?\d{6,8}|[VE]-\d{1,3}(?:\.\d{3}){1,3})$/
const PASAPORTE_RE = /^P-\d{5,12}$/
const LETRAS = /\p{L}/u

export type TipoClient = 'juridica' | 'natural' | 'desconocido'

const empty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)

export const clientTypeFrom = (valores: Record<string, unknown>): TipoClient => {
  const crudo = String(valores.tipo_persona ?? valores['cliente.tipo_persona'] ?? '').trim().toLowerCase()
  if (crudo.includes('juríd') || crudo.includes('jurid')) return 'juridica'
  if (crudo.includes('natural')) return 'natural'
  return 'desconocido'
}

/** The client's own document follows the chosen type. A `*_rif` code is a company RIF. Anyone else (shareholder, representative, spouse) may be a natural person. */
const documentDelClient = (key: string) =>
  key === 'documento' || key === 'rif' || key === 'pj_rif' || key === 'pn_documento'

export const typeForDocument = (key: string, valores: Record<string, unknown>): TipoClient => {
  if (documentDelClient(key)) return clientTypeFrom(valores)
  if (key.endsWith('_rif')) return 'juridica'
  return 'desconocido'
}

/** RIF, cédula o pasaporte. El vacío lo resuelve quien llama. */
export const validateIdentityDocument = (value: string, tipo: TipoClient): string | null => {
  const t = value.trim().toUpperCase()
  if (!t) return null
  const rif = RIF_RE.test(t)
  const cedula = CEDULA_RE.test(t)
  const pasaporte = PASAPORTE_RE.test(t)
  if (tipo === 'juridica') return rif ? null : 'El RIF debe verse así: J-00000000-0.'
  if (tipo === 'natural') return cedula || pasaporte || rif ? null : 'La cédula debe verse así: V-12345678 o E-12345678.'
  return rif || cedula || pasaporte ? null : 'Use el formato J-00000000-0 para el RIF o V-12345678 para la cédula.'
}

const validateName = (value: string): string | null => {
  if (value.length < 3) return 'Debe tener al menos 3 caracteres.'
  if (!LETRAS.test(value)) return 'Debe contener letras, no solo números.'
  if (!/^[\p{L}\p{N}\s.,&'’\-()]+$/u.test(value)) return 'Contiene caracteres no válidos.'
  return null
}

const validateAmount = (value: string): string | null => {
  const cleaned = value.replace(/[$\s.,]/g, '')
  if (!/^\d+$/.test(cleaned)) return 'Solo números. Ejemplo: 250000'
  if (Number(cleaned) <= 0) return 'Debe ser mayor que cero.'
  return null
}

const validatePercent = (value: string): string | null => {
  const t = value.trim().replace(/%$/, '').trim()
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(t)) return 'Solo números entre 0 y 100.'
  const n = Number(t.replace(',', '.'))
  if (n < 0 || n > 100) return 'Solo números entre 0 y 100.'
  return null
}

const validateDate = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Indique una fecha válida.'
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return 'Indique una fecha válida.'
  }
  return null
}

export const validateField = (field: FormField, value: unknown, values: Record<string, unknown>): string | null => {
  if (field.tipo === 'archivo') {
    if (value instanceof File) return null
    if (empty(value)) return field.required ? 'Este campo es obligatorio.' : null
    return null
  }
  if (empty(value)) return field.required ? 'Este campo es obligatorio.' : null

  const text = String(value).trim()
  const key = field.standard ?? field.id

  if (field.tipo === 'si-no') {
    const t = text.toLowerCase()
    return t === 'si' || t === 'no' || t === 'true' || t === 'false' ? null : 'Seleccione sí o no.'
  }
  if (field.tipo === 'documento' || key === 'documento' || key === 'rif') {
    return validateIdentityDocument(text, typeForDocument(key, values))
  }
  if (field.tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text) ? null : 'Email no válido.'
  if (field.tipo === 'telefono') {
    const digits = text.replace(/\D/g, '')
    if (digits.length < 10 || !/^[\d\s+()\-.]+$/.test(text)) return 'Debe tener al menos 10 dígitos, con código de área.'
    return null
  }
  if (field.tipo === 'url') {
    return /^(https?:\/\/)?([\p{L}\d-]+\.)+\p{L}{2,}(\/\S*)?$/u.test(text) ? null : 'Dirección no válida. Ejemplo: www.company.com'
  }
  if (field.tipo === 'moneda') return validateAmount(text)
  if (field.tipo === 'porcentaje') return validatePercent(text)
  if (field.tipo === 'numero') return /^\d+$/.test(text.replace(/\s/g, '')) ? null : 'Solo números.'
  if (field.tipo === 'fecha') return validateDate(text)
  if ((key === 'nombre' || key === 'razon_social') && field.tipo === 'texto') return validateName(text)
  if ((key === 'domicilio' || key === 'direccion') && text.length < 10) {
    return 'Indique la dirección completa, no solo la ciudad.'
  }
  return null
}
