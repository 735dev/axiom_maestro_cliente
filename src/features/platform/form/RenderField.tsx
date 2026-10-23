import React, { useEffect, useRef } from 'react'
import { Field } from '@/shared/ui'
import type { ApiForm } from '@/shared/api/maestro'
import { validateField } from './validateField'
import { optionsOf, widthOf, NUMERIC_TYPES, type FormField, type Operador, type Section, type FieldType } from './types'

const TIPO_API: Record<string, FieldType> = {
  si_no: 'si-no',
  seleccion_multiple: 'multiple',
  email: 'email',
  documento_identidad: 'documento',
  calculado: 'calculado',
}

export type PreparedForm = {
  sections: Section[]
  fields: FormField[]
  formulas: Record<string, string>
  repeatables: Set<string>
}

/** Rows of a `repetible` section. The prefix cannot collide with a field code. */
export const rowsKey = (sectionId: string) => `__filas:${sectionId}`

export const MENSAJE_PORCENTAJE = 'La suma de los porcentajes no puede superar 100.'

export type PendingFile = { field: string; archivo: File; key: string }

/**
 * Published formulas look like `{a} + {b}`. Only + − * / and parentheses are
 * accepted. Anything else, including a call that would need eval, is invalid.
 */
export const evaluarFormula = (formula: string, valores: Record<string, unknown>): string | null => {
  const src = formula.trim()
  if (!src) return null
  let i = 0

  const skip = () => {
    while (i < src.length && /\s/.test(src[i])) i += 1
  }
  const peek = () => src[i]

  const parseExpr = (depth: number): number | null => {
    if (depth > 32) return null
    skip()
    let left = parseTerm(depth)
    if (left === null) return null
    for (;;) {
      skip()
      const op = peek()
      if (op !== '+' && op !== '-') break
      i += 1
      const right = parseTerm(depth)
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  const parseTerm = (depth: number): number | null => {
    if (depth > 32) return null
    skip()
    let left = parseFactor(depth)
    if (left === null) return null
    for (;;) {
      skip()
      const op = peek()
      if (op !== '*' && op !== '/') break
      i += 1
      const right = parseFactor(depth)
      if (right === null) return null
      if (op === '/' && right === 0) return null
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  const parseFactor = (depth: number): number | null => {
    if (depth > 32) return null
    skip()
    const c = peek()
    if (c === '+' || c === '-') {
      i += 1
      const value = parseFactor(depth + 1)
      if (value === null) return null
      return c === '-' ? -value : value
    }
    if (c === '(') {
      i += 1
      const value = parseExpr(depth + 1)
      if (value === null) return null
      skip()
      if (peek() !== ')') return null
      i += 1
      return value
    }
    if (c === '{') {
      const end = src.indexOf('}', i + 1)
      if (end < 0) return null
      const name = src.slice(i + 1, end).trim()
      if (!name) return null
      i = end + 1
      return leerNumero(valores[name])
    }
    if (c >= '0' && c <= '9') {
      const start = i
      i += 1
      while (src[i] >= '0' && src[i] <= '9') i += 1
      if (src[i] === '.') {
        i += 1
        if (!(src[i] >= '0' && src[i] <= '9')) return null
        while (src[i] >= '0' && src[i] <= '9') i += 1
      }
      return Number(src.slice(start, i))
    }
    return null
  }

  const value = parseExpr(0)
  if (value === null) return null
  skip()
  if (i !== src.length) return null
  return formatNumber(value)
}

const formatNumber = (n: number): string | null => {
  if (!Number.isFinite(n)) return null
  const rounded = Math.round((n + Number.EPSILON) * 1e8) / 1e8
  if (Object.is(rounded, -0)) return '0'
  return String(rounded)
}

const leerNumero = (raw: unknown): number | null => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  let t = raw.trim().replace(/%$/, '').trim().replace(/\s/g, '')
  if (!t) return null
  if (t.includes(',') && t.includes('.')) {
    t = t.lastIndexOf(',') > t.lastIndexOf('.')
      ? t.replace(/\./g, '').replace(',', '.')
      : t.replace(/,/g, '')
  } else if (t.includes(',')) {
    t = t.replace(',', '.')
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

const textPlano = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return ''
}

const numeroPorcentaje = (value: unknown): number => {
  const n = leerNumero(typeof value === 'number' ? value : typeof value === 'string' ? value : null)
  if (n === null || n < 0) return 0
  return n
}

export const prepareForm = (form: ApiForm): PreparedForm => {
  const formulas: Record<string, string> = {}
  const repeatables = new Set<string>()
  const orderedSections = form.secciones.slice().sort((a, b) => a.orden - b.orden)
  const sections: Section[] = orderedSections.map(s => {
    if ((s as { repeatable?: unknown }).repeatable === true) repeatables.add(s.id)
    return { id: s.id, name: s.nombre, sub: '' }
  })
  const fields: FormField[] = orderedSections.flatMap(s => s.campos.slice().sort((a, b) => a.orden - b.orden).map(c => {
    const cruda = (c as { formula?: unknown }).formula
    const formula = typeof cruda === 'string'
      ? cruda
      : cruda && typeof cruda === 'object' && 'expresion' in cruda
        ? String((cruda as { expresion?: unknown }).expresion ?? '')
        : ''
    if (formula.trim()) formulas[c.codigo] = formula
    return {
      id: c.codigo,
      section: s.id,
      label: c.etiqueta,
      tipo: TIPO_API[c.tipo_campo] ?? (c.tipo_campo as FieldType),
      required: c.obligatorio,
      standard: c.es_estandar ? c.codigo : undefined,
      catalog: c.catalogo_ref ?? undefined,
      options: c.opciones ?? [],
      width: c.ancho as FormField['width'],
      condition: c.condiciones_visibilidad ? {
        enlace: c.condiciones_visibilidad.enlace,
        conditions: c.condiciones_visibilidad.condiciones.map(x => ({
          fieldId: x.campo_codigo,
          operador: x.operador as Operador,
          value: x.valor ?? undefined,
        })),
      } : undefined,
    }
  }))
  return { sections, fields, formulas, repeatables }
}

export const savedRows = (valores: Record<string, unknown>, sectionId: string): Record<string, unknown>[] | null => {
  const raw = valores[rowsKey(sectionId)]
  if (!Array.isArray(raw)) return null
  return raw.map(item => (
    item && typeof item === 'object' && !Array.isArray(item) ? { ...(item as Record<string, unknown>) } : {}
  ))
}

/** One blank row until the user stores rows, so the first person can be typed. */
export const visibleRows = (
  valores: Record<string, unknown>,
  sectionId: string,
  sectionFields: FormField[],
): Record<string, unknown>[] => {
  const guardadas = savedRows(valores, sectionId)
  if (guardadas) return guardadas
  const seed: Record<string, unknown> = {}
  for (const field of sectionFields) {
    const value = valores[field.id]
    if (value !== undefined && value !== '') seed[field.id] = value
  }
  return [seed]
}

export const excedePorcentaje = (fields: FormField[], rows: Record<string, unknown>[]): boolean => {
  const ids = fields.filter(c => c.tipo === 'porcentaje').map(c => c.id)
  if (!ids.length) return false
  const suma = rows.reduce((total, row) => total + ids.reduce((parte, id) => parte + numeroPorcentaje(row[id]), 0), 0)
  return Math.round(suma * 100) > 10000
}

export const rowErrors = (
  sectionFields: FormField[],
  todos: FormField[],
  rows: Record<string, unknown>[],
  contexto: Record<string, unknown>,
): { byField: Record<string, string>; general: string | null } => {
  const byField: Record<string, string> = {}
  for (let i = 0; i < rows.length; i += 1) {
    const ctx = { ...contexto, ...rows[i] }
    for (const field of sectionFields) {
      if (!fieldVisible(field, ctx, todos)) continue
      const mensaje = validateField(field, rows[i][field.id], ctx)
      if (mensaje) byField[`${i}:${field.id}`] = mensaje
    }
  }
  let general: string | null = null
  if (excedePorcentaje(sectionFields, rows)) general = MENSAJE_PORCENTAJE
  else if (rows.length === 0 && sectionFields.some(c => c.required && fieldVisible(c, contexto, todos))) {
    general = 'Agregue al menos una persona.'
  }
  return { byField, general }
}

const forAnswers = (value: unknown): unknown => {
  if (value instanceof File) return value.name
  if (Array.isArray(value)) return value.map(forAnswers)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = forAnswers(item)
    return out
  }
  return value
}

/**
 * Answers sent with the step. Repeating rows stay under `__filas:{id}`.
 * The first row is also copied onto the field code so a string validator
 * still sees the person the user typed first.
 */
export const packAnswers = (
  fields: FormField[],
  formulas: Record<string, string>,
  repeatables: Iterable<string>,
  valores: Record<string, unknown>,
): { answers: Record<string, unknown>; archivos: PendingFile[] } => {
  const repeatableIds = new Set(repeatables)
  const next: Record<string, unknown> = { ...valores }
  for (const sectionId of repeatableIds) {
    const ofSection = fields.filter(c => c.section === sectionId)
    const rows = (savedRows(next, sectionId) ?? visibleRows(next, sectionId, ofSection)).map(row => ({ ...row }))
    next[rowsKey(sectionId)] = rows
  }
  const aplicarCalculados = () => {
    for (const field of fields) {
      if (field.tipo !== 'calculado' || repeatableIds.has(field.section)) continue
      const formula = formulas[field.id]
      if (!formula) continue
      next[field.id] = evaluarFormula(formula, next) ?? ''
    }
  }
  aplicarCalculados()
  for (const sectionId of repeatableIds) {
    const ofSection = fields.filter(c => c.section === sectionId)
    const rows = (next[rowsKey(sectionId)] as Record<string, unknown>[]).map(row => {
      const copia = { ...row }
      for (const field of ofSection) {
        if (field.tipo !== 'calculado' || !formulas[field.id]) continue
        copia[field.id] = evaluarFormula(formulas[field.id], { ...next, ...copia }) ?? ''
      }
      return copia
    })
    next[rowsKey(sectionId)] = rows
    const primera = rows[0] ?? {}
    for (const field of ofSection) {
      const value = primera[field.id]
      next[field.id] = field.id in primera ? (value instanceof File ? value.name : value) : undefined
    }
  }
  aplicarCalculados()

  const inRow = new Set(fields.filter(c => repeatableIds.has(c.section)).map(c => c.id))
  const archivos: PendingFile[] = []
  for (const [key, value] of Object.entries(next)) {
    if (key.startsWith('__filas:') || inRow.has(key) || !(value instanceof File)) continue
    archivos.push({
      field: key,
      archivo: value,
      key: `campo:${key}:${value.name}:${value.size}:${value.lastModified}`,
    })
  }
  for (const sectionId of repeatableIds) {
    const rows = next[rowsKey(sectionId)]
    if (!Array.isArray(rows)) continue
    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') return
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (!(value instanceof File)) continue
        archivos.push({
          field: key,
          archivo: value,
          key: `fila:${sectionId}:${index}:${key}:${value.name}:${value.size}:${value.lastModified}`,
        })
      }
    })
  }
  return { answers: forAnswers(next) as Record<string, unknown>, archivos }
}

