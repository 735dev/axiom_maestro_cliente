import React from 'react'
import { Field } from '@/shared/ui'
import { opcionesDe, anchoDe, TIPOS_NUMERICOS, type Campo } from './tipos'

/**
 * Pinta un campo según su definición.
 *
 * Es el único que sabe cómo se ve un campo, y lo usan tanto la vista previa de
 * la consola como el formulario que llena el cliente. Si hubiera dos
 * implementaciones, la vista previa mentiría apenas una de las dos cambiara —
 * y una vista previa que miente es peor que no tenerla.
 */
export const RenderCampo: React.FC<{
  campo: Campo
  valor: unknown
  onChange: (v: unknown) => void
  error?: string
  /** En la vista previa nada se envía: los controles se ven pero no se usan. */
  soloVista?: boolean
  /**
   * Los catálogos de la empresa. De acá salen las opciones de los campos de
   * lista: la lista no vive en el campo, vive en el catálogo que la empresa
   * administra.
   */
  catalogos?: Record<string, string[]>
}> = ({ campo, valor, onChange, error, soloVista, catalogos = {} }) => {
  const opciones = opcionesDe(campo, catalogos)
  const comun = {
    disabled: soloVista,
    placeholder: campo.marcador,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
  }
  const v = typeof valor === 'string' ? valor : ''

  const etiqueta = campo.etiqueta + (campo.obligatorio ? ' *' : '')

  return (
    <Field label={etiqueta} error={error} hint={!error ? campo.ayuda : undefined}
      className={anchoDe(campo) === 'completo' ? 'completo' : undefined}>
      {campo.tipo === 'parrafo' ? <textarea rows={3} value={v} {...comun} />
        : campo.tipo === 'lista' ? (
          <select value={v} disabled={soloVista} onChange={e => onChange(e.target.value)}>
            <option value="">Seleccione</option>
            {opciones.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
        : campo.tipo === 'multiple' ? (
          <div className="chk-grupo">
            {opciones.map(o => {
              const marcadas = Array.isArray(valor) ? valor as string[] : []
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
        : campo.tipo === 'si-no' ? (
          <label className="sw-fila">
            <input type="checkbox" disabled={soloVista} checked={v === 'si'}
              onChange={e => onChange(e.target.checked ? 'si' : 'no')} />
            <span className={'sw' + (v === 'si' ? ' on' : '')} aria-hidden />
            <span>{v === 'si' ? 'Sí' : 'No'}</span>
          </label>
        )
        : campo.tipo === 'archivo' ? (
          <div className="archivo">
            <input type="file" disabled={soloVista} onChange={e => onChange(e.target.files?.[0] ?? null)} />
            <span>{v || (valor instanceof File ? valor.name : 'Ningún archivo seleccionado')}</span>
          </div>
        )
        : campo.tipo === 'fecha' ? <input type="date" value={v} {...comun} />
        : campo.tipo === 'numero' || campo.tipo === 'porcentaje'
          ? <input inputMode="numeric" value={v} {...comun}
              placeholder={campo.marcador ?? (campo.tipo === 'porcentaje' ? '0 a 100' : 'Solo números')} />
        : campo.tipo === 'moneda' ? <input inputMode="decimal" value={v} {...comun} placeholder={campo.marcador ?? '0,00'} />
        : campo.tipo === 'documento'
          ? <input value={v} {...comun} onChange={e => onChange(e.target.value.toUpperCase())} />
        : campo.tipo === 'calculado'
          ? <input value={v} readOnly disabled />
        : <input type={campo.tipo === 'email' ? 'email' : campo.tipo === 'telefono' ? 'tel' : campo.tipo === 'url' ? 'url' : 'text'} value={v} {...comun} />}
    </Field>
  )
}

/** Un valor vacío es undefined, null, cadena vacía o arreglo vacío (multiple). */
const vacio = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Convierte a número para comparar. Sin esto, "mayor que" y "menor que"
 * comparan como texto y "9" > "10" sale verdadero (orden ASCII): cualquier
 * condición numérica con cifras de distinta longitud queda mal.
 */
const numero = (v: unknown): number => {
  const limpio = String(v ?? '').replace(/[^\d.-]/g, '')
  return limpio === '' || limpio === '-' ? NaN : Number(limpio)
}

const cumple = (cond: { campoId: string; operador: string; valor?: string }, valores: Record<string, unknown>, campos: Campo[]) => {
  const disparador = campos.find(c => c.id === cond.campoId)
  const crudo = valores[cond.campoId]
  const esNumerico = disparador && TIPOS_NUMERICOS.includes(disparador.tipo)
  switch (cond.operador) {
    case 'vacio': return vacio(crudo)
    case 'no_vacio': return !vacio(crudo)
    case 'en': return (cond.valor ?? '').split(',').filter(Boolean).includes(String(crudo ?? ''))
    case 'mayor': return numero(crudo) > numero(cond.valor)
    case 'menor': return numero(crudo) < numero(cond.valor)
    case 'distinto': return esNumerico ? numero(crudo) !== numero(cond.valor) : String(crudo ?? '') !== (cond.valor ?? '')
    case 'igual':
    default: return esNumerico ? numero(crudo) === numero(cond.valor) : String(crudo ?? '') === (cond.valor ?? '')
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
export const campoVisible = (c: Campo, valores: Record<string, unknown>, campos: Campo[]) => {
  if (!c.condicion || !c.condicion.condiciones.length) return true
  const resultados = c.condicion.condiciones.map(cond => cumple(cond, valores, campos))
  return c.condicion.enlace === 'o' ? resultados.some(Boolean) : resultados.every(Boolean)
}
