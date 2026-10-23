import React, { useState, useEffect } from 'react'
import { Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import {
  toggleRolePermission, setRolePermissions, createRole, editRole, deleteRole,
} from '@/features/users/store/usersSlice'
import { PermissionsEditor } from '@/features/users/components/PermissionsEditor'

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
export const PlatformRoles = () => {
  const { roles, users } = useAppSelector(s => s.users)
  const companies = useAppSelector(s => s.companies.list)
  const dispatch = useAppDispatch()

  const [sel, setSel] = useState(roles[0]?.id ?? '')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | { modo: 'nuevo' | 'duplicar' | 'editar' }>(null)
  const [borrando, setBorrando] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (!pending) return
    const created = roles.find(r => r.name === pending)
    if (created) { setSel(created.id); setPending(null) }
  }, [roles, pending])

  const rol = roles.find(r => r.id === sel) ?? roles[0]
  const conRol = (id: string) => users.filter(u => u.rolId === id)
  const reached = conRol(rol.id)
  const reachedCompanies = new Set(reached.map(u => u.companyId).filter(Boolean))

  /** El rol de Axiom no se edita: su poder no sale del catálogo. */
  const esAxiom = Boolean(rol.platform)
  /** Los roles propios de una empresa se ven, no se tocan desde acá. */
  const isCompanyUser = Boolean(rol.companyId)
  const editable = !esAxiom && !isCompanyUser

  const alcance = (r: typeof roles[number]) =>
    r.platform ? { k: 'bad' as const, t: 'Axiom' }
      : r.companyId ? { k: 'ok' as const, t: companies.find(e => e.id === r.companyId)?.name ?? 'Propio' }
        : { k: 'mut' as const, t: 'Plantilla' }

  const listings = roles.filter(r => r.name.toLowerCase().includes(q.trim().toLowerCase()))

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
            {listings.map(r => {
              const a = alcance(r)
              return (
                <button key={r.id} className={'rp-item' + (r.id === rol.id ? ' on' : '')} onClick={() => setSel(r.id)}>
                  <div className="rp-item-n">
                    {r.name}
                    <Pill k={a.k}>{a.t}</Pill>
                  </div>
                  <div className="rp-item-m">
                    {r.platform
                      ? 'Sin catálogo'
                      : <><span className="num">{r.permissions.length}</span> permissions</>}
                    <span className="rp-sep">·</span>
                    <span className="num">{conRol(r.id).length}</span>
                  </div>
                </button>
              )
            })}
            {!listings.length && <div className="empty">Sin roles que coincidan con “{q}”.</div>}
          </div>
        </div>

        {/* ---- el rol seleccionado ---- */}
        <div className="rp-col rp-det">
          <div className="rp-head">
            <div>
              <div className="rp-title">
                {rol.name}
                <Pill k={alcance(rol).k}>{alcance(rol).t}</Pill>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {editable && <button className="btn sm" onClick={() => setModal({ modo: 'editar' })}>Renombrar</button>}
              <button className="btn sm" onClick={() => setModal({ modo: 'duplicar' })}>Duplicar</button>
              {editable && !rol.sistema && <button className="btn sm" onClick={() => setBorrando(true)}>Eliminar</button>}
            </div>
          </div>

          {!editable && <p className="rp-nota">Solo read.</p>}

          {editable && reached.length > 0 && (
            <p className="rp-nota">
              Aplica a {reached.length} user{reached.length === 1 ? '' : 's'} en {reachedCompanies.size} company{reachedCompanies.size === 1 ? '' : 's'}.
            </p>
          )}

          <PermissionsEditor
            permissions={rol.permissions}
            readOnly={!editable}
            onAlternar={p => dispatch(toggleRolePermission({ rolId: rol.id, permission: p }))}
            onGroup={(permissions, value) => dispatch(setRolePermissions({ rolId: rol.id, permissions, value }))}

          />
        </div>
      </div>

      {modal && (
        <PlantillaModal
          modo={modal.modo}
          rol={rol}
          onClose={() => setModal(null)}
          onCreada={setPending} />
      )}

      {borrando && (
        <Modal title={`Eliminar “${rol.name}”`} onClose={() => setBorrando(false)}
          footer={<><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn pri" disabled={reached.length > 0}
              onClick={() => { dispatch(deleteRole(rol.id)); setSel(roles[0].id); setBorrando(false) }}>
              Eliminar</button></>}>
          {reached.length > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{reached.length} user(s) en{' '}
              {reachedCompanies.size} company(s) tienen este rol.</b> DeleteIt los dejaría sin
              permissions. Hay que moveThem a otro rol primero, y eso lo hace cada company.
            </p>
          ) : (
            <p className="dlg-txt">Nadie tiene este rol. Eliminarlo no deja a ningún user sin acceso.</p>
          )}
        </Modal>
      )}
    </>
  )
}

/* ---------------- Alta, duplicado y renombrado de plantillas ---------------- */
const PlantillaModal: React.FC<{
  modo: 'nuevo' | 'duplicar' | 'editar'
  rol: { id: string; name: string; description: string }
  onClose: () => void
  onCreada: (name: string) => void
}> = ({ modo, rol, onClose, onCreada }) => {
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

  const save = () => {
    if (err) { setTocado(true); return }
    if (modo === 'editar') dispatch(editRole({ id: rol.id, name: t, description: d.description }))
    else {
      dispatch(createRole({
        name: t, description: d.description,
        copiarDe: modo === 'duplicar' ? rol.id : undefined,
        sistema: true,
      }))
      onCreada(t)
    }
    onClose()
  }

  const title = modo === 'editar' ? 'Renombrar plantilla'
    : modo === 'duplicar' ? `Crear plantilla basada en “${rol.name}”` : 'Nueva plantilla de rol'

  return (
    <Modal title={title} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={save}>{modo === 'editar' ? 'Guardar' : 'Crear'}</button></>}>
      <p className="dlg-txt">
        {modo === 'editar'
          ? 'Cambia el nombre y la descripción. Los permisos y los usuarios asignados no se tocan.'
          : modo === 'duplicar'
            ? <>Se crea una plantilla new con los mismos permissions y descripción. <b>No copia users</b>
              ni cambia el rol original. Queda available <b>para todas las companies</b>, pero nadie lo
              tiene asignado to que una company lo elija.</>
            : <>Queda available <b>para todas las companies</b> de la platform, incluidas las que se
              den de intake después. Nadie lo tiene asignado to que cada company se lo dé a alguien.</>}
      </p>

      <Field label="Nombre del rol" error={tocado ? err ?? undefined : undefined}>
        <input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && save()} placeholder="Ej. Analista senior" />
      </Field>
      <Field label="Descripción" hint="Qué hace y qué no puede hacer. La leen los administradores de cada empresa.">
        <textarea rows={2} value={d.description} onChange={e => setD({ ...d, description: e.target.value })}
          placeholder="Ej. Ejecuta consultas y prepara el expediente. No aprueba riesgo alto." />
      </Field>

      {modo === 'nuevo' && (
        <p className="dlg-txt">
          Nace <b>sin permissions</b>. Si se parece a uno existente, conviene duplicar ese en vez de
          armarlo de cero.
        </p>
      )}
    </Modal>
  )
}
