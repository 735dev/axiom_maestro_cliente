import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Listing, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login, logout } from '@/shared/store/slices/authSlice'
import {
  createCompany, changeCompanyStatus, deleteCompany, editCompany, currentVersion,
  companyIsEmpty, type Company,
} from '../store/companiesSlice'
import { FormEditor } from './FormEditorPage'
import { PlatformDashboard } from './PlatformDashboard'
import { PlatformAuditPage } from './PlatformAuditPage'
import { PlatformUsers } from './PlatformUsersPage'
import { PlatformRoles } from './PlatformRolesPage'
import { maestroApi, type ApiDraftRetention } from '@/shared/api/maestro'
import { showNotice } from '@/shared/store/slices/uiSlice'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import { PortalBrand } from '@/shared/components/brand/TransvalorIsotype'
import { Module } from '@/app/Module'

/**
 * Consola de la plataforma. No es una pantalla más del sistema de una empresa:
 * es de Axiom, vive en su propia dirección y ninguna empresa cliente llega
 * hasta acá ni sabe que existe.
 *
 * Usa el mismo armazón que el panel de las empresas —barra lateral, cabecera,
 * contenido— porque son dos consolas del mismo producto: si cada una se navega
 * distinto, quien administra las dos tiene que aprender dos veces.
 */
const RUTAS = [
  { id: 'resumen', label: 'Dashboard', title: 'Resumen', sub: 'Estado de la plataforma y uso del producto.' },
  { id: 'empresas', label: 'Empresas', title: 'Empresas', sub: 'Altas, suspensiones, portal y baja de las que todavía no tienen datos.', permission: PERMISSIONS.companiesView },
  { id: 'formularios', label: 'Formularios', title: 'Formularios', sub: 'Qué le pide cada empresa a sus clientes.', permission: PERMISSIONS.formView },
  { id: 'usuarios', label: 'Usuarios', title: 'Usuarios', sub: 'Todo el padrón: las empresas y también Axiom.', permission: PERMISSIONS.usersView },
  { id: 'roles', label: 'Roles', title: 'Roles', sub: 'Quién puede qué, y hasta dónde llega cada rol.', permission: PERMISSIONS.rolesManage },
  { id: 'auditoria', label: 'Auditoría', title: 'Auditoría', sub: 'Todo lo que pasó, en todas las empresas y en Axiom.', permission: PERMISSIONS.auditLogView },
  { id: 'retencion', label: 'Retención', title: 'Retención de borradores', sub: 'Cuánto tiempo se conservan los registros abandonados.', permission: PERMISSIONS.retentionManage },
] as const satisfies readonly { id: string; label: string; title: string; sub: string; permission?: PermissionCode }[]

const IDS = new Set<string>(RUTAS.map(r => r.id))

export const PlatformPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { '*': splat } = useParams()
  const user = useAppSelector(s => s.auth.user)
  const token = useAppSelector(s => s.auth.token)
  const can = useCan()
  const mainRef = useRef<HTMLElement>(null)
  const pedido = (splat ?? '').split('/').filter(Boolean)[0] ?? 'resumen'
  const pedidoValido = IDS.has(pedido) ? pedido : 'resumen'

  useEffect(() => {
    if (!token || !user) return
    maestroApi.session().then(session => {
      dispatch(login({
        token,
        user: {
          id: session.user_id,
          name: session.nombre,
          rol: session.rol,
          permissions: session.permisos,
          email: session.email,
          scope: session.scope === 'platform' ? 'plataforma' : 'empresa',
          companyId: session.empresa_id,
        },
      }))
    }).catch(() => undefined)
  }, [dispatch, token])

  const visibleItems = RUTAS.filter(r => !('permission' in r) || can(r.permission))
  const current = visibleItems.find(r => r.id === pedidoValido) ?? visibleItems[0]
  const direccion = !current || current.id === 'resumen' ? '/plataforma' : `/plataforma/${current.id}`

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/'
    if (current && path !== direccion) navigate(direccion, { replace: true })
  }, [current, direccion, location.pathname, navigate])

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand">
          <PortalBrand className="side-logo" title="Axiom Core Tech" />
          <div><b>Axiom Core Tech</b><span>Consola de platform</span></div>
        </div>
        <nav className="nav">
          {visibleItems.map(r => (
            <button key={r.id} type="button" className={current.id === r.id ? 'on' : ''}
              onClick={() => navigate(r.id === 'resumen' ? '/plataforma' : `/plataforma/${r.id}`)}>{r.label}</button>
          ))}
        </nav>
        <div className="side-user">
          <b>{user?.name ?? '—'}</b><span>{user?.rol ?? ''}</span>
          <button className="btn sm" style={{ marginTop: 10, width: '100%' }}
            onClick={() => { dispatch(logout()); navigate('/acceso', { replace: true }) }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main" ref={mainRef}>
        <header className="top">
          <div>
            <h1>{current.title}</h1>
            <p>{current.sub}</p>
          </div>
        </header>
        <div className="content">
          {visibleItems.some(r => r.id === 'resumen') && <Module active={current.id === 'resumen'}><PlatformDashboard /></Module>}
          {visibleItems.some(r => r.id === 'empresas') && <Module active={current.id === 'empresas'}><Companies /></Module>}
          {visibleItems.some(r => r.id === 'formularios') && <Module active={current.id === 'formularios'}>
            <FormEditor editable={can(PERMISSIONS.formManage)} />
          </Module>}
          {visibleItems.some(r => r.id === 'usuarios') && <Module active={current.id === 'usuarios'}><PlatformUsers /></Module>}
          {visibleItems.some(r => r.id === 'roles') && <Module active={current.id === 'roles'}><PlatformRoles /></Module>}
          {visibleItems.some(r => r.id === 'auditoria') && <Module active={current.id === 'auditoria'}><PlatformAuditPage /></Module>}
          {visibleItems.some(r => r.id === 'retencion') && <Module active={current.id === 'retencion'}><DraftRetention /></Module>}
        </div>
      </main>
    </div>
  )
}

