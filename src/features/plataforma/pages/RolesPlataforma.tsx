import React, { useState, useEffect } from 'react'
import { Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  alternarPermisoRol, fijarPermisosRol, crearRol, editarRol, borrarRol,
} from '@/features/usuarios/store/usuariosSlice'
import { EditorPermisos } from '@/features/usuarios/components/EditorPermisos'
import { CATALOGO } from '@/shared/auth/permissions'

const TODOS = CATALOGO.map(p => p.codigo)

/**
 * Roles de la plataforma.
 *
 * Acá Axiom edita las **plantillas**: los roles de sistema que toda empresa
 * hereda. Los roles propios de una empresa se ven pero no se tocan — quien los
 * creó sabe para qué, y no es Axiom.
 *
 * Lo delicado no es crear: es editar. Quitarle un permiso a "Analista" se lo
 * quita, en el acto, a todos los analistas de todas las empresas. Por eso cada
 * cambio muestra a cuánta gente alcanza antes de hacerlo.
 */
export const RolesPlataforma = () => {
  const { roles, usuarios } = useAppSelector(s => s.usuarios)
  const empresas = useAppSelector(s => s.empresas.lista)
  const dispatch = useAppDispatch()

  const [sel, setSel] = useState(roles[0]?.id ?? '')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | { modo: 'nuevo' | 'duplicar' | 'editar' }>(null)
  const [borrando, setBorrando] = useState(false)
  const [pendiente, setPendiente] = useState<string | null>(null)

  useEffect(() => {
    if (!pendiente) return
    const nuevo = roles.find(r => r.nombre === pendiente)
    if (nuevo) { setSel(nuevo.id); setPendiente(null) }
  }, [roles, pendiente])

  const rol = roles.find(r => r.id === sel) ?? roles[0]
  const conRol = (id: string) => usuarios.filter(u => u.rolId === id)
  const alcanzados = conRol(rol.id)
  const empresasAlcanzadas = new Set(alcanzados.map(u => u.empresaId).filter(Boolean))

  /** El rol de Axiom no se edita: su poder no sale del catálogo. */
  const esAxiom = Boolean(rol.plataforma)
  /** Los roles propios de una empresa se ven, no se tocan desde acá. */
  const esDeEmpresa = Boolean(rol.empresaId)
  const editable = !esAxiom && !esDeEmpresa

  const alcance = (r: typeof roles[number]) =>
    r.plataforma ? { k: 'bad' as const, t: 'Axiom' }
      : r.empresaId ? { k: 'ok' as const, t: empresas.find(e => e.id === r.empresaId)?.nombre ?? 'Propio' }
        : { k: 'mut' as const, t: 'Plantilla' }

  const listados = roles.filter(r => r.nombre.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <div className="rp">
        {/* ---- las plantillas ---- */}
        <div className="rp-col">
          <div className="rp-head">
            <div className="sec" style={{ margin: 0 }}>Roles<span className="num"> · {roles.length}</span></div>
            <button className="btn sm pri" onClick={() => setModal({ modo: 'nuevo' })}>Nueva plantilla</button>
          </div>
          <input className="rp-find" placeholder="Buscar rol" value={q} onChange={e => setQ(e.target.value)} />
          <div className="rp-list">
            {listados.map(r => {
              const a = alcance(r)
              return (
                <button key={r.id} className={'rp-item' + (r.id === rol.id ? ' on' : '')} onClick={() => setSel(r.id)}>
                  <div className="rp-item-n">
                    {r.nombre}
                    <Pill k={a.k}>{a.t}</Pill>
                  </div>
                  <div className="rp-item-m">
                    {r.plataforma
                      ? 'fuera del catálogo'
                      : <><span className="num">{r.permisos.length}</span> de {TODOS.length} permisos</>}
                    <span className="rp-sep">·</span>
                    <span className="num">{conRol(r.id).length}</span> usuario{conRol(r.id).length === 1 ? '' : 's'}
                  </div>
                </button>
              )
            })}
            {!listados.length && <div className="empty">Sin roles que coincidan con “{q}”.</div>}
          </div>
        </div>

        {/* ---- el rol seleccionado ---- */}
        <div className="rp-col rp-det">
          <div className="rp-head">
            <div>
              <div className="rp-title">
                {rol.nombre}
                <Pill k={alcance(rol).k}>{alcance(rol).t}</Pill>
              </div>
              <div className="rp-desc">{rol.descripcion || 'Sin descripción.'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {editable && <button className="btn sm" onClick={() => setModal({ modo: 'editar' })}>Renombrar</button>}
              <button className="btn sm" onClick={() => setModal({ modo: 'duplicar' })}>Crear plantilla basada en este rol</button>
              {editable && !rol.sistema && <button className="btn sm" onClick={() => setBorrando(true)}>Eliminar</button>}
            </div>
          </div>

          {esAxiom && (
            <div className="rp-tension">
              <b>Este rol no se edita.</b>
              <span>
                El poder del personal de Axiom no sale del catálogo de permisos de las empresas, sino
                del ámbito. Marcar casillas acá no cambiaría nada.
              </span>
            </div>
          )}

          {esDeEmpresa && (
            <div className="rp-tension">
              <b>Este rol es de {empresas.find(e => e.id === rol.empresaId)?.nombre}.</b>
              <span>
                Lo creó su administrador para su propia operación. Se puede ver y duplicar como
                plantilla, pero editarlo desde acá sería cambiarle la configuración a un cliente sin
                que lo pida.
              </span>
            </div>
          )}

          {editable && alcanzados.length > 0 && (
            <div className="rp-alcance">
              <b>Lo que cambie acá alcanza a {alcanzados.length} usuario(s)</b>
              <span>
                en {empresasAlcanzadas.size} empresa(s), de inmediato. Es una plantilla compartida:
                quitar un permiso se lo quita a todos los que ya tienen el rol.
              </span>
            </div>
          )}

          <EditorPermisos
            permisos={rol.permisos}
            soloLectura={!editable}
            onAlternar={p => dispatch(alternarPermisoRol({ rolId: rol.id, permiso: p }))}
            onGrupo={(permisos, valor) => dispatch(fijarPermisosRol({ rolId: rol.id, permisos, valor }))}
            pie={<><b className="num">{alcanzados.length}</b> usuario{alcanzados.length === 1 ? '' : 's'} en{' '}
              <b className="num">{empresasAlcanzadas.size}</b> empresa{empresasAlcanzadas.size === 1 ? '' : 's'}</>}
          />
        </div>
      </div>

      {modal && (
        <PlantillaModal
          modo={modal.modo}
          rol={rol}
          onClose={() => setModal(null)}
          onCreada={setPendiente} />
      )}

      {borrando && (
        <Modal title={`Eliminar “${rol.nombre}”`} onClose={() => setBorrando(false)}
          footer={<><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn pri" disabled={alcanzados.length > 0}
              onClick={() => { dispatch(borrarRol(rol.id)); setSel(roles[0].id); setBorrando(false) }}>
              Eliminar</button></>}>
          {alcanzados.length > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{alcanzados.length} usuario(s) en{' '}
              {empresasAlcanzadas.size} empresa(s) tienen este rol.</b> Borrarlo los dejaría sin
              permisos. Hay que moverlos a otro rol primero, y eso lo hace cada empresa.
            </p>
          ) : (
            <p className="dlg-txt">Nadie tiene este rol. Eliminarlo no deja a ningún usuario sin acceso.</p>
          )}
        </Modal>
      )}
    </>
  )
}

