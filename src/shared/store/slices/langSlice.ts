import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
type State = { current: 'es' | 'en' }
const slice = createSlice({
  name: 'lang',
  initialState: { current: 'es' } as State,
  reducers: { setLang(s, a: PayloadAction<'es' | 'en'>) { s.current = a.payload } },
})
export const { setLang } = slice.actions
export default slice.reducer
