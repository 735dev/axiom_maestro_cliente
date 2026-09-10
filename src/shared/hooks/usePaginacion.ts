import { useState, useEffect, useMemo } from 'react'

/**
 * Paginación en cliente. Devuelve la página visible y el estado del paginador.
 *
 * Vuelve sola a la página 1 cuando cambia el total: si el usuario está en la
 * página 7 y filtra hasta dejar 3 resultados, quedaría mirando una página vacía.
 */
export function usePaginacion<T>(items: T[], porPaginaInicial = 10) {
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(porPaginaInicial)

  const paginas = Math.max(1, Math.ceil(items.length / porPagina))

  useEffect(() => { setPagina(1) }, [items.length, porPagina])

  const visibles = useMemo(
    () => items.slice((pagina - 1) * porPagina, pagina * porPagina),
    [items, pagina, porPagina])

  const desde = items.length ? (pagina - 1) * porPagina + 1 : 0
  const hasta = Math.min(pagina * porPagina, items.length)

  return {
    visibles,
    paginador: {
      pagina, paginas, porPagina, desde, hasta, total: items.length,
      irA: (p: number) => setPagina(Math.min(paginas, Math.max(1, p))),
      cambiarPorPagina: setPorPagina,
    },
  }
}

export type EstadoPaginador = ReturnType<typeof usePaginacion>['paginador']
