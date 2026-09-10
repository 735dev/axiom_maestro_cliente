import React, { useState } from 'react'
import { Listado, Pill, Modal } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  cambiarEstadoUsuario, permisosEfectivos, selectTodosLosUsuarios,
  type UsuarioSistema,
} from '@/features/usuarios/store/usuariosSlice'
import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import { maestroApi } from '@/shared/api/maestro'

const TODOS = Object.values(PERMISSIONS) as PermissionCode[]

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

  const [q, setQ] = useState('')
  const [ambito, setAmbito] = useState('Todas')
  const [estado, setEstado] = useState('Todos')
  const [confirmar, setConfirmar] = useState<UsuarioSistema | null>(null)

  const donde = (u: UsuarioSistema) =>
    u.empresaId ? empresas.find(e => e.id === u.empresaId)?.nombre ?? u.empresaId : AXIOM
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
              {esDeAxiom(u)
                ? <span className="td-sub">ámbito plataforma</span>
                : <>
                  <span className="num" style={{ fontSize: 12 }}>{permisosEfectivos(u, roles).length}</span>
                  <span className="td-sub" style={{ display: 'inline' }}> de {TODOS.length}</span>
                  {u.concedidos.length > 0 && <span className="pill ok" style={{ marginLeft: 6 }}><i className="dot" />+{u.concedidos.length}</span>}
                  {u.revocados.length > 0 && <span className="pill bad" style={{ marginLeft: 6 }}><i className="dot" />−{u.revocados.length}</span>}
                </>}
            </td>
            <td><Pill k={u.estado === 'ACTIVO' ? 'ok' : u.estado === 'BLOQUEADO' ? 'bad' : 'warn'}>
              {u.estado[0] + u.estado.slice(1).toLowerCase()}</Pill></td>
            <td className="num td-sub">{u.ultimoAcceso ?? 'Nunca'}</td>
            <td style={{ textAlign: 'right' }}>
              <button className="btn sm" onClick={() => setConfirmar(u)}>
                {u.estado === 'BLOQUEADO' ? 'Reactivar' : 'Bloquear'}
              </button>
            </td>
          </>
        )}
      />

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
