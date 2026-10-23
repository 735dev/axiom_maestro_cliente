/**
 * Definición del formulario de captación.
 *
 * Una sola estructura para todo: la usa el editor de la consola, la vista
 * previa y el formulario que llena el cliente. No hay una definición para
 * configurar y otra para pintar.
 *
 * El formulario de una empresa **nace vacío**. La plataforma no impone
 * secciones ni campos: aporta un catálogo de campos estándar que la empresa
 * toma si le sirven.
 */

export type FieldType =
  | 'texto' | 'parrafo' | 'numero' | 'moneda' | 'porcentaje'
  | 'fecha' | 'email' | 'telefono' | 'documento' | 'url'
  | 'lista' | 'multiple' | 'si-no' | 'archivo' | 'calculado'

export const TYPES: { id: FieldType; name: string; nota: string }[] = [
  { id: 'texto', name: 'Texto', nota: 'Una línea' },
  { id: 'parrafo', name: 'Párrafo', nota: 'Varias líneas' },
  { id: 'numero', name: 'Número', nota: 'Solo dígitos' },
  { id: 'moneda', name: 'Monto', nota: 'Se formatea con separadores' },
  { id: 'porcentaje', name: 'Porcentaje', nota: '0 a 100' },
  { id: 'fecha', name: 'Fecha', nota: 'Selector de calendario' },
  { id: 'email', name: 'Correo', nota: 'Valida el formato' },
  { id: 'telefono', name: 'Teléfono', nota: 'Valida el formato' },
  { id: 'documento', name: 'RIF o cédula', nota: 'Normaliza a mayúscula' },
  { id: 'url', name: 'Página web', nota: 'Valida el formato' },
  { id: 'lista', name: 'Lista', nota: 'Una opción de varias' },
  { id: 'multiple', name: 'Selección múltiple', nota: 'Varias opciones a la vez' },
  { id: 'si-no', name: 'Sí / No', nota: 'Interruptor' },
  { id: 'archivo', name: 'Archivo', nota: 'El cliente adjunta un documento' },
  { id: 'calculado', name: 'Calculado', nota: 'Valor generado por el sistema' },
]

export type SectionId = string
export type Section = { id: SectionId; name: string; sub: string }

/* ============================================================
 * Catálogos
 * ============================================================
 *
 * Un catálogo es una lista de valores que alimenta las opciones de un campo.
 *
 * Quién define qué, y por qué está partido así:
 *
 * - **Axiom** declara qué catálogos existen. Van atados a una columna que
 *   comparten todas las empresas, así que el conjunto no puede depender de
 *   cada una: si Transvalor llamara "Rubro" a lo que Seguros llama "Sector",
 *   ningún informe podría cruzar las dos.
 * - **Cada empresa** administra los valores del suyo. Transvalor tiene
 *   sectores que una aseguradora no, y agregar uno no debe requerir
 *   desarrollo ni pedirle permiso a Axiom.
 */
export type CatalogId = string

export type CatalogDef = {
  id: CatalogId
  name: string
  description: string
  /** Con qué valores nace una empresa nueva. Después los cambia ella. */
  initial: string[]
}

