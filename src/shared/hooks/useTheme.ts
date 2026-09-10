import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { setTema } from '@/shared/store/slices/uiSlice'

export function useTheme() {
  const tema = useAppSelector((s) => s.ui.tema)
  const dispatch = useAppDispatch()
  useEffect(() => { document.documentElement.dataset.theme = tema }, [tema])
  return { tema, alternar: () => dispatch(setTema(tema === 'light' ? 'dark' : 'light')) }
}
