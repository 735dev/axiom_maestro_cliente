import { standardOf, type FormField, type Section } from './types'

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
  scope: 'Sección' | 'Campo'
  text: string
  detalle?: string
}

const sectionName = (sections: Section[], id: string) =>
  sections.find(s => s.id === id)?.name ?? '—'

/** Qué hace distinto a un campo del mismo id entre dos versiones. */
const fieldDiff = (a: FormField, b: FormField): string[] => {
  const d: string[] = []
  if (a.label !== b.label) d.push(`se llamaba “${a.label}”`)
  if (a.tipo !== b.tipo) d.push(`era de tipo ${a.tipo}`)
  if (a.required !== b.required) d.push(b.required ? 'pasó a ser obligatorio' : 'dejó de ser obligatorio')
  if (a.section !== b.section) d.push('cambió de sección')
  if (JSON.stringify(a.options ?? []) !== JSON.stringify(b.options ?? [])) {
    const before = a.options?.length ?? 0
    const ahora = b.options?.length ?? 0
    d.push(before === ahora ? 'cambiaron las opciones' : `las opciones pasaron de ${before} a ${ahora}`)
  }
  if (a.help !== b.help) d.push('cambió el texto de ayuda')
  if (JSON.stringify(a.condition ?? null) !== JSON.stringify(b.condition ?? null)) {
    d.push(
      !a.condition?.conditions.length && b.condition?.conditions.length ? 'pasó a mostrarse solo bajo condición'
        : a.condition?.conditions.length && !b.condition?.conditions.length ? 'dejó de estar condicionado'
        : 'cambió la condición que lo muestra',
    )
  }
  if ((a.width ?? 'auto') !== (b.width ?? 'auto')) d.push(`cambió el ancho a ${b.width ?? 'auto'}`)
  return d
}

export function compare(
  before: { sections: Section[]; fields: FormField[] },
  ahora: { sections: Section[]; fields: FormField[] },
): Cambio[] {
  const cambios: Cambio[] = []

  // ---- secciones ----
  ahora.sections.filter(s => !before.sections.some(x => x.id === s.id))
    .forEach(s => cambios.push({ clase: 'agregado', scope: 'Sección', text: s.name }))

  before.sections.filter(s => !ahora.sections.some(x => x.id === s.id))
    .forEach(s => cambios.push({
      clase: 'quitado', scope: 'Sección', text: s.name,
      detalle: `con ${before.fields.filter(c => c.section === s.id).length} campos`,
    }))

  ahora.sections.forEach(s => {
    const previo = before.sections.find(x => x.id === s.id)
    if (previo && previo.name !== s.name) {
      cambios.push({ clase: 'editado', scope: 'Sección', text: s.name, detalle: `se llamaba “${previo.name}”` })
    }
  })

  const ordenBefore = before.sections.map(s => s.id).filter(id => ahora.sections.some(x => x.id === id))
  const ordenAhora = ahora.sections.map(s => s.id).filter(id => before.sections.some(x => x.id === id))
  if (ordenBefore.join() !== ordenAhora.join()) {
    cambios.push({ clase: 'editado', scope: 'Sección', text: 'Cambió el orden de las secciones' })
  }

  // ---- campos ----
  ahora.fields.filter(c => !before.fields.some(x => x.id === c.id)).forEach(c => {
    const e = standardOf(c.standard)
    cambios.push({
      clase: 'agregado', scope: 'Campo', text: c.label,
      detalle: `en ${sectionName(ahora.sections, c.section)} · ${e ? e.column : 'field custom, sin índice'}`,
    })
  })

  before.fields.filter(c => !ahora.fields.some(x => x.id === c.id)).forEach(c => {
    const e = standardOf(c.standard)
    cambios.push({
      clase: 'quitado', scope: 'Campo', text: c.label,
      detalle: e?.expuesto
        ? `${e.column} — lo leen otros sistemas del grupo, va a llegar vacío`
        : `estaba en ${sectionName(before.sections, c.section)}`,
    })
  })

  ahora.fields.forEach(c => {
    const previo = before.fields.find(x => x.id === c.id)
    if (!previo) return
    const d = fieldDiff(previo, c)
    if (d.length) cambios.push({ clase: 'editado', scope: 'Campo', text: c.label, detalle: d.join(' · ') })
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
