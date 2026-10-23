import { fieldVisible } from '@/features/platform/form/RenderField'
import type { FormField, Section } from '@/features/platform/form/types'

export type PortalStep = {
  id: string
  title: string
  sections: Section[]
}

/** Paper headings stay on the page. The sidebar shows one block, not one step per heading. */
const BLOCKS: { id: string; title: string; keys: string[] }[] = [
  { id: 'tipo', title: 'Tipo de cliente', keys: ['tipo de cliente'] },
  {
    id: 'identificacion',
    title: 'Identificación',
    keys: [
      'ficha de identificación del cliente persona natural',
      'datos de la institución',
      'datos personales del cliente',
      'ficha de identificación del cliente persona jurídica',
      'datos de identificación de la empresa',
      'datos del registro',
      'última modificación',
      'entes públicos',
      'contacto de la empresa',
    ],
  },
  {
    id: 'vinculados',
    title: 'Vinculados y PEP',
    keys: [
      'persona expuesta politicamente (pep)',
      'persona expuesta politicamente',
      'en caso de actuación de representante legal, apoderado y/o autorizado',
      'representante(s) legal(es)/',
      'accionistas / junta directiva',
    ],
  },
  {
    id: 'actividad',
    title: 'Actividad e ingresos',
    keys: [
      'referencias bancarias',
      'referencias personales',
      'información económico financiera del cliente',
      'fuente de ingresos del cliente',
      'relación de dependencia',
      'negocio propio',
      'principales proveedores',
      'principales clientes',
      'otros ingresos',
      'empresas relacionadas',
      'información del servicio de transporte de valores orinoco, c.a.',
    ],
  },
  {
    id: 'declaracion',
    title: 'Declaración',
    keys: [
      'motivos por los cuales solicita los servicios',
      'motivos, origen y destino de los fondos',
      'declaración jurada de origen y destino de los fondos',
      'funcionario de transvalor orinoco, c.a',
    ],
  },
]

export const sectionKey = (name: string) =>
  name.trim().replace(/\s+/g, ' ').replace(/:/g, '').toLowerCase()

const sectionVisible = (section: Section, fields: FormField[], valores: Record<string, unknown>) =>
  fields.some(field => field.section === section.id && fieldVisible(field, valores, fields))

/**
 * Steps the client actually walks. A heading with no visible field is omitted,
 * so the other person type never becomes an empty page.
 */
export const portalSteps = (
  sections: Section[],
  fields: FormField[],
  valores: Record<string, unknown>,
): PortalStep[] => {
  const visible = sections.filter(section => sectionVisible(section, fields, valores))
  const used = new Set<string>()
  const steps: PortalStep[] = []
  for (const block of BLOCKS) {
    const keys = new Set(block.keys)
    const sections = visible.filter(section => keys.has(sectionKey(section.name)))
    sections.forEach(section => used.add(section.id))
    if (sections.length) steps.push({ id: block.id, title: block.title, sections })
  }
  for (const section of visible) {
    if (used.has(section.id)) continue
    steps.push({ id: section.id, title: section.name, sections: [section] })
  }
  return steps
}
