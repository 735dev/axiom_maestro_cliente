import { Routes, Route, Navigate } from 'react-router-dom'
import { PortalPublicoPage } from '@/features/portal/pages/PortalPublicoPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { PanelShell } from './PanelShell'
import { RutaProtegida, RutaPlataforma } from './RutaProtegida'
import { PlataformaPage } from '@/features/plataforma/pages/PlataformaPage'

/**
 * Dos zonas separadas, no dos pestañas de la misma pantalla:
 *
 *   /             público   — el cliente se autogestiona, sin cuenta
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
      <Route path="/" element={<Navigate to="/transvalor-orinoco-c-a" replace />} />
      <Route path="/acceso" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/acceso" replace />} />
      <Route path="/:empresaSlug" element={<PortalPublicoPage />} />
      <Route path="/panel/*" element={<RutaProtegida><PanelShell /></RutaProtegida>} />
      {/* La puerta vieja de plataforma queda apuntando a la única que hay. */}
      <Route path="/plataforma/acceso" element={<Navigate to="/acceso" replace />} />
      <Route path="/plataforma" element={<RutaPlataforma><PlataformaPage /></RutaPlataforma>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
