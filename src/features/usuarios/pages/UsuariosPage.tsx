import React, { useState, useEffect } from 'react'
import { Card, Tabs, Field, Modal, Pill, Kpi, Paginador } from '@/shared/ui'
import { usePaginacion } from '@/shared/hooks/usePaginacion'
import {
  PERMISSIONS, CATALOGO, GRUPOS, definicionDe,
  type PermissionCode,
} from '@/shared/auth/permissions'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  crearUsuario, editarUsuario, cambiarEstadoUsuario, alternarExcepcion,
  alternarPermisoRol, crearRol, editarRol, borrarRol, fijarPermisosRol, permisosEfectivos,
  selectUsuariosDeMiEmpresa, selectRolesDeMiEmpresa, sincronizarAdministracion,
  type UsuarioSistema, type EstadoUsuario, type Rol,
} from '../store/usuariosSlice'
import * as V from '@/features/clientes/schemas/cliente.schema'
import { EditorPermisos } from '../components/EditorPermisos'
import { maestroApi, type ApiRol, type ApiUsuario } from '@/shared/api/maestro'

const TODOS = CATALOGO.map(p => p.codigo)

const EstadoPill: React.FC<{ e: EstadoUsuario }> = ({ e }) => {
  const k = e === 'ACTIVO' ? 'ok' : e === 'BLOQUEADO' ? 'bad' : e === 'INVITADO' ? 'warn' : 'mut'
  return <Pill k={k}>{e[0] + e.slice(1).toLowerCase()}</Pill>
}

export const UsuariosPage = () => {
  const [tab, setTab] = useState('Usuarios')
  const dispatch = useAppDispatch()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  useEffect(() => {
    let activo = true
    Promise.all([maestroApi.usuarios(), maestroApi.roles()])
      .then(([usuarios, roles]) => { if (activo) dispatch(sincronizarAdministracion({ usuarios: usuarios.map(usuarioDesdeApi), roles: roles.map(rolDesdeApi) })) })
      .catch(() => { if (activo) setErrorApi('No fue posible cargar la administración desde el servidor.') })
    return () => { activo = false }
  }, [dispatch])
  return (
    <>
      <Card flush>
        <Tabs items={['Usuarios', 'Roles y permisos', 'Catálogo de permisos']} value={tab} onChange={setTab} />
        <div style={{ padding: 18 }}>
          {errorApi && <div className="val-err">{errorApi}</div>}
          {tab === 'Usuarios' && <Usuarios />}
          {tab === 'Roles y permisos' && <Roles />}
          {tab === 'Catálogo de permisos' && <Catalogo />}
        </div>
      </Card>
    </>
  )
}

const rolDesdeApi = (r: ApiRol): Rol => ({ id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? '', permisos: r.permisos.map(p => p.codigo as PermissionCode), sistema: r.es_predefinido, empresaId: r.empresa_id ?? undefined, plataforma: !r.empresa_id })
const usuarioDesdeApi = (u: ApiUsuario): UsuarioSistema => ({ empresaId: u.empresa_id ?? null, id: u.id, nombre: u.nombre_completo, correo: u.email, rolId: u.rol_id ?? '', estado: ({ active: 'ACTIVO', blocked: 'BLOQUEADO', invited: 'INVITADO', inactive: 'INACTIVO' }[u.status] ?? 'INACTIVO') as EstadoUsuario, concedidos: [], revocados: [] })

