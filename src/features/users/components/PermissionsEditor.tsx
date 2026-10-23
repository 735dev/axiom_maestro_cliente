import React, { useState } from 'react'
import { Pill } from '@/shared/ui'
import {
  TENANT_CATALOG, TENANT_GROUPS, definitionOf, dependOn, tensions,
  type PermissionCode,
} from '@/shared/auth/permissions'

const TODOS = TENANT_CATALOG.map(p => p.code)

/**
 * Editor de los permisos de un rol.
 *
 * Lo usan las dos consolas: el administrador de una empresa sobre sus roles, y
 * Axiom sobre los roles de sistema. Es el mismo trabajo, así que es el mismo
 * componente — si fueran dos, la advertencia de separación de funciones
 * terminaría existiendo en uno solo.
 *
 * No despacha nada: recibe el rol y avisa qué se tocó. Quién lo guarda y con
 * qué consecuencias es decisión de cada consola.
 */
export const PermissionsEditor: React.FC<{
  permissions: PermissionCode[]
  onAlternar: (p: PermissionCode) => void
  onGroup: (permissions: PermissionCode[], value: boolean) => void
  /** Cuántos usuarios quedan afectados por lo que se cambie acá. */
  pie?: React.ReactNode
  /** Sin esto los controles se ven pero no se usan. */
  readOnly?: boolean
}> = ({ permissions, onAlternar, onGroup, pie, readOnly }) => {
  const [q, setQ] = useState('')

  const byGroup = TENANT_GROUPS.map(g => ({
    group: g,
    permissions: TENANT_CATALOG.filter(d => d.group === g && (
      !q.trim() || (d.name + d.description + d.code).toLowerCase().includes(q.trim().toLowerCase())
    )).map(d => d.code),
  })).filter(x => x.permissions.length > 0)

  return (
    <>
      {tensions(permissions).map(t => (
        <div key={t.a + t.b} className="rp-tension">
          <b>Este rol junta dos permisos en tensión</b>
          <span>
            <b>{definitionOf(t.a)?.name}</b> y <b>{definitionOf(t.b)?.name}</b>. {t.because}
          </span>
        </div>
      ))}

      <div className="rp-bar">
        <input className="rp-find" placeholder="Buscar permiso" value={q} onChange={e => setQ(e.target.value)} />
        <span className="rp-count">
          <b className="num">{permissions.filter(p => TODOS.includes(p)).length}</b> de {TODOS.length} permisos
          {pie && <><span className="rp-sep">·</span>{pie}</>}
        </span>
      </div>

      <div className="rp-perms">
        {byGroup.map(({ group, permissions: delGroup }) => {
          const todos = delGroup.every(p => permissions.includes(p))
          return (
            <div key={group} className="rp-grupo">
              <div className="rp-grupo-h">
                <span className="sec" style={{ margin: 0 }}>{group}</span>
                {!readOnly && (
                  <button className="btn sm" onClick={() => onGroup(delGroup, !todos)}>
                    {todos ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                )}
              </div>
              {delGroup.map(p => {
                const d = definitionOf(p)!
                const on = permissions.includes(p)
                /** Se quedarían colgados si se quita este. */
                const colgarian = on ? dependOn(p).filter(x => permissions.includes(x)) : []
                return (
                  <label key={p} className={'rp-perm' + (on ? ' on' : '')}>
                    <input type="checkbox" checked={on} disabled={readOnly}
                      onChange={() => onAlternar(p)} />
                    <span className="sw" aria-hidden />
                    <span className="rp-perm-t">
                      <span>
                        {d.name}
                        {d.level === 'critico' && <Pill k="bad">Crítico</Pill>}
                      </span>
                      {!readOnly && d.implies && !on && (
                        <span className="td-sub">
                          Incluye {d.implies.map(i => definitionOf(i)?.name).join(', ')}
                        </span>
                      )}
                      {!readOnly && colgarian.length > 0 && (
                        <span className="td-sub">
                          Quita también {colgarian.map(i => definitionOf(i)?.name).join(', ')}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          )
        })}
        {!byGroup.length && <div className="empty">Ningún permiso coincide con “{q}”.</div>}
      </div>
    </>
  )
}
