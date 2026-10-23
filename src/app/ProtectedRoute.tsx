import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/shared/store/hooks'
import { useCan } from '@/shared/hooks/useCan'
import type { PermissionCode } from '@/shared/auth/permissions'

/**
 * Guard de las rutas internas.
 *
 * Ojo con qué protege realmente: esto evita que la interfaz se monte, y nada
 * más. El navegador tiene todo el bundle. La autorización de verdad la hace el
 * backend en cada request; este guard es para que el usuario no vea pantallas
 * que no le tocan, no para impedir el acceso a los datos.
 *
 * Sin sesión manda a /acceso y recuerda a dónde iba, para volver ahí después de
 * entrar en vez de dejarlo en la portada.
 */
export const ProtectedRoute: React.FC<{ permission?: PermissionCode; children: React.ReactNode }> =
  ({ permission, children }) => {
    const token = useAppSelector(s => s.auth.token)
    const scope = useAppSelector(s => s.auth.user?.scope)
    const can = useCan()
    const location = useLocation()

    /**
     * Una sesión sin ámbito no es una sesión.
     *
     * Puede pasar con una sesión guardada de antes de que el campo existiera.
     * Se trata como no autenticado —fallar cerrado— y además evita el rebote:
     * sin esto, un guard la mandaba al otro y el otro la devolvía, para
     * siempre.
     */
    if (!token || !scope) return <Navigate to="/acceso" replace state={{ start: location.pathname }} />

    // El ámbito plataforma no opera dentro de una empresa: no tiene empresaId,
    // así que cualquier consulta scopeada le devolvería vacío. Se lo saca de acá.
    if (scope !== 'empresa') return <Navigate to="/plataforma" replace />

    // Con sesión pero sin el permiso: no se le dice que la pantalla existe.
    if (permission && !can(permission)) return <Navigate to="/panel" replace />

    return <>{children}</>
  }

/**
 * Guard del ámbito plataforma.
 *
 * No mira permisos, mira el ámbito. Es la pieza que hace que ningún usuario de
 * una empresa llegue acá: por más permisos que le concedan dentro de su
 * sistema, su ámbito sigue siendo 'empresa' y ese valor no se emite en la
 * puerta de las empresas.
 */
export const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAppSelector(s => s.auth.token)
  const scope = useAppSelector(s => s.auth.user?.scope)
  const location = useLocation()

  // Sin sesión —o con una sin ámbito, que es lo mismo— a la puerta.
  // Se recuerda la dirección completa: recargar /plataforma/empresas tiene que
  // volver ahí después de entrar, no al resumen.
  if (!token || !scope) return <Navigate to="/acceso" replace state={{ start: location.pathname }} />

  /**
   * Con sesión pero de otro ámbito va a su propia casa, no al login.
   *
   * Mandarlo a iniciar sesión sería absurdo —ya la tiene— y además rebotaba:
   * el login veía la sesión abierta, lo devolvía al destino recordado, y el
   * guard lo echaba de nuevo. Un ciclo infinito sin ningún error visible.
   */
  if (scope !== 'plataforma') return <Navigate to="/panel" replace />

  return <>{children}</>
}
