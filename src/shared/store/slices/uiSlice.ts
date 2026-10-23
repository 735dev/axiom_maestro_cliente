import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type Notice = { tipo: 'error' | 'info'; code?: number; text: string } | null
type State = { theme: 'light' | 'dark'; notice: Notice }
const initialState: State = { theme: 'light', notice: null }

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(s, a: PayloadAction<'light' | 'dark'>) { s.theme = a.payload },
    showNotice(s, a: PayloadAction<Notice>) { s.notice = a.payload },
    clearNotice(s) { s.notice = null },
  },
})
export const { setTheme, showNotice, clearNotice } = slice.actions
export default slice.reducer
