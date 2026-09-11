import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'

/**
 * Las notificaciones que le tocan a la sesión actual.
 *
 * Mismo criterio que el resto del sistema: el filtro vive acá, no en la
 * campana, y sin sesión no devuelve nada. Un destinatario "por permiso" se
 * resuelve contra los permisos efectivos del usuario en este momento —no
 * contra los que tenía cuando se generó el aviso—, que es lo correcto: si le
 * quitaron el permiso, ya no es su aviso.
 */
const NOTIFICACIONES_VACIAS: RootState['notificaciones']['lista'] = []
export const selectNotificacionesMias = createSelector(
  [(s: RootState) => s.auth.usuario, (s: RootState) => s.notificaciones.lista],
  (usuario, lista) => {
    if (!usuario) return NOTIFICACIONES_VACIAS
    return lista.filter(n => {
    if (n.empresaId !== usuario.empresaId) return false
    return n.destinatario.tipo === 'usuario'
      ? n.destinatario.usuarioId === usuario.id
      : usuario.permisos.includes(n.destinatario.permiso)
    })
  },
)

export const selectNotificacionesNoLeidas = createSelector(
  [selectNotificacionesMias],
  notificaciones => notificaciones.filter(n => !n.leida),
)
