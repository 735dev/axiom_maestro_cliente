import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { setTheme } from '@/shared/store/slices/uiSlice'

export function useTheme() {
  const theme = useAppSelector((s) => s.ui.theme)
  const dispatch = useAppDispatch()
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  return { theme, alternar: () => dispatch(setTheme(theme === 'light' ? 'dark' : 'light')) }
}
