import { useAppSelector } from '@/shared/store/hooks'
import { isPlatformPermission, type PermissionCode } from '@/shared/auth/permissions'

export function useCan(): (p: PermissionCode) => boolean {
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const scope = useAppSelector((s) => s.auth.user?.scope)
  return (p) => {
    if (isPlatformPermission(p)) return scope === 'plataforma'
    return permissions.includes(p)
  }
}
