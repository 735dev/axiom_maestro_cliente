import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
type State = { actual: 'es' | 'en' }
const slice = createSlice({
  name: 'lang',
  initialState: { actual: 'es' } as State,
  reducers: { setLang(s, a: PayloadAction<'es' | 'en'>) { s.actual = a.payload } },
})
export const { setLang } = slice.actions
export default slice.reducer
