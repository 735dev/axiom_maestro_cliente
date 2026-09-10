import { createSlice } from '@reduxjs/toolkit'
import type { Entrada } from './tipos'

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
type State = { registro: Entrada[] }

const ACTOR = (nombre: string, rol: string, id: string) =>
  ({ id, nombre, rol, ambito: 'empresa' as const })

export const AUDITORIA_INICIAL: Entrada[] = [
  {
    id: 'h6', fecha: '2026-08-31T16:35:00Z', actor: ACTOR('Evelina Rodríguez', 'Oficial de Cumplimiento', 'u2'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Cambio de estado del expediente',
    entidad: { tipo: 'cliente', id: '005', nombre: 'Chocolates El Rey C.A.' },
    detalle: 'Cliente 005: REVISADO → RECHAZADO', antes: 'REVISADO', despues: 'RECHAZADO',
    motivo: 'Coincidencia vigente en lista ONU sobre un beneficiario final.',
    resultado: 'ok', gravedad: 'sensible',
  },
  {
    id: 'h5', fecha: '2026-08-30T11:25:00Z', actor: ACTOR('Yeniré Castillo', 'Comercialización', 'u5'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Edición de la ficha',
    entidad: { tipo: 'cliente', id: '003', nombre: 'Central Madeirense C.A.' },
    detalle: 'Cliente 003: correo, telefono',
    antes: 'correo: contacto@madeirense.com · telefono: 0212-5550000',
    despues: 'correo: legal@madeirense.com · telefono: 0212-5550199',
    resultado: 'ok', gravedad: 'normal',
  },
  {
    id: 'h4', fecha: '2026-08-29T08:00:00Z', actor: ACTOR('Rosa Marcano', 'Administrador', 'u6'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Excepción de permiso sobre un usuario',
    entidad: { tipo: 'usuario', id: 'u3', nombre: 'Marcos Ledezma' },
    detalle: 'Marcos Ledezma: reportes.ver → conceder', despues: 'conceder',
    resultado: 'ok', gravedad: 'sensible',
  },
  {
    id: 'h3', fecha: '2026-08-26T14:35:00Z', actor: ACTOR('Oriana Méndez', 'Comercialización', 'u1'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Alta de persona vinculada',
    entidad: { tipo: 'cliente', id: '004' },
    detalle: 'Celestino Turmero Blanco en el cliente 004',
    resultado: 'ok', gravedad: 'sensible',
  },
  {
    id: 'h2', fecha: '2026-08-26T14:32:00Z', actor: ACTOR('Oriana Méndez', 'Comercialización', 'u1'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Alta de cliente',
    entidad: { tipo: 'cliente', id: '004', nombre: 'Inversiones Fórum 2010 C.A.' },
    detalle: 'Inversiones Fórum 2010 C.A. — código 004 asignado',
    resultado: 'ok', gravedad: 'normal',
  },
  {
    id: 'h1', fecha: '2026-08-14T09:15:00Z', actor: ACTOR('Evelina Rodríguez', 'Oficial de Cumplimiento', 'u2'),
    empresaId: 'transvalor', sistema: 'Maestro', accion: 'Cambio de estado del expediente',
    entidad: { tipo: 'cliente', id: '001', nombre: 'Banco Venezolano de Crédito, S.A.' },
    detalle: 'Cliente 001: REVISADO → APROBADO', antes: 'REVISADO', despues: 'APROBADO',
    motivo: 'Sin coincidencias activas. Riesgo moderado por sector.',
    resultado: 'ok', gravedad: 'sensible',
  },
  {
    id: 'h0', fecha: '2026-09-01T09:00:00Z', actor: { id: 'sa1', nombre: 'Jerson Arias', rol: 'Super Admin', ambito: 'plataforma' },
    empresaId: 'transvalor', sistema: 'Plataforma', accion: 'Nueva versión del formulario',
    entidad: { tipo: 'formulario', id: 'transvalor', nombre: 'Transvalor' },
    detalle: 'Transvalor: v2 con 5 secciones y 25 campos', antes: 'v1', despues: 'v2',
    motivo: 'Instrucción de la Unidad de Prevención: se exige el documento constitutivo y se deja de pedir el capital.',
    resultado: 'ok', gravedad: 'sensible',
  },
]

const slice = createSlice({
  name: 'auditoria',
  initialState: { registro: AUDITORIA_INICIAL } as State,
  reducers: {},
})

export default slice.reducer
