import { useAppSelector } from '@/shared/store/hooks'
export const useAuth = () => useAppSelector((s) => s.auth)
