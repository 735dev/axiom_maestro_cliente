import { useState, useMemo } from 'react'
import { Listado, Kpi, Pill, Modal, Field, type Chip } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { selectAuditoriaDeMiEmpresa } from '@/shared/auditoria/selectores'
import type { Entrada } from '@/shared/auditoria/tipos'

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)
const dia = (iso: string) => iso.slice(0, 10)

const VACIO = {
  q: '', actor: 'Todos', accion: 'Todas', gravedad: 'Todas',
  entidad: 'Todas', sistema: 'Todos', desde: '', hasta: '', conMotivo: false,
}

/**
 * Bitácora de la empresa.
 *
 * Lee el registro único del sistema, scopeado a la empresa de la sesión. No
 * tiene forma de editar ni borrar: no es una decisión de esta pantalla, es que
 * el store no expone ninguna acción que lo permita.
 */
export const BitacoraPage = () => {
  const registro = useAppSelector(selectAuditoriaDeMiEmpresa)
  const [f, setF] = useState(VACIO)
  const [detalle, setDetalle] = useState<Entrada | null>(null)

  const set = <K extends keyof typeof VACIO>(k: K, v: (typeof VACIO)[K]) => setF(x => ({ ...x, [k]: v }))

  // Las opciones salen del propio registro: solo se ofrece lo que existe.
  const actores = useMemo(
    () => ['Todos', ...Array.from(new Set(registro.map(e => e.actor.nombre))).sort()], [registro])
  const acciones = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.accion))).sort()], [registro])
  const entidades = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.entidad?.tipo).filter(Boolean) as string[])).sort()],
    [registro])

  const filas = useMemo(() => registro.filter(e =>
    (f.actor === 'Todos' || e.actor.nombre === f.actor) &&
    (f.accion === 'Todas' || e.accion === f.accion) &&
    (f.gravedad === 'Todas' || e.gravedad === f.gravedad) &&
    (f.entidad === 'Todas' || e.entidad?.tipo === f.entidad) &&
    (f.sistema === 'Todos' || e.sistema === f.sistema) &&
    (!f.desde || dia(e.fecha) >= f.desde) &&
    (!f.hasta || dia(e.fecha) <= f.hasta) &&
    (!f.conMotivo || Boolean(e.motivo)) &&
    (e.actor.nombre + e.accion + e.detalle + (e.motivo ?? '') + (e.entidad?.id ?? '') + (e.entidad?.nombre ?? ''))
      .toLowerCase().includes(f.q.toLowerCase())
  ), [registro, f])

  const chips: Chip[] = [
    f.q && { texto: `“${f.q}”`, onQuitar: () => set('q', '') },
    f.actor !== 'Todos' && { texto: f.actor, onQuitar: () => set('actor', 'Todos') },
    f.accion !== 'Todas' && { texto: f.accion, onQuitar: () => set('accion', 'Todas') },
    f.gravedad !== 'Todas' && { texto: f.gravedad === 'sensible' ? 'Solo sensibles' : 'Solo normales', onQuitar: () => set('gravedad', 'Todas') },
    f.entidad !== 'Todas' && { texto: `Sobre: ${f.entidad}`, onQuitar: () => set('entidad', 'Todas') },
    f.sistema !== 'Todos' && { texto: `Sistema: ${f.sistema}`, onQuitar: () => set('sistema', 'Todos') },
    f.desde && { texto: `Desde ${f.desde}`, onQuitar: () => set('desde', '') },
    f.hasta && { texto: `Hasta ${f.hasta}`, onQuitar: () => set('hasta', '') },
    f.conMotivo && { texto: 'Con motivo escrito', onQuitar: () => set('conMotivo', false) },
  ].filter(Boolean) as Chip[]

  return (
    <>
      <div className="kpis">
        <Kpi label="Movimientos" value={registro.length} foot="desde el inicio del sistema" />
        <Kpi label="Sensibles" value={registro.filter(e => e.gravedad === 'sensible').length} foot="permisos, estados y bajas" />
        <Kpi label="Con motivo" value={registro.filter(e => e.motivo).length} foot="decisiones justificadas" />
        <Kpi label="Actores" value={new Set(registro.map(e => e.actor.id)).size} foot="personas distintas" />
      </div>

      <Listado
        titulo="Bitácora de auditoría"
        sub="Todo lo que cambia el sistema queda acá. No admite edición ni borrado."
        datos={filas}
        clave={e => e.id}
        etiqueta="movimientos"
        vacio="Ningún movimiento coincide con estos filtros."
        porPagina={25}
        onFila={setDetalle}
        buscar={{ valor: f.q, onChange: v => set('q', v), marcador: 'Buscar en persona, acción, detalle o motivo', ancho: 300 }}
        chips={chips}
        onLimpiar={() => setF(VACIO)}
        panel={
          <>
            <div className="lst-campo">
              <label>Desde</label>
              <input type="date" value={f.desde} onChange={e => set('desde', e.target.value)} />
            </div>
            <div className="lst-campo">
              <label>Hasta</label>
              <input type="date" value={f.hasta} onChange={e => set('hasta', e.target.value)} />
            </div>
            <div className="lst-campo">
              <label>Quién</label>
              <select value={f.actor} onChange={e => set('actor', e.target.value)}>
                {actores.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="lst-campo">
              <label>Acción</label>
              <select value={f.accion} onChange={e => set('accion', e.target.value)}>
                {acciones.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="lst-campo">
              <label>Sobre qué</label>
              <select value={f.entidad} onChange={e => set('entidad', e.target.value)}>
                {entidades.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="lst-campo">
              <label>Gravedad</label>
              <select value={f.gravedad} onChange={e => set('gravedad', e.target.value)}>
                <option value="Todas">Todas</option>
                <option value="sensible">Sensibles</option>
                <option value="normal">Normales</option>
              </select>
            </div>
            <div className="lst-campo">
              <label>Sistema</label>
              <select value={f.sistema} onChange={e => set('sistema', e.target.value)}>
                <option>Todos</option><option>Maestro</option><option>Plataforma</option>
              </select>
            </div>
            <label className="lst-chk">
              <input type="checkbox" checked={f.conMotivo} onChange={e => set('conMotivo', e.target.checked)} />
              Solo con motivo escrito
            </label>
          </>
        }
        columnas={[
          { th: 'Fecha y hora' }, { th: 'Quién' }, { th: 'Qué hizo' },
          { th: 'Sobre qué' }, { th: '', fin: true },
        ]}
        fila={e => (
          <>
            <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
            <td>
              <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.nombre}</b>
              <div className="td-sub">{e.actor.rol}</div>
            </td>
            <td className="td-m" style={{ maxWidth: 380 }}>
              {e.accion} {e.gravedad === 'sensible' && <Pill k="warn">Sensible</Pill>}
              <div className="td-sub" style={{ marginTop: 2 }}>{e.detalle}</div>
              {e.motivo && <div style={{ color: 'var(--pri)', fontSize: 11.5, marginTop: 3 }}>Por qué: {e.motivo}</div>}
            </td>
            <td className="td-m">
              {e.entidad
                ? <><span className="pill mut">{e.entidad.tipo}</span> <span className="num">{e.entidad.id}</span></>
                : <span className="td-sub">—</span>}
            </td>
            <td style={{ textAlign: 'right' }}><button className="btn sm">Ver</button></td>
          </>
        )}
      />

      {detalle && <DetalleEntrada entrada={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}

/** Ficha completa de un movimiento, con el antes y el después. */
const DetalleEntrada: React.FC<{ entrada: Entrada; onClose: () => void }> = ({ entrada: e, onClose }) => (
  <Modal title={e.accion} onClose={onClose}
    footer={<button className="btn pri" onClick={onClose}>Cerrar</button>}>
    <div className="grid">
      <Field label="Cuándo" value={fmt(e.fecha)} mono />
      <Field label="Quién" value={`${e.actor.nombre} · ${e.actor.rol}`} />
      <Field label="Sistema" value={e.sistema} />
      <Field label="Sobre qué" value={e.entidad ? `${e.entidad.tipo} ${e.entidad.id}` : '—'} mono />
    </div>

    <div className="sec">Qué pasó</div>
    <p className="dlg-txt">{e.detalle}</p>

    {(e.antes || e.despues) && (
      <>
        <div className="sec">Antes y después</div>
        <div className="ad">
          <div className="ad-c antes"><span>Antes</span><b>{e.antes || '—'}</b></div>
          <div className="ad-f">→</div>
          <div className="ad-c despues"><span>Después</span><b>{e.despues || '—'}</b></div>
        </div>
      </>
    )}

    {e.motivo && (
      <>
        <div className="sec">Motivo declarado</div>
        <p className="dlg-txt">{e.motivo}</p>
      </>
    )}

    <p className="dlg-txt" style={{ color: 'var(--muted)', marginTop: 14 }}>
      El nombre y el rol quedaron congelados al momento del hecho: si esa persona cambia de cargo o
      sale de la empresa, esta línea sigue diciendo lo mismo. Referencia <span className="num">{e.id}</span>.
    </p>
  </Modal>
)
