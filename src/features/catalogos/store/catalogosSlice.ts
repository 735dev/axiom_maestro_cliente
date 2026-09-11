import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { CATALOGOS_PLATAFORMA } from '@/features/plataforma/formulario/tipos'
import { crearEmpresa } from '@/features/plataforma/store/empresasSlice'
import type { RootState } from '@/shared/store'

/**
 * Valores de los catálogos, **por empresa**.
 *
 * Qué catálogos existen lo declara Axiom en `CATALOGOS_PLATAFORMA`, porque van
 * atados a columnas compartidas: si cada empresa inventara los suyos, ningún
 * informe podría cruzar dos empresas. Los **valores** de cada uno los
 * administra la empresa, que es quien sabe en qué ramos opera.
 */
type State = { porEmpresa: Record<string, Record<string, string[]>> }

/** Con qué valores nace una empresa. Desde ahí los cambia ella. */
const iniciales = () =>
  Object.fromEntries(CATALOGOS_PLATAFORMA.map(c => [c.id, [...c.inicial]]))

// Mientras se sincroniza el catálogo específico de una empresa real, el
// formulario puede trabajar con los valores iniciales de plataforma. Es una
// referencia estable y evita que una empresa cuyo UUID no exista aún en el
// store local quede con selects vacíos.
const CATALOGOS_INICIALES = iniciales()

const initialState: State = {
  porEmpresa: {
    transvalor: iniciales(),
    'demo-seguros': iniciales(),
    'demo-casa': iniciales(),
  },
}

const slice = createSlice({
  name: 'catalogos',
  initialState,
  reducers: {
    agregarValor(s, a: PayloadAction<{ empresaId: string; catalogo: string; valor: string }>) {
      const v = a.payload.valor.trim()
      const lista = s.porEmpresa[a.payload.empresaId]?.[a.payload.catalogo]
      if (!v || !lista || lista.includes(v)) return
      lista.push(v)
      lista.sort((x, y) => x.localeCompare(y, 'es'))
    },
    /**
     * Quitar un valor no toca los expedientes que ya lo tienen: deja de
     * ofrecerse en el formulario y nada más. Reescribir datos guardados
     * porque cambió una lista es perder historia.
     */
    quitarValor(s, a: PayloadAction<{ empresaId: string; catalogo: string; valor: string }>) {
      const emp = s.porEmpresa[a.payload.empresaId]
      if (!emp?.[a.payload.catalogo]) return
      emp[a.payload.catalogo] = emp[a.payload.catalogo].filter(v => v !== a.payload.valor)
    },
  },

  /** Una empresa nueva arranca con los valores por defecto de la plataforma. */
  extraReducers: builder => {
    builder.addCase(crearEmpresa, (s, a) => {
      s.porEmpresa[a.payload.id] = iniciales()
    })
  },
})

export const { agregarValor, quitarValor } = slice.actions
export default slice.reducer

/**
 * Los catálogos de la empresa de la sesión. Sin sesión, ninguno.
 *
 * Encadenado con `?.` a propósito: un estado guardado con la forma vieja no
 * puede tumbar la aplicación entera. La migración es la que arregla el dato;
 * esto solo evita que el síntoma sea una pantalla en blanco.
 */
export const selectCatalogosDeMiEmpresa = (s: RootState): Record<string, string[]> => {
  const empresaId = s.auth.usuario?.empresaId
  return empresaId ? s.catalogos?.porEmpresa?.[empresaId] ?? CATALOGOS_INICIALES : CATALOGOS_INICIALES
}

/**
 * Los de una empresa cualquiera, por id.
 *
 * Lo usa el portal público, que no tiene sesión: ahí la empresa la resuelve el
 * dominio por el que entró el cliente, no un usuario autenticado. Y la consola
 * de plataforma, que mira empresas ajenas.
 */
export const selectCatalogosDe = (empresaId: string | undefined) => (s: RootState): Record<string, string[]> =>
  empresaId ? s.catalogos?.porEmpresa?.[empresaId] ?? CATALOGOS_INICIALES : CATALOGOS_INICIALES
