import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { PLATFORM_CATALOGS } from '@/features/platform/form/types'
import { createCompany } from '@/features/platform/store/companiesSlice'
import type { RootState } from '@/shared/store'

/**
 * Valores de los catálogos, **por empresa**.
 *
 * Qué catálogos existen lo declara Axiom en `CATALOGOS_PLATAFORMA`, porque van
 * atados a columnas compartidas: si cada empresa inventara los suyos, ningún
 * informe podría cruzar dos empresas. Los **valores** de cada uno los
 * administra la empresa, que es quien sabe en qué ramos opera.
 */
type State = { byCompany: Record<string, Record<string, string[]>> }

/** Con qué valores nace una empresa. Desde ahí los cambia ella. */
const initials = () =>
  Object.fromEntries(PLATFORM_CATALOGS.map(c => [c.id, [...c.initial]]))

// Mientras se sincroniza el catálogo específico de una empresa real, el
// formulario puede trabajar con los valores iniciales de plataforma. Es una
// referencia estable y evita que una empresa cuyo UUID no exista aún en el
// store local quede con selects vacíos.
const INITIAL_CATALOGS = initials()

const initialState: State = {
  byCompany: {
    transvalor: initials(),
    'demo-seguros': initials(),
    'demo-casa': initials(),
  },
}

const slice = createSlice({
  name: 'catalogs',
  initialState,
  reducers: {
    addValue(s, a: PayloadAction<{ companyId: string; catalog: string; value: string }>) {
      const v = a.payload.value.trim()
      const list = s.byCompany[a.payload.companyId]?.[a.payload.catalog]
      if (!v || !list || list.includes(v)) return
      list.push(v)
      list.sort((x, y) => x.localeCompare(y, 'es'))
    },
    /**
     * Quitar un valor no toca los expedientes que ya lo tienen: deja de
     * ofrecerse en el formulario y nada más. Reescribir datos guardados
     * porque cambió una lista es perder historia.
     */
    removeValue(s, a: PayloadAction<{ companyId: string; catalog: string; value: string }>) {
      const emp = s.byCompany[a.payload.companyId]
      if (!emp?.[a.payload.catalog]) return
      emp[a.payload.catalog] = emp[a.payload.catalog].filter(v => v !== a.payload.value)
    },
  },

  /** Una empresa nueva arranca con los valores por defecto de la plataforma. */
  extraReducers: builder => {
    builder.addCase(createCompany, (s, a) => {
      s.byCompany[a.payload.id] = initials()
    })
  },
})

export const { addValue, removeValue } = slice.actions
export default slice.reducer

/**
 * Los catálogos de la empresa de la sesión. Sin sesión, ninguno.
 *
 * Encadenado con `?.` a propósito: un estado guardado con la forma vieja no
 * puede tumbar la aplicación entera. La migración es la que arregla el dato;
 * esto solo evita que el síntoma sea una pantalla en blanco.
 */
export const selectCatalogsOfMyCompany = (s: RootState): Record<string, string[]> => {
  const companyId = s.auth.user?.companyId
  return companyId ? s.catalogs?.byCompany?.[companyId] ?? INITIAL_CATALOGS : INITIAL_CATALOGS
}

/**
 * Los de una empresa cualquiera, por id.
 *
 * Lo usa el portal público, que no tiene sesión: ahí la empresa la resuelve el
 * dominio por el que entró el cliente, no un usuario autenticado. Y la consola
 * de plataforma, que mira empresas ajenas.
 */
export const selectCatalogsOf = (companyId: string | undefined) => (s: RootState): Record<string, string[]> =>
  companyId ? s.catalogs?.byCompany?.[companyId] ?? INITIAL_CATALOGS : INITIAL_CATALOGS
