import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Listado, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login, logout } from '@/shared/store/slices/authSlice'
import {
  crearEmpresa, cambiarEstadoEmpresa, editarEmpresa, versionVigente,
  type Empresa,
} from '../store/empresasSlice'
import { EditorFormulario } from './EditorFormulario'
import { DashboardPlataforma } from './DashboardPlataforma'
import { AuditoriaPlataforma } from './AuditoriaPlataforma'
import { UsuariosPlataforma } from './UsuariosPlataforma'
import { RolesPlataforma } from './RolesPlataforma'
import { maestroApi, type ApiRetencionBorrador } from '@/shared/api/maestro'
import { mostrarAviso } from '@/shared/store/slices/uiSlice'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import { MarcaPortal } from '@/shared/components/brand/IsotipoTransvalor'

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
  { id: 'resumen', label: 'Dashboard', titulo: 'Resumen', sub: 'Estado de la plataforma y uso del producto.' },
  { id: 'empresas', label: 'Empresas', titulo: 'Empresas', sub: 'Altas, suspensiones y portal de cada una.', permiso: PERMISSIONS.empresasVer },
  { id: 'formularios', label: 'Formularios', titulo: 'Formularios', sub: 'Qué le pide cada empresa a sus clientes.', permiso: PERMISSIONS.formularioVer },
  { id: 'usuarios', label: 'Usuarios', titulo: 'Usuarios', sub: 'Todo el padrón: las empresas y también Axiom.', permiso: PERMISSIONS.usuariosVer },
  { id: 'roles', label: 'Roles', titulo: 'Roles', sub: 'Quién puede qué, y hasta dónde llega cada rol.', permiso: PERMISSIONS.rolesGestionar },
  { id: 'auditoria', label: 'Auditoría', titulo: 'Auditoría', sub: 'Todo lo que pasó, en todas las empresas y en Axiom.', permiso: PERMISSIONS.bitacoraVer },
  { id: 'retencion', label: 'Retención', titulo: 'Retención de borradores', sub: 'Cuánto tiempo se conservan los registros abandonados.', permiso: PERMISSIONS.retencionGestionar },
] as const satisfies readonly { id: string; label: string; titulo: string; sub: string; permiso?: PermissionCode }[]

export const PlataformaPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const usuario = useAppSelector(s => s.auth.usuario)
  const token = useAppSelector(s => s.auth.token)
  const can = useCan()
  const [vista, setVista] = useState<string>('resumen')

  useEffect(() => {
    if (!token || !usuario) return
    maestroApi.sesion().then(sesion => {
      dispatch(login({
        token,
        usuario: {
          id: sesion.user_id,
          nombre: sesion.nombre,
          rol: sesion.rol,
          permisos: sesion.permisos,
          email: sesion.email,
          ambito: sesion.scope === 'platform' ? 'plataforma' : 'empresa',
          empresaId: sesion.empresa_id,
        },
      }))
    }).catch(() => undefined)
  }, [dispatch, token])

  const visibles = RUTAS.filter(r => !r.permiso || can(r.permiso))
  const actual = visibles.find(r => r.id === vista) ?? visibles[0]

  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand">
          <MarcaPortal className="side-logo" title="Axiom Core Tech" />
          <div><b>Axiom Core Tech</b><span>Consola de plataforma</span></div>
        </div>
        <nav className="nav">
          {visibles.map(r => (
            <a key={r.id} href="#" className={actual.id === r.id ? 'on' : ''}
              onClick={e => { e.preventDefault(); setVista(r.id) }}>{r.label}</a>
          ))}
        </nav>
        <div className="side-user">
          <b>{usuario?.nombre ?? '—'}</b><span>{usuario?.rol ?? ''}</span>
          <button className="btn sm" style={{ marginTop: 10, width: '100%' }}
            onClick={() => { dispatch(logout()); navigate('/acceso', { replace: true }) }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <h1>{actual.titulo}</h1>
            <p>{actual.sub}</p>
          </div>
        </header>
        <div className="content">
          {actual.id === 'resumen' ? <DashboardPlataforma />
            : actual.id === 'empresas' ? <Empresas />
              : actual.id === 'formularios' ? <EditorFormulario editable={can(PERMISSIONS.formularioGestionar)} />
                : actual.id === 'usuarios' ? <UsuariosPlataforma />
                  : actual.id === 'roles' ? <RolesPlataforma />
                    : actual.id === 'auditoria' ? <AuditoriaPlataforma /> : <RetencionBorradores />}
        </div>
      </main>
    </div>
  )
}

