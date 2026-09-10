import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type Aviso = { tipo: 'error' | 'info'; codigo?: number; texto: string } | null
type State = { tema: 'light' | 'dark'; aviso: Aviso }
const initialState: State = { tema: 'light', aviso: null }

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTema(s, a: PayloadAction<'light' | 'dark'>) { s.tema = a.payload },
    mostrarAviso(s, a: PayloadAction<Aviso>) { s.aviso = a.payload },
    limpiarAviso(s) { s.aviso = null },
  },
})
export const { setTema, mostrarAviso, limpiarAviso } = slice.actions
export default slice.reducer
