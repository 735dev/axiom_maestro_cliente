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
export const selectNotificacionesMias = (s: RootState) => {
  const usuario = s.auth.usuario
  if (!usuario) return []
  return s.notificaciones.lista.filter(n => {
    if (n.empresaId !== usuario.empresaId) return false
    return n.destinatario.tipo === 'usuario'
      ? n.destinatario.usuarioId === usuario.id
      : usuario.permisos.includes(n.destinatario.permiso)
  })
}

export const selectNotificacionesNoLeidas = (s: RootState) =>
  selectNotificacionesMias(s).filter(n => !n.leida)
