import { estandarDe, type Campo, type Seccion } from './tipos'

/**
 * Qué cambió entre dos versiones del formulario.
 *
 * Existe porque un motivo escrito a mano no alcanza: dice *por qué* se cambió,
 * pero no *qué*. Cuando el auditor pregunte por el expediente de marzo, la
 * respuesta tiene que ser una lista de diferencias, no la memoria de quien
 * publicó.
 *
 * Es una función pura sobre dos versiones: no mira el estado ni la pantalla, y
 * por eso sirve igual para el diálogo de publicación y para el historial.
 */
export type Clase = 'agregado' | 'quitado' | 'editado'

export type Cambio = {
  clase: Clase
  ambito: 'Sección' | 'Campo'
  texto: string
  detalle?: string
}

const nombreSeccion = (secciones: Seccion[], id: string) =>
  secciones.find(s => s.id === id)?.nombre ?? '—'

/** Qué hace distinto a un campo del mismo id entre dos versiones. */
const difCampo = (a: Campo, b: Campo): string[] => {
  const d: string[] = []
  if (a.etiqueta !== b.etiqueta) d.push(`se llamaba “${a.etiqueta}”`)
  if (a.tipo !== b.tipo) d.push(`era de tipo ${a.tipo}`)
  if (a.obligatorio !== b.obligatorio) d.push(b.obligatorio ? 'pasó a ser obligatorio' : 'dejó de ser obligatorio')
  if (a.seccion !== b.seccion) d.push('cambió de sección')
  if (JSON.stringify(a.opciones ?? []) !== JSON.stringify(b.opciones ?? [])) {
    const antes = a.opciones?.length ?? 0
    const ahora = b.opciones?.length ?? 0
    d.push(antes === ahora ? 'cambiaron las opciones' : `las opciones pasaron de ${antes} a ${ahora}`)
  }
  if (a.ayuda !== b.ayuda) d.push('cambió el texto de ayuda')
  if (JSON.stringify(a.condicion ?? null) !== JSON.stringify(b.condicion ?? null)) {
    d.push(
      !a.condicion?.condiciones.length && b.condicion?.condiciones.length ? 'pasó a mostrarse solo bajo condición'
        : a.condicion?.condiciones.length && !b.condicion?.condiciones.length ? 'dejó de estar condicionado'
        : 'cambió la condición que lo muestra',
    )
  }
  if ((a.ancho ?? 'auto') !== (b.ancho ?? 'auto')) d.push(`cambió el ancho a ${b.ancho ?? 'auto'}`)
  return d
}

export function comparar(
  antes: { secciones: Seccion[]; campos: Campo[] },
  ahora: { secciones: Seccion[]; campos: Campo[] },
): Cambio[] {
  const cambios: Cambio[] = []

  // ---- secciones ----
  ahora.secciones.filter(s => !antes.secciones.some(x => x.id === s.id))
    .forEach(s => cambios.push({ clase: 'agregado', ambito: 'Sección', texto: s.nombre }))

  antes.secciones.filter(s => !ahora.secciones.some(x => x.id === s.id))
    .forEach(s => cambios.push({
      clase: 'quitado', ambito: 'Sección', texto: s.nombre,
      detalle: `con ${antes.campos.filter(c => c.seccion === s.id).length} campos`,
    }))

  ahora.secciones.forEach(s => {
    const previo = antes.secciones.find(x => x.id === s.id)
    if (previo && previo.nombre !== s.nombre) {
      cambios.push({ clase: 'editado', ambito: 'Sección', texto: s.nombre, detalle: `se llamaba “${previo.nombre}”` })
    }
  })

  const ordenAntes = antes.secciones.map(s => s.id).filter(id => ahora.secciones.some(x => x.id === id))
  const ordenAhora = ahora.secciones.map(s => s.id).filter(id => antes.secciones.some(x => x.id === id))
  if (ordenAntes.join() !== ordenAhora.join()) {
    cambios.push({ clase: 'editado', ambito: 'Sección', texto: 'Cambió el orden de las secciones' })
  }

  // ---- campos ----
  ahora.campos.filter(c => !antes.campos.some(x => x.id === c.id)).forEach(c => {
    const e = estandarDe(c.estandar)
    cambios.push({
      clase: 'agregado', ambito: 'Campo', texto: c.etiqueta,
      detalle: `en ${nombreSeccion(ahora.secciones, c.seccion)} · ${e ? e.columna : 'campo propio, sin índice'}`,
    })
  })

  antes.campos.filter(c => !ahora.campos.some(x => x.id === c.id)).forEach(c => {
    const e = estandarDe(c.estandar)
    cambios.push({
      clase: 'quitado', ambito: 'Campo', texto: c.etiqueta,
      detalle: e?.expuesto
        ? `${e.columna} — lo leen otros sistemas del grupo, va a llegar vacío`
        : `estaba en ${nombreSeccion(antes.secciones, c.seccion)}`,
    })
  })

  ahora.campos.forEach(c => {
    const previo = antes.campos.find(x => x.id === c.id)
    if (!previo) return
    const d = difCampo(previo, c)
    if (d.length) cambios.push({ clase: 'editado', ambito: 'Campo', texto: c.etiqueta, detalle: d.join(' · ') })
  })

  return cambios
}

/** Resumen de una línea, para la fila del historial. */
export const resumen = (cambios: Cambio[]) => {
  if (!cambios.length) return 'Sin cambios en la definición'
  const n = (c: Clase) => cambios.filter(x => x.clase === c).length
  return [
    n('agregado') && `${n('agregado')} agregado(s)`,
    n('quitado') && `${n('quitado')} quitado(s)`,
    n('editado') && `${n('editado')} modificado(s)`,
  ].filter(Boolean).join(' · ')
}
