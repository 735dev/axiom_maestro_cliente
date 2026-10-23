import type { CSSProperties } from 'react'
import type { ApiFormAppearance } from '@/shared/api/maestro'

export const EMPTY_APPEARANCE: ApiFormAppearance = {}

export const SIMPLE_APPEARANCE: ApiFormAppearance = {
  color_primario: '#a83731',
  color_acento: '#a83731',
  color_encabezado: '#060e1f',
  color_fondo: '#f4f5f7',
  color_texto: '#1c1e24',
  fuente: 'sistema',
  titulo: 'Registro de cliente',
  subtitulo: 'Registro de clientes',
}

export const PALETAS: { id: string; name: string; nota: string; appearance: ApiFormAppearance }[] = [
  {
    id: 'simple', name: 'Simple', nota: 'La de siempre',
    appearance: SIMPLE_APPEARANCE,
  },
  {
    id: 'sobrio', name: 'Sobrio', nota: 'Azul y oro',
    appearance: { color_primario: '#16325c', color_acento: '#c4a15a', color_encabezado: '#0d1c33', color_fondo: '#f6f3ec', color_texto: '#1b2330', fuente: 'serif' },
  },
  {
    id: 'bosque', name: 'Bosque', nota: 'Verde profundo',
    appearance: { color_primario: '#1e6b45', color_acento: '#d9a441', color_encabezado: '#123528', color_fondo: '#f2f7f3', color_texto: '#14241c', fuente: 'sistema' },
  },
  {
    id: 'tinta', name: 'Tinta', nota: 'Azul de despacho',
    appearance: { color_primario: '#1f4e89', color_acento: '#e0a106', color_encabezado: '#10243f', color_fondo: '#f3f6fb', color_texto: '#152033', fuente: 'sistema' },
  },
  {
    id: 'carbon', name: 'Carbón', nota: 'Negro y ámbar',
    appearance: { color_primario: '#c9842a', color_acento: '#f0d7a2', color_encabezado: '#161616', color_fondo: '#f7f4ef', color_texto: '#1a1a1a', fuente: 'serif' },
  },
]

const canales = (hex: string): [number, number, number] | null => {
  const limpio = hex.trim().replace('#', '')
  const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null
  return [parseInt(completo.slice(0, 2), 16), parseInt(completo.slice(2, 4), 16), parseInt(completo.slice(4, 6), 16)]
}

const aHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

const mezclar = (origen: string, destination: string, t: number) => {
  const a = canales(origen)
  const b = canales(destination)
  if (!a || !b) return origen
  return '#' + [0, 1, 2].map(i => aHex(a[i] + (b[i] - a[i]) * t)).join('')
}

const tintaSobre = (hex: string) => {
  const rgb = canales(hex)
  if (!rgb) return '#f7f7f8'
  const lineal = rgb.map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminancia = 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2]
  return luminancia > 0.42 ? '#141820' : '#f7f7f8'
}

export function hasBrand(appearance?: ApiFormAppearance | null) {
  if (!appearance) return false
  return Object.values(appearance).some(value => value != null && String(value).trim() !== '')
}

export function initials(name: string) {
  const partes = name.replace(/[,.]/g, ' ').split(/\s+/).filter(parte => parte.length > 1 && !/^(ca|sa|de|la|el|los|las|y)$/i.test(parte))
  return ((partes[0]?.[0] ?? 'R') + (partes[1]?.[0] ?? '')).toUpperCase()
}

/** Variables que el portal y el alta ya consumen, más el lienzo y el contraste del botón. */
export function portalStyle(appearance?: ApiFormAppearance | null): CSSProperties {
  if (!appearance) return {}
  const style: CSSProperties & Record<string, string> = {}
  const primario = appearance.color_primario || undefined
  const encabezado = appearance.color_encabezado || (primario ? mezclar(primario, '#000000', 0.45) : undefined)
  if (primario) {
    style['--pri'] = primario
    style['--pri-600'] = mezclar(primario, '#000000', 0.16)
    style['--on-pri'] = tintaSobre(primario)
    style['--acc'] = appearance.color_acento || mezclar(primario, '#ffffff', 0.28)
  } else if (appearance.color_acento) {
    style['--acc'] = appearance.color_acento
  }
  if (encabezado) {
    style['--strong'] = encabezado
    style['--on-strong'] = tintaSobre(encabezado)
  }
  if (appearance.color_fondo) style['--portal-lienzo'] = appearance.color_fondo
  if (appearance.color_texto) style['--fg'] = appearance.color_texto
  if (appearance.fuente === 'serif') style.fontFamily = '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif'
  if (appearance.fuente === 'redondeada') style.fontFamily = '"Avenir Next", Nunito, ui-rounded, "Segoe UI", system-ui, sans-serif'
  return style
}
