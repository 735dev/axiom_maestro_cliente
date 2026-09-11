import React from 'react'
import { cn } from '@/shared/utils/cn'

export const Card: React.FC<{ title?: string; sub?: string; right?: React.ReactNode; flush?: boolean; children: React.ReactNode }> =
  ({ title, sub, right, flush, children }) => (
    <div className="card">
      {title && <div className="card-h"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{right}</div>}
      <div className={cn('card-b', flush && 'flush')}>{children}</div>
    </div>
  )

export const Pill: React.FC<{ k: 'ok' | 'warn' | 'bad' | 'mut' | 'info' | 'decision' | 'dark'; children: React.ReactNode }> = ({ k, children }) => (
  <span className={cn('pill', k)}><i className="dot" />{children}</span>
)

export const Tabs: React.FC<{ items: string[]; value: string; onChange: (v: string) => void }> = ({ items, value, onChange }) => (
  <div className="tabs">
    {items.map(i => <button key={i} className={cn(i === value && 'on')} onClick={() => onChange(i)}>{i}</button>)}
  </div>
)

export const Field: React.FC<{
  label: string; value?: string; mono?: boolean; error?: string; hint?: string
  /** Extra para cuando el campo vive en una rejilla y necesita, por ejemplo, ocupar toda la fila. */
  className?: string
  children?: React.ReactNode
}> = ({ label, value, mono, error, hint, className, children }) => (
  <div className={cn('f', error && 'bad', className)}>
    <label>{label}</label>
    {children ?? <div className={cn('ro', mono && 'm')}>{value || '—'}</div>}
    {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
  </div>
)

export const Kpi: React.FC<{ label: string; value: React.ReactNode; foot?: string }> = ({ label, value, foot }) => (
  <div className="kpi"><span>{label}</span><b>{value}</b>{foot && <i>{foot}</i>}</div>
)

export const Modal: React.FC<{ title: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }> =
  ({ title, onClose, footer, children }) => (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h"><h3>{title}</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  )

export { Paginador } from './Paginador'

export { Listado } from './Listado'
export type { Columna, Filtro, Chip } from './Listado'
