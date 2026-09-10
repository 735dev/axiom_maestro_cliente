/**
 * Cuántas columnas conviene para una sección de formulario, según cuántos de
 * sus campos comparten fila ("medio") contra cuántos ocupan la fila entera
 * ("completo").
 *
 * Vive en `shared` y no en la feature de plataforma porque lo usa tanto el
 * formulario configurable de una empresa (campos con `ancho`) como el
 * asistente de alta de cliente, que no tiene esa noción y arma su propio
 * arreglo de anchos a mano.
 *
 * No depende del ancho de la pantalla —eso lo resuelven las media queries de
 * `.form-grid`— sino de cuánto contenido hay que acomodar: una sección con
 * muchos campos cortos aprovecha 3 o 4 columnas, una con pocos campos largos
 * se ve mejor en 1 o 2.
 */
export type AnchoItem = 'medio' | 'completo'

export const columnasSeccion = (anchos: AnchoItem[]): 1 | 2 | 3 | 4 => {
  const medios = anchos.filter(a => a === 'medio').length
  if (medios >= 8) return 4
  if (medios >= 5) return 3
  if (medios >= 2) return 2
  return 1
}
