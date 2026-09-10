import React, { useState } from 'react'

export type Fila = { etiqueta: string; valor: number; nota?: string }

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
export const Barras: React.FC<{
  datos: Fila[]
  /** Unidad para el detalle al pasar el mouse. */
  unidad?: string
  /** Cuántas filas mostrar. El resto se resume en una fila final. */
  tope?: number
}> = ({ datos, unidad = '', tope }) => {
  const [sobre, setSobre] = useState<string | null>(null)

  const ordenados = [...datos].sort((a, b) => b.valor - a.valor)
  const visibles = tope ? ordenados.slice(0, tope) : ordenados
  const resto = tope ? ordenados.slice(tope) : []
  const restoTotal = resto.reduce((s, f) => s + f.valor, 0)

  const total = datos.reduce((s, f) => s + f.valor, 0)
  const max = Math.max(...datos.map(f => f.valor), 1)

  if (!total) return <div className="empty">Sin datos todavía.</div>

  return (
    <div className="brs">
      {visibles.map(f => (
        <div key={f.etiqueta} className={'brs-f' + (sobre === f.etiqueta ? ' on' : '')}
          onMouseEnter={() => setSobre(f.etiqueta)} onMouseLeave={() => setSobre(null)}>
          <div className="brs-e">{f.etiqueta}</div>
          <div className="brs-p">
            <i style={{ width: Math.max(f.valor / max * 100, 1.5) + '%' }} />
          </div>
          <div className="brs-v num">{f.valor}</div>
          {sobre === f.etiqueta && (
            <div className="brs-tip" role="status">
              <b className="num">{f.valor}</b> {unidad}
              <span> · {Math.round(f.valor / total * 100)}% del total</span>
              {f.nota && <span className="brs-tip-n">{f.nota}</span>}
            </div>
          )}
        </div>
      ))}
      {resto.length > 0 && (
        <div className="brs-f otros">
          <div className="brs-e">Otros ({resto.length})</div>
          <div className="brs-p"><i style={{ width: Math.max(restoTotal / max * 100, 1.5) + '%' }} /></div>
          <div className="brs-v num">{restoTotal}</div>
        </div>
      )}
    </div>
  )
}
