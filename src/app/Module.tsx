import { useState, type ReactNode } from 'react'

/**
 * El módulo queda montado. Cambiar de uno a otro no lo reconstruye,
 * así que no vuelve a salir la semilla mientras responde el servidor.
 *
 * `alAbrir` es para ficha, alta y perfil: no tienen que existir hasta
 * que el usuario entra. El resto arranca con el panel, escondido, y
 * al hacer clic ya está pintado.
 */
export function Module({ active, lazy = false, children }: { active: boolean; lazy?: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(!lazy || active)
  if (active && !mounted) setMounted(true)
  if (!mounted) return null
  return <div hidden={!active}>{children}</div>
}
