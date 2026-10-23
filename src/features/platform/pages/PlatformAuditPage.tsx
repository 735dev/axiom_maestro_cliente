import React, { useState, useMemo } from 'react'
import { Listing, Pill, type Chip } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { selectPlatformAudit } from '@/shared/audit/selectors'

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)
const dia = (iso: string) => iso.slice(0, 10)

const EMPTY = {
  q: '', company: 'Todas', sistema: 'Todos', actor: 'Todos',
  action: 'Todas', severity: 'Todas', entity: 'Todas',
  start: '', to: '', conReason: false,
}

/**
 * Auditoría de la plataforma: el registro entero, de todas las empresas.
 *
 * Los filtros no son comodidad. Un auditor llega con una pregunta acotada
 * —"qué pasó con este cliente entre marzo y junio", "qué tocó esta personaa"—
 * y sin rango de fechas ni filtro por actor tiene que leer todo para
 * responderla.
 */
export const PlatformAuditPage = () => {
  const registro = useAppSelector(selectPlatformAudit)
  const companies = useAppSelector(s => s.companies.list)
  const [f, setF] = useState(EMPTY)

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF(x => ({ ...x, [k]: v }))

  const name = (id: string | null) =>
    id ? companies.find(e => e.id === id)?.name ?? id : 'Plataforma'

  const actores = useMemo(
    () => ['Todos', ...Array.from(new Set(registro.map(e => e.actor.name))).sort()], [registro])
  const actions = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.action))).sort()], [registro])
  const entities = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.entity?.tipo).filter(Boolean) as string[])).sort()],
    [registro])

  const rows = useMemo(() => registro.filter(e =>
    (f.company === 'Todas' || name(e.companyId) === f.company) &&
    (f.sistema === 'Todos' || e.sistema === f.sistema) &&
    (f.actor === 'Todos' || e.actor.name === f.actor) &&
    (f.action === 'Todas' || e.action === f.action) &&
    (f.severity === 'Todas' || e.severity === f.severity) &&
    (f.entity === 'Todas' || e.entity?.tipo === f.entity) &&
    (!f.start || dia(e.fecha) >= f.start) &&
    (!f.to || dia(e.fecha) <= f.to) &&
    (!f.conReason || Boolean(e.reason)) &&
    (e.actor.name + e.action + e.detalle + (e.reason ?? '') + (e.entity?.id ?? ''))
      .toLowerCase().includes(f.q.toLowerCase())
  ), [registro, f])

  /** Lo puesto, para poder quitarlo de a uno sin adivinar qué está activo. */
  const chips: Chip[] = [
    f.q && { text: `“${f.q}”`, onRemove: () => set('q', '') },
    f.company !== 'Todas' && { text: f.company, onRemove: () => set('company', 'Todas') },
    f.sistema !== 'Todos' && { text: `Sistema: ${f.sistema}`, onRemove: () => set('sistema', 'Todos') },
    f.actor !== 'Todos' && { text: f.actor, onRemove: () => set('actor', 'Todos') },
    f.action !== 'Todas' && { text: f.action, onRemove: () => set('action', 'Todas') },
    f.severity !== 'Todas' && { text: f.severity === 'sensible' ? 'Solo sensibles' : 'Solo normales', onRemove: () => set('severity', 'Todas') },
    f.entity !== 'Todas' && { text: `Sobre: ${f.entity}`, onRemove: () => set('entity', 'Todas') },
    f.start && { text: `Desde ${f.start}`, onRemove: () => set('start', '') },
    f.to && { text: `Hasta ${f.to}`, onRemove: () => set('to', '') },
    f.conReason && { text: 'Con motivo escrito', onRemove: () => set('conReason', false) },
  ].filter(Boolean) as Chip[]

  return (
    <Listing
      title="Registro de auditoría"
      sub={`${registro.length} movimientos · append-only, no admite edición ni borrado`}
      rows={rows}
      rowKey={e => e.id}
      label="movimientos"
      empty="Ningún movimiento coincide con estos filtros."
      perPage={25}
      search={{ value: f.q, onChange: v => set('q', v), placeholder: 'Buscar en persona, acción, detalle o motivo', width: 300 }}
      chips={chips}
      onClear={() => setF(EMPTY)}
      panel={
        <>
          <div className="lst-campo">
            <label>From</label>
            <input type="date" value={f.start} onChange={e => set('start', e.target.value)} />
          </div>
          <div className="lst-campo">
            <label>Until</label>
            <input type="date" value={f.to} onChange={e => set('to', e.target.value)} />
          </div>
          <div className="lst-campo">
            <label>Company</label>
            <select value={f.company} onChange={e => set('company', e.target.value)}>
              {['Todas', 'Plataforma', ...companies.map(e => e.name)].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lst-campo">
            <label>Quién</label>
            <select value={f.actor} onChange={e => set('actor', e.target.value)}>
              {actores.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lst-campo">
            <label>Acción</label>
            <select value={f.action} onChange={e => set('action', e.target.value)}>
              {actions.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lst-campo">
            <label>Sobre qué</label>
            <select value={f.entity} onChange={e => set('entity', e.target.value)}>
              {entities.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lst-campo">
            <label>Severity</label>
            <select value={f.severity} onChange={e => set('severity', e.target.value)}>
              <option value="Todas">Todas</option>
              <option value="sensible">SensitiveItems</option>
              <option value="normal">Normales</option>
            </select>
          </div>
          <div className="lst-campo">
            <label>Sistema</label>
            <select value={f.sistema} onChange={e => set('sistema', e.target.value)}>
              <option>Todos</option><option>Platform</option><option>Maestro</option>
            </select>
          </div>
          <label className="lst-chk">
            <input type="checkbox" checked={f.conReason} onChange={e => set('conReason', e.target.checked)} />
            Solo con reason escrito
          </label>
        </>
      }
      columns={[{ th: 'Fecha y hora' }, { th: 'Empresa' }, { th: 'Quién' }, { th: 'Qué hizo' }]}
      row={e => (
        <>
          <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
          <td className="td-m">
            {name(e.companyId)}
            <div className="td-sub">{e.sistema}</div>
          </td>
          <td>
            <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.name}</b>
            <div className="td-sub">{e.actor.rol}</div>
          </td>
          <td className="td-m" style={{ maxWidth: 460 }}>
            {e.action} {e.severity === 'sensible' && <Pill k="warn">Sensitive</Pill>}
            <div className="td-sub" style={{ marginTop: 2 }}>{e.detalle}</div>
            {(e.before || e.after) && (
              <div style={{ fontSize: 11.5, marginTop: 3 }}>
                <span className="td-sub">{e.before || '—'} → </span>
                <b style={{ fontWeight: 500 }}>{e.after || '—'}</b>
              </div>
            )}
            {e.reason && <div style={{ color: 'var(--pri)', fontSize: 11.5, marginTop: 3 }}>Por qué: {e.reason}</div>}
          </td>
        </>
      )}
    />
  )
}
