import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { limpiarAviso } from '@/shared/store/slices/uiSlice'

/** Aviso interno del sistema; nunca usa diálogos nativos del navegador. */
export const AvisoGlobal = () => {
  const aviso = useAppSelector(s => s.ui.aviso)
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(() => dispatch(limpiarAviso()), 5000)
    return () => window.clearTimeout(id)
  }, [aviso, dispatch])
  if (!aviso) return null
  return <div className={`aviso-global ${aviso.tipo}`} role="status">
    <span>{aviso.texto}</span>
    <button onClick={() => dispatch(limpiarAviso())} aria-label="Cerrar aviso">×</button>
  </div>
}
