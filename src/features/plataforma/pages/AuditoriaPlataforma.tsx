import React, { useState, useMemo } from 'react'
import { Listado, Pill, type Chip } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { selectAuditoriaPlataforma } from '@/shared/auditoria/selectores'

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)
const dia = (iso: string) => iso.slice(0, 10)

const VACIO = {
  q: '', empresa: 'Todas', sistema: 'Todos', actor: 'Todos',
  accion: 'Todas', gravedad: 'Todas', entidad: 'Todas',
  desde: '', hasta: '', conMotivo: false,
}

/**
 * Auditoría de la plataforma: el registro entero, de todas las empresas.
 *
 * Los filtros no son comodidad. Un auditor llega con una pregunta acotada
 * —"qué pasó con este cliente entre marzo y junio", "qué tocó esta persona"—
 * y sin rango de fechas ni filtro por actor tiene que leer todo para
 * responderla.
 */
export const AuditoriaPlataforma = () => {
  const registro = useAppSelector(selectAuditoriaPlataforma)
  const empresas = useAppSelector(s => s.empresas.lista)
  const [f, setF] = useState(VACIO)

  const set = <K extends keyof typeof VACIO>(k: K, v: (typeof VACIO)[K]) => setF(x => ({ ...x, [k]: v }))

  const nombre = (id: string | null) =>
    id ? empresas.find(e => e.id === id)?.nombre ?? id : 'Plataforma'

  const actores = useMemo(
    () => ['Todos', ...Array.from(new Set(registro.map(e => e.actor.nombre))).sort()], [registro])
  const acciones = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.accion))).sort()], [registro])
  const entidades = useMemo(
    () => ['Todas', ...Array.from(new Set(registro.map(e => e.entidad?.tipo).filter(Boolean) as string[])).sort()],
    [registro])

  const filas = useMemo(() => registro.filter(e =>
    (f.empresa === 'Todas' || nombre(e.empresaId) === f.empresa) &&
    (f.sistema === 'Todos' || e.sistema === f.sistema) &&
    (f.actor === 'Todos' || e.actor.nombre === f.actor) &&
    (f.accion === 'Todas' || e.accion === f.accion) &&
    (f.gravedad === 'Todas' || e.gravedad === f.gravedad) &&
    (f.entidad === 'Todas' || e.entidad?.tipo === f.entidad) &&
    (!f.desde || dia(e.fecha) >= f.desde) &&
    (!f.hasta || dia(e.fecha) <= f.hasta) &&
    (!f.conMotivo || Boolean(e.motivo)) &&
    (e.actor.nombre + e.accion + e.detalle + (e.motivo ?? '') + (e.entidad?.id ?? ''))
      .toLowerCase().includes(f.q.toLowerCase())
  ), [registro, f])

  /** Lo puesto, para poder quitarlo de a uno sin adivinar qué está activo. */
  const chips: Chip[] = [
    f.q && { texto: `“${f.q}”`, onQuitar: () => set('q', '') },
    f.empresa !== 'Todas' && { texto: f.empresa, onQuitar: () => set('empresa', 'Todas') },
    f.sistema !== 'Todos' && { texto: `Sistema: ${f.sistema}`, onQuitar: () => set('sistema', 'Todos') },
    f.actor !== 'Todos' && { texto: f.actor, onQuitar: () => set('actor', 'Todos') },
    f.accion !== 'Todas' && { texto: f.accion, onQuitar: () => set('accion', 'Todas') },
    f.gravedad !== 'Todas' && { texto: f.gravedad === 'sensible' ? 'Solo sensibles' : 'Solo normales', onQuitar: () => set('gravedad', 'Todas') },
    f.entidad !== 'Todas' && { texto: `Sobre: ${f.entidad}`, onQuitar: () => set('entidad', 'Todas') },
    f.desde && { texto: `Desde ${f.desde}`, onQuitar: () => set('desde', '') },
    f.hasta && { texto: `Hasta ${f.hasta}`, onQuitar: () => set('hasta', '') },
    f.conMotivo && { texto: 'Con motivo escrito', onQuitar: () => set('conMotivo', false) },
  ].filter(Boolean) as Chip[]

  return (
    <Listado
      titulo="Registro de auditoría"
      sub={`${registro.length} movimientos · append-only, no admite edición ni borrado`}
      datos={filas}
      clave={e => e.id}
      etiqueta="movimientos"
      vacio="Ningún movimiento coincide con estos filtros."
      porPagina={25}
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
            <label>Empresa</label>
            <select value={f.empresa} onChange={e => set('empresa', e.target.value)}>
              {['Todas', 'Plataforma', ...empresas.map(e => e.nombre)].map(o => <option key={o}>{o}</option>)}
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
              <option>Todos</option><option>Plataforma</option><option>Maestro</option>
            </select>
          </div>
          <label className="lst-chk">
            <input type="checkbox" checked={f.conMotivo} onChange={e => set('conMotivo', e.target.checked)} />
            Solo con motivo escrito
          </label>
        </>
      }
      columnas={[{ th: 'Fecha y hora' }, { th: 'Empresa' }, { th: 'Quién' }, { th: 'Qué hizo' }]}
      fila={e => (
        <>
          <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
          <td className="td-m">
            {nombre(e.empresaId)}
            <div className="td-sub">{e.sistema}</div>
          </td>
          <td>
            <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.nombre}</b>
            <div className="td-sub">{e.actor.rol}</div>
          </td>
          <td className="td-m" style={{ maxWidth: 460 }}>
            {e.accion} {e.gravedad === 'sensible' && <Pill k="warn">Sensible</Pill>}
            <div className="td-sub" style={{ marginTop: 2 }}>{e.detalle}</div>
            {(e.antes || e.despues) && (
              <div style={{ fontSize: 11.5, marginTop: 3 }}>
                <span className="td-sub">{e.antes || '—'} → </span>
                <b style={{ fontWeight: 500 }}>{e.despues || '—'}</b>
              </div>
            )}
            {e.motivo && <div style={{ color: 'var(--pri)', fontSize: 11.5, marginTop: 3 }}>Por qué: {e.motivo}</div>}
          </td>
        </>
      )}
    />
  )
}
