import React, { useEffect, useState } from 'react'
import { Listing, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  alternarExcepcion, changeUserStatus, editUser, effectivePermissions, selectAllUsers,
  sincronizarAdministracion,
  type SystemUser,
} from '@/features/users/store/usersSlice'
import {
  PERMISSIONS, withImplied, dependOn, definitionOf, isPlatformPermission,
  type PermissionCode,
} from '@/shared/auth/permissions'
import { maestroApi } from '@/shared/api/maestro'
import { useCan } from '@/shared/hooks/useCan'
import type { ApiRole, ApiUser } from '@/shared/api/maestro'

/** Sin empresa quiere decir personal de Axiom. Es la única diferencia. */
const AXIOM = 'Axiom Core Tech'

/**
 * Padrón completo de la plataforma: todos los usuarios, de todas las empresas
 * y también los de Axiom.
 *
 * Una sola tabla a propósito. Un usuario de Axiom y uno de una empresa son la
 * misma entidad; lo único que cambia es si tiene empresa. Separarlos en dos
 * listas obliga a duplicar filtros, columnas y acciones para no ganar nada.
 */
export const PlatformUsers = () => {
  const users = useAppSelector(selectAllUsers)
  const roles = useAppSelector(s => s.users.roles)
  const companies = useAppSelector(s => s.companies.list)
  const dispatch = useAppDispatch()
  const can = useCan()
  const canManage = can(PERMISSIONS.usersManage)

  const [q, setQ] = useState('')
  const [scope, setScope] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [confirm, setConfirming] = useState<SystemUser | null>(null)
  const [editando, setEditando] = useState<SystemUser | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([maestroApi.users(), maestroApi.roles()]).then(([apiUsers, rolesApi]) => {
      if (!active) return
      dispatch(sincronizarAdministracion({
        users: apiUsers.map(userFromApi),
        roles: rolesApi.map(roleFromApi),
      }))
    }).catch(() => undefined).finally(() => { if (active) setListo(true) })
    return () => { active = false }
  }, [dispatch])

  const whereAt = (u: SystemUser) =>
    u.companyId ? u.companyName ?? companies.find(e => e.id === u.companyId)?.name ?? u.companyId : AXIOM
  const rolDe = (id: string) => roles.find(r => r.id === id)?.name ?? '—'
  const isAxiomStaff = (u: SystemUser) => u.companyId === null

  const list = users.filter(u =>
    (scope === 'Todas' || whereAt(u) === scope) &&
    (status === 'Todos' || u.status === status) &&
    (u.name + u.email + rolDe(u.rolId) + whereAt(u)).toLowerCase().includes(q.trim().toLowerCase()))

  if (!listo) return null

  return (
    <>
      <Listing
        title="Usuarios"
        sub={`${users.length} en total · ${users.filter(u => u.status === 'ACTIVO').length} pueden entrar hoy`}
        rows={list}
        rowKey={u => u.id}
        label="usuarios"
        empty="Sin usuarios que coincidan."
        perPage={25}
        search={{ value: q, onChange: setQ, placeholder: 'Buscar por nombre, correo o rol' }}
        filters={[
          { value: scope, onChange: setScope, options: ['Todas', AXIOM, ...companies.map(e => e.name)] },
          {
            value: status, onChange: setStatus,
            options: [
              { value: 'Todos', text: 'Todos' },
              { value: 'ACTIVO', text: 'Activo' },
              { value: 'INVITADO', text: 'Invitado' },
              { value: 'BLOQUEADO', text: 'Bloqueado' },
              { value: 'INACTIVO', text: 'Inactivo' },
            ],
          },
        ]}
        columns={[
          { th: 'Usuario', sort: u => u.name },
          { th: 'Dónde', sort: u => whereAt(u) },
          { th: 'Rol', sort: u => rolDe(u.rolId) },
          { th: 'Permisos' },
          { th: 'Estado', sort: u => u.status },
          { th: 'Último acceso', sort: u => u.lastAccess ?? '' },
          { th: '', end: true },
        ]}
        row={u => (
          <>
            <td>
              <b style={{ fontWeight: 500 }}>{u.name}</b>
              <div className="td-sub">{u.email}</div>
            </td>
            <td className="td-m">
              {isAxiomStaff(u)
                ? <><b style={{ fontWeight: 500 }}>{AXIOM}</b><div className="td-sub">sin company</div></>
                : whereAt(u)}
            </td>
            <td className="td-m">{rolDe(u.rolId)}</td>
            <td>
              <button className="btn sm" onClick={() => setAbierto(u.id)}>Ver permisos</button>
            </td>
            <td><Pill k={u.status === 'ACTIVO' ? 'ok' : u.status === 'BLOQUEADO' ? 'bad' : 'warn'}>
              {u.status[0] + u.status.slice(1).toLowerCase()}</Pill></td>
            <td className="num td-sub">{u.lastAccess ?? 'Nunca'}</td>
            <td style={{ textAlign: 'right' }}>
              {canManage && (
                <div className="btn-row">
                  <button className="btn sm" onClick={() => setEditando(u)}>Edit</button>
                  <button className="btn sm" onClick={() => setConfirming(u)}>
                    {u.status === 'BLOQUEADO' ? 'Reactivar' : 'Bloquear'}
                  </button>
                </div>
              )}
            </td>
          </>
        )}
      />

      {abierto && <EditorExcepciones userId={abierto} onCerrar={() => setAbierto(null)} />}
      {editando && <EditUser user={editando} onCerrar={() => setEditando(null)} />}

      {confirm && (
        <Modal title={confirm.status === 'BLOQUEADO' ? 'Reactivar usuario' : 'Bloquear usuario'}
          onClose={() => setConfirming(null)}
          footer={<><button className="btn" onClick={() => setConfirming(null)}>Cancelar</button>
            <button className="btn pri" onClick={() => {
              const siguiente = confirm.status === 'BLOQUEADO' ? 'ACTIVO' : 'BLOQUEADO'
              maestroApi.changeUserStatus(confirm.id, siguiente === 'ACTIVO' ? 'active' : 'blocked')
                .then(() => dispatch(changeUserStatus({ id: confirm.id, status: siguiente })))
                .finally(() => setConfirming(null))
            }}>{confirm.status === 'BLOQUEADO' ? 'Reactivar' : 'Bloquear'}</button></>}>
          <p className="dlg-txt">
            <b>{confirm.name}</b> — {rolDe(confirm.rolId)} en {whereAt(confirm)}.
          </p>
          {!isAxiomStaff(confirm) && (
            <p className="dlg-txt">
              Está actuando sobre el user de una company client. Queda registered en la bitácora
              <b> de esa company</b>, con su name y la fecha: ellos van a ver que Axiom lo hizo.
            </p>
          )}
          {confirm.rolId === 'administrador' && confirm.status !== 'BLOQUEADO' && (
            <p className="val-err">
              Es el administrador de {whereAt(confirm)}. Si no queda otro usuario activo, la empresa
              se queda sin nadie que pueda signIn.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

const EditUser: React.FC<{ user: SystemUser; onCerrar: () => void }> = ({ user, onCerrar }) => {
  const roles = useAppSelector(s => s.users.roles)
  const dispatch = useAppDispatch()
  const custom = roles.filter(r => user.companyId ? r.companyId === user.companyId : r.companyId == null)
  const current = roles.find(r => r.id === user.rolId)
  const options = !current || custom.some(r => r.id === current.id) ? custom : [current, ...custom]
  const [name, setName] = useState(user.name)
  const [rolId, setRolId] = useState(user.rolId)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const save = async () => {
    const limpio = name.trim()
    if (limpio.length < 3) { setError('Escriba al menos 3 caracteres.'); return }
    if (!rolId) { setError('Elija un rol.'); return }
    setGuardando(true)
    setError(null)
    try {
      await maestroApi.editUser(user.id, limpio, rolId)
      dispatch(editUser({ id: user.id, cambios: { name: limpio, rolId } }))
      onCerrar()
    } catch {
      setError('No fue posible guardar. El usuario quedó como estaba.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal title={`Editar · ${user.name}`} onClose={onCerrar}
      footer={<><button className="btn" onClick={onCerrar}>Cancelar</button>
        <button className="btn pri" disabled={guardando} onClick={() => void save()}>Guardar</button></>}>
      <Field label="Nombre" error={error ?? undefined}>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Rol">
        <select value={rolId} onChange={e => setRolId(e.target.value)}>
          {options.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
    </Modal>
  )
}

const P = PERMISSIONS

/** Módulos y, dentro, la acción que prende o apaga el interruptor. */
const MODULES: { module: string; actions: { code: PermissionCode; action: string }[] }[] = [
  { module: 'Clientes', actions: [
    { code: P.recordsView, action: 'Ver' },
    { code: P.recordsCreate, action: 'Registrar' },
    { code: P.recordsEdit, action: 'Editar' },
    { code: P.recordsPeople, action: 'Personas vinculadas' },
    { code: P.recordsApprove, action: 'Aprobar o rechazar' },
    { code: P.recordsDeactivate, action: 'Inactivar' },
    { code: P.recordsExport, action: 'Exportar' },
  ]},
  { module: 'Catálogos', actions: [
    { code: P.catalogsView, action: 'Ver' },
    { code: P.catalogsManage, action: 'Administrar' },
  ]},
  { module: 'Formulario', actions: [
    { code: P.formView, action: 'Ver' },
    { code: P.formManage, action: 'Publicar' },
  ]},
  { module: 'Empresa', actions: [
    { code: P.companyConfigure, action: 'Configurar' },
    { code: P.integrationsManage, action: 'Credenciales' },
  ]},
  { module: 'Usuarios', actions: [
    { code: P.usersView, action: 'Ver' },
    { code: P.usersManage, action: 'Administrar' },
  ]},
  { module: 'Roles', actions: [
    { code: P.rolesManage, action: 'Administrar' },
  ]},
  { module: 'Bitácora', actions: [
    { code: P.auditLogView, action: 'Consultar' },
    { code: P.auditLogExport, action: 'Exportar' },
  ]},
  { module: 'Reportes', actions: [
    { code: P.reportsView, action: 'Ver' },
    { code: P.reportsIssue, action: 'Emitir' },
  ]},
]

const EditorExcepciones: React.FC<{ userId: string; onCerrar: () => void }> = ({ userId, onCerrar }) => {
  const users = useAppSelector(s => s.users.users)
  const roles = useAppSelector(s => s.users.roles)
  const dispatch = useAppDispatch()
  const u = users.find(x => x.id === userId)
  const canManage = useCan()(PERMISSIONS.usersManage)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!u) return null
  const rol = roles.find(r => r.id === u.rolId)
  const delRol = new Set(rol?.permissions ?? [])
  const effective = new Set(effectivePermissions(u, roles))
  const conocidos = new Set<string>(MODULES.flatMap(m => m.actions.map(a => a.code)))
  const extras = [...new Set([...delRol, ...u.granted, ...u.revoked])].filter(c => !conocidos.has(c) && !isPlatformPermission(c))
  const modules = extras.length
    ? [...MODULES, { module: 'Otros', actions: extras.map(code => ({ code, action: code.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ') })) }]
    : MODULES

  const alternar = async (code: PermissionCode) => {
    if (isPlatformPermission(code)) return
    const conceder = !effective.has(code)
    const tocar = (conceder
      ? withImplied([code]).filter(c => !effective.has(c))
      : [code, ...dependOn(code)].filter(c => effective.has(c))) as PermissionCode[]
    setOcupado(code)
    setError(null)
    try {
      const catalog = await maestroApi.permissions()
      for (const c of tocar) {
        const permission = catalog.find(p => p.codigo === c)
        if (!permission) { setError('Ese permiso no está en el catálogo del servidor.'); return }
        await maestroApi.userException(u.id, permission.id, conceder, reason.trim())
        dispatch(alternarExcepcion({ id: u.id, permission: c, modo: conceder ? 'conceder' : 'revocar' }))
      }
    } catch {
      setError('No fue posible guardar el cambio. El permiso quedó como estaba.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Modal title={`Permisos de ${u.name}`} onClose={onCerrar}
      footer={<button className="btn" onClick={onCerrar}>Cerrar</button>}>
      <p className="dlg-txt">
        {rol ? <>Rol {rol.name}. </> : null}
        El interruptor prende o apaga la acción solo para esta persona.
      </p>
      <Field label="Justificación" error={error ?? undefined} hint="Opcional. Queda en la auditoría si la escribe.">
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          placeholder="Por qué esta persona tiene un permiso distinto al de su rol." />
      </Field>
      {modules.map(({ module, actions }) => (
        <div key={module} className="perm-mod">
          <div className="sec">{module}</div>
          {actions.map(({ code, action }) => {
            const on = effective.has(code)
            const excepcion = u.revoked.includes(code)
              ? 'Quitado a esta persona'
              : u.granted.includes(code) && !delRol.has(code)
                ? 'Concedido a esta persona'
                : null
            return (
              <label key={code} className={'perm-acc' + (on ? ' on' : '')}>
                <span>
                  <b>{action}</b>
                  {definitionOf(code)?.level === 'critico' && <Pill k="bad">Crítico</Pill>}
                  <span className="td-sub">{definitionOf(code)?.description}</span>
                  {excepcion && <span className="td-sub">{excepcion}</span>}
                </span>
                <input type="checkbox" checked={on} disabled={!canManage || ocupado !== null}
                  onChange={() => canManage && void alternar(code)} />
                <span className="sw" aria-hidden />
              </label>
            )
          })}
        </div>
      ))}
    </Modal>
  )
}

const userFromApi = (u: ApiUser): SystemUser => ({
  companyId: u.empresa_id ?? null,
  companyName: u.empresa_nombre ?? undefined,
  id: u.id,
  name: u.nombre_completo,
  email: u.email,
  rolId: u.rol_id ?? '',
  status: ({ active: 'ACTIVO', blocked: 'BLOQUEADO', invited: 'INVITADO', inactive: 'INACTIVO' }[u.status] ?? 'INACTIVO') as SystemUser['status'],
  lastAccess: undefined,
  granted: (u.concedidos ?? []) as PermissionCode[],
  revoked: (u.revocados ?? []) as PermissionCode[],
})

const roleFromApi = (r: ApiRole) => ({
  id: r.id,
  name: r.nombre,
  description: r.descripcion ?? '',
  permissions: r.permisos.map(p => p.codigo) as PermissionCode[],
  sistema: r.es_predefinido,
  platform: r.empresa_id == null,
  companyId: r.empresa_id ?? undefined,
})
