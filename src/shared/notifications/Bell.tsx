import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { marcarLeidas } from './notificationsSlice'
import { selectMyNotifications } from './selectors'
import { maestroApi } from '@/shared/api/maestro'
import { PERMISSIONS } from '@/shared/auth/permissions'
import type { Notification } from './types'

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)

/**
 * Campana del panel. Pinta lo que el store ya decidió que le corresponde
 * a este usuario. Un caso nuevo de aviso se agrega en generate.ts, nunca acá.
 */
export const Bell: React.FC = () => {
  const dispatch = useAppDispatch()
  const locales = useAppSelector(selectMyNotifications) ?? []
  const [remotas, setRemotas] = useState<Notification[] | null>(null)
  const [open, setOpen] = useState(false)
  const items = remotas ?? locales
  const unread = items.filter(n => !n.leida)

  useEffect(() => {
    maestroApi.notifications().then(rows => setRemotas(rows.map(n => ({
      id: n.id,
      fecha: n.created_at,
      destinatario: { tipo: 'permiso' as const, permission: PERMISSIONS.recordsApprove },
      companyId: null,
      title: n.titulo,
      detalle: n.detalle,
      entity: n.entidad_tipo && n.entidad_id ? { tipo: n.entidad_tipo, id: n.entidad_id } : undefined,
      leida: n.leida,
      severity: 'sensible' as const,
    })))).catch(() => setRemotas([]))
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread.length) {
      dispatch(marcarLeidas(unread.map(n => n.id)))
      if (remotas) {
        setRemotas(remotas.map(n => unread.some(x => x.id === n.id) ? { ...n, leida: true } : n))
        maestroApi.markNotifications(unread.map(n => n.id)).catch(() => undefined)
      }
    }
  }

  return (
    <div className="bell">
      <button className="bell-btn" onClick={toggle} title="Notificaciones" aria-label="Notificaciones">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread.length > 0 && <span className="bell-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
      </button>

      {open && (
        <>
          <div className="bell-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-panel">
            <div className="bell-panel-h">Notificaciones</div>
            {items.length ? (
              <ul className="bell-list">
                {items.map(n => (
                  <li key={n.id} className={n.leida ? undefined : 'no-leida'}>
                    <div className="bell-item-t">{n.title}</div>
                    <div className="bell-item-d">{n.detalle}</div>
                    <div className="bell-item-f num">{fmt(n.fecha)}</div>
                  </li>
                ))}
              </ul>
            ) : <div className="empty">Sin notificaciones todavía.</div>}
          </div>
        </>
      )}
    </div>
  )
}
