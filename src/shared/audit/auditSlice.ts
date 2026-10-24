import { createSlice } from '@reduxjs/toolkit'
import type { Entry } from './types'

/**
 * El registro de auditoría.
 *
 * No tiene reducers. A propósito: las entradas las agrega el envoltorio del
 * reducer raíz, que ve el estado antes y después de cada acción. Si esto
 * expusiera un `agregar`, cualquiera podría escribir una entrada falsa; y si
 * expusiera un `borrar`, el registro dejaría de valer como prueba.
 *
 * La semilla es histórica: entradas de antes de que el sistema arrancara.
 */
type State = { registro: Entry[] }

export const INITIAL_AUDIT: Entry[] = [
  {
    id: 'h0', fecha: '2026-10-24T09:00:00Z', actor: { id: 'sa1', name: 'Jerson Arias', rol: 'Super Admin', scope: 'plataforma' },
    companyId: 'fondo-ganadero', sistema: 'Plataforma', action: 'Nueva versión del formulario',
    entity: { tipo: 'formulario', id: 'fondo-ganadero', name: 'Fondo Ganadero, C.A.' },
    detalle: 'Fondo Ganadero: v1 ficha de inversionista', after: 'v1',
    reason: 'Ficha para regular a los inversionistas del ganado.',
    resultado: 'ok', severity: 'sensible',
  },
]

const slice = createSlice({
  name: 'audit',
  initialState: { registro: INITIAL_AUDIT } as State,
  reducers: {},
})

export default slice.reducer
