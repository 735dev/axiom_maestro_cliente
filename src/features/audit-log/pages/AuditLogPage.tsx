import { useEffect, useState, useMemo } from 'react'
import { Listing, Kpi, Pill, Modal, Field, type Chip } from '@/shared/ui'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS } from '@/shared/auth/permissions'
import type { Entry } from '@/shared/audit/types'
import { maestroApi, type ApiAuditLog } from '@/shared/api/maestro'

const fromApi = (row: ApiAuditLog): Entry => {
  const detalle = row.detalle ?? {}
  const reason = typeof detalle.reason === 'string' ? detalle.reason : undefined
  const cambios = detalle.cambios ? JSON.stringify(detalle.cambios) : ''
  const rest = Object.entries(detalle)
    .filter(([key]) => key !== 'motivo' && key !== 'cambios')
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ')
  const sensitive = /decision|inactiv|permission|verdict|aprob|rechaz/.test(row.accion)
  return {
    id: row.id,
    fecha: row.ocurrido_en,
    actor: { id: row.actor_usuario_id ?? row.actor_nombre, name: row.actor_nombre, rol: row.actor_rol ?? '', scope: 'empresa' },
    companyId: null,
    sistema: 'Maestro',
    action: row.accion,
    entity: row.entidad_tipo ? { tipo: row.entidad_tipo, id: row.entidad_id ?? '' } : undefined,
    detalle: [reason, cambios, rest].filter(Boolean).join(' · '),
    reason,
    resultado: row.resultado === 'fallido' ? 'denegado' : 'ok',
    severity: sensitive ? 'sensible' : 'normal',
  }
}

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)
const dia = (iso: string) => iso.slice(0, 10)

const EMPTY = {
  q: '', actor: 'Todos', action: 'Todas', severity: 'Todas',
  entity: 'Todas', sistema: 'Todos', start: '', to: '', conReason: false,
}

/**
 * Bitácora de la empresa.
 *
 * Lee el registro único del sistema, scopeado a la empresa de la sesión. No
 * tiene forma de editar ni borrar: no es una decisión de esta pantalla, es que
 * el store no expone ninguna acción que lo permita.
 */
