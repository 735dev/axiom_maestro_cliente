import React, { useEffect, useState } from 'react'
import { type Client, type Person } from '../types/client.types'
import { Card, Tabs, Field, Modal, Paginator } from '@/shared/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import { StatusPill } from '../components/Pills'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectCatalogsOf } from '@/features/catalogs/store/catalogsSlice'
import { editClient, addPerson, removePerson, changeRecordStatus, replaceClientsFromApi, replaceClientPeople } from '../store/clientsSlice'
import { useCan } from '@/shared/hooks/useCan'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { PERMISSIONS } from '@/shared/auth/permissions'
import { maestroApi } from '@/shared/api/maestro'
import { fromApi } from './ClientsPage'
import { showNotice } from '@/shared/store/slices/uiSlice'

export const MasterRecord: React.FC<{ code: string; onBack: () => void }> = ({ code, onBack }) => {
  const client = useAppSelector(s => s.clients.list.find(c => c.code === code))
  const company = useCurrentCompany()
  const CATALOGS = useAppSelector(selectCatalogsOf(company?.id))
  const user = useAppSelector(s => s.auth.user)
  const dispatch = useAppDispatch()
  const can = useCan()
  const [people, setPeople] = useState<Person[]>([])

  useEffect(() => {
    if (!client?.code) return
    let active = true
    setPeople([])
    // The file reads related parties from the server. The client list does not
    // carry them, and its refresh must not blank this tab.
    maestroApi.clients({ count: 100, status: 'todos' }).then(({ data }) => {
      const apiClient = data.find(c => c.codigo === client.code)
      if (!apiClient || !active) return
      setApiClientId(apiClient.id)
      return maestroApi.relatedPeople(apiClient.id).then(rows => {
        if (!active) return
        const rol: Record<string, Person['rol']> = {
          shareholder: 'Accionista', beneficiario_final: 'Beneficiario final', representante_legal: 'Representante legal',
        }
        const cargadas = rows.map(p => ({
          id: p.id,
          name: [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' '),
          document: p.documento ?? '', nationality: p.nacionalidad === 'VEN' ? 'Venezolana' : (p.nacionalidad ?? ''),
          rol: rol[p.rol_vinculo] ?? 'Beneficiario final', porcentaje: p.porcentaje_participacion == null ? undefined : Number(p.porcentaje_participacion),
          cargo: p.cargo ?? undefined, pep: p.es_pep,
        }))
        setPeople(cargadas)
        dispatch(replaceClientPeople({ code, people: cargadas }))
      })
    }).catch(() => undefined)
    return () => { active = false }
  }, [code, client?.code, dispatch])

  const [tab, setTab] = useState('Datos de la empresa')
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState<Partial<Client>>({})
  const [reason, setReason] = useState('')
  const [confirm, setConfirming] = useState(false)
  const [adding, setAdding] = useState(false)
  const [remove, setRemoving] = useState<Person | null>(null)
  const [disable, setDisabling] = useState(false)
  // Aprobar y rechazar comparten un mismo diálogo: solo cambia el veredicto.
  const [decision, setDecision] = useState<'APROBADO' | 'RECHAZADO' | null>(null)
  const [apiClientId, setApiClientId] = useState<string | null>(null)
  const [revisado, setRevisado] = useState(false)

  // Recargar /panel/clientes/CLI-… no trae el expediente en el primer render.
  // Hasta que el servidor responde no se dice que no existe.
  useEffect(() => {
    if (client) return
    let active = true
    maestroApi.clients({ count: 100, status: 'todos' })
      .then(({ data }) => { if (active) dispatch(replaceClientsFromApi(data.map(fromApi))) })
      .catch(() => undefined)
      .finally(() => { if (active) setRevisado(true) })
    return () => { active = false }
  }, [client, code, dispatch])

  if (!client && !revisado) return null
  if (!client) return <div className="empty">Client no encontrado.</div>
  const canEdit = can(PERMISSIONS.recordsEdit)
  const canApprove = can(PERMISSIONS.recordsApprove)
  const canDisable = can(PERMISSIONS.recordsDeactivate)
  const seesVerdict = canApprove || can(PERMISSIONS.auditLogView)
  const peoplePage = usePagination(people)
  const suma = people.filter(p => p.rol === 'Accionista').reduce((a, p) => a + (p.porcentaje || 0), 0)

  const v = (k: keyof Client) => (draft[k] as string) ?? (client[k] as string)
  const set = (k: keyof Client) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft({ ...draft, [k]: e.target.value })

  const abrirEdicion = () => { setDraft({}); setReason(''); setEditando(true) }
  const cancelar = () => { setDraft({}); setEditando(false) }
  const save = async () => {
    const mapa: Record<string, string> = {
      legalName: 'razon_social', rif: 'documento', sector: 'sector_economico',
      activity: 'actividad_economica', activityDetail: 'actividad_economica',
      email: 'email', phone: 'phone', address: 'direccion',
      fundOrigin: 'origen_fondos', ingresos: 'ingresos_estimados', frequency: 'frecuencia_operacion',
    }
    const payload: Record<string, unknown> = { reason }
    for (const [key, value] of Object.entries(draft)) {
      const destination = mapa[key]
      if (destination) payload[destination] = value
    }
    try {
      if (!apiClientId) throw new Error('Cliente no encontrado en el servidor')
      await maestroApi.editClient(apiClientId, payload)
      dispatch(editClient({ code, cambios: draft, user: user!.name, rol: user!.rol, reason }))
      setEditando(false); setConfirming(false); setDraft({}); setReason('')
    } catch {
      dispatch(showNotice({ tipo: 'error', text: 'No fue posible guardar la ficha en el servidor.' }))
    }
  }

  const decidir = async () => {
    if (!decision) return
    try {
      if (!apiClientId) throw new Error('Cliente no encontrado en el servidor')
      if (decision === 'APROBADO') await maestroApi.approveClient(apiClientId, reason)
      else await maestroApi.rejectClient(apiClientId, reason)
      dispatch(changeRecordStatus({ code, status: decision, user: user!.name, rol: user!.rol, reason }))
      setDecision(null); setReason('')
    } catch { dispatch(showNotice({ tipo: 'error', text: 'No fue posible registrar la decisión en el servidor.' })) }
  }

  const field = (label: string, k: keyof Client, options?: string[]) =>
    editando
      ? <Field key={k} label={label}>
        {options
          ? <select value={v(k)} onChange={set(k)}>{options.map(o => <option key={o}>{o}</option>)}</select>
          : <input value={v(k)} onChange={set(k)} />}
      </Field>
      : <Field key={k} label={label} value={client[k] as string} />

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 14 }}>
        <button className="btn sm" onClick={onBack}>← Volver al listing</button>
      </div>

      <Card flush>
        <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="num" style={{ background: 'var(--strong)', color: '#fff', padding: '3px 10px', borderRadius: 8, fontWeight: 500 }}>{client.code}</span>
              <h2 style={{ fontSize: 19 }}>{client.legalName}</h2>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 5 }} className="num">{client.rif} · {client.tipo}</p>
            {client.reviewNotes && (
              <p style={{ fontSize: 13, marginTop: 8, maxWidth: 560 }}>{client.reviewNotes}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusPill e={client.status} />
            {client.verificationStatus === 'revisado_con_riesgo' && (
              <span className="pill bad"><i className="dot" />Con riesgo{client.riskLevel ? ` · ${client.riskLevel}` : ''}</span>
            )}
            {client.verificationStatus === 'revisado_conforme' && (
              <span className="pill ok"><i className="dot" />Conforme{client.riskLevel ? ` · ${client.riskLevel}` : ''}</span>
            )}
            {canEdit && !editando && (
              <button className="btn sm" onClick={abrirEdicion}>Edit record</button>
            )}
            {editando && <>
              <button className="btn sm" onClick={cancelar}>Cancelar</button>
              <button className="btn sm pri" onClick={() => setConfirming(true)}
                disabled={!Object.keys(draft).length}>Guardar cambios</button>
            </>}

            {!editando && canApprove && client.status === 'REVISADO' && <>
              <button className="btn sm" onClick={() => { setReason(''); setDecision('RECHAZADO') }}>Reject</button>
              <button className="btn sm pri" onClick={() => { setReason(''); setDecision('APROBADO') }}>Approve</button>
            </>}

            {!editando && canDisable && client.status === 'APROBADO' && (
              <button className="btn sm" onClick={() => { setReason(''); setDisabling(true) }}>Disable</button>
            )}
          </div>
        </div>
        <Tabs items={['Datos de la empresa', 'Personas vinculadas', 'Perfil financiero']} value={tab} onChange={setTab} />

        <div style={{ padding: 18 }}>
          {tab === 'Datos de la empresa' && (
            <>
              <div className="sec">Identificación</div>
              <div className="grid">
                {field('Razón social', 'legalName')}
                {field('RIF', 'rif')}
                {field('Tipo de empresa jurídica', 'tipo', (CATALOGS.tipo_empresa ?? []))}
                {field('Registro mercantil', 'registro')}
              </div>
              <div className="sec">Contacto y address</div>
              <div className="grid">
                {field('Domicilio fiscal', 'address')}
                {field('Teléfono', 'phone')}
                {field('Correo corporativo', 'email')}
                {field('Página web', 'web')}
              </div>
              <div className="sec">Activity</div>
              <div className="grid">
                {field('Sector económico', 'sector', (CATALOGS.sector ?? []))}
                {field('Actividad económica', 'activity', (CATALOGS.activity ?? []))}
              </div>
            </>
          )}

          {tab === 'Personas vinculadas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="sec" style={{ margin: 0 }}>Accionistas, beneficiarios finales y representantes</div>
                {canEdit && <button className="btn sm pri" onClick={() => setAdding(true)}>Agregar persona</button>}
              </div>
              <table>
                <thead><tr><th>Name</th><th>Document</th><th>Rol</th><th>Participación</th><th>Nationality</th><th>PEP</th><th /></tr></thead>
                <tbody>
                  {peoplePage.visibleItems.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}{p.cargo && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.cargo}</div>}</td>
                      <td className="num">{p.document}</td>
                      <td>{p.rol}</td>
                      <td className="num">{p.porcentaje ? p.porcentaje + '%' : '—'}</td>
                      <td>{p.nationality}</td>
                      <td>{p.pep
                        ? <span className="pill warn"><i className="dot" />Sí — {p.pepRole}</span>
                        : <span style={{ color: 'var(--muted)' }}>No</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canEdit && <button className="btn sm" onClick={() => { setReason(''); setRemoving(p) }}>Remove</button>}
                      </td>
                    </tr>
                  ))}
                  {!people.length &&
                    <tr><td colSpan={7}><div className="empty">Sin people vinculadas. Agregue al menos un shareholder y un representante legal.</div></td></tr>}
                </tbody>
              </table>
              <Paginator p={peoplePage.paginator} label="personas" />
              {people.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Suma de participación shareholding</span>
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
              <div className="sec">Declarado por el client</div>
              <div className="grid">
                {field('Origen de fondos', 'fundOrigin', (CATALOGS.origen_fondos ?? []))}
                {field('Rango de ingresos', 'ingresos', ['Menos de $1M', '$1M – $10M', '$10M – $50M', 'Más de $50M'])}
                {field('Monto que espera movilizar', 'declaredAmount')}
                {field('Frecuencia', 'frequency', ['Semanal', 'Quincenal', 'Mensual', 'Trimestral'])}
              </div>
              <div className="sec">Trazabilidad del registro</div>
              <div className="grid">
                <Field label="Registrado por" value={client.registeredBy} />
                <Field label="Fecha de registro" value={client.registeredAt} mono />
                {seesVerdict && <>
                  <Field label="Verificado por" value={client.verificadoPor} />
                  <Field label="Fecha de verificación" value={client.verificationDate} mono />
                  <Field label="Nivel de riesgo" value={client.riskLevel} />
                  <Field label="Observación de la Unidad" value={client.reviewNotes} />
                </>}
              </div>
            </>
          )}
        </div>
      </Card>

      {confirm && (
        <Modal title="Guardar cambios" onClose={() => setConfirming(false)}
          footer={<><button className="btn" onClick={() => setConfirming(false)}>Cancelar</button>
            <button className="btn pri" disabled={reason.trim().length < 10} onClick={save}>Guardar</button></>}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Se modificarán <b>{Object.keys(draft).length}</b> field(s). El cambio queda en la bitácora
            con su name, la fecha y el reason.
          </p>
          <Field label="Motivo del cambio (obligatorio)">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Por qué se corrige la ficha" />
          </Field>
        </Modal>
      )}

      {disable && (
        <Modal title="Inhabilitar cliente" onClose={() => setDisabling(false)}
          footer={<><button className="btn" onClick={() => setDisabling(false)}>Cancelar</button>
            <button className="btn pri" disabled={reason.trim().length < 10}
              onClick={() => {
                if (!apiClientId) return
                maestroApi.disableClient(apiClientId, reason).then(() => {
                  dispatch(changeRecordStatus({ code, status: 'INHABILITADO', user: user!.name, rol: user!.rol, reason }))
                  setDisabling(false); setReason('')
                }).catch(() => dispatch(showNotice({ tipo: 'error', text: 'No fue posible inhabilitar el cliente.' })))
              }}>Disable</button></>}>
          <p className="dlg-txt">
            El client <b>no se borra</b>: queda inhabilitado y keep toda su historia.
          </p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Por qué se inhabilita este cliente" />
          </Field>
        </Modal>
      )}

      {decision && (
        <Modal title={decision === 'APROBADO' ? 'Aprobar cliente' : 'Rechazar cliente'} onClose={() => setDecision(null)}
          footer={<><button className="btn" onClick={() => setDecision(null)}>Cancelar</button>
            <button className="btn pri" disabled={reason.trim().length < 10} onClick={decidir}>
              {decision === 'APROBADO' ? 'Aprobar' : 'Rechazar'}
            </button></>}>
          <p className="dlg-txt">
            {decision === 'APROBADO'
              ? <>El client queda <b>habilitado para operar</b>. Axiom Prevención ya terminó su revisión; esta es la decisión de la company.</>
              : <>El caseFile queda <b>rechazado</b>. No se borra: keep toda su historia.</>}
          </p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder={decision === 'APROBADO' ? 'Por qué se aprueba este cliente' : 'Por qué se rechaza este cliente'} />
          </Field>
        </Modal>
      )}

      {remove && (
        <Modal title="Quitar persona vinculada" onClose={() => setRemoving(null)}
          footer={<><button className="btn" onClick={() => setRemoving(null)}>Cancelar</button>
            <button className="btn pri" disabled={reason.trim().length < 10}
              onClick={() => {
                if (!apiClientId) return
                maestroApi.deactivatePerson(apiClientId, remove.id).then(() => {
                  dispatch(removePerson({ code, personId: remove.id, user: user!.name, rol: user!.rol, reason }))
                  setRemoving(null); setReason('')
                }).catch(() => dispatch(showNotice({ tipo: 'error', text: 'No fue posible quitar la persona.' })))
              }}>Remove</button></>}>
          <p style={{ fontSize: 13, marginBottom: 12 }}><b>{remove.name}</b> — {remove.rol}</p>
          <Field label="Motivo (obligatorio)">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Por qué deja de estar vinculada" />
          </Field>
        </Modal>
      )}

      {adding && apiClientId && <NewPerson code={code} clientId={apiClientId} onClose={() => setAdding(false)} />}
    </>
  )
}