/* ---------------- Usuarios ---------------- */
const Usuarios = () => {
  const usuarios = useAppSelector(selectUsuariosDeMiEmpresa)
  const roles = useAppSelector(selectRolesDeMiEmpresa)
  const dispatch = useAppDispatch()
  const [nuevo, setNuevo] = useState(false)
  const [detalle, setDetalle] = useState<UsuarioSistema | null>(null)
  const [q, setQ] = useState('')
  const rolDe = (id: string) => roles.find(r => r.id === id)

  const lista = usuarios.filter(u =>
    (u.nombre + u.correo + (rolDe(u.rolId)?.nombre ?? '')).toLowerCase().includes(q.trim().toLowerCase()))
  const { visibles, paginador } = usePaginacion(lista)

  return (
    <>
      <div className="kpis">
        <Kpi label="Usuarios" value={usuarios.length} foot="en los dos sistemas" />
        <Kpi label="Activos" value={usuarios.filter(u => u.estado === 'ACTIVO').length} foot="pueden entrar hoy" />
        <Kpi label="Con excepciones" value={usuarios.filter(u => u.concedidos.length || u.revocados.length).length} foot="permisos fuera de su rol" />
        <Kpi label="Roles" value={roles.length} foot="definidos" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="sec" style={{ margin: 0 }}>Usuarios del sistema</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Buscar por nombre, correo o rol" value={q} onChange={e => setQ(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 10, width: 250, background: 'var(--bg)' }} />
          <button className="btn sm pri" onClick={() => setNuevo(true)}>Nuevo usuario</button>
        </div>
      </div>

      <table>
        <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Permisos</th><th>Estado</th><th>Último acceso</th><th /></tr></thead>
        <tbody>
          {visibles.map(u => {
            const efectivos = permisosEfectivos(u, roles)
            return (
              <tr key={u.id}>
                <td><b style={{ fontWeight: 500 }}>{u.nombre}</b></td>
                <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{u.correo}</td>
                <td>{rolDe(u.rolId)?.nombre ?? '—'}</td>
                <td>
                  <span className="num" style={{ fontSize: 12 }}>{efectivos.length}</span>
                  {u.concedidos.length > 0 && <span className="pill ok" style={{ marginLeft: 6 }}><i className="dot" />+{u.concedidos.length}</span>}
                  {u.revocados.length > 0 && <span className="pill bad" style={{ marginLeft: 6 }}><i className="dot" />−{u.revocados.length}</span>}
                </td>
                <td><EstadoPill e={u.estado} /></td>
                <td className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>{u.ultimoAcceso ?? 'Nunca'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setDetalle(u)}>Permisos</button>
                    {u.estado === 'BLOQUEADO'
                      ? <button className="btn sm" onClick={() => maestroApi.cambiarEstadoUsuario(u.id, 'active').then(() => dispatch(cambiarEstadoUsuario({ id: u.id, estado: 'ACTIVO' }))) }>Reactivar</button>
                      : <button className="btn sm" onClick={() => maestroApi.cambiarEstadoUsuario(u.id, 'blocked').then(() => dispatch(cambiarEstadoUsuario({ id: u.id, estado: 'BLOQUEADO' }))) }>Bloquear</button>}
                  </div>
                </td>
              </tr>
            )
          })}
          {!visibles.length && <tr><td colSpan={7}><div className="empty">Sin usuarios que coincidan.</div></td></tr>}
        </tbody>
      </table>
      <Paginador p={paginador} etiqueta="usuarios" />

      {nuevo && <NuevoUsuario onClose={() => setNuevo(false)} />}
      {detalle && <PermisosUsuario usuario={detalle} onClose={() => setDetalle(null)} />}
    </>
  )
}

const NuevoUsuario: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const roles = useAppSelector(s => s.usuarios.roles)
  const correos = useAppSelector(s => s.usuarios.usuarios.map(u => u.correo))
  const dispatch = useAppDispatch()
  const empresaId = useAppSelector(s => s.auth.usuario?.empresaId) ?? ''
  const [d, setD] = useState({ nombre: '', correo: '', rolId: roles[0].id })
  const [tocado, setTocado] = useState<Record<string, boolean>>({})

  const errNombre = V.nombrePersona(d.nombre)
  const errCorreo = V.correo(d.correo) ?? (correos.includes(d.correo.trim()) ? 'Ese correo ya tiene cuenta.' : null)
  const ok = !errNombre && !errCorreo

  return (
    <Modal title="Nuevo usuario" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={() => {
          if (!ok) { setTocado({ nombre: true, correo: true }); return }
          dispatch(crearUsuario({ ...d, empresaId, estado: 'INVITADO', concedidos: [], revocados: [] }))
          onClose()
        }}>Invitar</button></>}>
      <div className="grid">
        <Field label="Nombre completo" error={tocado.nombre ? errNombre ?? undefined : undefined}>
          <input value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })}
            onBlur={() => setTocado(t => ({ ...t, nombre: true }))} placeholder="Nombres y apellidos" />
        </Field>
        <Field label="Correo" error={tocado.correo ? errCorreo ?? undefined : undefined}>
          <input value={d.correo} onChange={e => setD({ ...d, correo: e.target.value })}
            onBlur={() => setTocado(t => ({ ...t, correo: true }))} placeholder="usuario@transvalor.com" />
        </Field>
        <Field label="Rol">
          <select value={d.rolId} onChange={e => setD({ ...d, rolId: e.target.value })}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