export const AuditLogPage = () => {
  const can = useCan()
  const [registro, setRegistro] = useState<Entry[] | null>(null)
  const [listo, setListo] = useState(false)
  useEffect(() => {
    let active = true
    maestroApi.auditLog()
      .then(rows => { if (active) setRegistro(rows.map(fromApi)) })
      .catch(() => { if (active) setRegistro([]) })
      .finally(() => { if (active) setListo(true) })
    return () => { active = false }
  }, [])
  const [f, setF] = useState(EMPTY)
  const [detalle, setDetalle] = useState<Entry | null>(null)

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF(x => ({ ...x, [k]: v }))
  const source = registro ?? []

  // Las opciones salen del propio registro: solo se ofrece lo que existe.
  const actores = useMemo(
    () => ['Todos', ...Array.from(new Set(source.map(e => e.actor.name))).sort()], [source])
  const actions = useMemo(
    () => ['Todas', ...Array.from(new Set(source.map(e => e.action))).sort()], [source])
  const entities = useMemo(
    () => ['Todas', ...Array.from(new Set(source.map(e => e.entity?.tipo).filter(Boolean) as string[])).sort()],
    [source])

  const rows = useMemo(() => source.filter(e => (
    (f.actor === 'Todos' || e.actor.name === f.actor) &&
    (f.action === 'Todas' || e.action === f.action) &&
    (f.severity === 'Todas' || e.severity === f.severity) &&
    (f.entity === 'Todas' || e.entity?.tipo === f.entity) &&
    (f.sistema === 'Todos' || e.sistema === f.sistema) &&
    (!f.start || dia(e.fecha) >= f.start) &&
    (!f.to || dia(e.fecha) <= f.to) &&
    (!f.conReason || Boolean(e.reason)) &&
    (e.actor.name + e.action + e.detalle + (e.reason ?? '') + (e.entity?.id ?? '') + (e.entity?.name ?? ''))
      .toLowerCase().includes(f.q.toLowerCase())
  )), [source, f])

  const chips: Chip[] = [
    f.q && { text: `“${f.q}”`, onRemove: () => set('q', '') },
    f.actor !== 'Todos' && { text: f.actor, onRemove: () => set('actor', 'Todos') },
    f.action !== 'Todas' && { text: f.action, onRemove: () => set('action', 'Todas') },
    f.severity !== 'Todas' && { text: f.severity === 'sensible' ? 'Solo sensibles' : 'Solo normales', onRemove: () => set('severity', 'Todas') },
    f.entity !== 'Todas' && { text: `Sobre: ${f.entity}`, onRemove: () => set('entity', 'Todas') },
    f.sistema !== 'Todos' && { text: `Sistema: ${f.sistema}`, onRemove: () => set('sistema', 'Todos') },
    f.start && { text: `Desde ${f.start}`, onRemove: () => set('start', '') },
    f.to && { text: `Hasta ${f.to}`, onRemove: () => set('to', '') },
    f.conReason && { text: 'Con motivo escrito', onRemove: () => set('conReason', false) },
  ].filter(Boolean) as Chip[]

  // La semilla local no es esta pantalla. Pintarla y después cambiarla por el
  // servidor se ve como dos páginas distintas en el mismo módulo.
  if (!listo) return null

  return (
    <>
      <div className="kpis">
        <Kpi label="Movimientos" value={source.length} foot="desde el inicio del sistema" />
        <Kpi label="Sensibles" value={source.filter(e => e.severity === 'sensible').length} foot="permisos, estados y bajas" />
        <Kpi label="Con motivo" value={source.filter(e => e.reason).length} foot="decisiones justificadas" />
        <Kpi label="Actores" value={new Set(source.map(e => e.actor.id)).size} foot="personas distintas" />
      </div>

      <Listing
        title="Bitácora de auditoría"
        sub="Todo lo que cambia el sistema queda acá. No admite edición ni borrado."
        rows={rows}
        rowKey={e => e.id}
        label="movimientos"
        empty="Ningún movimiento coincide con estos filtros."
        perPage={25}
        onRow={setDetalle}
        actions={can(PERMISSIONS.auditLogExport) ? (
          <button className="btn sm" type="button" onClick={() => {
            maestroApi.exportAuditLog().then(blob => {
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'bitacora.csv'
              link.click()
              URL.revokeObjectURL(url)
            })
          }}>Export</button>
        ) : undefined}
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
                <option>Todos</option><option>Maestro</option><option>Platform</option>
              </select>
            </div>
            <label className="lst-chk">
              <input type="checkbox" checked={f.conReason} onChange={e => set('conReason', e.target.checked)} />
              Solo con reason escrito
            </label>
          </>
        }
        columns={[
          { th: 'Fecha y hora' }, { th: 'Quién' }, { th: 'Qué hizo' },
          { th: 'Sobre qué' }, { th: '', end: true },
        ]}
        row={e => (
          <>
            <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
            <td>
              <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.name}</b>
              <div className="td-sub">{e.actor.rol}</div>
            </td>
            <td className="td-m" style={{ maxWidth: 380 }}>
              {e.action} {e.severity === 'sensible' && <Pill k="warn">Sensitive</Pill>}
              <div className="td-sub" style={{ marginTop: 2 }}>{e.detalle}</div>
              {e.reason && <div style={{ color: 'var(--pri)', fontSize: 11.5, marginTop: 3 }}>Por qué: {e.reason}</div>}
            </td>
            <td className="td-m">
              {e.entity
                ? <><span className="pill mut">{e.entity.tipo}</span> <span className="num">{e.entity.id}</span></>
                : <span className="td-sub">—</span>}
            </td>
            <td style={{ textAlign: 'right' }}><button className="btn sm">Ver</button></td>
          </>
        )}
      />

      {detalle && <EntryDetail entry={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}

/** Ficha completa de un movimiento, con el antes y el después. */
const EntryDetail: React.FC<{ entry: Entry; onClose: () => void }> = ({ entry: e, onClose }) => (
  <Modal title={e.action} onClose={onClose}
    footer={<button className="btn pri" onClick={onClose}>Cerrar</button>}>
    <div className="grid">
      <Field label="Cuándo" value={fmt(e.fecha)} mono />
      <Field label="Quién" value={`${e.actor.name} · ${e.actor.rol}`} />
      <Field label="Sistema" value={e.sistema} />
      <Field label="Sobre qué" value={e.entity ? `${e.entity.tipo} ${e.entity.id}` : '—'} mono />
    </div>

    <div className="sec">Qué pasó</div>
    <p className="dlg-txt">{e.detalle}</p>

    {(e.before || e.after) && (
      <>
        <div className="sec">Before y después</div>
        <div className="ad">
          <div className="ad-c antes"><span>Before</span><b>{e.before || '—'}</b></div>
          <div className="ad-f">→</div>
          <div className="ad-c despues"><span>Después</span><b>{e.after || '—'}</b></div>
        </div>
      </>
    )}

    {e.reason && (
      <>
        <div className="sec">Reason declarado</div>
        <p className="dlg-txt">{e.reason}</p>
      </>
    )}

    <p className="dlg-txt" style={{ color: 'var(--muted)', marginTop: 14 }}>
      El name y el rol quedaron congelados al momento del hecho: si esa person cambia de cargo o
      sale de la company, esta línea sigue diciendo lo mismo. Referencia <span className="num">{e.id}</span>.
    </p>
  </Modal>
)
