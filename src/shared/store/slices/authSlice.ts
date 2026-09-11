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
export type Ambito = 'plataforma' | 'empresa'

export type Usuario = {
  id: string; nombre: string; rol: string; permisos: string[]
  email?: string
  ambito: Ambito
  empresaId: string | null
}
type State = { token: string | null; usuario: Usuario | null }
const initialState: State = { token: null, usuario: null }

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(s, a: PayloadAction<{ token: string; usuario: Usuario }>) {
      s.token = a.payload.token; s.usuario = a.payload.usuario
    },
    logout(s) { s.token = null; s.usuario = null },
  },
})
export const { login, logout } = slice.actions
export default slice.reducer
