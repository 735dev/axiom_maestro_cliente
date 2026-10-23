import React from 'react'
import type { PaginatorState } from '@/shared/hooks/usePagination'

const OPTIONS = [10, 25, 50, 100]

/**
 * Pie de tabla: cuántos se ven de cuántos, cuántos por página y las páginas.
 * Se oculta cuando todo cabe en una página y no hay nada que elegir.
 */
export const Paginator: React.FC<{ p: PaginatorState; label?: string; compact?: boolean }> = ({ p, label = 'registros', compact }) => {
  if (p.total <= OPTIONS[0] && p.pages === 1) return null

  /** Ventana de páginas alrededor de la actual: con 200 páginas no se pintan 200 botones. */
  const window: (number | '…')[] = []
  const near = (n: number) => Math.abs(n - p.page) <= 1
  for (let n = 1; n <= p.pages; n++) {
    if (n === 1 || n === p.pages || near(n)) window.push(n)
    else if (window[window.length - 1] !== '…') window.push('…')
  }

  return (
    <div className={'pag' + (compact ? ' compacto' : '')}>
      <span className="pag-info">
        {p.total === 0
          ? `Sin ${label}`
          : <><b className="num">{p.start}</b>–<b className="num">{p.to}</b> de <b className="num">{p.total}</b> {label}</>}
      </span>

      <div className="pag-ctrl">
        {!compact && <label className="pag-pp">
          Por página
          <select value={p.perPage} onChange={e => p.setPerPage(Number(e.target.value))}>
            {OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>}

        <div className="pag-nums">
          <button className="btn sm" disabled={p.page === 1} onClick={() => p.goTo(p.page - 1)}>Previous</button>
          {window.map((n, i) => n === '…'
            ? <span key={'e' + i} className="pag-gap">…</span>
            : <button key={n} className={'btn sm num' + (n === p.page ? ' on' : '')} onClick={() => p.goTo(n)}>{n}</button>)}
          <button className="btn sm" disabled={p.page === p.pages} onClick={() => p.goTo(p.page + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  )
}