/* ---------------- Alta, duplicado y renombrado de plantillas ---------------- */
const PlantillaModal: React.FC<{
  modo: 'nuevo' | 'duplicar' | 'editar'
  rol: { id: string; nombre: string; descripcion: string }
  onClose: () => void
  onCreada: (nombre: string) => void
}> = ({ modo, rol, onClose, onCreada }) => {
  const roles = useAppSelector(s => s.usuarios.roles)
  const dispatch = useAppDispatch()
  const [d, setD] = useState(
    modo === 'editar' ? { nombre: rol.nombre, descripcion: rol.descripcion }
      : modo === 'duplicar' ? { nombre: rol.nombre + ' (copia)', descripcion: rol.descripcion }
        : { nombre: '', descripcion: '' })
  const [tocado, setTocado] = useState(false)

  const t = d.nombre.trim()
  const err = t.length < 3 ? 'Escriba al menos 3 caracteres.'
    : roles.some(r => r.nombre.toLowerCase() === t.toLowerCase() && r.id !== (modo === 'editar' ? rol.id : ''))
      ? 'Ya existe un rol con ese nombre.' : null

  const guardar = () => {
    if (err) { setTocado(true); return }
    if (modo === 'editar') dispatch(editarRol({ id: rol.id, nombre: t, descripcion: d.descripcion }))
    else {
      dispatch(crearRol({
        nombre: t, descripcion: d.descripcion,
        copiarDe: modo === 'duplicar' ? rol.id : undefined,
        sistema: true,
      }))
      onCreada(t)
    }
    onClose()
  }

  const titulo = modo === 'editar' ? 'Renombrar plantilla'
    : modo === 'duplicar' ? `Crear plantilla basada en “${rol.nombre}”` : 'Nueva plantilla de rol'

  return (
    <Modal title={titulo} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={guardar}>{modo === 'editar' ? 'Guardar' : 'Crear'}</button></>}>
      <p className="dlg-txt">
        {modo === 'editar'
          ? 'Cambia el nombre y la descripción. Los permisos y los usuarios asignados no se tocan.'
          : modo === 'duplicar'
            ? <>Se crea una plantilla nueva con los mismos permisos y descripción. <b>No copia usuarios</b>
              ni cambia el rol original. Queda disponible <b>para todas las empresas</b>, pero nadie lo
              tiene asignado hasta que una empresa lo elija.</>
            : <>Queda disponible <b>para todas las empresas</b> de la plataforma, incluidas las que se
              den de alta después. Nadie lo tiene asignado hasta que cada empresa se lo dé a alguien.</>}
      </p>

      <Field label="Nombre del rol" error={tocado ? err ?? undefined : undefined}>
        <input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && guardar()} placeholder="Ej. Analista senior" />
      </Field>
      <Field label="Descripción" hint="Qué hace y qué no puede hacer. La leen los administradores de cada empresa.">
        <textarea rows={2} value={d.descripcion} onChange={e => setD({ ...d, descripcion: e.target.value })}
          placeholder="Ej. Ejecuta consultas y prepara el expediente. No aprueba riesgo alto." />
      </Field>

      {modo === 'nuevo' && (
        <p className="dlg-txt">
          Nace <b>sin permisos</b>. Si se parece a uno existente, conviene duplicar ese en vez de
          armarlo de cero.
        </p>
      )}
    </Modal>
  )
}
