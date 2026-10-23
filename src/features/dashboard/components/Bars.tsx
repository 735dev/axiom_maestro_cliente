import React, { useState } from 'react'

export type Row = { label: string; value: number; nota?: string }

/**
 * Barras horizontales de una sola serie.
 *
 * Un solo tono a propósito: la magnitud la lleva el largo de la barra, no el
 * color. Pintar cada barra de un color distinto agrega una dimensión que no
 * existe, y en el caso de los estados —aprobado verde, rechazado rojo— ese par
 * es indistinguible en deuteranopía. La etiqueta dice qué es cada fila; el
 * color no tiene que decirlo.
 *
 * Horizontal y no vertical porque las etiquetas son texto largo: en vertical
 * habría que rotarlas.
 *
 * Cada barra lleva su valor escrito al lado. No es adorno: es lo que permite
 * leer el número exacto sin pasar el mouse, y lo que hace que un lector de
 * pantalla recorra el gráfico como texto.
 */
export const Bars: React.FC<{
  rows: Row[]
  /** Unidad para el detalle al pasar el mouse. */
  unidad?: string
  /** Cuántas filas mostrar. El resto se resume en una fila final. */
  tope?: number
}> = ({ rows, unidad = '', tope }) => {
  const [sobre, setSobre] = useState<string | null>(null)

  const ordenados = [...rows].sort((a, b) => b.value - a.value)
  const visibleItems = tope ? ordenados.slice(0, tope) : ordenados
  const rest = tope ? ordenados.slice(tope) : []
  const restoTotal = rest.reduce((s, f) => s + f.value, 0)

  const total = rows.reduce((s, f) => s + f.value, 0)
  const max = Math.max(...rows.map(f => f.value), 1)

  if (!total) return <div className="empty">Sin datos todavía.</div>

  return (
    <div className="brs">
      {visibleItems.map(f => (
        <div key={f.label} className={'brs-f' + (sobre === f.label ? ' on' : '')}
          onMouseEnter={() => setSobre(f.label)} onMouseLeave={() => setSobre(null)}>
          <div className="brs-e">{f.label}</div>
          <div className="brs-p">
            <i style={{ width: Math.max(f.value / max * 100, 1.5) + '%' }} />
          </div>
          <div className="brs-v num">{f.value}</div>
          {sobre === f.label && (
            <div className="brs-tip" role="status">
              <b className="num">{f.value}</b> {unidad}
              <span> · {Math.round(f.value / total * 100)}% del total</span>
              {f.nota && <span className="brs-tip-n">{f.nota}</span>}
            </div>
          )}
        </div>
      ))}
      {rest.length > 0 && (
        <div className="brs-f otros">
          <div className="brs-e">Otros ({rest.length})</div>
          <div className="brs-p"><i style={{ width: Math.max(restoTotal / max * 100, 1.5) + '%' }} /></div>
          <div className="brs-v num">{restoTotal}</div>
        </div>
      )}
    </div>
  )
}
