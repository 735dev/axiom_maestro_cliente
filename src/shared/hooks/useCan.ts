import { useAppSelector } from '@/shared/store/hooks'
import type { PermissionCode } from '@/shared/auth/permissions'

export function useCan(): (p: PermissionCode) => boolean {
  const permisos = useAppSelector((s) => s.auth.usuario?.permisos ?? [])
  return (p) => permisos.includes(p)
}
