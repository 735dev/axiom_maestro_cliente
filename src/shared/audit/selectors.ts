import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'

const esSincronizacionTecnica = (action: string) =>
  action === 'Acción sin describir (clients/replaceClientsFromApi)' ||
  action === 'Acción sin describir (clients/replaceClientPeople)'

/**
 * La auditoría de la empresa de la sesión.
 *
 * Mismo criterio que el resto: el filtro vive acá, no en la pantalla, y sin
 * sesión no devuelve nada. Una bitácora que se filtra en el componente es una
 * bitácora que alguien puede ver entera abriendo las herramientas del
 * navegador.
 */
const EMPTY_AUDIT: RootState['audit']['registro'] = []
export const selectAuditOfMyCompany = createSelector(
  [(s: RootState) => s.auth.user?.companyId, (s: RootState) => s.audit.registro],
  (companyId, registro) => companyId
    ? registro.filter(e => e.companyId === companyId && !esSincronizacionTecnica(e.action))
    : EMPTY_AUDIT,
)

/** Todo el registro. Solo para el ámbito plataforma. */
export const selectPlatformAudit = createSelector(
  [(s: RootState) => s.auth.user?.scope, (s: RootState) => s.audit.registro],
  (scope, registro) => scope === 'plataforma'
    ? registro.filter(e => !esSincronizacionTecnica(e.action))
    : EMPTY_AUDIT,
)
