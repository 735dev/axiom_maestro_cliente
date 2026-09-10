import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import type { Notificacion } from './tipos'

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

type Estado = any

function avisosDe(tipo: string, p: any, _antes: Estado, despues: Estado): Omit<Notificacion, 'id' | 'fecha' | 'leida'>[] {
  switch (tipo) {
    case 'clientes/cambiarEstadoRegistro': {
      // Solo interesa la llegada a REVISADO: es el punto donde Axiom
      // Prevención termina su trabajo y la pelota pasa al administrador de
      // la empresa, que es quien tiene que enterarse.
      if (p.estado !== 'REVISADO') return []
      const cliente = despues.clientes.lista.find((c: any) => c.codigo === p.codigo)
      if (!cliente) return []
      return [{
        destinatario: { tipo: 'permiso', permiso: PERMISSIONS.registrosAprobar as PermissionCode },
        empresaId: cliente.empresaId,
        titulo: 'Cliente listo para decisión',
        detalle: `${cliente.razonSocial} — código ${cliente.codigo} — Axiom Prevención terminó su revisión.`,
        entidad: { tipo: 'cliente', id: cliente.codigo, nombre: cliente.razonSocial },
        gravedad: 'sensible',
      }]
    }
  }
  return []
}

let secuencia = 0

export function generarNotificaciones(action: any, antes: Estado, despues: Estado): Notificacion[] {
  const tipo: string = action?.type ?? ''
  if (!tipo) return []

  return avisosDe(tipo, action.payload, antes, despues).map(a => {
    secuencia += 1
    return {
      id: `n${Date.now()}-${secuencia}`,
      fecha: new Date().toISOString(),
      leida: false,
      ...a,
    }
  })
}