/**
 * Pinta un campo según su definición.
 *
 * Es el único que sabe cómo se ve un campo, y lo usan tanto la vista previa de
 * la consola como el formulario que llena el cliente. Si hubiera dos
 * implementaciones, la vista previa mentiría apenas una de las dos cambiara —
 * y una vista previa que miente es peor que no tenerla.
 */
export const RenderField: React.FC<{
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
  /** En la vista previa nada se envía: los controles se ven pero no se usan. */
  soloVista?: boolean
  /**
   * Los catálogos de la empresa. De acá salen las opciones de los campos de
   * lista: la lista no vive en el campo, vive en el catálogo que la empresa
   * administra.
   */
  catalogs?: Record<string, string[]>
  /** Published `formula` for a `calculado` field. Other answers live in `valores`. */
  formula?: string
  valores?: Record<string, unknown>
  accept?: string
  /** Shown from a ? button beside the label, instead of a permanent hint. */
  help?: string
}> = ({ field, value, onChange, error, soloVista, catalogs = {}, formula, valores, accept, help }) => {
  const options = optionsOf(field, catalogs)
  const comun = {
    disabled: soloVista,
    placeholder: field.placeholder ?? (field.tipo === 'documento' ? 'J-00000000-0 o V-12345678' : undefined),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
  }
  const v = typeof value === 'string' ? value : ''
  const tieneFormula = field.tipo === 'calculado' && Boolean(formula?.trim())
  // null means the formula is present but cannot be evaluated. Do not fall back to eval.
  const resultado = tieneFormula ? evaluarFormula(formula ?? '', valores ?? {}) : undefined
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    if (!tieneFormula || soloVista || resultado == null) return
    if (textPlano(value) === resultado) return
    onChangeRef.current(resultado)
  }, [tieneFormula, soloVista, resultado, value])

  const label = field.label + (field.required ? ' *' : '')
  const mostrado = !tieneFormula ? textPlano(value) : (resultado ?? '')

  if (field.id.startsWith('ficha_nota_') || field.id.startsWith('pn_declaracion_') || field.id.startsWith('pj_declaracion_')) {
    return <p className="ficha-nota">{field.label}</p>
  }

  return (
    <Field label={label} error={error} help={help} hint={!error && !help ? field.help : undefined}
      className={widthOf(field) === 'completo' ? 'completo' : undefined}>
      {field.tipo === 'parrafo' ? <textarea rows={3} value={v} {...comun} />
        : field.tipo === 'lista' ? (
          <select value={v} disabled={soloVista} onChange={e => onChange(e.target.value)}>
            <option value="">Seleccione</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
        : field.tipo === 'multiple' ? (
          <div className="chk-grupo">
            {options.map(o => {
              const marcadas = Array.isArray(value) ? value as string[] : []
              return (
                <label key={o} className="chk">
                  <input type="checkbox" disabled={soloVista} checked={marcadas.includes(o)}
                    onChange={() => onChange(marcadas.includes(o) ? marcadas.filter(x => x !== o) : [...marcadas, o])} />
                  <span>{o}</span>
                </label>
              )
            })}
          </div>
        )
        : field.tipo === 'si-no' ? (
          <label className="sw-fila">
            <input type="checkbox" disabled={soloVista} checked={v === 'si'}
              onChange={e => onChange(e.target.checked ? 'si' : 'no')} />
            <span className={'sw' + (v === 'si' ? ' on' : '')} aria-hidden />
            <span>{v === 'si' ? 'Sí' : 'No'}</span>
          </label>
        )
        : field.tipo === 'archivo' ? (
          <div className="archivo">
            <input type="file" accept={accept} disabled={soloVista} onChange={e => onChange(e.target.files?.[0] ?? null)} />
            <span>{v || (value instanceof File ? value.name : 'Ningún archivo seleccionado')}</span>
          </div>
        )
        : field.tipo === 'fecha' ? <input type="date" value={v} {...comun} />
        : field.tipo === 'numero' || field.tipo === 'porcentaje'
          ? <input inputMode="numeric" value={v} {...comun}
              placeholder={field.placeholder ?? (field.tipo === 'porcentaje' ? '0 a 100' : 'Solo números')} />
        : field.tipo === 'moneda' ? <input inputMode="decimal" value={v} {...comun} placeholder={field.placeholder ?? '0,00'} />
        : field.tipo === 'documento'
          ? <input value={v} {...comun} onChange={e => onChange(e.target.value.toUpperCase())} />
        : field.tipo === 'calculado'
          ? <input value={mostrado} readOnly disabled />
        : <input type={field.tipo === 'email' ? 'email' : field.tipo === 'telefono' ? 'tel' : field.tipo === 'url' ? 'url' : 'text'} value={v} {...comun} />}
    </Field>
  )
}

