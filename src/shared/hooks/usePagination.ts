import { useState, useEffect, useMemo } from 'react'

/**
 * Paginación en cliente. Devuelve la página visible y el estado del paginador.
 *
 * Vuelve sola a la página 1 cuando cambia el total: si el usuario está en la
 * página 7 y filtra hasta dejar 3 resultados, quedaría mirando una página vacía.
 */
export function usePagination<T>(items: T[], initialPerPage = 10) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)

  const pages = Math.max(1, Math.ceil(items.length / perPage))

  useEffect(() => { setPage(1) }, [items.length, perPage])

  const visibleItems = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage])

  const start = items.length ? (page - 1) * perPage + 1 : 0
  const to = Math.min(page * perPage, items.length)

  return {
    visibleItems,
    paginator: {
      page, pages, perPage, start, to, total: items.length,
      goTo: (p: number) => setPage(Math.min(pages, Math.max(1, p))),
      setPerPage: setPerPage,
    },
  }
}

export type PaginatorState = ReturnType<typeof usePagination>['paginator']
