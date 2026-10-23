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

const ACTOR = (name: string, rol: string, id: string) =>
  ({ id, name, rol, scope: 'empresa' as const })

export const INITIAL_AUDIT: Entry[] = [
  {
    id: 'h6', fecha: '2026-08-31T16:35:00Z', actor: ACTOR('Evelina Rodríguez', 'Oficial de Cumplimiento', 'u2'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Cambio de estado del expediente',
    entity: { tipo: 'cliente', id: '005', name: 'Chocolates El Rey C.A.' },
    detalle: 'Cliente 005: REVISADO → RECHAZADO', before: 'REVISADO', after: 'RECHAZADO',
    reason: 'Coincidencia vigente en lista ONU sobre un beneficiario final.',
    resultado: 'ok', severity: 'sensible',
  },
  {
    id: 'h5', fecha: '2026-08-30T11:25:00Z', actor: ACTOR('Yeniré Castillo', 'Comercialización', 'u5'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Edición de la ficha',
    entity: { tipo: 'cliente', id: '003', name: 'Central Madeirense C.A.' },
    detalle: 'Cliente 003: correo, telefono',
    before: 'correo: contacto@madeirense.com · telefono: 0212-5550000',
    after: 'correo: legal@madeirense.com · telefono: 0212-5550199',
    resultado: 'ok', severity: 'normal',
  },
  {
    id: 'h4', fecha: '2026-08-29T08:00:00Z', actor: ACTOR('Rosa Marcano', 'Administrador', 'u6'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Excepción de permiso sobre un usuario',
    entity: { tipo: 'usuario', id: 'u3', name: 'Marcos Ledezma' },
    detalle: 'Marcos Ledezma: reportes.ver → conceder', after: 'conceder',
    resultado: 'ok', severity: 'sensible',
  },
  {
    id: 'h3', fecha: '2026-08-26T14:35:00Z', actor: ACTOR('Oriana Méndez', 'Comercialización', 'u1'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Alta de persona vinculada',
    entity: { tipo: 'cliente', id: '004' },
    detalle: 'Celestino Turmero Blanco en el cliente 004',
    resultado: 'ok', severity: 'sensible',
  },
  {
    id: 'h2', fecha: '2026-08-26T14:32:00Z', actor: ACTOR('Oriana Méndez', 'Comercialización', 'u1'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Alta de cliente',
    entity: { tipo: 'cliente', id: '004', name: 'Inversiones Fórum 2010 C.A.' },
    detalle: 'Inversiones Fórum 2010 C.A. — código 004 asignado',
    resultado: 'ok', severity: 'normal',
  },
  {
    id: 'h1', fecha: '2026-08-14T09:15:00Z', actor: ACTOR('Evelina Rodríguez', 'Oficial de Cumplimiento', 'u2'),
    companyId: 'transvalor', sistema: 'Maestro', action: 'Cambio de estado del expediente',
    entity: { tipo: 'cliente', id: '001', name: 'Banco Venezolano de Crédito, S.A.' },
    detalle: 'Cliente 001: REVISADO → APROBADO', before: 'REVISADO', after: 'APROBADO',
    reason: 'Sin coincidencias activas. Riesgo moderado por sector.',
    resultado: 'ok', severity: 'sensible',
  },
  {
    id: 'h0', fecha: '2026-09-01T09:00:00Z', actor: { id: 'sa1', name: 'Jerson Arias', rol: 'Super Admin', scope: 'plataforma' },
    companyId: 'transvalor', sistema: 'Plataforma', action: 'Nueva versión del formulario',
    entity: { tipo: 'formulario', id: 'transvalor', name: 'Transvalor' },
    detalle: 'Transvalor: v2 con 5 secciones y 25 campos', before: 'v1', after: 'v2',
    reason: 'Instrucción de la Unidad de Prevención: se exige el documento constitutivo y se deja de pedir el capital.',
    resultado: 'ok', severity: 'sensible',
  },
]

const slice = createSlice({
  name: 'audit',
  initialState: { registro: INITIAL_AUDIT } as State,
  reducers: {},
})

export default slice.reducer
