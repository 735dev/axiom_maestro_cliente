import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Notification } from './types'

/**
 * Las notificaciones del panel.
 *
 * Mismo criterio que la auditoría (`shared/auditoria/auditoriaSlice.ts`): no
 * hay un `agregar` expuesto acá. Las crea el envoltorio del store raíz
 * (`shared/store/index.ts` + `generar.ts`), que es el único lugar que ve
 * todas las acciones y puede decidir sin que cada pantalla tenga que
 * acordarse de disparar su propio aviso. Si el slice permitiera crear una
 * directamente, cualquier componente podría mandarse una notificación falsa.
 */
type State = { list: Notification[] }

const slice = createSlice({
  name: 'notifications',
  initialState: { list: [] } as State,
  reducers: {
    /** Se marcan por lote —lo que el usuario tiene visible al abrir la campana—, no todas de una. */
    marcarLeidas(s, a: PayloadAction<string[]>) {
      const ids = new Set(a.payload)
      s.list.forEach(n => { if (ids.has(n.id)) n.leida = true })
    },
  },
})

export const { marcarLeidas } = slice.actions
export default slice.reducer
