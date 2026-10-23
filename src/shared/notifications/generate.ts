import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import type { Notification } from './types'

/**
 * Traduce una acción del store en avisos para quien tenga que enterarse.
 *
 * Vive al lado de `shared/auditoria/describir.ts` y se llama desde el mismo
 * envoltorio del store (`shared/store/index.ts`), por la misma razón: ve el
 * estado antes y después de cada acción, así que ninguna acción relevante se
 * escapa de generar su aviso porque una pantalla se olvidó de dispararlo a
 * mano.
 *
 * Genérico a propósito: el mecanismo de entrega (slice, campana, scoping por
 * empresa y por destinatario) no sabe nada de clientes ni de estados. Agregar
 * un aviso nuevo el día de mañana es sumar un `case` acá, no tocar la campana.
 */

type Status = any

function noticesFrom(tipo: string, p: any, before: Status, after: Status): Omit<Notification, 'id' | 'fecha' | 'leida'>[] {
  switch (tipo) {
    case 'clients/cambiarEstadoRegistro': {
      // Solo interesa la llegada a REVISADO: es el punto donde Axiom
      // Prevención termina su trabajo y la pelota pasa al administrador de
      // la empresa, que es quien tiene que enterarse.
      if (p.status !== 'REVISADO') return []
      const client = after.clients.list.find((c: any) => c.code === p.code)
      if (!client) return []
      return [{
        destinatario: { tipo: 'permiso', permission: PERMISSIONS.recordsApprove as PermissionCode },
        companyId: client.companyId,
        title: 'Cliente listo para decisión',
        detalle: `${client.legalName} — código ${client.code} — Axiom Prevención terminó su revisión.`,
        entity: { tipo: 'cliente', id: client.code, name: client.legalName },
        severity: 'sensible',
      }]
    }
  }
  return []
}

let secuencia = 0

export function generateNotifications(action: any, before: Status, after: Status): Notification[] {
  const tipo: string = action?.type ?? ''
  if (!tipo) return []

  return noticesFrom(tipo, action.payload, before, after).map(a => {
    secuencia += 1
    return {
      id: `n${Date.now()}-${secuencia}`,
      fecha: new Date().toISOString(),
      leida: false,
      ...a,
    }
  })
}
