import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { clearNotice } from '@/shared/store/slices/uiSlice'

/** Aviso interno del sistema; nunca usa diálogos nativos del navegador. */
export const GlobalNotice = () => {
  const notice = useAppSelector(s => s.ui.notice)
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => dispatch(clearNotice()), 5000)
    return () => window.clearTimeout(id)
  }, [notice, dispatch])
  if (!notice) return null
  return <div className={`aviso-global ${notice.tipo}`} role="status">
    <span>{notice.text}</span>
    <button onClick={() => dispatch(clearNotice())} aria-label="Cerrar aviso">×</button>
  </div>
}