export const RepeatableBlock: React.FC<{
  sectionId: string
  fields: FormField[]
  todos: FormField[]
  formulas: Record<string, string>
  valores: Record<string, unknown>
  mostrarErrores: boolean
  gridClass: string
  catalogs?: Record<string, string[]>
  accept?: string
  validateFile?: (archivo: File) => string | null
  onValores: (update: (prev: Record<string, unknown>) => Record<string, unknown>) => void
}> = ({ sectionId, fields, todos, formulas, valores, mostrarErrores, gridClass, catalogs, accept, validateFile, onValores }) => {
  const [archivoMal, setArchivoMal] = React.useState<Record<string, string>>({})
  const rows = visibleRows(valores, sectionId, fields)
  const hallados = rowErrors(fields, todos, rows, valores)
  const errorGeneral = hallados.general === MENSAJE_PORCENTAJE || mostrarErrores ? hallados.general : null

  const proyectar = (prev: Record<string, unknown>, siguiente: Record<string, unknown>[]) => {
    const next: Record<string, unknown> = { ...prev, [rowsKey(sectionId)]: siguiente }
    const primera = siguiente[0] ?? {}
    for (const field of fields) {
      if (!(field.id in primera)) {
        delete next[field.id]
        continue
      }
      const value = primera[field.id]
      next[field.id] = value instanceof File ? value.name : value
    }
    return next
  }

  const escribir = (siguiente: Record<string, unknown>[]) => {
    onValores(prev => proyectar(prev, siguiente))
  }

  const cambiar = (index: number, fieldId: string, value: unknown) => {
    onValores(prev => {
      const copia = visibleRows(prev, sectionId, fields).map(row => ({ ...row }))
      copia[index] = { ...copia[index], [fieldId]: value }
      return proyectar(prev, copia)
    })
  }

  return (
    <div>
      {rows.map((row, index) => {
        const ctx = { ...valores, ...row }
        const visibleItems = fields.filter(c => fieldVisible(c, ctx, todos))
        return (
          <div key={`${sectionId}:${index}`} className="portal-persona">
            <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <b>Person {index + 1}</b>
              <button type="button" className="btn sm" onClick={() => {
                setArchivoMal({})
                escribir(rows.filter((_, i) => i !== index))
              }}>Remove</button>
            </div>
            <div className={`${gridClass} portal-personas`}>
              {visibleItems.map(c => {
                const key = `${index}:${c.id}`
                const error = archivoMal[key] || (mostrarErrores ? hallados.byField[key] : undefined)
                return (
                  <RenderField key={c.id} field={c} value={row[c.id]} catalogs={catalogs} error={error}
                    formula={formulas[c.id]} valores={ctx} accept={accept}
                    onChange={value => {
                      if (value instanceof File && validateFile) {
                        const mensaje = validateFile(value)
                        if (mensaje) {
                          setArchivoMal(prev => ({ ...prev, [key]: mensaje }))
                          cambiar(index, c.id, null)
                          return
                        }
                      }
                      setArchivoMal(prev => {
                        if (!prev[key]) return prev
                        const next = { ...prev }
                        delete next[key]
                        return next
                      })
                      cambiar(index, c.id, value)
                    }} />
                )
              })}
            </div>
          </div>
        )
      })}
      <button type="button" className="btn" onClick={() => escribir([...rows.map(row => ({ ...row })), {}])}>Agregar persona</button>
      {errorGeneral && <div className="val-err" role="alert">{errorGeneral}</div>}
    </div>
  )
}