const RetencionBorradores = () => {
  const dispatch = useAppDispatch()
  const puede = useCan()(PERMISSIONS.retencionGestionar)
  const [items, setItems] = useState<ApiRetencionBorrador[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  useEffect(() => { maestroApi.retencionesBorradores().then(setItems).catch(() => undefined).finally(() => setCargando(false)) }, [])
  const cambiar = async (item: ApiRetencionBorrador, dias: number) => {
    setGuardando(item.empresa_id)
    try { setItems(xs => xs.map(x => x.empresa_id === item.empresa_id ? { ...x, dias } : x)); await maestroApi.actualizarRetencionBorradores(item.empresa_id, dias) }
    catch { dispatch(mostrarAviso({ tipo: 'error', texto: 'No fue posible guardar la política.' })) }
    finally { setGuardando(null) }
  }
  const opciones = [7, 15, 30, 60, 90, 180, 365]
  return <Listado
    titulo="Retención de borradores"
    sub="Define cuánto tiempo puede permanecer un registro sin actividad antes de que la tarea programada lo inactive. Nunca se borra físicamente."
    datos={items} clave={x => x.empresa_id} etiqueta="empresas"
    vacio={cargando ? 'Cargando políticas…' : 'No hay empresas configuradas.'}
    columnas={[{ th: 'Empresa' }, { th: 'Días de retención' }, { th: 'Efecto' }]}
    fila={x => <>
      <td><b>{x.empresa}</b><div className="td-sub">Política propia de esta empresa</div></td>
      <td>
        <div className="retencion-opciones" aria-label={`Días de retención para ${x.empresa}`}>
          {opciones.map(d => <button key={d} className={d === x.dias ? 'on' : ''}
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
const Empresas = () => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const clientes = useAppSelector(s => s.clientes.lista)
  const usuarios = useAppSelector(s => s.usuarios.usuarios)
  const dispatch = useAppDispatch()
  const [nueva, setNueva] = useState(false)
  const [editar, setEditar] = useState<Empresa | null>(null)
  const can = useCan()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('Todas')

  const lista = empresas.filter(e =>
    (estado === 'Todas' || e.estado === estado) &&
    (e.nombre + e.rif + e.slug).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <Listado
        titulo="Empresas"
        sub={`${empresas.length} en la plataforma · ${empresas.filter(e => e.estado === 'ACTIVA').length} activas`}
        datos={lista}
        clave={e => e.id}
        etiqueta="empresas"
        vacio="Sin empresas que coincidan."
        buscar={{ valor: q, onChange: setQ, marcador: 'Buscar por nombre, RIF o portal', ancho: 250 }}
        filtros={[{
          valor: estado, onChange: setEstado,
          opciones: [
            { valor: 'Todas', texto: 'Todas' },
            { valor: 'ACTIVA', texto: 'Activa' },
            { valor: 'SUSPENDIDA', texto: 'Suspendida' },
          ],
        }]}
        acciones={can(PERMISSIONS.empresasCrear) ? <button className="btn pri sm" onClick={() => setNueva(true)}>Nueva empresa</button> : undefined}
        columnas={[
          { th: 'Empresa' }, { th: 'RIF' }, { th: 'Portal' }, { th: 'Clientes' },
          { th: 'Usuarios' }, { th: 'Formulario' }, { th: 'Estado' }, { th: '', fin: true },
        ]}
        fila={e => (
          <>
            <td>
              <b style={{ fontWeight: 500 }}>{e.nombre}</b>
              <div className="td-sub">Desde {e.desde}</div>
            </td>
            <td className="num">{e.rif}</td>
            <td className="td-sub">/{e.slug}</td>
            <td className="num">{clientes.filter(c => c.empresaId === e.id).length}</td>
            <td className="num">{usuarios.filter(u => u.empresaId === e.id).length}</td>
            <td className="num">v{versionVigente(e).version}</td>
            <td>{e.estado === 'ACTIVA' ? <Pill k="ok">Activa</Pill> : <Pill k="bad">Suspendida</Pill>}</td>
            <td style={{ textAlign: 'right' }}>
              <div className="btn-row">
                {can(PERMISSIONS.empresasEditar) && <button className="btn sm" onClick={() => setEditar(e)}>Editar</button>}
                {can(PERMISSIONS.empresasSuspender) && <button className="btn sm" onClick={() => dispatch(cambiarEstadoEmpresa({
                  id: e.id, estado: e.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA',
                }))}>
                  {e.estado === 'ACTIVA' ? 'Suspender' : 'Reactivar'}
                </button>}
              </div>
            </td>
          </>
        )}
      />

      {nueva && <NuevaEmpresa onClose={() => setNueva(false)} />}
      {editar && <EditarEmpresa empresa={editar} onClose={() => setEditar(null)} />}
    </>
  )
}

const EditarEmpresa: React.FC<{ empresa: Empresa; onClose: () => void }> = ({ empresa, onClose }) => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const dispatch = useAppDispatch()
  const [d, setD] = useState({ nombre: empresa.nombre, rif: empresa.rif, slug: empresa.slug })
  const [tocado, setTocado] = useState(false)
  const otras = empresas.filter(e => e.id !== empresa.id)
  const errNombre = d.nombre.trim().length < 3 ? 'Escriba al menos 3 caracteres.'
    : otras.some(e => e.nombre.toLowerCase() === d.nombre.trim().toLowerCase()) ? 'Ya existe una empresa con ese nombre.' : null
  const errSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug.trim())
    ? 'Use minúsculas, números y guiones; por ejemplo transvalor-orinoco-c-a.'
    : otras.some(e => e.slug.toLowerCase() === d.slug.trim().toLowerCase()) ? 'Ese portal ya está en uso.' : null
  const ok = !errNombre && !errSlug
  const guardar = () => {
    if (!ok) { setTocado(true); return }
    dispatch(editarEmpresa({
      id: empresa.id, nombre: d.nombre.trim(), rif: d.rif.trim().toUpperCase(),
      slug: d.slug.trim().toLowerCase(),
    }))
    onClose()
  }
  return (
    <Modal title={`Editar empresa · ${empresa.nombre}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={guardar}>Guardar</button></>}>
      <div className="sec">La empresa</div>
      <div className="grid">
        <Field label="Nombre" error={tocado ? errNombre ?? undefined : undefined}>
          <input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} />
        </Field>
        <Field label="RIF">
          <input value={d.rif} onChange={e => setD({ ...d, rif: e.target.value.toUpperCase() })} placeholder="J-00000000-0" />
        </Field>
      </div>
      <Field label="Portal" error={tocado ? errSlug ?? undefined : undefined}
        hint={!errSlug ? 'La ruta será /' + (d.slug || 'su-portal') + '.' : undefined}>
        <input value={d.slug} onChange={e => setD({ ...d, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="transvalor-orinoco-c-a" />
      </Field>
    </Modal>
  )
}

const NuevaEmpresa: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const correos = useAppSelector(s => s.usuarios.usuarios.map(u => u.correo.toLowerCase()))
  const dispatch = useAppDispatch()
  const [d, setD] = useState({ nombre: '', rif: '', slug: '', adminNombre: '', adminCorreo: '' })
  const [tocado, setTocado] = useState(false)

  const errNombre = d.nombre.trim().length < 3 ? 'Escriba al menos 3 caracteres.'
    : empresas.some(e => e.nombre.toLowerCase() === d.nombre.trim().toLowerCase()) ? 'Ya existe una empresa con ese nombre.' : null
  const errSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug.trim())
    ? 'Use minúsculas, números y guiones; por ejemplo transvalor-orinoco-c-a.'
    : empresas.some(e => e.slug.toLowerCase() === d.slug.trim().toLowerCase()) ? 'Ese portal ya está en uso.' : null
  const errAdminNombre = d.adminNombre.trim().length < 5 ? 'Nombre y apellido del administrador.' : null
  const errAdminCorreo = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.adminCorreo.trim())
    ? 'Escriba un correo válido.'
    : correos.includes(d.adminCorreo.trim().toLowerCase()) ? 'Ese correo ya tiene cuenta en la plataforma.' : null

  const ok = !errNombre && !errSlug && !errAdminNombre && !errAdminCorreo

  const crear = () => {
    if (!ok) { setTocado(true); return }
    dispatch(crearEmpresa({
      nombre: d.nombre.trim(), rif: d.rif.trim(), slug: d.slug.trim().toLowerCase(),
      admin: { nombre: d.adminNombre.trim(), correo: d.adminCorreo.trim().toLowerCase() },
    }))
    onClose()
  }

  return (
    <Modal title="Nueva empresa" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={crear}>Crear empresa</button></>}>

      <div className="sec">La empresa</div>
      <div className="grid">
        <Field label="Nombre" error={tocado ? errNombre ?? undefined : undefined}>
          <input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} placeholder="Razón social" />
        </Field>
        <Field label="RIF">
          <input value={d.rif} onChange={e => setD({ ...d, rif: e.target.value.toUpperCase() })} placeholder="J-00000000-0" />
        </Field>
      </div>
      <Field label="Portal" error={tocado ? errSlug ?? undefined : undefined}
        hint={!errSlug ? 'La ruta será /' + (d.slug || 'su-portal') + '.' : undefined}>
        <input value={d.slug} onChange={e => setD({ ...d, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="transvalor-orinoco-c-a" />
      </Field>

      <div className="sec">Su administrador</div>
      <p className="dlg-txt">
        Es quien va a crear el resto de los usuarios y armar el formulario. Sin él la empresa queda
        creada pero sin nadie que pueda entrar, así que se da de alta en el mismo acto.
      </p>
      <div className="grid">
        <Field label="Nombre completo" error={tocado ? errAdminNombre ?? undefined : undefined}>
          <input value={d.adminNombre} onChange={e => setD({ ...d, adminNombre: e.target.value })}
            placeholder="Nombres y apellidos" />
        </Field>
        <Field label="Correo" error={tocado ? errAdminCorreo ?? undefined : undefined}>
          <input value={d.adminCorreo} onChange={e => setD({ ...d, adminCorreo: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && crear()} placeholder="admin@empresa.com" />
        </Field>
      </div>

      <p className="dlg-txt" style={{ marginTop: 12 }}>
        Queda con rol <b>Administrador</b> y estado <b>ACTIVO</b>: puede entrar de inmediato para
        terminar de configurar la empresa. La empresa nace con el formulario en blanco.
      </p>
    </Modal>
  )
}
