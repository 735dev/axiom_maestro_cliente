import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicEntryPage, PublicPortalPage } from '@/features/portal/pages/PublicPortalPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AppShell } from './AppShell'
import { ProtectedRoute, PlatformRoute } from './ProtectedRoute'
import { PlatformPage } from '@/features/platform/pages/PlatformPage'

/**
 * Dos zonas separadas, no dos pestañas de la misma pantalla:
 *
 *   /             público   — no abre ninguna empresa
 *   /:companySlug público   — el cliente se autogestiona, sin cuenta
 *   /acceso       público   — inicio de sesión, único para todo el personal
 *   /panel        protegido — el sistema interno de la empresa
 *   /plataforma   protegido — consola de Axiom, ámbito 'plataforma'
 *
 * Una sola puerta para el personal: quien entra va a un lado o a otro según el
 * ámbito de su cuenta, no según por dónde entró. Dos direcciones distintas no
 * protegían nada y duplicaban lo que hay que endurecer.
 *
 * /acceso no se enlaza desde el portal público: quien trabaja en Transvalor
 * sabe la dirección, y el cliente no tiene por qué ver una puerta que no es
 * suya.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicEntryPage />} />
      <Route path="/acceso" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/acceso" replace />} />
      <Route path="/:companySlug" element={<PublicPortalPage />} />
      <Route path="/panel/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
      {/* La puerta vieja de plataforma queda apuntando a la única que hay. */}
      <Route path="/plataforma/acceso" element={<Navigate to="/acceso" replace />} />
      <Route path="/plataforma/*" element={<PlatformRoute><PlatformPage /></PlatformRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
