import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'

const esSincronizacionTecnica = (accion: string) =>
  accion === 'Acción sin describir (clientes/reemplazarClientesDesdeApi)' ||
  accion === 'Acción sin describir (clientes/reemplazarPersonasCliente)'

/**
 * La auditoría de la empresa de la sesión.
 *
 * Mismo criterio que el resto: el filtro vive acá, no en la pantalla, y sin
 * sesión no devuelve nada. Una bitácora que se filtra en el componente es una
 * bitácora que alguien puede ver entera abriendo las herramientas del
 * navegador.
 */
const AUDITORIA_VACIA: RootState['auditoria']['registro'] = []
export const selectAuditoriaDeMiEmpresa = createSelector(
  [(s: RootState) => s.auth.usuario?.empresaId, (s: RootState) => s.auditoria.registro],
  (empresaId, registro) => empresaId
    ? registro.filter(e => e.empresaId === empresaId && !esSincronizacionTecnica(e.accion))
    : AUDITORIA_VACIA,
)

/** Todo el registro. Solo para el ámbito plataforma. */
export const selectAuditoriaPlataforma = createSelector(
  [(s: RootState) => s.auth.usuario?.ambito, (s: RootState) => s.auditoria.registro],
  (ambito, registro) => ambito === 'plataforma'
    ? registro.filter(e => !esSincronizacionTecnica(e.accion))
    : AUDITORIA_VACIA,
)
