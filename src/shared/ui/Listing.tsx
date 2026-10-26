import React from 'react'
import { Card } from './index'
import { Paginator } from './Paginator'
import { usePagination } from '@/shared/hooks/usePagination'
import { SortHeaders, useTableSort, type Column } from './tableSort'

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

export type { Column } from './tableSort'

export type Filter = {
  value: string
  onChange: (v: string) => void
  options: string[] | { value: string; text: string }[]
  /** Ancho fijo, si hace falta. */
  width?: number
}

/** Un filtro puesto, para mostrarlo como chip y poder quitarlo de a uno. */
export type Chip = { text: string; onRemove: () => void }

export function Listing<T>({
  title, sub, rows, columns, row, rowKey, label,
  search, filters = [], actions, empty = 'Sin resultados.', perPage = 10, onRow,
  panel, chips = [], onClear,
}: {
  title: string
  sub?: string
  rows: T[]
  columns: Column<T>[]
  row: (item: T) => React.ReactNode
  rowKey: (item: T) => string
  /** Nombre de lo que se lista, para el paginador: "clientes", "usuarios". */
  label: string
  search?: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }
  filters?: Filter[]
  actions?: React.ReactNode
  empty?: string
  perPage?: number
  onRow?: (item: T) => void
  /**
   * Filtros que no entran en la barra: rangos de fecha, selectores largos.
   * Van en una fila propia bajo el encabezado en vez de apretujarse arriba.
   */
  panel?: React.ReactNode
  /** Qué está filtrando ahora mismo. Sin esto no se ve por qué faltan filas. */
  chips?: Chip[]
  onClear?: () => void
}) {
  const sort = useTableSort(rows, columns)
  const { visibleItems, paginator } = usePagination(sort.sorted, perPage, `${sort.index ?? ''}:${sort.dir}`)

  const herramientas = (search || filters.length || actions) ? (
    <div className="lst-tools">
      {search && (
        <input className="lst-buscar" placeholder={search.placeholder ?? 'Buscar'}
          value={search.value} onChange={e => search.onChange(e.target.value)}
          style={search.width ? { width: search.width } : undefined} />
      )}
      {filters.map((f, i) => (
        <select key={i} className="lst-filtro" value={f.value} onChange={e => f.onChange(e.target.value)}
          style={f.width ? { width: f.width } : undefined}>
          {f.options.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.text}</option>)}
        </select>
      ))}
      {actions}
    </div>
  ) : undefined

  return (
    <Card title={title} sub={sub} right={herramientas} flush>
      {panel && <div className="lst-panel">{panel}</div>}

      {chips.length > 0 && (
        <div className="lst-chips">
          <span className="lst-chips-t">Filtrando por</span>
          {chips.map((c, i) => (
            <button key={i} className="lst-chip" onClick={c.onRemove} title="Quitar este filtro">
              {c.text}<i>×</i>
            </button>
          ))}
          {onClear && <button className="lnk" onClick={onClear}>limpiar todo</button>}
          <span className="lst-chips-n"><b className="num">{rows.length}</b> {label}</span>
        </div>
      )}

      <table>
        <thead>
          <SortHeaders columns={columns} index={sort.index} dir={sort.dir} onSort={sort.toggle} />
        </thead>
        <tbody>
          {visibleItems.map(item => (
            <tr key={rowKey(item)} className={onRow ? 'click' : undefined}
              onClick={onRow ? () => onRow(item) : undefined}>
              {row(item)}
            </tr>
          ))}
          {!visibleItems.length && (
            <tr><td colSpan={columns.length}><div className="empty">{empty}</div></td></tr>
          )}
        </tbody>
      </table>
      <Paginator p={paginator} label={label} />
    </Card>
  )
}
