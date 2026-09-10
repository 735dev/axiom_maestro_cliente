import React, { useState } from 'react'
import { type Cliente, type Persona } from '../types/cliente.types'
import { Card, Tabs, Field, Modal, Paginador } from '@/shared/ui'
import { usePaginacion } from '@/shared/hooks/usePaginacion'
import { EstadoPill } from '../components/Pills'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectCatalogosDe } from '@/features/catalogos/store/catalogosSlice'
import { editarCliente, agregarPersona, quitarPersona, cambiarEstadoRegistro } from '../store/clientesSlice'
import { useCan } from '@/shared/hooks/useCan'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { PERMISSIONS } from '@/shared/auth/permissions'

export const MaestroFicha: React.FC<{ codigo: string; onBack: () => void }> = ({ codigo, onBack }) => {
  const cliente = useAppSelector(s => s.clientes.lista.find(c => c.codigo === codigo))
  const empresa = useEmpresaActual()
  const CATALOGOS = useAppSelector(selectCatalogosDe(empresa?.id))
  const usuario = useAppSelector(s => s.auth.usuario)
  const dispatch = useAppDispatch()
  const can = useCan()

  const [tab, setTab] = useState('Datos de la empresa')
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Partial<Cliente>>({})
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [nueva, setNueva] = useState(false)
  const [quitar, setQuitar] = useState<Persona | null>(null)
  const [inhabilitar, setInhabilitar] = useState(false)
  // Aprobar y rechazar comparten un mismo diálogo: solo cambia el veredicto.
  const [decision, setDecision] = useState<'APROBADO' | 'RECHAZADO' | null>(null)

  if (!cliente) return <div className="empty">Cliente no encontrado.</div>
  const puedeEditar = can(PERMISSIONS.registrosEditar)
  const puedeAprobar = can(PERMISSIONS.registrosAprobar)
  const puedeInhabilitar = can(PERMISSIONS.registrosInactivar)
  const personasPag = usePaginacion(cliente.personas)
  const suma = cliente.personas.filter(p => p.rol === 'Accionista').reduce((a, p) => a + (p.porcentaje || 0), 0)

  const v = (k: keyof Cliente) => (borrador[k] as string) ?? (cliente[k] as string)
  const set = (k: keyof Cliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setBorrador({ ...borrador, [k]: e.target.value })

  const abrirEdicion = () => { setBorrador({}); setMotivo(''); setEditando(true) }
  const cancelar = () => { setBorrador({}); setEditando(false) }
  const guardar = () => {
    dispatch(editarCliente({ codigo, cambios: borrador, usuario: usuario!.nombre, rol: usuario!.rol, motivo }))
    setEditando(false); setConfirmar(false); setBorrador({}); setMotivo('')
  }

  const decidir = () => {
    if (!decision) return
    dispatch(cambiarEstadoRegistro({ codigo, estado: decision, usuario: usuario!.nombre, rol: usuario!.rol, motivo }))
    setDecision(null); setMotivo('')
  }

  const campo = (label: string, k: keyof Cliente, opciones?: string[]) =>
    editando
      ? <Field key={k} label={label}>
        {opciones
          ? <select value={v(k)} onChange={set(k)}>{opciones.map(o => <option key={o}>{o}</option>)}</select>
          : <input value={v(k)} onChange={set(k)} />}
      </Field>
      : <Field key={k} label={label} value={cliente[k] as string} />

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={onBack}>← Volver al listado</button>
      </div>

      <Card flush>
        <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="num" style={{ background: 'var(--strong)', color: '#fff', padding: '3px 10px', borderRadius: 8, fontWeight: 500 }}>{cliente.codigo}</span>
              <h2 style={{ fontSize: 19 }}>{cliente.razonSocial}</h2>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 5 }} className="num">{cliente.rif} · {cliente.tipo}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <EstadoPill e={cliente.estado} />
            {puedeEditar && !editando && (
              <button className="btn sm" onClick={abrirEdicion}>Editar ficha</button>
            )}
            {editando && <>
              <button className="btn sm" onClick={cancelar}>Cancelar</button>
              <button className="btn sm pri" onClick={() => setConfirmar(true)}
                disabled={!Object.keys(borrador).length}>Guardar cambios</button>
            </>}

            {!editando && puedeAprobar && cliente.estado === 'REVISADO' && <>
              <button className="btn sm" onClick={() => { setMotivo(''); setDecision('RECHAZADO') }}>Rechazar</button>
              <button className="btn sm pri" onClick={() => { setMotivo(''); setDecision('APROBADO') }}>Aprobar</button>
            </>}

            {!editando && puedeInhabilitar && cliente.estado === 'APROBADO' && (
              <button className="btn sm" onClick={() => { setMotivo(''); setInhabilitar(true) }}>Inhabilitar</button>
            )}
          </div>
        </div>
        <Tabs items={['Datos de la empresa', 'Personas vinculadas', 'Perfil financiero']} value={tab} onChange={setTab} />

        <div style={{ padding: 18 }}>
          {tab === 'Datos de la empresa' && (
            <>
              <div className="sec">Identificación</div>
              <div className="grid">
                {campo('Razón social', 'razonSocial')}
                {campo('RIF', 'rif')}
                {campo('Tipo de empresa jurídica', 'tipo', (CATALOGOS.tipo_empresa ?? []))}
                {campo('Registro mercantil', 'registro')}
              </div>
              <div className="sec">Contacto y domicilio</div>
              <div className="grid">
                {campo('Domicilio fiscal', 'domicilio')}
                {campo('Teléfono', 'telefono')}
                {campo('Correo corporativo', 'correo')}
                {campo('Página web', 'web')}
              </div>
              <div className="sec">Actividad</div>
              <div className="grid">
                {campo('Sector económico', 'sector', (CATALOGOS.sector ?? []))}
                {campo('Actividad económica', 'actividad', (CATALOGOS.actividad ?? []))}
              </div>
            </>
          )}

          {tab === 'Personas vinculadas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="sec" style={{ margin: 0 }}>Accionistas, beneficiarios finales y representantes</div>
                {puedeEditar && <button className="btn sm pri" onClick={() => setNueva(true)}>Agregar persona</button>}
              </div>
              <table>
                <thead><tr><th>Nombre</th><th>Documento</th><th>Rol</th><th>Participación</th><th>Nacionalidad</th><th>PEP</th><th /></tr></thead>
                <tbody>
                  {personasPag.visibles.map(p => (
                    <tr key={p.id}>
                      <td>{p.nombre}{p.cargo && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.cargo}</div>}</td>
                      <td className="num">{p.documento}</td>
                      <td>{p.rol}</td>
                      <td className="num">{p.porcentaje ? p.porcentaje + '%' : '—'}</td>
                      <td>{p.nacionalidad}</td>
                      <td>{p.pep
                        ? <span className="pill warn"><i className="dot" />Sí — {p.pepCargo}</span>
                        : <span style={{ color: 'var(--muted)' }}>No</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        {puedeEditar && <button className="btn sm" onClick={() => { setMotivo(''); setQuitar(p) }}>Quitar</button>}
                      </td>
                    </tr>
                  ))}
                  {!cliente.personas.length &&
                    <tr><td colSpan={7}><div className="empty">Sin personas vinculadas. Agregue al menos un accionista y un representante legal.</div></td></tr>}
                </tbody>
              </table>
              <Paginador p={personasPag.paginador} etiqueta="personas" />
              {cliente.personas.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Suma de participación accionaria</span>
                  <div className="bar" style={{ flex: 1, maxWidth: 260 }}>
                    <i style={{ width: Math.min(suma, 100) + '%', background: suma > 100 ? 'var(--bad)' : 'var(--pri)' }} />
                  </div>
                  <b className="num" style={{ color: suma > 100 ? 'var(--bad)' : 'var(--fg)' }}>{suma}%</b>
                  {suma > 100 && <span className="pill bad"><i className="dot" />Excede 100%</span>}
                </div>
              )}
            </>
          )}

          {tab === 'Perfil financiero' && (
            <>
              <div className="sec">Declarado por el cliente</div>
              <div className="grid">
                {campo('Origen de fondos', 'origenFondos', (CATALOGOS.origen_fondos ?? []))}
                {campo('Rango de ingresos', 'ingresos', ['Menos de $1M', '$1M – $10M', '$10M – $50M', 'Más de $50M'])}
                {campo('Monto que espera movilizar', 'montoDeclarado')}
                {campo('Frecuencia', 'frecuencia', ['Semanal', 'Quincenal', 'Mensual', 'Trimestral'])}
              </div>
              <div className="sec">Trazabilidad del registro</div>
              <div className="grid">
                <Field label="Registrado por" value={cliente.registradoPor} />
                <Field label="Fecha de registro" value={cliente.fechaRegistro} mono />
                <Field label="Verificado por" value={cliente.verificadoPor} />
                <Field label="Fecha de verificación" value={cliente.fechaVerificacion} mono />
              </div>
            </>
          )}
        </div>
      </Card>

      {confirmar && (
        <Modal title="Guardar cambios" onClose={() => setConfirmar(false)}
          footer={<><button className="btn" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="btn pri" disabled={motivo.trim().length < 10} onClick={guardar}>Guardar</button></>}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Se modificarán <b>{Object.keys(borrador).length}</b> campo(s). El cambio queda en la bitácora
            con su nombre, la fecha y el motivo.
          </p>
          <Field label="Motivo del cambio (obligatorio)">
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Por qué se corrige la ficha" />
          </Field>
        </Modal>
      )}

      {inhabilitar && (
        <Modal title="Inhabilitar cliente" onClose={() => setInhabilitar(false)}
          footer={<><button className="btn" onClick={() => setInhabilitar(false)}>Cancelar</button>
            <button className="btn pri" disabled={motivo.trim().length < 10}
              onClick={() => {
                dispatch(cambiarEstadoRegistro({ codigo, estado: 'INHABILITADO', usuario: usuario!.nombre, rol: usuario!.rol, motivo }))
                setInhabilitar(false); setMotivo('')
              }}>Inhabilitar</button></>}>
          <p className="dlg-txt">
            El cliente <b>no se borra</b>: queda inhabilitado y conserva toda su historia.
          </p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Por qué se inhabilita este cliente" />
          </Field>
        </Modal>
      )}

      {decision && (
        <Modal title={decision === 'APROBADO' ? 'Aprobar cliente' : 'Rechazar cliente'} onClose={() => setDecision(null)}
          footer={<><button className="btn" onClick={() => setDecision(null)}>Cancelar</button>
            <button className="btn pri" disabled={motivo.trim().length < 10} onClick={decidir}>
              {decision === 'APROBADO' ? 'Aprobar' : 'Rechazar'}
            </button></>}>
          <p className="dlg-txt">
            {decision === 'APROBADO'
              ? <>El cliente queda <b>habilitado para operar</b>. Axiom Prevención ya terminó su revisión; esta es la decisión de la empresa.</>
              : <>El expediente queda <b>rechazado</b>. No se borra: conserva toda su historia.</>}
          </p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder={decision === 'APROBADO' ? 'Por qué se aprueba este cliente' : 'Por qué se rechaza este cliente'} />
          </Field>
        </Modal>
      )}

      {quitar && (
        <Modal title="Quitar persona vinculada" onClose={() => setQuitar(null)}
          footer={<><button className="btn" onClick={() => setQuitar(null)}>Cancelar</button>
            <button className="btn pri" disabled={motivo.trim().length < 10}
              onClick={() => {
                dispatch(quitarPersona({ codigo, personaId: quitar.id, usuario: usuario!.nombre, rol: usuario!.rol, motivo }))
                setQuitar(null); setMotivo('')
              }}>Quitar</button></>}>
          <p style={{ fontSize: 13, marginBottom: 12 }}><b>{quitar.nombre}</b> — {quitar.rol}</p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Por qué deja de estar vinculada" />
          </Field>
        </Modal>
      )}

      {nueva && <NuevaPersona codigo={codigo} onClose={() => setNueva(false)} />}
    </>
  )
}

