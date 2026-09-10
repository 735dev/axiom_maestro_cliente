import React from 'react'
import { Card } from './index'
import { Paginador } from './Paginador'
import { usePaginacion } from '@/shared/hooks/usePaginacion'

/**
 * Listado con barra de herramientas, tabla y paginación.
 *
 * Existe para que todas las pantallas que muestran una lista se vean y se usen
 * igual. Antes cada una repetía la misma tarjeta, el mismo buscador con sus
 * estilos en línea, la misma fila vacía y el mismo paginador — y cuando algo
 * se copia cinco veces, termina distinto en las cinco.
 *
 * Recibe la lista ya filtrada. La paginación la resuelve acá adentro: es
 * mecánica y no tiene por qué repetirse en cada pantalla.
 */

export type Columna = {
  th: React.ReactNode
  /** Alineación de la columna, para números y para la de acciones. */
  fin?: boolean
  ancho?: string
}

export type Filtro = {
  valor: string
  onChange: (v: string) => void
  opciones: string[] | { valor: string; texto: string }[]
  /** Ancho fijo, si hace falta. */
  ancho?: number
}

/** Un filtro puesto, para mostrarlo como chip y poder quitarlo de a uno. */
export type Chip = { texto: string; onQuitar: () => void }

export function Listado<T>({
  titulo, sub, datos, columnas, fila, clave, etiqueta,
  buscar, filtros = [], acciones, vacio = 'Sin resultados.', porPagina = 10, onFila,
  panel, chips = [], onLimpiar,
}: {
  titulo: string
  sub?: string
  datos: T[]
  columnas: Columna[]
  fila: (item: T) => React.ReactNode
  clave: (item: T) => string
  /** Nombre de lo que se lista, para el paginador: "clientes", "usuarios". */
  etiqueta: string
  buscar?: { valor: string; onChange: (v: string) => void; marcador?: string; ancho?: number }
  filtros?: Filtro[]
  acciones?: React.ReactNode
  vacio?: string
  porPagina?: number
  onFila?: (item: T) => void
  /**
   * Filtros que no entran en la barra: rangos de fecha, selectores largos.
   * Van en una fila propia bajo el encabezado en vez de apretujarse arriba.
   */
  panel?: React.ReactNode
  /** Qué está filtrando ahora mismo. Sin esto no se ve por qué faltan filas. */
  chips?: Chip[]
  onLimpiar?: () => void
}) {
  const { visibles, paginador } = usePaginacion(datos, porPagina)

  const herramientas = (buscar || filtros.length || acciones) ? (
    <div className="lst-tools">
      {buscar && (
        <input className="lst-buscar" placeholder={buscar.marcador ?? 'Buscar'}
          value={buscar.valor} onChange={e => buscar.onChange(e.target.value)}
          style={buscar.ancho ? { width: buscar.ancho } : undefined} />
      )}
      {filtros.map((f, i) => (
        <select key={i} className="lst-filtro" value={f.valor} onChange={e => f.onChange(e.target.value)}
          style={f.ancho ? { width: f.ancho } : undefined}>
          {f.opciones.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      ))}
      {acciones}
    </div>
  ) : undefined

  return (
    <Card title={titulo} sub={sub} right={herramientas} flush>
      {panel && <div className="lst-panel">{panel}</div>}

      {chips.length > 0 && (
        <div className="lst-chips">
          <span className="lst-chips-t">Filtrando por</span>
          {chips.map((c, i) => (
            <button key={i} className="lst-chip" onClick={c.onQuitar} title="Quitar este filtro">
              {c.texto}<i>×</i>
            </button>
          ))}
          {onLimpiar && <button className="lnk" onClick={onLimpiar}>limpiar todo</button>}
          <span className="lst-chips-n"><b className="num">{datos.length}</b> {etiqueta}</span>
        </div>
      )}

      <table>
        <thead>
          <tr>
            {columnas.map((c, i) => (
              <th key={i} style={{ textAlign: c.fin ? 'right' : undefined, width: c.ancho }}>{c.th}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map(item => (
            <tr key={clave(item)} className={onFila ? 'click' : undefined}
              onClick={onFila ? () => onFila(item) : undefined}>
              {fila(item)}
            </tr>
          ))}
          {!visibles.length && (
            <tr><td colSpan={columnas.length}><div className="empty">{vacio}</div></td></tr>
          )}
        </tbody>
      </table>
      <Paginador p={paginador} etiqueta={etiqueta} />
    </Card>
  )
}
