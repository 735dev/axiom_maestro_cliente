import React, { useState, useEffect } from 'react'
import { Card, Tabs, Field, Modal, Pill, Kpi, Paginator } from '@/shared/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import {
  PERMISSIONS, TENANT_CATALOG, TENANT_GROUPS, definitionOf, dependOn, isPlatformPermission, withImplied,
  type PermissionCode,
} from '@/shared/auth/permissions'
import { useCan } from '@/shared/hooks/useCan'
import { login } from '@/shared/store/slices/authSlice'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  createUser, editUser, changeUserStatus, alternarExcepcion,
  toggleRolePermission, createRole, editRole, deleteRole, setRolePermissions, effectivePermissions,
  selectUsersOfMyCompany, selectRolesOfMyCompany, sincronizarAdministracion,
  type SystemUser, type UserStatus, type Rol,
} from '../store/usersSlice'
import * as V from '@/features/clients/schemas/client.schema'
import { PermissionsEditor } from '../components/PermissionsEditor'
import { maestroApi, type ApiRole, type ApiUser } from '@/shared/api/maestro'

const TODOS = TENANT_CATALOG.map(p => p.code)

const StatusPill: React.FC<{ e: UserStatus }> = ({ e }) => {
  const k = e === 'ACTIVO' ? 'ok' : e === 'BLOQUEADO' ? 'bad' : e === 'INVITADO' ? 'warn' : 'mut'
  return <Pill k={k}>{e[0] + e.slice(1).toLowerCase()}</Pill>
}

export const UsersPage = () => {
  const [tab, setTab] = useState('Usuarios')
  const dispatch = useAppDispatch()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([maestroApi.users(), maestroApi.roles()])
      .then(([users, roles]) => { if (active) dispatch(sincronizarAdministracion({ users: users.map(userFromApi), roles: roles.map(roleFromApi) })) })
      .catch(() => { if (active) setErrorApi('No fue posible cargar la administración desde el servidor.') })
      .finally(() => { if (active) setListo(true) })
    return () => { active = false }
  }, [dispatch])
  if (!listo) return null
  return (
    <>
      <Card flush>
        <Tabs items={['Usuarios', 'Roles y permisos', 'Catálogo de permisos']} value={tab} onChange={setTab} />
        <div style={{ padding: 18 }}>
          {errorApi && <div className="val-err">{errorApi}</div>}
          {tab === 'Usuarios' && <Users />}
          {tab === 'Roles y permisos' && <Roles />}
          {tab === 'Catálogo de permisos' && <Catalog />}
        </div>
      </Card>
    </>
  )
}

const roleFromApi = (r: ApiRole): Rol => ({ id: r.id, name: r.nombre, description: r.descripcion ?? '', permissions: r.permisos.map(p => p.codigo as PermissionCode), sistema: r.es_predefinido, companyId: r.empresa_id ?? undefined, platform: !r.empresa_id })
const userFromApi = (u: ApiUser): SystemUser => ({
  companyId: u.empresa_id ?? null,
  id: u.id,
  name: u.nombre_completo,
  email: u.email,
  rolId: u.rol_id ?? '',
  status: ({ active: 'ACTIVO', blocked: 'BLOQUEADO', invited: 'INVITADO', inactive: 'INACTIVO' }[u.status] ?? 'INACTIVO') as UserStatus,
  granted: (u.concedidos ?? []) as PermissionCode[],
  revoked: (u.revocados ?? []) as PermissionCode[],
})

