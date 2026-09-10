import React from 'react'
import { Pill } from '@/shared/ui'
import type { Estado } from '../types/cliente.types'

/**
 * El riesgo vive en Prevención; acá solo se pinta el punto del flujo en el
 * que está el expediente. `REVISADO` es intencionalmente del mismo color que
 * `EN REVISIÓN` — visualmente sigue "en curso"— y se distingue por el texto:
 * es la marca de que ya se puede decidir, no una decisión en sí misma.
 */
export const EstadoPill: React.FC<{ e: Estado }> = ({ e }) => {
  const k = e === 'APROBADO' ? 'ok'
    : e === 'RECHAZADO' || e === 'INHABILITADO' ? 'bad'
    : e === 'EN REVISIÓN' || e === 'REVISADO' ? 'warn'
    : 'mut'
  return <Pill k={k}>{e[0] + e.slice(1).toLowerCase()}</Pill>
}
