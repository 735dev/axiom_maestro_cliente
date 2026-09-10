import type { RootState } from '@/shared/store'

/**
 * La auditoría de la empresa de la sesión.
 *
 * Mismo criterio que el resto: el filtro vive acá, no en la pantalla, y sin
 * sesión no devuelve nada. Una bitácora que se filtra en el componente es una
 * bitácora que alguien puede ver entera abriendo las herramientas del
 * navegador.
 */
export const selectAuditoriaDeMiEmpresa = (s: RootState) => {
  const empresaId = s.auth.usuario?.empresaId
  return empresaId ? s.auditoria.registro.filter(e => e.empresaId === empresaId) : []
}

/** Todo el registro. Solo para el ámbito plataforma. */
export const selectAuditoriaPlataforma = (s: RootState) =>
  s.auth.usuario?.ambito === 'plataforma' ? s.auditoria.registro : []
