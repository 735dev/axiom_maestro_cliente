/**
 * Reglas de validación de la ficha del cliente.
 * Devuelven el mensaje de error, o null si el valor es válido.
 */

const LETRAS = /\p{L}/u

export const requerido = (v: string, nombre = 'Este campo') =>
  !v.trim() ? `${nombre} es obligatorio.` : null

export const razonSocial = (v: string) => {
  const t = v.trim()
  if (!t) return 'La razón social es obligatoria.'
  if (t.length < 3) return 'Debe tener al menos 3 caracteres.'
  if (!LETRAS.test(t)) return 'Debe contener letras, no solo números.'
  if (!/^[\p{L}\p{N}\s.,&'’\-()]+$/u.test(t)) return 'Contiene caracteres no válidos.'
  return null
}

// Algunas empresas usan RIF con 8 y otras con 9 dígitos centrales.
export const RIF_RE = /^[JGVEP]-\d{8,9}-\d$/

export const rif = (v: string, existentes: string[] = []) => {
  const t = v.trim().toUpperCase()
  if (!t) return 'El RIF es obligatorio.'
  if (!RIF_RE.test(t)) return 'Formato esperado: J-00000000-0. Se admite en minúscula.'
  if (existentes.includes(t)) return 'Ese RIF ya está registrado: el cliente ya existe en el Maestro.'
  return null
}

export const correo = (v: string) => {
  const t = v.trim()
  if (!t) return 'El correo corporativo es obligatorio: es el canal de comunicación.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return 'Correo no válido.'
  return null
}

export const telefono = (v: string) => {
  const t = v.trim()
  if (!t) return 'El teléfono es obligatorio.'
  const digitos = t.replace(/\D/g, '')
  if (digitos.length < 10) return 'Debe tener al menos 10 dígitos, con código de área.'
  if (!/^[\d\s+()\-.]+$/.test(t)) return 'Solo dígitos, espacios y los signos + ( ) -'
  return null
}

export const web = (v: string) => {
  const t = v.trim()
  if (!t) return null // opcional
  if (!/^(https?:\/\/)?([\p{L}\d-]+\.)+\p{L}{2,}(\/\S*)?$/u.test(t)) return 'Dirección no válida. Ejemplo: www.empresa.com'
  return null
}

export const domicilio = (v: string) => {
  const t = v.trim()
  if (!t) return 'El domicilio fiscal es obligatorio.'
  if (t.length < 10) return 'Indique la dirección completa, no solo la ciudad.'
  return null
}

export const monto = (v: string, nombre = 'El monto') => {
  const t = v.trim()
  if (!t) return `${nombre} es obligatorio.`
  const limpio = t.replace(/[$\s.,]/g, '')
  if (!/^\d+$/.test(limpio)) return 'Solo números. Ejemplo: 250000'
  if (Number(limpio) <= 0) return 'Debe ser mayor que cero.'
  return null
}

export const montoOpcional = (v: string) => (v.trim() ? monto(v) : null)

export const documento = (v: string) => {
  const t = v.trim()
  if (!t) return 'El documento es obligatorio.'
  if (!/^[VEJPGvejpg][-\s]?[\d.]{6,12}$/.test(t)) return 'Formato esperado: V-12.345.678 o P-1234567.'
  return null
}

export const nombrePersona = (v: string) => {
  const t = v.trim()
  if (!t) return 'El nombre es obligatorio.'
  if (t.length < 5) return 'Escriba el nombre completo.'
  if (!LETRAS.test(t)) return 'Debe contener letras.'
  if (!t.includes(' ')) return 'Incluya nombre y apellido.'
  return null
}

export const porcentaje = (v: string) => {
  const t = v.trim()
  if (!t) return 'Indique la participación.'
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(t)) return 'Solo números entre 0 y 100.'
  const n = Number(t.replace(',', '.'))
  if (n <= 0) return 'Debe ser mayor que cero.'
  if (n > 100) return 'No puede superar 100%.'
  return null
}

export const seleccion = (v: string, nombre = 'Seleccione una opción') =>
  !v ? `${nombre}.` : null

/** Formatea un monto a la vista: 250000 → $250.000 */
export const formatearMonto = (v: string) => {
  const limpio = v.replace(/[$\s.,]/g, '')
  if (!/^\d+$/.test(limpio)) return v
  return '$' + Number(limpio).toLocaleString('es-VE')
}
