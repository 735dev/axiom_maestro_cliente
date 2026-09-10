import type { PermissionCode } from '@/shared/auth/permissions'

/**
 * A quién le llega el aviso.
 *
 * Dos formas, no una: casi todo lo que pasa en el sistema le interesa a
 * "quien tenga tal permiso" —cualquier administrador, no una persona en
 * concreto—, pero algunas cosas son de alguien puntual (una excepción sobre
 * su propio usuario, por ejemplo). Forzar todo a "por usuario" obligaría a
 * expandir la lista de destinatarios en el momento de generar el aviso, y
 * ese cálculo dejaría de reflejar altas y bajas de personal después.
 */
export type Destinatario =
  | { tipo: 'permiso'; permiso: PermissionCode }
  | { tipo: 'usuario'; usuarioId: string }

export type Gravedad = 'normal' | 'sensible'

export type Notificacion = {
  id: string
  /** ISO. Del servidor en producción; nunca del reloj del navegador. */
  fecha: string
  destinatario: Destinatario
  /** A qué empresa pertenece el hecho. Mismo criterio que la auditoría. */
  empresaId: string | null
  titulo: string
  detalle: string
  entidad?: { tipo: string; id: string; nombre?: string }
  leida: boolean
  gravedad: Gravedad
}