/** Un valor vacío es undefined, null, cadena vacía o arreglo vacío (multiple). */
const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Convierte a número para comparar. Sin esto, "mayor que" y "menor que"
 * comparan como texto y "9" > "10" sale verdadero (orden ASCII): cualquier
 * condición numérica con cifras de distinta longitud queda mal.
 */
const numero = (v: unknown): number => {
  const limpio = String(v ?? '').replace(/[^\d.-]/g, '')
  return limpio === '' || limpio === '-' ? NaN : Number(limpio)
}

const cumple = (cond: { fieldId: string; operador: string; value?: string }, valores: Record<string, unknown>, fields: FormField[]) => {
  const disparador = fields.find(c => c.id === cond.fieldId)
  const crudo = valores[cond.fieldId]
  const esNumerico = disparador && NUMERIC_TYPES.includes(disparador.tipo)
  switch (cond.operador) {
    case 'vacio': return empty(crudo)
    case 'no_vacio': return !empty(crudo)
    case 'en': return (cond.value ?? '').split(',').filter(Boolean).includes(String(crudo ?? ''))
    case 'mayor': return numero(crudo) > numero(cond.value)
    case 'menor': return numero(crudo) < numero(cond.value)
    case 'distinto': return esNumerico ? numero(crudo) !== numero(cond.value) : String(crudo ?? '') !== (cond.value ?? '')
    case 'igual':
    default: return esNumerico ? numero(crudo) === numero(cond.value) : String(crudo ?? '') === (cond.value ?? '')
  }
}

/**
 * Un campo con `condicion` solo se muestra cuando el grupo de condiciones se
 * cumple —todas si el enlace es Y, alguna si es O—. Es lo que hace que los
 * campos de PEP no se le pidan a quien declaró que no lo es, generalizado a
 * cualquier campo, cualquier operador y cualquier combinación.
 *
 * `campos` hace falta para saber el tipo del disparador y así coercionar
 * números en vez de comparar como texto.
 */
export const fieldVisible = (c: FormField, valores: Record<string, unknown>, fields: FormField[]) => {
  if (!c.condition || !c.condition.conditions.length) return true
  const resultados = c.condition.conditions.map(cond => cumple(cond, valores, fields))
  return c.condition.enlace === 'o' ? resultados.some(Boolean) : resultados.every(Boolean)
}