const DraftRetention = () => {
  const dispatch = useAppDispatch()
  const puede = useCan()(PERMISSIONS.retentionManage)
  const [items, setItems] = useState<ApiDraftRetention[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  useEffect(() => { maestroApi.draftRetentions().then(setItems).catch(() => undefined).finally(() => setLoading(false)) }, [])
  const cambiar = async (item: ApiDraftRetention, dias: number) => {
    setGuardando(item.empresa_id)
    try { setItems(xs => xs.map(x => x.empresa_id === item.empresa_id ? { ...x, dias } : x)); await maestroApi.updateDraftRetention(item.empresa_id, dias) }
    catch { dispatch(showNotice({ tipo: 'error', text: 'No fue posible guardar la política.' })) }
    finally { setGuardando(null) }
  }
  const options = [7, 15, 30, 60, 90, 180, 365]
  return <Listing
    title="Retención de borradores"
    sub="Define cuánto tiempo puede permanecer un registro sin actividad antes de que la tarea programada lo inactive. Nunca se borra físicamente."
    rows={items} rowKey={x => x.empresa_id} label="empresas"
    empty={loading ? 'Cargando políticas…' : 'No hay empresas configuradas.'}
    columns={[
      { th: 'Empresa', sort: x => x.empresa },
      { th: 'Días de retención', sort: x => x.dias },
      { th: 'Efecto', sort: x => x.dias },
    ]}
    row={x => <>
      <td><b>{x.empresa}</b><div className="td-sub">Política propia de esta company</div></td>
      <td>
        <div className="retencion-opciones" aria-label={`Días de retención para ${x.empresa}`}>
          {options.map(d => <button key={d} className={d === x.dias ? 'on' : ''}
            disabled={!puede || guardando === x.empresa_id} onClick={() => puede && d !== x.dias && void cambiar(x, d)}>
            {d} días
          </button>)}
        </div>
        {guardando === x.empresa_id && <div className="td-sub retencion-guardando">Guardando…</div>}
      </td>
      <td><span className="retencion-efecto"><i className="dot" />Se inactiva automáticamente al superar {x.dias} días sin actividad</span></td>
    </>}
  />
}

/* ---------------- Empresas ---------------- */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const Companies = () => {
  const companies = useAppSelector(s => s.companies.list)
  const clients = useAppSelector(s => s.clients.list)
  const users = useAppSelector(s => s.users.users)
  const dispatch = useAppDispatch()
  const [adding, setAdding] = useState(false)
  const [edit, setEditing] = useState<Company | null>(null)
  const [removing, setRemoving] = useState<Company | null>(null)
  const [borrando, setBorrando] = useState(false)
  const can = useCan()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Todas')

  const list = companies.filter(e =>
    (status === 'Todas' || e.status === status) &&
    (e.name + e.rif + e.slug).toLowerCase().includes(q.trim().toLowerCase()))

  const remove = async (e: Company) => {
    const clientes = clients.filter(c => c.companyId === e.id).length
    if (!companyIsEmpty(e, clientes)) {
      dispatch(showNotice({ tipo: 'error', text: 'Solo se borra una empresa sin clientes y sin formulario.' }))
      return
    }
    setBorrando(true)
    try {
      if (UUID_RE.test(e.id)) {
        try {
          await maestroApi.deleteCompany(e.id)
        } catch (err: unknown) {
          const statusCode = (err as { response?: { status?: number } })?.response?.status
          if (statusCode === 409) {
            dispatch(showNotice({ tipo: 'error', text: 'La empresa ya tiene datos y no se puede borrar.' }))
            return
          }
          if (statusCode && statusCode !== 404) {
            dispatch(showNotice({ tipo: 'error', text: 'No fue posible borrar la empresa.' }))
            return
          }
        }
      }
      dispatch(deleteCompany(e.id))
      setRemoving(null)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <>
      <Listing
        title="Empresas"
        sub={`${companies.length} en la plataforma · ${companies.filter(e => e.status === 'ACTIVA').length} activas`}
        rows={list}
        rowKey={e => e.id}
        label="empresas"
        empty="Sin empresas que coincidan."
        search={{ value: q, onChange: setQ, placeholder: 'Buscar por nombre, RIF o portal', width: 250 }}
        filters={[{
          value: status, onChange: setStatus,
          options: [
            { value: 'Todas', text: 'Todas' },
            { value: 'ACTIVA', text: 'Activa' },
            { value: 'SUSPENDIDA', text: 'Suspendida' },
          ],
        }]}
        actions={can(PERMISSIONS.companiesCreate) ? <button className="btn pri sm" onClick={() => setAdding(true)}>Nueva empresa</button> : undefined}
        columns={[
          { th: 'Empresa', sort: e => e.name },
          { th: 'RIF', sort: e => e.rif },
          { th: 'Portal', sort: e => e.slug },
          { th: 'Clientes', sort: e => clients.filter(c => c.companyId === e.id).length },
          { th: 'Usuarios', sort: e => users.filter(u => u.companyId === e.id).length },
          { th: 'Formulario', sort: e => currentVersion(e).version },
          { th: 'Estado', sort: e => e.status },
          { th: '', end: true },
        ]}
        row={e => {
          const vacia = companyIsEmpty(e, clients.filter(c => c.companyId === e.id).length)
          return (
          <>
            <td>
              <b style={{ fontWeight: 500 }}>{e.name}</b>
              <div className="td-sub">From {e.start}</div>
            </td>
            <td className="num">{e.rif}</td>
            <td className="td-sub">/{e.slug}</td>
            <td className="num">{clients.filter(c => c.companyId === e.id).length}</td>
            <td className="num">{users.filter(u => u.companyId === e.id).length}</td>
            <td className="num">v{currentVersion(e).version}</td>
            <td>{e.status === 'ACTIVA' ? <Pill k="ok">Activa</Pill> : <Pill k="bad">Suspendida</Pill>}</td>
            <td style={{ textAlign: 'right' }}>
              <div className="btn-row">
                {can(PERMISSIONS.companiesEdit) && <button className="btn sm" onClick={() => setEditing(e)}>Edit</button>}
                {can(PERMISSIONS.companiesSuspend) && <button className="btn sm" onClick={() => dispatch(changeCompanyStatus({
                  id: e.id, status: e.status === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA',
                }))}>
                  {e.status === 'ACTIVA' ? 'Suspender' : 'Reactivar'}
                </button>}
                {can(PERMISSIONS.companiesDelete) && (
                  <button
                    className="btn sm"
                    disabled={!vacia}
                    title={vacia ? undefined : 'Solo se borra una empresa sin clientes y sin formulario.'}
                    onClick={() => setRemoving(e)}
                  >Borrar</button>
                )}
              </div>
            </td>
          </>
          )
        }}
      />

      {adding && <NewCompany onClose={() => setAdding(false)} />}
      {edit && <EditCompany company={edit} onClose={() => setEditing(null)} />}
      {removing && (
        <Modal title={`Borrar ${removing.name}`} onClose={() => !borrando && setRemoving(null)}
          footer={<>
            <button className="btn" disabled={borrando} onClick={() => setRemoving(null)}>Cancelar</button>
            <button className="btn pri" disabled={borrando} onClick={() => void remove(removing)}>
              {borrando ? 'Borrando…' : 'Borrar empresa'}
            </button>
          </>}>
          <p className="dlg-txt">
            No tiene clientes ni formulario. Se quita de la plataforma y su administrador deja de poder entrar.
          </p>
        </Modal>
      )}
    </>
  )
}

const EditCompany: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
  const companies = useAppSelector(s => s.companies.list)
  const dispatch = useAppDispatch()
  const [d, setD] = useState({ name: company.name, rif: company.rif, slug: company.slug })
  const [tocado, setTocado] = useState(false)
  const otras = companies.filter(e => e.id !== company.id)
  const nameError = d.name.trim().length < 3 ? 'Escriba al menos 3 caracteres.'
    : otras.some(e => e.name.toLowerCase() === d.name.trim().toLowerCase()) ? 'Ya existe una empresa con ese nombre.' : null
  const errSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug.trim())
    ? 'Use minúsculas, números y guiones; por ejemplo fondo-ganadero.'
    : otras.some(e => e.slug.toLowerCase() === d.slug.trim().toLowerCase()) ? 'Ese portal ya está en uso.' : null
  const ok = !nameError && !errSlug
  const save = () => {
    if (!ok) { setTocado(true); return }
    dispatch(editCompany({
      id: company.id, name: d.name.trim(), rif: d.rif.trim().toUpperCase(),
      slug: d.slug.trim().toLowerCase(),
    }))
    onClose()
  }
  return (
    <Modal title={`Editar empresa · ${company.name}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={save}>Guardar</button></>}>
      <div className="sec">La company</div>
      <div className="grid">
        <Field label="Nombre" error={tocado ? nameError ?? undefined : undefined}>
          <input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="RIF">
          <input value={d.rif} onChange={e => setD({ ...d, rif: e.target.value.toUpperCase() })} placeholder="J-00000000-0" />
        </Field>
      </div>
      <Field label="Portal" error={tocado ? errSlug ?? undefined : undefined}
        hint={!errSlug ? 'La ruta será /' + (d.slug || 'su-portal') + '.' : undefined}>
        <input value={d.slug} onChange={e => setD({ ...d, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="fondo-ganadero" />
      </Field>
    </Modal>
  )
}

const NewCompany: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const companies = useAppSelector(s => s.companies.list)
  const emails = useAppSelector(s => s.users.users.map(u => u.email.toLowerCase()))
  const dispatch = useAppDispatch()
  const [d, setD] = useState({ name: '', rif: '', slug: '', adminName: '', adminEmail: '' })
  const [tocado, setTocado] = useState(false)

  const nameError = d.name.trim().length < 3 ? 'Escriba al menos 3 caracteres.'
    : companies.some(e => e.name.toLowerCase() === d.name.trim().toLowerCase()) ? 'Ya existe una empresa con ese nombre.' : null
  const errSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug.trim())
    ? 'Use minúsculas, números y guiones; por ejemplo fondo-ganadero.'
    : companies.some(e => e.slug.toLowerCase() === d.slug.trim().toLowerCase()) ? 'Ese portal ya está en uso.' : null
  const adminNameError = d.adminName.trim().length < 5 ? 'Nombre y apellido del administrador.' : null
  const adminEmailError = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.adminEmail.trim())
    ? 'Escriba un correo válido.'
    : emails.includes(d.adminEmail.trim().toLowerCase()) ? 'Ese correo ya tiene cuenta en la plataforma.' : null

  const ok = !nameError && !errSlug && !adminNameError && !adminEmailError

  const create = () => {
    if (!ok) { setTocado(true); return }
    dispatch(createCompany({
      name: d.name.trim(), rif: d.rif.trim(), slug: d.slug.trim().toLowerCase(),
      admin: { name: d.adminName.trim(), email: d.adminEmail.trim().toLowerCase() },
    }))
    onClose()
  }

  return (
    <Modal title="Nueva empresa" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={create}>Create company</button></>}>

      <div className="sec">La company</div>
      <div className="grid">
        <Field label="Nombre" error={tocado ? nameError ?? undefined : undefined}>
          <input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Razón social" />
        </Field>
        <Field label="RIF">
          <input value={d.rif} onChange={e => setD({ ...d, rif: e.target.value.toUpperCase() })} placeholder="J-00000000-0" />
        </Field>
      </div>
      <Field label="Portal" error={tocado ? errSlug ?? undefined : undefined}
        hint={!errSlug ? 'La ruta será /' + (d.slug || 'su-portal') + '.' : undefined}>
        <input value={d.slug} onChange={e => setD({ ...d, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="fondo-ganadero" />
      </Field>

      <div className="sec">Su administrador</div>
      <p className="dlg-txt">
        Es quien va a create el rest de los users y armar el form. Sin él la company queda
        creada pero sin nadie que pueda signIn, así que se da de intake en el mismo acto.
      </p>
      <div className="grid">
        <Field label="Nombre completo" error={tocado ? adminNameError ?? undefined : undefined}>
          <input value={d.adminName} onChange={e => setD({ ...d, adminName: e.target.value })}
            placeholder="Nombres y apellidos" />
        </Field>
        <Field label="Correo" error={tocado ? adminEmailError ?? undefined : undefined}>
          <input value={d.adminEmail} onChange={e => setD({ ...d, adminEmail: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && create()} placeholder="admin@empresa.com" />
        </Field>
      </div>

      <p className="dlg-txt" style={{ marginTop: 12 }}>
        Queda con rol <b>Administrador</b> y status <b>ACTIVE</b>: puede signIn de inmediato para
        terminar de configure la company. La company nace con el form en blanco.
      </p>
    </Modal>
  )
}