/* ---------------- Alta de persona ---------------- */
const NewPerson: React.FC<{ code: string; clientId: string; onClose: () => void }> = ({ code, clientId, onClose }) => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(s => s.auth.user)
  const [d, setD] = useState({
    name: '', document: '', rol: 'Accionista' as Person['rol'],
    nationality: 'Venezolana', porcentaje: '', cargo: '',
    pep: false, pepRole: '', pepSince: '',
  })
  const ok = d.name.trim().length > 3 && d.document.trim().length > 4

  return (
    <Modal title="Agregar persona vinculada" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={!ok} onClick={() => {
          const partes = d.name.trim().split(/\s+/).filter(Boolean)
          const rolApi = { Accionista: 'accionista', 'Beneficiario final': 'beneficiario_final', 'Representante legal': 'representante_legal' }[d.rol]
          const nationality = { Venezolana: 'VEN', Portuguesa: 'PRT', Española: 'ESP', Rusa: 'RUS' }[d.nationality]
          maestroApi.createPerson(clientId, {
            rol_vinculo: rolApi,
            primer_nombre: partes[0],
            primer_apellido: partes[1] ?? 'Sin apellido',
            segundo_nombre: partes[2],
            documento: d.document,
            nacionalidad: nationality,
            cargo: d.rol === 'Representante legal' ? d.cargo : undefined,
            porcentaje_participacion: d.rol === 'Accionista' && d.porcentaje ? Number(d.porcentaje) : undefined,
            es_pep: d.pep,
          }).then(p => {
            dispatch(addPerson({
              code,
              person: {
                id: p.id, name: d.name, document: d.document, rol: d.rol,
                nationality: d.nationality,
                porcentaje: d.rol === 'Accionista' && d.porcentaje ? Number(d.porcentaje) : undefined,
                cargo: d.rol === 'Representante legal' ? d.cargo : undefined,
                pep: d.pep, pepRole: d.pep ? d.pepRole : undefined, pepSince: d.pep ? d.pepSince : undefined,
              },
              user: user!.name, rol: user!.rol,
            }))
            onClose()
          }).catch(() => dispatch(showNotice({ tipo: 'error', text: 'No fue posible guardar la persona.' })))
        }}>Guardar</button></>}>
      <div className="grid">
        <Field label="Nombre completo"><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombres y apellidos" /></Field>
        <Field label="Documento"><input value={d.document} onChange={e => setD({ ...d, document: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Rol">
          <select value={d.rol} onChange={e => setD({ ...d, rol: e.target.value as Person['rol'] })}>
            <option>Accionista</option><option>Beneficiario final</option><option>Representante legal</option>
          </select>
        </Field>
        <Field label="Nacionalidad">
          <select value={d.nationality} onChange={e => setD({ ...d, nationality: e.target.value })}>
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
          <b>¿Es person expuesta políticamente (PEP)?</b>
        </label>
        {d.pep ? (
          <div className="grid" style={{ marginTop: 13 }}>
            <Field label="Cargo público"><input value={d.pepRole} onChange={e => setD({ ...d, pepRole: e.target.value })} placeholder="Cargo que ocupa u ocupó" /></Field>
            <Field label="Desde"><input value={d.pepSince} onChange={e => setD({ ...d, pepSince: e.target.value })} placeholder="Año" /></Field>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 9 }}>
            Los fields de cargo y período aparecen solo si la answer es sí.
          </p>
        )}
      </div>
    </Modal>
  )
}
