import { useAppSelector } from '@/shared/store/hooks'
import type { Empresa } from '@/features/plataforma/store/empresasSlice'

/**
 * Qué empresa está operando en esta pantalla.
 *
 * Con sesión manda la empresa del usuario, y no se negocia: nada de leerla de
 * la URL o de un parámetro, porque eso es justamente lo que permitiría pedir
 * los datos de otra.
 *
 * Sin sesión estamos en el portal público y la empresa viene del slug de la
 * ruta. No hay fallback a la primera activa.
 */
export function useEmpresaActual(): Empresa | undefined {
  const empresas = useAppSelector(s => s.empresas.lista)
  const empresaId = useAppSelector(s => s.auth.usuario?.empresaId)

  if (empresaId) return empresas.find(e => e.id === empresaId)

  const slug = window.location.pathname.split('/').filter(Boolean)[0]
  const normalizar = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return empresas.find(e => (e.slug ?? normalizar(e.nombre)) === slug && e.estado === 'ACTIVA')
}
