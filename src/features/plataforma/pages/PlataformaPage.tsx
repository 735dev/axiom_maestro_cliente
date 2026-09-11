import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Listado, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { logout } from '@/shared/store/slices/authSlice'
import {
  crearEmpresa, cambiarEstadoEmpresa, versionVigente,
  type Empresa,
} from '../store/empresasSlice'
import { EditorFormulario } from './EditorFormulario'
import { DashboardPlataforma } from './DashboardPlataforma'
import { AuditoriaPlataforma } from './AuditoriaPlataforma'
import { UsuariosPlataforma } from './UsuariosPlataforma'
import { RolesPlataforma } from './RolesPlataforma'
import { maestroApi, type ApiRetencionBorrador } from '@/shared/api/maestro'

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
  { id: 'empresas', label: 'Empresas', titulo: 'Empresas', sub: 'Altas, suspensiones y portal de cada una.' },
  { id: 'formularios', label: 'Formularios', titulo: 'Formularios', sub: 'Qué le pide cada empresa a sus clientes.' },
  { id: 'usuarios', label: 'Usuarios', titulo: 'Usuarios', sub: 'Todo el padrón: las empresas y también Axiom.' },
  { id: 'roles', label: 'Roles', titulo: 'Roles', sub: 'Quién puede qué, y hasta dónde llega cada rol.' },
  { id: 'auditoria', label: 'Auditoría', titulo: 'Auditoría', sub: 'Todo lo que pasó, en todas las empresas y en Axiom.' },
  { id: 'retencion', label: 'Retención', titulo: 'Retención de borradores', sub: 'Cuánto tiempo se conservan los registros abandonados.' },
] as const

export const PlataformaPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const usuario = useAppSelector(s => s.auth.usuario)
  const [vista, setVista] = useState<string>('resumen')

  const actual = RUTAS.find(r => r.id === vista) ?? RUTAS[0]

  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand"><b>Axiom Core Tech</b><span>Consola de plataforma</span></div>
        <nav className="nav">
          {RUTAS.map(r => (
            <a key={r.id} href="#" className={vista === r.id ? 'on' : ''}
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
          {vista === 'resumen' ? <DashboardPlataforma />
            : vista === 'empresas' ? <Empresas />
              : vista === 'formularios' ? <EditorFormulario />
                : vista === 'usuarios' ? <UsuariosPlataforma />
                  : vista === 'roles' ? <RolesPlataforma />
                    : vista === 'auditoria' ? <AuditoriaPlataforma /> : <RetencionBorradores />}
        </div>
      </main>
    </div>
  )
}

const RetencionBorradores = () => {
  const [items, setItems] = useState<ApiRetencionBorrador[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  useEffect(() => { maestroApi.retencionesBorradores().then(setItems).catch(() => undefined).finally(() => setCargando(false)) }, [])
  const cambiar = async (item: ApiRetencionBorrador, dias: number) => {
    setGuardando(item.empresa_id)
    try { setItems(xs => xs.map(x => x.empresa_id === item.empresa_id ? { ...x, dias } : x)); await maestroApi.actualizarRetencionBorradores(item.empresa_id, dias) }
    catch { window.alert('No fue posible guardar la política.') }
    finally { setGuardando(null) }
  }
  return <Listado
    titulo="Retención de borradores"
    sub="La tarea programada inactiva los borradores sin actividad que superen este plazo. Nunca se borran físicamente."
    datos={items} clave={x => x.empresa_id} etiqueta="empresas"
    vacio={cargando ? 'Cargando políticas…' : 'No hay empresas configuradas.'}
    columnas={[{ th: 'Empresa' }, { th: 'Días de retención' }, { th: 'Efecto' }]}
    fila={x => <><td><b>{x.empresa}</b></td><td><select value={x.dias} disabled={guardando === x.empresa_id} onChange={e => void cambiar(x, Number(e.target.value))}>{[7, 15, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>{d} días</option>)}</select></td><td className="td-sub">Se inactiva por tarea programada</td></>}
  />
}

/* ---------------- Empresas ---------------- */
const Empresas = () => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const clientes = useAppSelector(s => s.clientes.lista)
  const usuarios = useAppSelector(s => s.usuarios.usuarios)
  const dispatch = useAppDispatch()
  const [nueva, setNueva] = useState(false)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('Todas')

  const lista = empresas.filter(e =>
    (estado === 'Todas' || e.estado === estado) &&
    (e.nombre + e.rif + e.dominio).toLowerCase().includes(q.trim().toLowerCase()))

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
        acciones={<button className="btn pri sm" onClick={() => setNueva(true)}>Nueva empresa</button>}
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
            <td className="td-sub">{e.dominio}</td>
            <td className="num">{clientes.filter(c => c.empresaId === e.id).length}</td>
            <td className="num">{usuarios.filter(u => u.empresaId === e.id).length}</td>
            <td className="num">v{versionVigente(e).version}</td>
            <td>{e.estado === 'ACTIVA' ? <Pill k="ok">Activa</Pill> : <Pill k="bad">Suspendida</Pill>}</td>
            <td style={{ textAlign: 'right' }}>
              <button className="btn sm" onClick={() => dispatch(cambiarEstadoEmpresa({
                id: e.id, estado: e.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA',
              }))}>
                {e.estado === 'ACTIVA' ? 'Suspender' : 'Reactivar'}
              </button>
            </td>
          </>
        )}
      />

      {nueva && <NuevaEmpresa onClose={() => setNueva(false)} />}
    </>
  )
}

const NuevaEmpresa: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const correos = useAppSelector(s => s.usuarios.usuarios.map(u => u.correo.toLowerCase()))
  const dispatch = useAppDispatch()
  const [d, setD] = useState({ nombre: '', rif: '', dominio: '', adminNombre: '', adminCorreo: '' })
  const [tocado, setTocado] = useState(false)

  const errNombre = d.nombre.trim().length < 3 ? 'Escriba al menos 3 caracteres.'
    : empresas.some(e => e.nombre.toLowerCase() === d.nombre.trim().toLowerCase()) ? 'Ya existe una empresa con ese nombre.' : null
  const errDominio = !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d.dominio.trim())
    ? 'Escriba un dominio válido, por ejemplo registro.empresa.com'
    : empresas.some(e => e.dominio.toLowerCase() === d.dominio.trim().toLowerCase()) ? 'Ese dominio ya está en uso.' : null
  const errAdminNombre = d.adminNombre.trim().length < 5 ? 'Nombre y apellido del administrador.' : null
  const errAdminCorreo = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.adminCorreo.trim())
    ? 'Escriba un correo válido.'
    : correos.includes(d.adminCorreo.trim().toLowerCase()) ? 'Ese correo ya tiene cuenta en la plataforma.' : null

  const ok = !errNombre && !errDominio && !errAdminNombre && !errAdminCorreo

  const crear = () => {
    if (!ok) { setTocado(true); return }
    dispatch(crearEmpresa({
      nombre: d.nombre.trim(), rif: d.rif.trim(), dominio: d.dominio.trim().toLowerCase(),
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
      <Field label="Dominio del portal público" error={tocado ? errDominio ?? undefined : undefined}
        hint={!errDominio ? 'Por aquí entran sus clientes a autogestionarse.' : undefined}>
        <input value={d.dominio} onChange={e => setD({ ...d, dominio: e.target.value.toLowerCase() })}
          placeholder="registro.empresa.com" />
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
        Queda con rol <b>Administrador</b> y estado <b>INVITADO</b>: existe, pero no entra hasta que
        use su invitación. La empresa nace con el formulario en blanco.
      </p>
    </Modal>
  )
}

export type { Empresa }
