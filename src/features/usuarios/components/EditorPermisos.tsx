import React, { useState } from 'react'
import { Pill } from '@/shared/ui'
import {
  CATALOGO, GRUPOS, definicionDe, dependenDe, tensiones,
  type PermissionCode,
} from '@/shared/auth/permissions'

const TODOS = CATALOGO.map(p => p.codigo)

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
export const EditorPermisos: React.FC<{
  permisos: PermissionCode[]
  onAlternar: (p: PermissionCode) => void
  onGrupo: (permisos: PermissionCode[], valor: boolean) => void
  /** Cuántos usuarios quedan afectados por lo que se cambie acá. */
  pie?: React.ReactNode
  /** Sin esto los controles se ven pero no se usan. */
  soloLectura?: boolean
}> = ({ permisos, onAlternar, onGrupo, pie, soloLectura }) => {
  const [q, setQ] = useState('')

  const porGrupo = GRUPOS.map(g => ({
    grupo: g,
    permisos: CATALOGO.filter(d => d.grupo === g && (
      !q.trim() || (d.nombre + d.descripcion + d.codigo).toLowerCase().includes(q.trim().toLowerCase())
    )).map(d => d.codigo),
  })).filter(x => x.permisos.length > 0)

  return (
    <>
      {tensiones(permisos).map(t => (
        <div key={t.a + t.b} className="rp-tension">
          <b>Este rol junta dos permisos en tensión</b>
          <span>
            <b>{definicionDe(t.a)?.nombre}</b> y <b>{definicionDe(t.b)?.nombre}</b>. {t.porque}
          </span>
        </div>
      ))}

      <div className="rp-bar">
        <input className="rp-find" placeholder="Buscar permiso" value={q} onChange={e => setQ(e.target.value)} />
        <span className="rp-count">
          <b className="num">{permisos.length}</b> de {TODOS.length} permisos
          {pie && <><span className="rp-sep">·</span>{pie}</>}
        </span>
      </div>

      <div className="rp-perms">
        {porGrupo.map(({ grupo, permisos: delGrupo }) => {
          const todos = delGrupo.every(p => permisos.includes(p))
          return (
            <div key={grupo} className="rp-grupo">
              <div className="rp-grupo-h">
                <span className="sec" style={{ margin: 0 }}>{grupo}</span>
                {!soloLectura && (
                  <button className="btn sm" onClick={() => onGrupo(delGrupo, !todos)}>
                    {todos ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                )}
              </div>
              {delGrupo.map(p => {
                const d = definicionDe(p)!
                const on = permisos.includes(p)
                /** Se quedarían colgados si se quita este. */
                const colgarian = on ? dependenDe(p).filter(x => permisos.includes(x)) : []
                return (
                  <label key={p} className={'rp-perm' + (on ? ' on' : '')}>
                    <input type="checkbox" checked={on} disabled={soloLectura}
                      onChange={() => onAlternar(p)} />
                    <span className="sw" aria-hidden />
                    <span className="rp-perm-t">
                      <span>
                        {d.nombre}
                        {d.nivel === 'critico' && <Pill k="bad">Crítico</Pill>}
                        {d.nivel === 'escritura' && <Pill k="warn">Escritura</Pill>}
                      </span>
                      <span className="td-sub">{d.descripcion}</span>
                      {d.implica && !on && (
                        <span className="td-sub">
                          Se concede junto con: {d.implica.map(i => definicionDe(i)?.nombre).join(', ')}
                        </span>
                      )}
                      {colgarian.length > 0 && (
                        <span className="td-sub" style={{ color: 'var(--warn)' }}>
                          Al quitarlo quedan sin efecto: {colgarian.map(i => definicionDe(i)?.nombre).join(', ')}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          )
        })}
        {!porGrupo.length && <div className="empty">Ningún permiso coincide con “{q}”.</div>}
      </div>
    </>
  )
}
