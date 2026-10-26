import React, { useMemo, useState } from 'react'

/** Valor por el que se ordena una fila. Vacío queda siempre al final. */
export type SortValue = string | number | boolean | null | undefined
export type SortDir = 'asc' | 'desc'

export type Column<T = unknown> = {
  th: React.ReactNode
  /** Alineación de la columna, para números y para la de acciones. */
  end?: boolean
  width?: string
  /**
   * Si está, el encabezado ordena la tabla. Sin esto la columna no se ordena
   * (acciones, botones).
   */
  sort?: (item: T) => SortValue
}

const blank = (value: SortValue) => value == null || value === ''

export const compareSort = (a: SortValue, b: SortValue, dir: SortDir): number => {
  const aBlank = blank(a)
  const bBlank = blank(b)
  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1
  let order = 0
  if (typeof a === 'number' && typeof b === 'number') order = a - b
  else if (typeof a === 'boolean' && typeof b === 'boolean') order = Number(a) - Number(b)
  else order = String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? order : -order
}

export function useTableSort<T>(rows: T[], columns: Array<Pick<Column<T>, 'sort'>>) {
  const [index, setIndex] = useState<number | null>(null)
  const [dir, setDir] = useState<SortDir>('asc')
  const read = index == null ? undefined : columns[index]?.sort
  const sorted = useMemo(() => {
    if (!read) return rows
    return [...rows].sort((a, b) => compareSort(read(a), read(b), dir))
  }, [rows, read, dir])
  const toggle = (i: number) => {
    if (!columns[i]?.sort) return
    if (index === i) setDir(current => current === 'asc' ? 'desc' : 'asc')
    else { setIndex(i); setDir('asc') }
  }
  return { sorted, index, dir, toggle }
}

export function SortHeaders<T>({ columns, index, dir, onSort }: {
  columns: Column<T>[]
  index: number | null
  dir: SortDir
  onSort: (i: number) => void
}) {
  return (
    <tr>
      {columns.map((column, i) => {
        const active = index === i
        const sortable = Boolean(column.sort)
        return (
          <th key={i}
            aria-sort={!sortable ? undefined : active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            style={{ textAlign: column.end ? 'right' : undefined, width: column.width }}>
            {sortable ? (
              <button type="button" className={'th-sort' + (active ? ' on' : '') + (column.end ? ' end' : '')}
                onClick={() => onSort(i)}>
                <span>{column.th}</span>
                <i aria-hidden>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</i>
              </button>
            ) : column.th}
          </th>
        )
      })}
    </tr>
  )
}

/** Tabla con encabezados que ordenan. La usa quien no pasa por Listing. */
export function DataTable<T>({ rows, columns, rowKey, row, empty, onRow }: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (item: T) => string
  row: (item: T) => React.ReactNode
  empty?: string
  onRow?: (item: T) => void
}) {
  const sort = useTableSort(rows, columns)
  return (
    <table>
      <thead>
        <SortHeaders columns={columns} index={sort.index} dir={sort.dir} onSort={sort.toggle} />
      </thead>
      <tbody>
        {sort.sorted.map(item => (
          <tr key={rowKey(item)} className={onRow ? 'click' : undefined}
            onClick={onRow ? () => onRow(item) : undefined}>
            {row(item)}
          </tr>
        ))}
        {!sort.sorted.length && empty && (
          <tr><td colSpan={columns.length}><div className="empty">{empty}</div></td></tr>
        )}
      </tbody>
    </table>
  )
}