const PermisosUsuario: React.FC<{ usuario: UsuarioSistema; onClose: () => void }> = ({ usuario, onClose }) => {
  const { roles, usuarios } = useAppSelector(s => s.usuarios)
  const u = usuarios.find(x => x.id === usuario.id)!
  const dispatch = useAppDispatch()
  const rol = roles.find(r => r.id === u.rolId)!

  const actualizarExcepcion = async (p: PermissionCode, modo: 'conceder' | 'heredar' | 'revocar') => {
    if (modo === 'heredar') return
    const motivo = window.prompt(`Justificación para ${modo === 'conceder' ? 'conceder' : 'revocar'} ${p}:`)
    if (!motivo || motivo.trim().length < 10) return
    try {
      const permiso = (await maestroApi.permisos()).find(x => x.codigo === p)
      if (!permiso) return
      await maestroApi.excepcionUsuario(u.id, permiso.id, modo === 'conceder', motivo)
      dispatch(alternarExcepcion({ id: u.id, permiso: p, modo }))
    } catch { window.alert('No fue posible guardar la excepción de permiso.') }
  }

  const modoDe = (p: PermissionCode) =>
    u.concedidos.includes(p) ? 'conceder' : u.revocados.includes(p) ? 'revocar' : 'heredar'

  return (
    <Modal title={`Permisos de ${u.nombre}`} onClose={onClose}
      footer={<button className="btn pri" onClick={onClose}>Listo</button>}>
      <div className="grid" style={{ marginBottom: 4 }}>
        <Field label="Rol" value={rol.nombre} />
        <Field label="Permisos efectivos" value={String(permisosEfectivos(u, roles).length) + ' de ' + TODOS.length} mono />
      </div>
      <p className="dlg-txt">{rol.descripcion}</p>

      {GRUPOS.map(g => (
        <div key={g}>
          <div className="sec">{g}</div>
          {CATALOGO.filter(d => d.grupo === g).map(({ codigo: p, nombre, descripcion }) => {
            const enRol = rol.permisos.includes(p)
            const modo = modoDe(p)
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{nombre}</div>
                  <div className="td-sub" style={{ maxWidth: '46ch' }}>{descripcion}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6 }}>
                    {enRol ? 'incluido en el rol' : 'no está en el rol'}
                  </span>
                  {(['conceder', 'heredar', 'revocar'] as const).map(m => (
                    <button key={m} className="btn sm"
                      onClick={() => actualizarExcepcion(p, m)}
                      style={modo === m
                        ? { background: m === 'conceder' ? 'var(--ok)' : m === 'revocar' ? 'var(--bad)' : 'var(--surface)', color: m === 'heredar' ? 'var(--fg)' : '#fff', borderColor: 'transparent' }
                        : undefined}>
                      {m === 'conceder' ? 'Conceder' : m === 'revocar' ? 'Revocar' : 'Heredar'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}

    </Modal>
  )
}

/* ---------------- Roles ----------------
 * Maestro-detalle, no matriz. Una matriz de permisos × roles crece a lo ancho:
 * con cinco roles ya no entra en pantalla y con quince es ilegible. Aquí los
 * roles son una lista vertical (crece hacia abajo, con buscador) y solo se
 * editan los permisos del rol seleccionado.
 */
const Roles = () => {
  const roles = useAppSelector(selectRolesDeMiEmpresa)
  const usuarios = useAppSelector(selectUsuariosDeMiEmpresa)
  const dispatch = useAppDispatch()
  const [sel, setSel] = useState(roles[0]?.id ?? '')
  const [qRol, setQRol] = useState('')
  const [modal, setModal] = useState<null | { modo: 'nuevo' | 'duplicar' | 'editar' }>(null)
  const [borrando, setBorrando] = useState(false)
  /** Nombre del rol recién creado: se selecciona solo cuando aparece en el store. */
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pendiente) return
    const nuevo = roles.find(r => r.nombre === pendiente)
    if (nuevo) { setSel(nuevo.id); setPendiente(null) }
  }, [roles, pendiente])

  const rol = roles.find(r => r.id === sel) ?? roles[0]
  const conRol = (id: string) => usuarios.filter(u => u.rolId === id).length
  const listados = roles.filter(r => r.nombre.toLowerCase().includes(qRol.trim().toLowerCase()))
  const rolesPag = usePaginacion(listados)
  const usuariosDelRol = usuarios.filter(u => u.rolId === rol.id)

  const guardarPermisos = async (siguientes: PermissionCode[]) => {
    setGuardando(true); setError(null)
    try {
      const permisos = await maestroApi.permisos()
      const ids = siguientes.map(c => permisos.find(p => p.codigo === c)?.id).filter((id): id is string => Boolean(id))
      await maestroApi.reemplazarPermisosRol(rol.id, ids)
      dispatch(sincronizarAdministracion({ usuarios, roles: roles.map(r => r.id === rol.id ? { ...r, permisos: siguientes } : r) }))
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
            {rolesPag.visibles.map(r => (
              <button key={r.id} className={'rp-item' + (r.id === rol.id ? ' on' : '')} onClick={() => setSel(r.id)}>
                <div className="rp-item-n">
                  {r.nombre}
                  {r.sistema && <span className="pill mut">Sistema</span>}
                </div>
                <div className="rp-item-m">
                  <span className="num">{r.permisos.length}</span> de {TODOS.length} permisos
                  <span className="rp-sep">·</span>
                  <span className="num">{conRol(r.id)}</span> usuario{conRol(r.id) === 1 ? '' : 's'}
                </div>
              </button>
            ))}
            {!listados.length && <div className="empty">Sin roles que coincidan con “{qRol}”.</div>}
          </div>
          <Paginador p={rolesPag.paginador} etiqueta="roles" compacto />
        </div>

        {/* ---- detalle: los permisos del rol seleccionado ---- */}
        <div className="rp-col rp-det">
          <div className="rp-head">
            <div>
              <div className="rp-title">{rol.nombre}{rol.sistema && <span className="pill mut">Sistema</span>}</div>
              <div className="rp-desc">{rol.descripcion || 'Sin descripción.'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn sm" onClick={() => setModal({ modo: 'editar' })}>Renombrar</button>
              <button className="btn sm" onClick={() => setModal({ modo: 'duplicar' })}>Duplicar</button>
              {!rol.sistema && <button className="btn sm" onClick={() => setBorrando(true)}>Eliminar</button>}
            </div>
          </div>

          <EditorPermisos
            permisos={rol.permisos}
            onAlternar={p => guardarPermisos(rol.permisos.includes(p) ? rol.permisos.filter(x => x !== p) : [...rol.permisos, p])}
            onGrupo={(permisos, valor) => guardarPermisos(valor ? Array.from(new Set([...rol.permisos, ...permisos])) : rol.permisos.filter(p => !permisos.includes(p)))}
            pie={<><b className="num">{conRol(rol.id)}</b> usuario{conRol(rol.id) === 1 ? '' : 's'} con este rol</>}
          />
          {guardando && <p className="td-sub">Guardando permisos…</p>}
          {error && <p className="val-err">{error}</p>}
        </div>
      </div>

      {modal && <RolModal modo={modal.modo} rol={rol} onClose={() => setModal(null)} onCreado={setPendiente} />}

      {borrando && (
        <Modal title={`Eliminar “${rol.nombre}”`} onClose={() => setBorrando(false)}
          footer={<><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn pri" disabled={usuariosDelRol.length > 0}
              onClick={() => { dispatch(borrarRol(rol.id)); setSel(roles[0].id); setBorrando(false) }}>Eliminar</button></>}>
          {usuariosDelRol.length > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{usuariosDelRol.length} usuario(s) tienen este rol</b>{' '}
              ({usuariosDelRol.map(u => u.nombre).join(', ')}). Borrarlo los dejaría sin permisos.
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
  onCreado: (nombre: string) => void
}> = ({ modo, rol, onClose, onCreado }) => {
  const roles = useAppSelector(s => s.usuarios.roles)
  const dispatch = useAppDispatch()
  const [d, setD] = useState(
    modo === 'editar' ? { nombre: rol.nombre, descripcion: rol.descripcion }
      : modo === 'duplicar' ? { nombre: rol.nombre + ' (copia)', descripcion: rol.descripcion }
        : { nombre: '', descripcion: '' })
  const [tocado, setTocado] = useState(false)

  const t = d.nombre.trim()
  const err = t.length < 3 ? 'Escriba al menos 3 caracteres.'
    : roles.some((r: any) => r.nombre.toLowerCase() === t.toLowerCase() && r.id !== (modo === 'editar' ? rol.id : ''))
      ? 'Ya existe un rol con ese nombre.' : null

  const titulo = modo === 'editar' ? 'Renombrar rol' : modo === 'duplicar' ? `Duplicar “${rol.nombre}”` : 'Nuevo rol'

  const guardar = () => {
    if (err) { setTocado(true); return }
    if (modo === 'editar') dispatch(editarRol({ id: rol.id, nombre: t, descripcion: d.descripcion }))
    else {
      dispatch(crearRol({ nombre: t, descripcion: d.descripcion, copiarDe: modo === 'duplicar' ? rol.id : undefined }))
      onCreado(t)
    }
    onClose()
  }

  return (
    <Modal title={titulo} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={guardar}>{modo === 'editar' ? 'Guardar' : 'Crear'}</button></>}>
      <div className="grid">
        <Field label="Nombre del rol" error={tocado ? err ?? undefined : undefined}>
          <input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })}
            onBlur={() => setTocado(true)} onKeyDown={e => e.key === 'Enter' && guardar()}
            placeholder="Ej. Analista senior" />
        </Field>
      </div>
      <Field label="Descripción">
        <textarea rows={2} value={d.descripcion} onChange={e => setD({ ...d, descripcion: e.target.value })}
          placeholder="Qué hace y qué no puede hacer" />
      </Field>
    </Modal>
  )
}

/* ---------------- Catálogo ---------------- */
const Catalogo = () => {
  const [q, setQ] = useState('')
  const lista = TODOS.filter(p =>
    (p + (definicionDe(p)?.nombre ?? '') + (definicionDe(p)?.descripcion ?? '') + (definicionDe(p)?.grupo ?? ''))
      .toLowerCase().includes(q.trim().toLowerCase()))
  const { visibles, paginador } = usePaginacion(lista)

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
          {visibles.map(p => (
            <tr key={p}>
              <td className="num" style={{ fontSize: 12 }}>{p}</td>
              <td>
                {definicionDe(p)?.nombre}
                <div className="td-sub" style={{ maxWidth: '60ch' }}>{definicionDe(p)?.descripcion}</div>
              </td>
              <td><span className="pill mut">{definicionDe(p)?.grupo}</span></td>
              <td>
                {definicionDe(p)?.nivel === 'critico' ? <Pill k="bad">Crítico</Pill>
                  : definicionDe(p)?.nivel === 'escritura' ? <Pill k="warn">Escritura</Pill>
                    : <Pill k="mut">Lectura</Pill>}
              </td>
            </tr>
          ))}
          {!visibles.length && <tr><td colSpan={4}><div className="empty">Sin permisos que coincidan.</div></td></tr>}
        </tbody>
      </table>
      <Paginador p={paginador} etiqueta="permisos" />
    </>
  )
}
