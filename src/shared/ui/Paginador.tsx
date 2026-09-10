import React from 'react'
import type { EstadoPaginador } from '@/shared/hooks/usePaginacion'

const OPCIONES = [10, 25, 50, 100]

/**
 * Pie de tabla: cuántos se ven de cuántos, cuántos por página y las páginas.
 * Se oculta cuando todo cabe en una página y no hay nada que elegir.
 */
export const Paginador: React.FC<{ p: EstadoPaginador; etiqueta?: string; compacto?: boolean }> = ({ p, etiqueta = 'registros', compacto }) => {
  if (p.total <= OPCIONES[0] && p.paginas === 1) return null

  /** Ventana de páginas alrededor de la actual: con 200 páginas no se pintan 200 botones. */
  const ventana: (number | '…')[] = []
  const cerca = (n: number) => Math.abs(n - p.pagina) <= 1
  for (let n = 1; n <= p.paginas; n++) {
    if (n === 1 || n === p.paginas || cerca(n)) ventana.push(n)
    else if (ventana[ventana.length - 1] !== '…') ventana.push('…')
  }

  return (
    <div className={'pag' + (compacto ? ' compacto' : '')}>
      <span className="pag-info">
        {p.total === 0
          ? `Sin ${etiqueta}`
          : <><b className="num">{p.desde}</b>–<b className="num">{p.hasta}</b> de <b className="num">{p.total}</b> {etiqueta}</>}
      </span>

      <div className="pag-ctrl">
        {!compacto && <label className="pag-pp">
          Por página
          <select value={p.porPagina} onChange={e => p.cambiarPorPagina(Number(e.target.value))}>
            {OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>}

        <div className="pag-nums">
          <button className="btn sm" disabled={p.pagina === 1} onClick={() => p.irA(p.pagina - 1)}>Anterior</button>
          {ventana.map((n, i) => n === '…'
            ? <span key={'e' + i} className="pag-gap">…</span>
            : <button key={n} className={'btn sm num' + (n === p.pagina ? ' on' : '')} onClick={() => p.irA(n)}>{n}</button>)}
          <button className="btn sm" disabled={p.pagina === p.paginas} onClick={() => p.irA(p.pagina + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  )
}