export const PLATFORM_CATALOGS: CatalogDef[] = [
  {
    id: 'tipo_persona', name: 'Tipo de cliente',
    description: 'Si el cliente es una persona o una empresa. Decide qué se le pide después.',
    initial: ['Persona natural', 'Persona jurídica'],
  },
  {
    id: 'sector', name: 'Sector económico',
    description: 'En qué ramo opera el cliente. Alimenta el campo estándar Sector económico.',
    initial: ['Banca y servicios financieros', 'Seguros', 'Comercio al detal', 'Manufactura',
      'Inmobiliaria', 'Casino y juegos de azar', 'Transporte de valores', 'Otro'],
  },
  {
    id: 'actividad', name: 'Actividad económica',
    description: 'A qué se dedica en concreto, dentro de su sector.',
    initial: ['Banca universal', 'Banca microfinanciera', 'Casa de cambio', 'Seguros',
      'Cadena de supermercados', 'Producción de alimentos', 'Desarrollo inmobiliario',
      'Transporte de valores', 'Juegos de azar'],
  },
  {
    id: 'tipo_empresa', name: 'Tipo de empresa jurídica',
    description: 'Forma societaria del cliente cuando es persona jurídica.',
    initial: ['Compañía Anónima', 'Sociedad Anónima', 'Sociedad de Responsabilidad Limitada',
      'Firma Personal', 'Cooperativa', 'Fundación'],
  },
  {
    id: 'origen_fondos', name: 'Origen de fondos',
    description: 'De dónde declara el cliente que salen sus recursos.',
    initial: ['Operaciones comerciales propias', 'Sueldo o salario', 'Inversión de accionistas',
      'Créditos bancarios', 'Rendimientos financieros', 'Herencia', 'Mixto', 'Otro'],
  },
  {
    id: 'pais', name: 'País',
    description: 'Dónde opera o reside el cliente.',
    initial: ['Venezuela', 'Colombia', 'Panamá', 'España', 'Estados Unidos'],
  },
  {
    id: 'nacionalidad', name: 'Nacionalidad',
    description: 'Nacionalidad de las personas del expediente.',
    initial: ['Venezolana', 'Colombiana', 'Española', 'Estadounidense', 'Otra'],
  },
  {
    id: 'rol_persona', name: 'Rol de la persona vinculada',
    description: 'Con qué carácter aparece una persona en el expediente.',
    initial: ['Accionista', 'Beneficiario final', 'Representante legal'],
  },
  {
    id: 'ingresos', name: 'Rango de ingresos',
    description: 'Escala de ingresos declarada.',
    initial: ['Menos de $1M', '$1M – $10M', '$10M – $50M', 'Más de $50M'],
  },
  {
    id: 'frecuencia', name: 'Frecuencia de operación',
    description: 'Cada cuánto espera operar el cliente.',
    initial: ['Semanal', 'Quincenal', 'Mensual', 'Trimestral'],
  },
  {
    id: 'estado_civil', name: 'Estado civil',
    description: 'Solo aplica a persona natural.',
    initial: ['Soltero', 'Casado', 'Divorciado', 'Viudo'],
  },
]

export const catalogOf = (id?: CatalogId) =>
  id ? PLATFORM_CATALOGS.find(c => c.id === id) : undefined

/* ============================================================
 * Catálogo de campos estándar
 * ============================================================
 *
 * Un campo estándar tiene **columna propia** en la base: es tipado, indexado
 * y se puede buscar, filtrar y agregar. Un campo propio de la empresa vive en
 * un documento sin esquema — se guarda y se muestra, pero no se indexa, y
 * buscar por él obliga a recorrer todo.
 *
 * Por eso conviene que lo que se va a consultar seguido salga de acá, aunque
 * la empresa le cambie la etiqueta. "Razón social" y "Nombre de la compañía"
 * son la misma columna.
 *
 * Ninguno es obligatorio. Una empresa puede armar su formulario sin tocar el
 * catálogo.
 */
export type StandardKey = string

export type StandardField = {
  key: StandardKey
  name: string
  column: string
  tipo: FieldType
  group: string
  /** De qué catálogo salen las opciones, si es de tipo lista. */
  catalog?: CatalogId
  placeholder?: string
  help?: string
  /**
   * Si otros sistemas del grupo lo leen por la interfaz de consulta.
   *
   * El Maestro no sabe qué hacen con el dato —eso es de cada sistema— pero sí
   * sabe cuáles se comprometió a exponer, y esos no conviene sacarlos sin
   * avisar a quien los consume.
   */
  expuesto?: boolean
}

