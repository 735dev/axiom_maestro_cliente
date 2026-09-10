import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { marcarLeidas } from './notificacionesSlice'
import { selectNotificacionesMias } from './selectores'

const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)

/**
 * Campana genérica del panel: no sabe qué disparó cada aviso, solo pinta lo
 * que el store ya decidió que le corresponde a este usuario (ver
 * `selectores.ts`). Un caso nuevo de notificación se agrega en
 * `shared/notificaciones/generar.ts`, nunca acá.
 */
export const Campana: React.FC = () => {
  const dispatch = useAppDispatch()
  const notificaciones = useAppSelector(selectNotificacionesMias)
  const [abierta, setAbierta] = useState(false)
  const noLeidas = notificaciones.filter(n => !n.leida)

  const alternar = () => {
    const abrir = !abierta
    setAbierta(abrir)
    // Se marcan leídas al abrir el panel, no al montar el componente: así el
    // contador no baja solo porque la pestaña estuvo abierta de fondo.
    if (abrir && noLeidas.length) dispatch(marcarLeidas(noLeidas.map(n => n.id)))
  }

  return (
    <div className="bell">
      <button className="bell-btn" onClick={alternar} title="Notificaciones" aria-label="Notificaciones">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {noLeidas.length > 0 && <span className="bell-badge">{noLeidas.length > 9 ? '9+' : noLeidas.length}</span>}
      </button>

      {abierta && (
        <>
          <div className="bell-backdrop" onClick={() => setAbierta(false)} />
          <div className="bell-panel">
            <div className="bell-panel-h">Notificaciones</div>
            {notificaciones.length ? (
              <ul className="bell-list">
                {notificaciones.map(n => (
                  <li key={n.id} className={n.leida ? undefined : 'no-leida'}>
                    <div className="bell-item-t">{n.titulo}</div>
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
