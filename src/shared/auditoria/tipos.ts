/**
 * Registro de auditoría. Uno solo para todo el sistema.
 *
 * Tres reglas que no se negocian, y de las que depende que el registro sirva
 * de prueba:
 *
 * 1. **Es append-only.** No hay reducer que edite ni borre una entrada. Un
 *    registro que se puede corregir no prueba nada: lo primero que hace quien
 *    quiere tapar algo es corregir el registro.
 *
 * 2. **El actor queda congelado.** Se guarda el nombre y el rol tal como eran
 *    en ese momento, no una referencia al usuario. Que la persona ascienda,
 *    cambie de rol o salga de la empresa no altera lo que el registro dice de
 *    lo que hizo aquel día.
 *
 * 3. **También se registra lo que no se pudo hacer.** Un intento denegado es
 *    justamente lo que un auditor busca, y es lo que un registro que solo
 *    guarda éxitos nunca va a mostrar.
 */

export type Ambito = 'plataforma' | 'empresa'
export type Sistema = 'Plataforma' | 'Maestro'
export type Resultado = 'ok' | 'denegado'

/** Cuán delicada es la acción. Ordena la revisión, no cambia el registro. */
export type Gravedad = 'normal' | 'sensible'

export type Entrada = {
  id: string
  /** ISO. Del servidor en producción; nunca del reloj del navegador. */
  fecha: string
  actor: {
    id: string
    /** Congelados al momento del hecho. */
    nombre: string
    rol: string
    ambito: Ambito
  }
  /** A qué empresa pertenece el hecho. `null` = acción de plataforma. */
  empresaId: string | null
  sistema: Sistema
  accion: string
  entidad?: { tipo: string; id: string; nombre?: string }
  detalle: string
  /** Obligatorio en las acciones que lo exigen; el reducer no lo suple. */
  motivo?: string
  /** Valor anterior y nuevo, cuando la acción cambia algo que ya existía. */
  antes?: string
  despues?: string
  resultado: Resultado
  gravedad: Gravedad
}
