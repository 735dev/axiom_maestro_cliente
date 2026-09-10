import { useAppSelector } from '@/shared/store/hooks'
import { locales } from '@/shared/i18n/locales'

export function useT() {
  const lang = useAppSelector((s) => s.lang.actual)
  return (key: string): string => {
    const dict = locales[lang] as Record<string, string>
    return dict[key] ?? key
  }
}
