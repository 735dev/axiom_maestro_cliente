import { useAppSelector } from '@/shared/store/hooks'
import type { Empresa } from '@/features/plataforma/store/empresasSlice'

/**
 * Qué empresa está operando en esta pantalla.
 *
 * Con sesión manda la empresa del usuario, y no se negocia: nada de leerla de
 * la URL o de un parámetro, porque eso es justamente lo que permitiría pedir
 * los datos de otra.
 *
 * Sin sesión estamos en el portal público, y ahí la decide el dominio por el
 * que entró el cliente: cada empresa tiene el suyo.
 */
export function useEmpresaActual(): Empresa | undefined {
  const empresas = useAppSelector(s => s.empresas.lista)
  const empresaId = useAppSelector(s => s.auth.usuario?.empresaId)

  if (empresaId) return empresas.find(e => e.id === empresaId)

  return empresas.find(e => e.dominio === window.location.host && e.estado === 'ACTIVA')
    // En el prototipo no hay dominios reales: se cae a la primera activa.
    ?? empresas.find(e => e.estado === 'ACTIVA')
}
