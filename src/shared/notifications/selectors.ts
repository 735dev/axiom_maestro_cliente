import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'
import type { Notification } from './types'

/**
 * Las notificaciones que le tocan a la sesión actual.
 *
 * Mismo criterio que el resto del sistema: el filtro vive acá, no en la
 * campana, y sin sesión no devuelve nada. Un destinatario "por permiso" se
 * resuelve contra los permisos efectivos del usuario en este momento —no
 * contra los que tenía cuando se generó el aviso—, que es lo correcto: si le
 * quitaron el permiso, ya no es su aviso.
 */
const EMPTY_NOTIFICATIONS: Notification[] = []
export const selectMyNotifications = createSelector(
  [(s: RootState) => s.auth.user, (s: RootState) => s.notifications?.list ?? EMPTY_NOTIFICATIONS],
  (user, list) => {
    if (!user) return EMPTY_NOTIFICATIONS
    return list.filter(n => {
      if (n.companyId !== user.companyId) return false
      return n.destinatario.tipo === 'usuario'
        ? n.destinatario.userId === user.id
        : (user.permissions ?? []).includes(n.destinatario.permission)
    })
  },
)

export const selectUnreadNotifications = createSelector(
  [selectMyNotifications],
  notifications => notifications.filter(n => !n.leida),
)