export const STANDARD_FIELDS: StandardField[] = [
  // ---- Común a cualquier cliente ----
  // El cliente puede ser una empresa o una persona. Lo que ambos tienen —un
  // nombre y un documento— va en las mismas columnas, y por eso las etiquetas
  // son neutras: una lista de clientes mezcla los dos sin casos especiales.
  { key: 'tipo_persona', name: 'Tipo de cliente', column: 'cliente.tipo_persona', tipo: 'lista', catalog: 'tipo_persona', group: 'Cliente', expuesto: true },
  { key: 'nombre', name: 'Nombre o razón social', column: 'cliente.nombre', tipo: 'texto', group: 'Cliente', placeholder: 'Nombre completo o razón social', expuesto: true },
  { key: 'documento', name: 'RIF o cédula', column: 'cliente.documento', tipo: 'documento', group: 'Cliente', placeholder: 'J-00000000-0 · V-00000000', help: 'Se admite en minúscula; el sistema lo normaliza.', expuesto: true },
  { key: 'sector', name: 'Sector económico', column: 'cliente.sector', tipo: 'lista', catalog: 'sector', group: 'Cliente', expuesto: true },
  { key: 'actividad', name: 'Actividad económica', column: 'cliente.actividad', tipo: 'lista', catalog: 'actividad', group: 'Cliente' },

  // ---- Solo persona natural ----
  { key: 'fecha_nacimiento', name: 'Fecha de nacimiento', column: 'cliente.fecha_nacimiento', tipo: 'fecha', group: 'Persona natural' },
  { key: 'nacionalidad', name: 'Nacionalidad', column: 'cliente.nacionalidad', tipo: 'lista', catalog: 'nacionalidad', group: 'Persona natural', expuesto: true },
  { key: 'profesion', name: 'Profesión u ocupación', column: 'cliente.profesion', tipo: 'texto', group: 'Persona natural' },
  { key: 'estado_civil', name: 'Estado civil', column: 'cliente.estado_civil', tipo: 'lista', catalog: 'estado_civil', group: 'Persona natural' },
  { key: 'cliente_pep', name: '¿Es persona expuesta políticamente?', column: 'cliente.pep', tipo: 'si-no', group: 'Persona natural', expuesto: true },

  // ---- Solo persona jurídica ----
  { key: 'tipo_empresa', name: 'Tipo de empresa jurídica', column: 'cliente.tipo_empresa', tipo: 'lista', catalog: 'tipo_empresa', group: 'Persona jurídica' },
  { key: 'registro_mercantil', name: 'Registro mercantil', column: 'cliente.registro', tipo: 'texto', group: 'Persona jurídica', placeholder: 'N.º 77, tomo 42-A, folio 121' },
  { key: 'capital', name: 'Capital social', column: 'cliente.capital', tipo: 'moneda', group: 'Persona jurídica' },
  { key: 'fecha_constitucion', name: 'Fecha de constitución', column: 'cliente.fecha_constitucion', tipo: 'fecha', group: 'Persona jurídica' },

  // ---- Contacto ----
  { key: 'correo', name: 'Correo electrónico', column: 'cliente.correo', tipo: 'email', group: 'Contacto', expuesto: true },
  { key: 'telefono', name: 'Teléfono', column: 'cliente.telefono', tipo: 'telefono', group: 'Contacto', placeholder: '0212-0000000' },
  { key: 'domicilio', name: 'Domicilio', column: 'cliente.domicilio', tipo: 'texto', group: 'Contacto', help: 'Fiscal si es empresa, de habitación si es persona.' },
  { key: 'pais', name: 'País de operación o residencia', column: 'cliente.pais', tipo: 'lista', catalog: 'pais', group: 'Contacto', expuesto: true },
  { key: 'web', name: 'Página web', column: 'cliente.web', tipo: 'url', group: 'Contacto' },

  // ---- Personas vinculadas (solo aplica a persona jurídica) ----
  { key: 'persona_nombre', name: 'Nombre de la persona vinculada', column: 'persona.nombre', tipo: 'texto', group: 'Personas vinculadas', expuesto: true },
  { key: 'persona_documento', name: 'Documento de la persona vinculada', column: 'persona.documento', tipo: 'documento', group: 'Personas vinculadas', expuesto: true },
  { key: 'persona_rol', name: 'Rol en la empresa', column: 'persona.rol', tipo: 'lista', catalog: 'rol_persona', group: 'Personas vinculadas' },
  { key: 'persona_participacion', name: 'Participación accionaria', column: 'persona.porcentaje', tipo: 'porcentaje', group: 'Personas vinculadas' },
  { key: 'persona_nacionalidad', name: 'Nacionalidad de la persona vinculada', column: 'persona.nacionalidad', tipo: 'lista', catalog: 'nacionalidad', group: 'Personas vinculadas', expuesto: true },
  { key: 'persona_pep', name: '¿La persona vinculada es PEP?', column: 'persona.pep', tipo: 'si-no', group: 'Personas vinculadas', expuesto: true },

  // ---- Perfil económico ----
  { key: 'origen_fondos', name: 'Origen de fondos', column: 'cliente.origen_fondos', tipo: 'lista', catalog: 'origen_fondos', group: 'Perfil económico', expuesto: true },
  { key: 'ingresos', name: 'Rango de ingresos', column: 'cliente.ingresos', tipo: 'lista', catalog: 'ingresos', group: 'Perfil económico', expuesto: true },
  { key: 'monto_declarado', name: 'Monto que espera movilizar', column: 'cliente.monto_declarado', tipo: 'moneda', group: 'Perfil económico', expuesto: true },
  { key: 'frecuencia', name: 'Frecuencia de operación', column: 'cliente.frecuencia', tipo: 'lista', catalog: 'frecuencia', group: 'Perfil económico' },
]