/* ---------------- Alta de persona ---------------- */
const NuevaPersona: React.FC<{ codigo: string; onClose: () => void }> = ({ codigo, onClose }) => {
  const dispatch = useAppDispatch()
  const usuario = useAppSelector(s => s.auth.usuario)
  const [d, setD] = useState({
    nombre: '', documento: '', rol: 'Accionista' as Persona['rol'],
    nacionalidad: 'Venezolana', porcentaje: '', cargo: '',
    pep: false, pepCargo: '', pepDesde: '',
  })
  const ok = d.nombre.trim().length > 3 && d.documento.trim().length > 4

  return (
    <Modal title="Agregar persona vinculada" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={!ok} onClick={() => {
          dispatch(agregarPersona({
            codigo,
            persona: {
              id: 'p' + Date.now(), nombre: d.nombre, documento: d.documento, rol: d.rol,
              nacionalidad: d.nacionalidad,
              porcentaje: d.rol === 'Accionista' && d.porcentaje ? Number(d.porcentaje) : undefined,
              cargo: d.rol === 'Representante legal' ? d.cargo : undefined,
              pep: d.pep, pepCargo: d.pep ? d.pepCargo : undefined, pepDesde: d.pep ? d.pepDesde : undefined,
            },
            usuario: usuario!.nombre, rol: usuario!.rol,
          }))
          onClose()
        }}>Guardar</button></>}>
      <div className="grid">
        <Field label="Nombre completo"><input value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} placeholder="Nombres y apellidos" /></Field>
        <Field label="Documento"><input value={d.documento} onChange={e => setD({ ...d, documento: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Rol">
          <select value={d.rol} onChange={e => setD({ ...d, rol: e.target.value as Persona['rol'] })}>
            <option>Accionista</option><option>Beneficiario final</option><option>Representante legal</option>
          </select>
        </Field>
        <Field label="Nacionalidad">
          <select value={d.nacionalidad} onChange={e => setD({ ...d, nacionalidad: e.target.value })}>
            <option>Venezolana</option><option>Portuguesa</option><option>Española</option><option>Rusa</option><option>Otra</option>
          </select>
        </Field>
        {d.rol === 'Accionista' &&
          <Field label="Participación (%)"><input value={d.porcentaje} onChange={e => setD({ ...d, porcentaje: e.target.value })} placeholder="0 a 100" /></Field>}
        {d.rol === 'Representante legal' &&
          <Field label="Cargo"><input value={d.cargo} onChange={e => setD({ ...d, cargo: e.target.value })} placeholder="Cargo que ocupa" /></Field>}
      </div>

      <div style={{ marginTop: 16, padding: 13, background: 'var(--surface)', borderRadius: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5 }}>
          <input type="checkbox" checked={d.pep} onChange={e => setD({ ...d, pep: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: 'var(--pri)' }} />
          <b>¿Es persona expuesta políticamente (PEP)?</b>
        </label>
        {d.pep ? (
          <div className="grid" style={{ marginTop: 13 }}>
            <Field label="Cargo público"><input value={d.pepCargo} onChange={e => setD({ ...d, pepCargo: e.target.value })} placeholder="Cargo que ocupa u ocupó" /></Field>
            <Field label="Desde"><input value={d.pepDesde} onChange={e => setD({ ...d, pepDesde: e.target.value })} placeholder="Año" /></Field>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 9 }}>
            Los campos de cargo y período aparecen solo si la respuesta es sí.
          </p>
        )}
      </div>
    </Modal>
  )
}
