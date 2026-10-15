import React, { useEffect, useState } from 'react'
import { Listado, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  alternarExcepcion, cambiarEstadoUsuario, permisosEfectivos, selectTodosLosUsuarios,
  sincronizarAdministracion,
  type UsuarioSistema,
} from '@/features/usuarios/store/usuariosSlice'
import {
  PERMISSIONS, conImplicados, dependenDe, definicionDe,
  type PermissionCode,
} from '@/shared/auth/permissions'
import { maestroApi } from '@/shared/api/maestro'
import { useCan } from '@/shared/hooks/useCan'
import type { ApiRol, ApiUsuario } from '@/shared/api/maestro'

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
export const UsuariosPlataforma = () => {
  const usuarios = useAppSelector(selectTodosLosUsuarios)
  const roles = useAppSelector(s => s.usuarios.roles)
  const empresas = useAppSelector(s => s.empresas.lista)
  const dispatch = useAppDispatch()
  const can = useCan()
  const puedeGestionar = can(PERMISSIONS.usuariosGestionar)

  const [q, setQ] = useState('')
  const [ambito, setAmbito] = useState('Todas')
  const [estado, setEstado] = useState('Todos')
  const [confirmar, setConfirmar] = useState<UsuarioSistema | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([maestroApi.usuarios(), maestroApi.roles()]).then(([usuariosApi, rolesApi]) => {
      if (!activo) return
      dispatch(sincronizarAdministracion({
        usuarios: usuariosApi.map(usuarioDesdeApi),
        roles: rolesApi.map(rolDesdeApi),
      }))
    }).catch(() => undefined)
    return () => { activo = false }
  }, [dispatch])

  const donde = (u: UsuarioSistema) =>
    u.empresaId ? u.empresaNombre ?? empresas.find(e => e.id === u.empresaId)?.nombre ?? u.empresaId : AXIOM
  const rolDe = (id: string) => roles.find(r => r.id === id)?.nombre ?? '—'
  const esDeAxiom = (u: UsuarioSistema) => u.empresaId === null

  const lista = usuarios.filter(u =>
    (ambito === 'Todas' || donde(u) === ambito) &&
    (estado === 'Todos' || u.estado === estado) &&
    (u.nombre + u.correo + rolDe(u.rolId) + donde(u)).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <Listado
        titulo="Usuarios"
        sub={`${usuarios.length} en total · ${usuarios.filter(u => u.estado === 'ACTIVO').length} pueden entrar hoy`}
        datos={lista}
        clave={u => u.id}
        etiqueta="usuarios"
        vacio="Sin usuarios que coincidan."
        porPagina={25}
        buscar={{ valor: q, onChange: setQ, marcador: 'Buscar por nombre, correo o rol' }}
        filtros={[
          { valor: ambito, onChange: setAmbito, opciones: ['Todas', AXIOM, ...empresas.map(e => e.nombre)] },
          {
            valor: estado, onChange: setEstado,
            opciones: [
              { valor: 'Todos', texto: 'Todos' },
              { valor: 'ACTIVO', texto: 'Activo' },
              { valor: 'INVITADO', texto: 'Invitado' },
              { valor: 'BLOQUEADO', texto: 'Bloqueado' },
              { valor: 'INACTIVO', texto: 'Inactivo' },
            ],
          },
        ]}
        columnas={[
          { th: 'Usuario' }, { th: 'Dónde' }, { th: 'Rol' },
          { th: 'Permisos' }, { th: 'Estado' }, { th: 'Último acceso' }, { th: '', fin: true },
        ]}
        fila={u => (
          <>
            <td>
              <b style={{ fontWeight: 500 }}>{u.nombre}</b>
              <div className="td-sub">{u.correo}</div>
            </td>
            <td className="td-m">
              {esDeAxiom(u)
                ? <><b style={{ fontWeight: 500 }}>{AXIOM}</b><div className="td-sub">sin empresa</div></>
                : donde(u)}
            </td>
            <td className="td-m">{rolDe(u.rolId)}</td>
            <td>
              <button className="btn sm" onClick={() => setAbierto(u.id)}>Ver permisos</button>
            </td>
            <td><Pill k={u.estado === 'ACTIVO' ? 'ok' : u.estado === 'BLOQUEADO' ? 'bad' : 'warn'}>
              {u.estado[0] + u.estado.slice(1).toLowerCase()}</Pill></td>
            <td className="num td-sub">{u.ultimoAcceso ?? 'Nunca'}</td>
            <td style={{ textAlign: 'right' }}>
              {puedeGestionar && <button className="btn sm" onClick={() => setConfirmar(u)}>
                {u.estado === 'BLOQUEADO' ? 'Reactivar' : 'Bloquear'}
              </button>}
            </td>
          </>
        )}
      />

      {abierto && <EditorExcepciones usuarioId={abierto} onCerrar={() => setAbierto(null)} />}

      {confirmar && (
        <Modal title={confirmar.estado === 'BLOQUEADO' ? 'Reactivar usuario' : 'Bloquear usuario'}
          onClose={() => setConfirmar(null)}
          footer={<><button className="btn" onClick={() => setConfirmar(null)}>Cancelar</button>
            <button className="btn pri" onClick={() => {
              const siguiente = confirmar.estado === 'BLOQUEADO' ? 'ACTIVO' : 'BLOQUEADO'
              maestroApi.cambiarEstadoUsuario(confirmar.id, siguiente === 'ACTIVO' ? 'active' : 'blocked')
                .then(() => dispatch(cambiarEstadoUsuario({ id: confirmar.id, estado: siguiente })))
                .finally(() => setConfirmar(null))
            }}>{confirmar.estado === 'BLOQUEADO' ? 'Reactivar' : 'Bloquear'}</button></>}>
          <p className="dlg-txt">
            <b>{confirmar.nombre}</b> — {rolDe(confirmar.rolId)} en {donde(confirmar)}.
          </p>
          {!esDeAxiom(confirmar) && (
            <p className="dlg-txt">
              Está actuando sobre el usuario de una empresa cliente. Queda registrado en la bitácora
              <b> de esa empresa</b>, con su nombre y la fecha: ellos van a ver que Axiom lo hizo.
            </p>
          )}
          {confirmar.rolId === 'administrador' && confirmar.estado !== 'BLOQUEADO' && (
            <p className="val-err">
              Es el administrador de {donde(confirmar)}. Si no queda otro usuario activo, la empresa
              se queda sin nadie que pueda entrar.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

const P = PERMISSIONS

/** Módulos y, dentro, la acción que prende o apaga el interruptor. */
const MODULOS: { modulo: string; acciones: { codigo: PermissionCode; accion: string }[] }[] = [
  { modulo: 'Clientes', acciones: [
    { codigo: P.registrosVer, accion: 'Ver' },
    { codigo: P.registrosCrear, accion: 'Registrar' },
    { codigo: P.registrosEditar, accion: 'Editar' },
    { codigo: P.registrosPersonas, accion: 'Personas vinculadas' },
    { codigo: P.registrosAprobar, accion: 'Aprobar o rechazar' },
    { codigo: P.registrosInactivar, accion: 'Inactivar' },
    { codigo: P.registrosExportar, accion: 'Exportar' },
  ]},
  { modulo: 'Catálogos', acciones: [
    { codigo: P.catalogosVer, accion: 'Ver' },
    { codigo: P.catalogosGestionar, accion: 'Administrar' },
  ]},
  { modulo: 'Formulario', acciones: [
    { codigo: P.formularioVer, accion: 'Ver' },
    { codigo: P.formularioGestionar, accion: 'Publicar' },
  ]},
  { modulo: 'Empresa', acciones: [
    { codigo: P.empresaConfigurar, accion: 'Configurar' },
  ]},
  { modulo: 'Plataforma', acciones: [
    { codigo: P.empresasVer, accion: 'Ver empresas' },
    { codigo: P.empresasCrear, accion: 'Crear empresas' },
    { codigo: P.empresasEditar, accion: 'Editar empresas' },
    { codigo: P.empresasSuspender, accion: 'Suspender empresas' },
    { codigo: P.retencionGestionar, accion: 'Retención' },
  ]},
  { modulo: 'Usuarios', acciones: [
    { codigo: P.usuariosVer, accion: 'Ver' },
    { codigo: P.usuariosGestionar, accion: 'Administrar' },
  ]},
  { modulo: 'Roles', acciones: [
    { codigo: P.rolesGestionar, accion: 'Administrar' },
  ]},
  { modulo: 'Bitácora', acciones: [
    { codigo: P.bitacoraVer, accion: 'Consultar' },
    { codigo: P.bitacoraExportar, accion: 'Exportar' },
  ]},
  { modulo: 'Reportes', acciones: [
    { codigo: P.reportesVer, accion: 'Ver' },
    { codigo: P.reportesEmitir, accion: 'Emitir' },
  ]},
]

const EditorExcepciones: React.FC<{ usuarioId: string; onCerrar: () => void }> = ({ usuarioId, onCerrar }) => {
  const usuarios = useAppSelector(s => s.usuarios.usuarios)
  const roles = useAppSelector(s => s.usuarios.roles)
  const dispatch = useAppDispatch()
  const u = usuarios.find(x => x.id === usuarioId)
  const puedeGestionar = useCan()(PERMISSIONS.usuariosGestionar)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!u) return null
  const rol = roles.find(r => r.id === u.rolId)
  const delRol = new Set(rol?.permisos ?? [])
  const efectivos = new Set(permisosEfectivos(u, roles))
  const conocidos = new Set<string>(MODULOS.flatMap(m => m.acciones.map(a => a.codigo)))
  const extras = [...new Set([...delRol, ...u.concedidos, ...u.revocados])].filter(c => !conocidos.has(c))
  const modulos = extras.length
    ? [...MODULOS, { modulo: 'Otros', acciones: extras.map(codigo => ({ codigo, accion: codigo.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ') })) }]
    : MODULOS

  const alternar = async (codigo: PermissionCode) => {
    if (motivo.trim().length < 10) {
      setError('Escriba una justificación de al menos 10 caracteres. Queda en la auditoría.')
      return
    }
    const conceder = !efectivos.has(codigo)
    const tocar = (conceder
      ? conImplicados([codigo]).filter(c => !efectivos.has(c))
      : [codigo, ...dependenDe(codigo)].filter(c => efectivos.has(c))) as PermissionCode[]
    setOcupado(codigo)
    setError(null)
    try {
      const catalogo = await maestroApi.permisos()
      for (const c of tocar) {
        const permiso = catalogo.find(p => p.codigo === c)
        if (!permiso) { setError('Ese permiso no está en el catálogo del servidor.'); return }
        await maestroApi.excepcionUsuario(u.id, permiso.id, conceder, motivo.trim())
        dispatch(alternarExcepcion({ id: u.id, permiso: c, modo: conceder ? 'conceder' : 'revocar' }))
      }
    } catch {
      setError('No fue posible guardar el cambio. El permiso quedó como estaba.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Modal title={`Permisos de ${u.nombre}`} onClose={onCerrar}
      footer={<button className="btn" onClick={onCerrar}>Cerrar</button>}>
      <p className="dlg-txt">
        {rol ? <>Rol {rol.nombre}. </> : null}
        El interruptor prende o apaga la acción solo para esta persona.
      </p>
      <Field label="Justificación" error={error ?? undefined} hint="Hace falta para cada cambio. Vale para los que haga a continuación.">
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
          placeholder="Por qué esta persona tiene un permiso distinto al de su rol." />
      </Field>
      {modulos.map(({ modulo, acciones }) => (
        <div key={modulo} className="perm-mod">
          <div className="sec">{modulo}</div>
          {acciones.map(({ codigo, accion }) => {
            const on = efectivos.has(codigo)
            const excepcion = u.revocados.includes(codigo)
              ? 'Quitado a esta persona'
              : u.concedidos.includes(codigo) && !delRol.has(codigo)
                ? 'Concedido a esta persona'
                : null
            return (
              <label key={codigo} className={'perm-acc' + (on ? ' on' : '')}>
                <span>
                  <b>{accion}</b>
                  {definicionDe(codigo)?.nivel === 'critico' && <Pill k="bad">Crítico</Pill>}
                  <span className="td-sub">{definicionDe(codigo)?.descripcion}</span>
                  {excepcion && <span className="td-sub">{excepcion}</span>}
                </span>
                <input type="checkbox" checked={on} disabled={!puedeGestionar || ocupado !== null}
                  onChange={() => puedeGestionar && void alternar(codigo)} />
                <span className="sw" aria-hidden />
              </label>
            )
          })}
        </div>
      ))}
    </Modal>
  )
}

const usuarioDesdeApi = (u: ApiUsuario): UsuarioSistema => ({
  empresaId: u.empresa_id ?? null,
  empresaNombre: u.empresa_nombre ?? undefined,
  id: u.id,
  nombre: u.nombre_completo,
  correo: u.email,
  rolId: u.rol_id ?? '',
  estado: ({ active: 'ACTIVO', blocked: 'BLOQUEADO', invited: 'INVITADO', inactive: 'INACTIVO' }[u.status] ?? 'INACTIVO') as UsuarioSistema['estado'],
  ultimoAcceso: undefined,
  concedidos: (u.concedidos ?? []) as PermissionCode[],
  revocados: (u.revocados ?? []) as PermissionCode[],
})

const rolDesdeApi = (r: ApiRol) => ({
  id: r.id,
  nombre: r.nombre,
  descripcion: r.descripcion ?? '',
  permisos: r.permisos.map(p => p.codigo) as PermissionCode[],
  sistema: r.es_predefinido,
  plataforma: r.empresa_id == null,
  empresaId: r.empresa_id ?? undefined,
})