export const standardOf = (key?: StandardKey) =>
  key ? STANDARD_FIELDS.find(c => c.key === key) : undefined

/* ============================================================
 * Condiciones de visibilidad
 * ============================================================
 *
 * Un campo puede depender de cualquier otro campo del formulario, no solo de
 * uno sí/no. `en` sirve para listas; `mayor`/`menor` solo tienen sentido
 * sobre campos numéricos y se coercionan como número al evaluarse — comparar
 * como texto rompe apenas hay cifras de distinta longitud ("9" > "10" en
 * ASCII).
 */
export type Operador = 'igual' | 'distinto' | 'vacio' | 'no_vacio' | 'en' | 'mayor' | 'menor'

export const OPERADORES: { id: Operador; name: string; necesitaValue: boolean }[] = [
  { id: 'igual', name: 'es igual a', necesitaValue: true },
  { id: 'distinto', name: 'es distinto de', necesitaValue: true },
  { id: 'en', name: 'está en', necesitaValue: true },
  { id: 'mayor', name: 'es mayor que', necesitaValue: true },
  { id: 'menor', name: 'es menor que', necesitaValue: true },
  { id: 'vacio', name: 'está vacío', necesitaValue: false },
  { id: 'no_vacio', name: 'no está vacío', necesitaValue: false },
]

/** Tipos de campo cuyo valor se compara como número. */
export const NUMERIC_TYPES: FieldType[] = ['numero', 'moneda', 'porcentaje']

/** Qué operadores tienen sentido según el tipo del campo disparador. */
export const operadoresPara = (tipo?: FieldType): Operador[] => {
  if (tipo && NUMERIC_TYPES.includes(tipo)) return ['igual', 'distinto', 'mayor', 'menor', 'vacio', 'no_vacio']
  if (tipo === 'lista' || tipo === 'multiple') return ['igual', 'distinto', 'en', 'vacio', 'no_vacio']
  return ['igual', 'distinto', 'vacio', 'no_vacio']
}

export type Condition = { fieldId: string; operador: Operador; value?: string }
export type Enlace = 'y' | 'o'
/** Varias condiciones combinadas con Y (todas) u O (alguna). */
export type ConditionGroup = { enlace: Enlace; conditions: Condition[] }

/* ============================================================
 * Ancho declarado de un campo
 * ============================================================
 *
 * `auto` deja que el tipo decida: párrafo y archivo piden toda la fila,
 * el resto comparte columna con sus vecinos. `medio` y `completo` fuerzan lo
 * contrario a lo que tocaría por tipo, para el caso raro de un campo corto
 * que conviene aislar o un párrafo que conviene compartir fila.
 */
export type FieldWidth = 'auto' | 'medio' | 'completo'

