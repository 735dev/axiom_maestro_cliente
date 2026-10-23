import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * `ambito` es una dimensión aparte de los permisos, a propósito.
 *
 * Si "plataforma" fuera un permiso del catálogo, el administrador de una
 * empresa entraría a Roles y permisos y se lo concedería a sí mismo. Al vivir
 * fuera del catálogo, ninguna pantalla de empresa puede otorgarlo: solo lo
 * emite el servidor al autenticar contra el padrón de la plataforma.
 *
 * `empresaId` es null para el ámbito plataforma: no pertenece a ninguna.
 */
export type Scope = 'plataforma' | 'empresa'

export type User = {
  id: string; name: string; rol: string; permissions: string[]
  email?: string
  scope: Scope
  companyId: string | null
}
type State = { token: string | null; user: User | null }
const initialState: State = { token: null, user: null }

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(s, a: PayloadAction<{ token: string; user: User }>) {
      s.token = a.payload.token; s.user = a.payload.user
    },
    logout(s) { s.token = null; s.user = null },
  },
})
export const { login, logout } = slice.actions
export default slice.reducer