/* ---------------- Usuarios ---------------- */
const Users = () => {
  const users = useAppSelector(selectUsersOfMyCompany)
  const roles = useAppSelector(selectRolesOfMyCompany)
  const dispatch = useAppDispatch()
  const [adding, setAdding] = useState(false)
  const [detalle, setDetalle] = useState<SystemUser | null>(null)
  const [q, setQ] = useState('')
  const rolDe = (id: string) => roles.find(r => r.id === id)

  const list = users.filter(u =>
    (u.name + u.email + (rolDe(u.rolId)?.name ?? '')).toLowerCase().includes(q.trim().toLowerCase()))
  const { visibleItems, paginator } = usePagination(list)

  return (
    <>
      <div className="kpis">
        <Kpi label="Usuarios" value={users.length} foot="en los dos sistemas" />
        <Kpi label="Activos" value={users.filter(u => u.status === 'ACTIVO').length} foot="pueden entrar hoy" />
        <Kpi label="Con excepciones" value={users.filter(u => u.granted.length || u.revoked.length).length} foot="permisos fuera de su rol" />
        <Kpi label="Roles" value={roles.length} foot="definidos" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="sec" style={{ margin: 0 }}>Usuarios del sistema</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Buscar por nombre, correo o rol" value={q} onChange={e => setQ(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 10, width: 250, background: 'var(--bg)' }} />
          <button className="btn sm pri" onClick={() => setAdding(true)}>Nuevo usuario</button>
        </div>
      </div>

      <table>
        <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Permisos</th><th>Estado</th><th>Último acceso</th><th /></tr></thead>
        <tbody>
          {visibleItems.map(u => {
            const effective = effectivePermissions(u, roles)
            return (
              <tr key={u.id}>
                <td><b style={{ fontWeight: 500 }}>{u.name}</b></td>
                <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{u.email}</td>
                <td>{rolDe(u.rolId)?.name ?? '—'}</td>
                <td>
                  <span className="num" style={{ fontSize: 12 }}>{effective.length}</span>
                  {u.granted.length > 0 && <span className="pill ok" style={{ marginLeft: 6 }}><i className="dot" />+{u.granted.length}</span>}
                  {u.revoked.length > 0 && <span className="pill bad" style={{ marginLeft: 6 }}><i className="dot" />−{u.revoked.length}</span>}
                </td>
                <td><StatusPill e={u.status} /></td>
                <td className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>{u.lastAccess ?? 'Nunca'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setDetalle(u)}>Permisos</button>
                    {u.status === 'BLOQUEADO'
                      ? <button className="btn sm" onClick={() => maestroApi.changeUserStatus(u.id, 'active').then(() => dispatch(changeUserStatus({ id: u.id, status: 'ACTIVO' }))) }>Reactivar</button>
                      : <button className="btn sm" onClick={() => maestroApi.changeUserStatus(u.id, 'blocked').then(() => dispatch(changeUserStatus({ id: u.id, status: 'BLOQUEADO' }))) }>Bloquear</button>}
                  </div>
                </td>
              </tr>
            )
          })}
          {!visibleItems.length && <tr><td colSpan={7}><div className="empty">Sin usuarios que coincidan.</div></td></tr>}
        </tbody>
      </table>
      <Paginator p={paginator} label="usuarios" />

      {adding && <NewUser onClose={() => setAdding(false)} />}
      {detalle && <UserPermissions user={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}

const NewUser: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const roles = useAppSelector(selectRolesOfMyCompany)
  const emails = useAppSelector(s => s.users.users.map(u => u.email))
  const dispatch = useAppDispatch()
  const companyId = useAppSelector(s => s.auth.user?.companyId) ?? ''
  const [d, setD] = useState({ name: '', email: '', rolId: roles[0].id })
  const [tocado, setTocado] = useState<Record<string, boolean>>({})

  const nameError = V.personName(d.name)
  const emailError = V.email(d.email) ?? (emails.includes(d.email.trim()) ? 'Ese correo ya tiene cuenta.' : null)
  const ok = !nameError && !emailError

  return (
    <Modal title="Nuevo usuario" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={() => {
          if (!ok) { setTocado({ name: true, email: true }); return }
          dispatch(createUser({ ...d, companyId, status: 'INVITADO', granted: [], revoked: [] }))
          onClose()
        }}>Invitar</button></>}>
      <div className="grid">
        <Field label="Nombre completo" error={tocado.name ? nameError ?? undefined : undefined}>
          <input value={d.name} onChange={e => setD({ ...d, name: e.target.value })}
            onBlur={() => setTocado(t => ({ ...t, name: true }))} placeholder="Nombres y apellidos" />
        </Field>
        <Field label="Correo" error={tocado.email ? emailError ?? undefined : undefined}>
          <input value={d.email} onChange={e => setD({ ...d, email: e.target.value })}
            onBlur={() => setTocado(t => ({ ...t, email: true }))} placeholder="usuario@fondoganadero.demo" />
        </Field>
        <Field label="Rol">
          <select value={d.rolId} onChange={e => setD({ ...d, rolId: e.target.value })}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

const UserPermissions: React.FC<{ user: SystemUser; onClose: () => void }> = ({ user, onClose }) => {
  const { roles, users } = useAppSelector(s => s.users)
  const sessionUser = useAppSelector(s => s.auth.user)
  const token = useAppSelector(s => s.auth.token)
  const u = users.find(x => x.id === user.id)!
  const dispatch = useAppDispatch()
  const canManage = useCan()(PERMISSIONS.usersManage)
  const rol = roles.find(r => r.id === u.rolId)!
  const [solicitud, setSolicitud] = useState<{ permission: PermissionCode; modo: 'conceder' | 'revocar' } | null>(null)
  const [reason, setReason] = useState('')
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const modoDe = (p: PermissionCode): 'conceder' | 'revocar' | 'rol' =>
    u.granted.includes(p) ? 'conceder' : u.revoked.includes(p) ? 'revocar' : 'rol'

  const catalogCodes = TENANT_CATALOG.map(d => d.code)
  const effective = effectivePermissions(u, roles).filter(p => catalogCodes.includes(p))
  const enRolDe = (p: PermissionCode) => rol.permissions.includes(p)

  const actualizarExcepcion = (p: PermissionCode, modo: 'conceder' | 'revocar') => {
    if (!canManage || isPlatformPermission(p) || modo === modoDe(p)) return
    if (modo === 'conceder' && enRolDe(p)) return
    if (modo === 'revocar' && !enRolDe(p) && modoDe(p) !== 'conceder') return
    setSolicitud({ permission: p, modo })
    setReason('')
    setPermissionError(null)
  }

  const saveException = async () => {
    if (!solicitud) return
    const text = reason.trim()
    if (text.length < 10) {
      setPermissionError('Escriba al menos 10 caracteres. El servidor no guarda una excepción sin justificación.')
      return
    }
    const effectiveNow = new Set(effectivePermissions(u, roles))
    const touched = (solicitud.modo === 'conceder'
      ? withImplied([solicitud.permission]).filter(c => !enRolDe(c) && !u.granted.includes(c))
      : [solicitud.permission, ...dependOn(solicitud.permission)].filter(c => effectiveNow.has(c))) as PermissionCode[]
    if (!touched.length) { setSolicitud(null); return }
    try {
      const catalog = await maestroApi.permissions()
      for (const code of touched) {
        const permission = catalog.find(x => x.codigo === code)
        if (!permission) { setPermissionError('Ese permiso no está en el catálogo del servidor.'); return }
        const granted = solicitud.modo === 'conceder'
        await maestroApi.userException(u.id, permission.id, granted, text)
        dispatch(alternarExcepcion({ id: u.id, permission: code, modo: granted ? 'conceder' : 'revocar' }))
      }
      if (sessionUser && token && sessionUser.id === u.id) {
        const session = await maestroApi.session()
        dispatch(login({ token, user: { ...sessionUser, permissions: session.permisos, name: session.nombre, rol: session.rol } }))
      }
      setSolicitud(null)
    } catch { setPermissionError('No fue posible guardar la excepción de permiso.') }
  }

  const caption = (p: PermissionCode) => {
    const modo = modoDe(p)
    if (modo === 'conceder' && enRolDe(p)) return 'concedido, y el rol ya lo incluye'
    if (modo === 'conceder') return 'concedido a esta persona'
    if (modo === 'revocar') return 'quitado a esta persona'
    return enRolDe(p) ? 'incluido en el rol' : 'no está en el rol'
  }

  return (
    <>
    <Modal title={`Permisos de ${u.name}`} onClose={onClose}
      footer={<button className="btn pri" onClick={onClose}>Listo</button>}>
      <div className="grid" style={{ marginBottom: 4 }}>
        <Field label="Rol" value={rol.name} />
        <Field label="Permisos efectivos" value={String(effective.length) + ' de ' + catalogCodes.length} mono />
      </div>
      <p className="dlg-txt">{rol.description} El número cuenta solo los permisos de esta lista.</p>

      {TENANT_GROUPS.map(g => (
        <div key={g}>
          <div className="sec">{g}</div>
          {TENANT_CATALOG.filter(d => d.group === g).map(({ code: p, name, description }) => {
            const modo = modoDe(p)
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{name}</div>
                  <div className="td-sub" style={{ maxWidth: '46ch' }}>{description}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6, maxWidth: 180 }}>
                    {caption(p)}
                  </span>
                  {(['conceder', 'revocar'] as const).map(m => {
                    const blocked = !canManage
                      || m === modo
                      || (m === 'conceder' && enRolDe(p))
                      || (m === 'revocar' && !enRolDe(p) && modo !== 'conceder')
                    return (
                      <button key={m} className="btn sm" disabled={blocked}
                        onClick={() => actualizarExcepcion(p, m)}
                        style={modo === m
                          ? { background: m === 'conceder' ? 'var(--ok)' : 'var(--bad)', color: '#fff', borderColor: 'transparent' }
                          : undefined}>
                        {m === 'conceder' ? 'Conceder' : 'Revocar'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ))}

    </Modal>
    {solicitud && <Modal title={solicitud.modo === 'conceder' ? 'Conceder permiso individual' : 'Revocar permiso individual'}
      onClose={() => setSolicitud(null)}
      footer={<><button className="btn" onClick={() => setSolicitud(null)}>Cancelar</button>
        <button className="btn pri" onClick={() => void saveException()}>Guardar excepción</button></>}>
      <p className="dlg-txt">El cambio aplica solo a <b>{u.name}</b> y queda en la auditoría.</p>
      <Field label="Justificación" error={permissionError ?? undefined} hint="Obligatoria, al menos 10 caracteres.">
        <textarea autoFocus rows={4} value={reason} onChange={e => { setReason(e.target.value); setPermissionError(null) }} placeholder="Por qué esta persona tiene un permiso distinto al de su rol." />
      </Field>
    </Modal>}
    </>
  )
}

/* ---------------- Roles ----------------
 * Maestro-detalle, no matriz. Una matriz de permisos × roles crece a lo ancho:
 * con cinco roles ya no entra en pantalla y con quince es ilegible. Aquí los
 * roles son una lista vertical (crece hacia abajo, con buscador) y solo se
 * editan los permisos del rol seleccionado.
 */
const Roles = () => {
  const roles = useAppSelector(selectRolesOfMyCompany)
  const users = useAppSelector(selectUsersOfMyCompany)
  const dispatch = useAppDispatch()
  const [sel, setSel] = useState(roles[0]?.id ?? '')
  const [qRol, setQRol] = useState('')
  const [modal, setModal] = useState<null | { modo: 'nuevo' | 'duplicar' | 'editar' }>(null)
  const [borrando, setBorrando] = useState(false)
  /** Nombre del rol recién creado: se selecciona solo cuando aparece en el store. */
  const [pending, setPending] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pending) return
    const created = roles.find(r => r.name === pending)
    if (created) { setSel(created.id); setPending(null) }
  }, [roles, pending])

  const rol = roles.find(r => r.id === sel) ?? roles[0]
  const conRol = (id: string) => users.filter(u => u.rolId === id).length
  const listings = roles.filter(r => r.name.toLowerCase().includes(qRol.trim().toLowerCase()))
  const rolesPag = usePagination(listings)
  const usersOfRole = users.filter(u => u.rolId === rol.id)

  const savePermissions = async (siguientes: PermissionCode[]) => {
    const tenantOnly = siguientes.filter(p => !isPlatformPermission(p))
    setGuardando(true); setError(null)
    try {
      const permissions = await maestroApi.permissions()
      const ids = tenantOnly.map(c => permissions.find(p => p.codigo === c)?.id).filter((id): id is string => Boolean(id))
      await maestroApi.replaceRolePermissions(rol.id, ids)
      dispatch(sincronizarAdministracion({ users, roles: roles.map(r => r.id === rol.id ? { ...r, permissions: tenantOnly } : r) }))
    } catch { setError('No se pudieron actualizar los permisos del rol.') }
    finally { setGuardando(false) }
  }


  return (
    <>
      <div className="rp">
        {/* ---- maestro: los roles ---- */}
        <div className="rp-col">
          <div className="rp-head">
            <div className="sec" style={{ margin: 0 }}>Roles<span className="num"> · {roles.length}</span></div>
            <button className="btn sm pri" onClick={() => setModal({ modo: 'nuevo' })}>Nuevo</button>
          </div>
          <input className="rp-find" placeholder="Buscar rol" value={qRol} onChange={e => setQRol(e.target.value)} />
          <div className="rp-list">
            {rolesPag.visibleItems.map(r => (
              <button key={r.id} className={'rp-item' + (r.id === rol.id ? ' on' : '')} onClick={() => setSel(r.id)}>
                <div className="rp-item-n">
                  {r.name}
                  {r.sistema && <span className="pill mut">Sistema</span>}
                </div>
                <div className="rp-item-m">
                  <span className="num">{r.permissions.filter(p => TODOS.includes(p)).length}</span> permisos
                  <span className="rp-sep">·</span>
                  <span className="num">{conRol(r.id)}</span>
                </div>
              </button>
            ))}
            {!listings.length && <div className="empty">Sin roles que coincidan con “{qRol}”.</div>}
          </div>
          <Paginator p={rolesPag.paginator} label="roles" compact />
        </div>

        {/* ---- detalle: los permisos del rol seleccionado ---- */}
        <div className="rp-col rp-det">
          <div className="rp-head">
            <div>
              <div className="rp-title">{rol.name}{rol.sistema && <span className="pill mut">Sistema</span>}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn sm" onClick={() => setModal({ modo: 'editar' })}>Renombrar</button>
              <button className="btn sm" onClick={() => setModal({ modo: 'duplicar' })}>Duplicar</button>
              {!rol.sistema && <button className="btn sm" onClick={() => setBorrando(true)}>Eliminar</button>}
            </div>
          </div>

          <PermissionsEditor
            permissions={rol.permissions}
            onAlternar={p => savePermissions(rol.permissions.includes(p) ? rol.permissions.filter(x => x !== p) : [...rol.permissions, p])}
            onGroup={(permissions, value) => savePermissions(value ? Array.from(new Set([...rol.permissions, ...permissions])) : rol.permissions.filter(p => !permissions.includes(p)))}
            pie={<><b className="num">{conRol(rol.id)}</b> usuario{conRol(rol.id) === 1 ? '' : 's'} con este rol</>}
          />
          {guardando && <p className="td-sub">Guardando permisos…</p>}
          {error && <p className="val-err">{error}</p>}
        </div>
      </div>

      {modal && <RolModal modo={modal.modo} rol={rol} onClose={() => setModal(null)} onCreado={setPending} />}

      {borrando && (
        <Modal title={`Eliminar “${rol.name}”`} onClose={() => setBorrando(false)}
          footer={<><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn pri" disabled={usersOfRole.length > 0}
              onClick={() => { dispatch(deleteRole(rol.id)); setSel(roles[0].id); setBorrando(false) }}>Eliminar</button></>}>
          {usersOfRole.length > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{usersOfRole.length} usuario(s) tienen este rol</b>{' '}
              ({usersOfRole.map(u => u.name).join(', ')}). Eliminarlo los dejaría sin permisos.
              Cámbielos de rol primero.
            </p>
          ) : (
            <p className="dlg-txt">Ningún usuario tiene este rol. Eliminarlo no deja a nadie sin acceso.</p>
          )}
        </Modal>
      )}
    </>
  )
}

/** Un solo modal para crear, duplicar y renombrar: los tres piden lo mismo. */
const RolModal: React.FC<{
  modo: 'nuevo' | 'duplicar' | 'editar'
  rol: Rol
  onClose: () => void
  onCreado: (name: string) => void
}> = ({ modo, rol, onClose, onCreado }) => {
  const roles = useAppSelector(s => s.users.roles)
  const dispatch = useAppDispatch()
  const [d, setD] = useState(
    modo === 'editar' ? { name: rol.name, description: rol.description }
      : modo === 'duplicar' ? { name: rol.name + ' (copia)', description: rol.description }
        : { name: '', description: '' })
  const [tocado, setTocado] = useState(false)

  const t = d.name.trim()
  const err = t.length < 3 ? 'Escriba al menos 3 caracteres.'
    : roles.some(r => r.name.toLowerCase() === t.toLowerCase() && r.id !== (modo === 'editar' ? rol.id : ''))
      ? 'Ya existe un rol con ese nombre.' : null

  const title = modo === 'editar' ? 'Renombrar rol' : modo === 'duplicar' ? `Duplicar “${rol.name}”` : 'Nuevo rol'

  const save = () => {
    if (err) { setTocado(true); return }
    if (modo === 'editar') dispatch(editRole({ id: rol.id, name: t, description: d.description }))
    else {
      dispatch(createRole({ name: t, description: d.description, copiarDe: modo === 'duplicar' ? rol.id : undefined }))
      onCreado(t)
    }
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={save}>{modo === 'editar' ? 'Guardar' : 'Crear'}</button></>}>
      <div className="grid">
        <Field label="Nombre del rol" error={tocado ? err ?? undefined : undefined}>
          <input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })}
            onBlur={() => setTocado(true)} onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Ej. Analista senior" />
        </Field>
      </div>
      <Field label="Descripción">
        <textarea rows={2} value={d.description} onChange={e => setD({ ...d, description: e.target.value })}
          placeholder="Qué hace y qué no puede hacer" />
      </Field>
    </Modal>
  )
}

/* ---------------- Catálogo ---------------- */
const Catalog = () => {
  const [q, setQ] = useState('')
  const list = TODOS.filter(p =>
    (p + (definitionOf(p)?.name ?? '') + (definitionOf(p)?.description ?? '') + (definitionOf(p)?.group ?? ''))
      .toLowerCase().includes(q.trim().toLowerCase()))
  const { visibleItems, paginator } = usePagination(list)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="sec" style={{ margin: 0 }}>Catálogo cerrado de permisos</div>
        <input placeholder="Buscar permiso" value={q} onChange={e => setQ(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 10, width: 220, background: 'var(--bg)' }} />
      </div>
      <table>
        <thead><tr><th>Código</th><th>Qué habilita</th><th>Grupo</th><th>Nivel</th></tr></thead>
        <tbody>
          {visibleItems.map(p => (
            <tr key={p}>
              <td className="num" style={{ fontSize: 12 }}>{p}</td>
              <td>
                {definitionOf(p)?.name}
                <div className="td-sub" style={{ maxWidth: '60ch' }}>{definitionOf(p)?.description}</div>
              </td>
              <td><span className="pill mut">{definitionOf(p)?.group}</span></td>
              <td>
                {definitionOf(p)?.level === 'critico' ? <Pill k="bad">Crítico</Pill>
                  : definitionOf(p)?.level === 'escritura' ? <Pill k="warn">Escritura</Pill>
                    : <Pill k="mut">Lectura</Pill>}
              </td>
            </tr>
          ))}
          {!visibleItems.length && <tr><td colSpan={4}><div className="empty">Sin permisos que coincidan.</div></td></tr>}
        </tbody>
      </table>
      <Paginator p={paginator} label="permisos" />
    </>
  )
}