export const WIDTHS: { id: FieldWidth; name: string }[] = [
  { id: 'auto', name: 'Automático' },
  { id: 'medio', name: 'Comparte fila' },
  { id: 'completo', name: 'Fila completa' },
]

const autoWidth = (tipo: FieldType): 'medio' | 'completo' =>
  (tipo === 'parrafo' || tipo === 'archivo') ? 'completo' : 'medio'

/** El ancho efectivo de un campo: lo declarado, o lo que toca por su tipo. */
export const widthOf = (c: Pick<FormField, 'tipo' | 'width'>): 'medio' | 'completo' =>
  c.width && c.width !== 'auto' ? c.width : autoWidth(c.tipo)

/* ============================================================
 * El campo tal como vive en el formulario de una empresa
 * ============================================================ */
export type FormField = {
  id: string
  section: SectionId
  label: string
  tipo: FieldType
  required: boolean
  /**
   * Si apunta a una clave del catálogo, el valor va a esa columna: indexado y
   * buscable. Sin clave es un campo propio y se guarda sin esquema.
   */
  standard?: StandardKey
  /**
   * De dónde salen las opciones cuando es de tipo lista.
   *
   * `catalogo` las toma del catálogo de la empresa, que ella administra.
   * `opciones` son fijas, escritas por Axiom al crear el campo. Un campo usa
   * una cosa o la otra, nunca las dos.
   */
  catalog?: CatalogId
  options?: string[]
  help?: string
  placeholder?: string
  /** Visible solo cuando se cumplen una o varias condiciones sobre otros campos. */
  condition?: ConditionGroup
  /** Cuánto ocupa en la rejilla de su sección. Sin definir, decide el tipo. */
  width?: FieldWidth
}

export const esStandard = (c: FormField) => Boolean(c.standard)

/**
 * Todos los campos de un formulario en el orden en que se ven en pantalla:
 * por sección primero —en el orden de `secciones`— y dentro de cada una por
 * su posición. Es el orden que define qué campo es "anterior" a cuál.
 */
export const ordenGlobal = (sections: Section[], fields: FormField[]): FormField[] =>
  sections.flatMap(s => fields.filter(c => c.section === s.id))

/**
 * Los campos que `objetivo` puede usar como disparador de su condición: solo
 * los que aparecen antes que él en el formulario. Depender de uno posterior
 * no tiene sentido —todavía no se llenó cuando el navegador decide si
 * mostrar este— así que ni se ofrece como opción.
 */
export const previousFields = (sections: Section[], fields: FormField[], objetivo: FormField): FormField[] => {
  const orden = ordenGlobal(sections, fields)
  const yaExiste = fields.some(c => c.id === objetivo.id)
  const targetSectionIndex = sections.findIndex(s => s.id === objetivo.section)
  return orden.filter(c => {
    if (c.id === objetivo.id) return false
    const sectionIndexC = sections.findIndex(s => s.id === c.section)
    if (sectionIndexC !== targetSectionIndex) return sectionIndexC < targetSectionIndex
    // Misma sección: si el campo ya existe, solo cuentan los que están antes
    // de él en el orden real. Si es nuevo, entra al final de la sección, así
    // que todo lo que ya está ahí cuenta como anterior.
    return yaExiste ? orden.indexOf(c) < orden.indexOf(objetivo) : true
  })
}

/** Qué claves del catálogo usa hoy el formulario. */
export const usedKeys = (fields: FormField[]) =>
  new Set(fields.map(c => c.standard).filter(Boolean) as StandardKey[])

/**
 * Las opciones que le tocan a un campo, con los valores de esta empresa.
 *
 * Es el único lugar que resuelve esto. Antes la lista vivía dos veces —cableada
 * en el campo y editable en el catálogo— y el formulario usaba la cableada, así
 * que la pantalla de catálogos no cambiaba nada de lo que veía el cliente.
 */
export const optionsOf = (c: FormField, catalogs: Record<string, string[]>): string[] => {
  const fromCatalog = c.catalog ? catalogs[c.catalog] : undefined
  if (fromCatalog && fromCatalog.length) return fromCatalog
  return c.options ?? []
}
