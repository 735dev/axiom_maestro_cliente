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

export type TipoCampo =
  | 'texto' | 'parrafo' | 'numero' | 'moneda' | 'porcentaje'
  | 'fecha' | 'email' | 'telefono' | 'documento' | 'url'
  | 'lista' | 'multiple' | 'si-no' | 'archivo'

export const TIPOS: { id: TipoCampo; nombre: string; nota: string }[] = [
  { id: 'texto', nombre: 'Texto', nota: 'Una línea' },
  { id: 'parrafo', nombre: 'Párrafo', nota: 'Varias líneas' },
  { id: 'numero', nombre: 'Número', nota: 'Solo dígitos' },
  { id: 'moneda', nombre: 'Monto', nota: 'Se formatea con separadores' },
  { id: 'porcentaje', nombre: 'Porcentaje', nota: '0 a 100' },
  { id: 'fecha', nombre: 'Fecha', nota: 'Selector de calendario' },
  { id: 'email', nombre: 'Correo', nota: 'Valida el formato' },
  { id: 'telefono', nombre: 'Teléfono', nota: 'Valida el formato' },
  { id: 'documento', nombre: 'RIF o cédula', nota: 'Normaliza a mayúscula' },
  { id: 'url', nombre: 'Página web', nota: 'Valida el formato' },
  { id: 'lista', nombre: 'Lista', nota: 'Una opción de varias' },
  { id: 'multiple', nombre: 'Selección múltiple', nota: 'Varias opciones a la vez' },
  { id: 'si-no', nombre: 'Sí / No', nota: 'Interruptor' },
  { id: 'archivo', nombre: 'Archivo', nota: 'El cliente adjunta un documento' },
]

export type SeccionId = string
export type Seccion = { id: SeccionId; nombre: string; sub: string }

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
export type CatalogoId = string

export type CatalogoDef = {
  id: CatalogoId
  nombre: string
  descripcion: string
  /** Con qué valores nace una empresa nueva. Después los cambia ella. */
  inicial: string[]
}

export const CATALOGOS_PLATAFORMA: CatalogoDef[] = [
  {
    id: 'tipo_persona', nombre: 'Tipo de cliente',
    descripcion: 'Si el cliente es una persona o una empresa. Decide qué se le pide después.',
    inicial: ['Persona natural', 'Persona jurídica'],
  },
  {
    id: 'sector', nombre: 'Sector económico',
    descripcion: 'En qué ramo opera el cliente. Alimenta el campo estándar Sector económico.',
    inicial: ['Banca y servicios financieros', 'Seguros', 'Comercio al detal', 'Manufactura',
      'Inmobiliaria', 'Casino y juegos de azar', 'Transporte de valores', 'Otro'],
  },
  {
    id: 'actividad', nombre: 'Actividad económica',
    descripcion: 'A qué se dedica en concreto, dentro de su sector.',
    inicial: ['Banca universal', 'Banca microfinanciera', 'Casa de cambio', 'Seguros',
      'Cadena de supermercados', 'Producción de alimentos', 'Desarrollo inmobiliario',
      'Transporte de valores', 'Juegos de azar'],
  },
  {
    id: 'tipo_empresa', nombre: 'Tipo de empresa jurídica',
    descripcion: 'Forma societaria del cliente cuando es persona jurídica.',
    inicial: ['Compañía Anónima', 'Sociedad Anónima', 'Sociedad de Responsabilidad Limitada',
      'Firma Personal', 'Cooperativa', 'Fundación'],
  },
  {
    id: 'origen_fondos', nombre: 'Origen de fondos',
    descripcion: 'De dónde declara el cliente que salen sus recursos.',
    inicial: ['Operaciones comerciales propias', 'Sueldo o salario', 'Inversión de accionistas',
      'Créditos bancarios', 'Rendimientos financieros', 'Herencia', 'Mixto', 'Otro'],
  },
  {
    id: 'pais', nombre: 'País',
    descripcion: 'Dónde opera o reside el cliente.',
    inicial: ['Venezuela', 'Colombia', 'Panamá', 'España', 'Estados Unidos'],
  },
  {
    id: 'nacionalidad', nombre: 'Nacionalidad',
    descripcion: 'Nacionalidad de las personas del expediente.',
    inicial: ['Venezolana', 'Colombiana', 'Española', 'Estadounidense', 'Otra'],
  },
  {
    id: 'rol_persona', nombre: 'Rol de la persona vinculada',
    descripcion: 'Con qué carácter aparece una persona en el expediente.',
    inicial: ['Accionista', 'Beneficiario final', 'Representante legal'],
  },
  {
    id: 'ingresos', nombre: 'Rango de ingresos',
    descripcion: 'Escala de ingresos declarada.',
    inicial: ['Menos de $1M', '$1M – $10M', '$10M – $50M', 'Más de $50M'],
  },
  {
    id: 'frecuencia', nombre: 'Frecuencia de operación',
    descripcion: 'Cada cuánto espera operar el cliente.',
    inicial: ['Semanal', 'Quincenal', 'Mensual', 'Trimestral'],
  },
  {
    id: 'estado_civil', nombre: 'Estado civil',
    descripcion: 'Solo aplica a persona natural.',
    inicial: ['Soltero', 'Casado', 'Divorciado', 'Viudo'],
  },
]

export const catalogoDe = (id?: CatalogoId) =>
  id ? CATALOGOS_PLATAFORMA.find(c => c.id === id) : undefined

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
export type ClaveEstandar = string

export type CampoEstandar = {
  clave: ClaveEstandar
  nombre: string
  columna: string
  tipo: TipoCampo
  grupo: string
  /** De qué catálogo salen las opciones, si es de tipo lista. */
  catalogo?: CatalogoId
  marcador?: string
  ayuda?: string
  /**
   * Si otros sistemas del grupo lo leen por la interfaz de consulta.
   *
   * El Maestro no sabe qué hacen con el dato —eso es de cada sistema— pero sí
   * sabe cuáles se comprometió a exponer, y esos no conviene sacarlos sin
   * avisar a quien los consume.
   */
  expuesto?: boolean
}

export const CAMPOS_ESTANDAR: CampoEstandar[] = [
  // ---- Común a cualquier cliente ----
  // El cliente puede ser una empresa o una persona. Lo que ambos tienen —un
  // nombre y un documento— va en las mismas columnas, y por eso las etiquetas
  // son neutras: una lista de clientes mezcla los dos sin casos especiales.
  { clave: 'tipo_persona', nombre: 'Tipo de cliente', columna: 'cliente.tipo_persona', tipo: 'lista', catalogo: 'tipo_persona', grupo: 'Cliente', expuesto: true },
  { clave: 'nombre', nombre: 'Nombre o razón social', columna: 'cliente.nombre', tipo: 'texto', grupo: 'Cliente', marcador: 'Nombre completo o razón social', expuesto: true },
  { clave: 'documento', nombre: 'RIF o cédula', columna: 'cliente.documento', tipo: 'documento', grupo: 'Cliente', marcador: 'J-00000000-0 · V-00000000', ayuda: 'Se admite en minúscula; el sistema lo normaliza.', expuesto: true },
  { clave: 'sector', nombre: 'Sector económico', columna: 'cliente.sector', tipo: 'lista', catalogo: 'sector', grupo: 'Cliente', expuesto: true },
  { clave: 'actividad', nombre: 'Actividad económica', columna: 'cliente.actividad', tipo: 'lista', catalogo: 'actividad', grupo: 'Cliente' },

  // ---- Solo persona natural ----
  { clave: 'fecha_nacimiento', nombre: 'Fecha de nacimiento', columna: 'cliente.fecha_nacimiento', tipo: 'fecha', grupo: 'Persona natural' },
  { clave: 'nacionalidad', nombre: 'Nacionalidad', columna: 'cliente.nacionalidad', tipo: 'lista', catalogo: 'nacionalidad', grupo: 'Persona natural', expuesto: true },
  { clave: 'profesion', nombre: 'Profesión u ocupación', columna: 'cliente.profesion', tipo: 'texto', grupo: 'Persona natural' },
  { clave: 'estado_civil', nombre: 'Estado civil', columna: 'cliente.estado_civil', tipo: 'lista', catalogo: 'estado_civil', grupo: 'Persona natural' },
  { clave: 'cliente_pep', nombre: '¿Es persona expuesta políticamente?', columna: 'cliente.pep', tipo: 'si-no', grupo: 'Persona natural', expuesto: true },

  // ---- Solo persona jurídica ----
  { clave: 'tipo_empresa', nombre: 'Tipo de empresa jurídica', columna: 'cliente.tipo_empresa', tipo: 'lista', catalogo: 'tipo_empresa', grupo: 'Persona jurídica' },
  { clave: 'registro_mercantil', nombre: 'Registro mercantil', columna: 'cliente.registro', tipo: 'texto', grupo: 'Persona jurídica', marcador: 'N.º 77, tomo 42-A, folio 121' },
  { clave: 'capital', nombre: 'Capital social', columna: 'cliente.capital', tipo: 'moneda', grupo: 'Persona jurídica' },
  { clave: 'fecha_constitucion', nombre: 'Fecha de constitución', columna: 'cliente.fecha_constitucion', tipo: 'fecha', grupo: 'Persona jurídica' },

  // ---- Contacto ----
  { clave: 'correo', nombre: 'Correo electrónico', columna: 'cliente.correo', tipo: 'email', grupo: 'Contacto', expuesto: true },
  { clave: 'telefono', nombre: 'Teléfono', columna: 'cliente.telefono', tipo: 'telefono', grupo: 'Contacto', marcador: '0212-0000000' },
  { clave: 'domicilio', nombre: 'Domicilio', columna: 'cliente.domicilio', tipo: 'texto', grupo: 'Contacto', ayuda: 'Fiscal si es empresa, de habitación si es persona.' },
  { clave: 'pais', nombre: 'País de operación o residencia', columna: 'cliente.pais', tipo: 'lista', catalogo: 'pais', grupo: 'Contacto', expuesto: true },
  { clave: 'web', nombre: 'Página web', columna: 'cliente.web', tipo: 'url', grupo: 'Contacto' },

  // ---- Personas vinculadas (solo aplica a persona jurídica) ----
  { clave: 'persona_nombre', nombre: 'Nombre de la persona vinculada', columna: 'persona.nombre', tipo: 'texto', grupo: 'Personas vinculadas', expuesto: true },
  { clave: 'persona_documento', nombre: 'Documento de la persona vinculada', columna: 'persona.documento', tipo: 'documento', grupo: 'Personas vinculadas', expuesto: true },
  { clave: 'persona_rol', nombre: 'Rol en la empresa', columna: 'persona.rol', tipo: 'lista', catalogo: 'rol_persona', grupo: 'Personas vinculadas' },
  { clave: 'persona_participacion', nombre: 'Participación accionaria', columna: 'persona.porcentaje', tipo: 'porcentaje', grupo: 'Personas vinculadas' },
  { clave: 'persona_nacionalidad', nombre: 'Nacionalidad de la persona vinculada', columna: 'persona.nacionalidad', tipo: 'lista', catalogo: 'nacionalidad', grupo: 'Personas vinculadas', expuesto: true },
  { clave: 'persona_pep', nombre: '¿La persona vinculada es PEP?', columna: 'persona.pep', tipo: 'si-no', grupo: 'Personas vinculadas', expuesto: true },

  // ---- Perfil económico ----
  { clave: 'origen_fondos', nombre: 'Origen de fondos', columna: 'cliente.origen_fondos', tipo: 'lista', catalogo: 'origen_fondos', grupo: 'Perfil económico', expuesto: true },
  { clave: 'ingresos', nombre: 'Rango de ingresos', columna: 'cliente.ingresos', tipo: 'lista', catalogo: 'ingresos', grupo: 'Perfil económico', expuesto: true },
  { clave: 'monto_declarado', nombre: 'Monto que espera movilizar', columna: 'cliente.monto_declarado', tipo: 'moneda', grupo: 'Perfil económico', expuesto: true },
  { clave: 'frecuencia', nombre: 'Frecuencia de operación', columna: 'cliente.frecuencia', tipo: 'lista', catalogo: 'frecuencia', grupo: 'Perfil económico' },
]

export const estandarDe = (clave?: ClaveEstandar) =>
  clave ? CAMPOS_ESTANDAR.find(c => c.clave === clave) : undefined

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

export const OPERADORES: { id: Operador; nombre: string; necesitaValor: boolean }[] = [
  { id: 'igual', nombre: 'es igual a', necesitaValor: true },
  { id: 'distinto', nombre: 'es distinto de', necesitaValor: true },
  { id: 'en', nombre: 'está en', necesitaValor: true },
  { id: 'mayor', nombre: 'es mayor que', necesitaValor: true },
  { id: 'menor', nombre: 'es menor que', necesitaValor: true },
  { id: 'vacio', nombre: 'está vacío', necesitaValor: false },
  { id: 'no_vacio', nombre: 'no está vacío', necesitaValor: false },
]

/** Tipos de campo cuyo valor se compara como número. */
export const TIPOS_NUMERICOS: TipoCampo[] = ['numero', 'moneda', 'porcentaje']

/** Qué operadores tienen sentido según el tipo del campo disparador. */
export const operadoresPara = (tipo?: TipoCampo): Operador[] => {
  if (tipo && TIPOS_NUMERICOS.includes(tipo)) return ['igual', 'distinto', 'mayor', 'menor', 'vacio', 'no_vacio']
  if (tipo === 'lista' || tipo === 'multiple') return ['igual', 'distinto', 'en', 'vacio', 'no_vacio']
  return ['igual', 'distinto', 'vacio', 'no_vacio']
}

export type Condicion = { campoId: string; operador: Operador; valor?: string }
export type Enlace = 'y' | 'o'
/** Varias condiciones combinadas con Y (todas) u O (alguna). */
export type CondicionGrupo = { enlace: Enlace; condiciones: Condicion[] }

/* ============================================================
 * Ancho declarado de un campo
 * ============================================================
 *
 * `auto` deja que el tipo decida: párrafo y archivo piden toda la fila,
 * el resto comparte columna con sus vecinos. `medio` y `completo` fuerzan lo
 * contrario a lo que tocaría por tipo, para el caso raro de un campo corto
 * que conviene aislar o un párrafo que conviene compartir fila.
 */
export type AnchoCampo = 'auto' | 'medio' | 'completo'

export const ANCHOS: { id: AnchoCampo; nombre: string }[] = [
  { id: 'auto', nombre: 'Automático' },
  { id: 'medio', nombre: 'Comparte fila' },
  { id: 'completo', nombre: 'Fila completa' },
]

const anchoAuto = (tipo: TipoCampo): 'medio' | 'completo' =>
  (tipo === 'parrafo' || tipo === 'archivo') ? 'completo' : 'medio'

/** El ancho efectivo de un campo: lo declarado, o lo que toca por su tipo. */
export const anchoDe = (c: Pick<Campo, 'tipo' | 'ancho'>): 'medio' | 'completo' =>
  c.ancho && c.ancho !== 'auto' ? c.ancho : anchoAuto(c.tipo)

/* ============================================================
 * El campo tal como vive en el formulario de una empresa
 * ============================================================ */
export type Campo = {
  id: string
  seccion: SeccionId
  etiqueta: string
  tipo: TipoCampo
  obligatorio: boolean
  /**
   * Si apunta a una clave del catálogo, el valor va a esa columna: indexado y
   * buscable. Sin clave es un campo propio y se guarda sin esquema.
   */
  estandar?: ClaveEstandar
  /**
   * De dónde salen las opciones cuando es de tipo lista.
   *
   * `catalogo` las toma del catálogo de la empresa, que ella administra.
   * `opciones` son fijas, escritas por Axiom al crear el campo. Un campo usa
   * una cosa o la otra, nunca las dos.
   */
  catalogo?: CatalogoId
  opciones?: string[]
  ayuda?: string
  marcador?: string
  /** Visible solo cuando se cumplen una o varias condiciones sobre otros campos. */
  condicion?: CondicionGrupo
  /** Cuánto ocupa en la rejilla de su sección. Sin definir, decide el tipo. */
  ancho?: AnchoCampo
}

export const esEstandar = (c: Campo) => Boolean(c.estandar)

/**
 * Todos los campos de un formulario en el orden en que se ven en pantalla:
 * por sección primero —en el orden de `secciones`— y dentro de cada una por
 * su posición. Es el orden que define qué campo es "anterior" a cuál.
 */
export const ordenGlobal = (secciones: Seccion[], campos: Campo[]): Campo[] =>
  secciones.flatMap(s => campos.filter(c => c.seccion === s.id))

/**
 * Los campos que `objetivo` puede usar como disparador de su condición: solo
 * los que aparecen antes que él en el formulario. Depender de uno posterior
 * no tiene sentido —todavía no se llenó cuando el navegador decide si
 * mostrar este— así que ni se ofrece como opción.
 */
export const camposAnteriores = (secciones: Seccion[], campos: Campo[], objetivo: Campo): Campo[] => {
  const orden = ordenGlobal(secciones, campos)
  const yaExiste = campos.some(c => c.id === objetivo.id)
  const iSeccionObjetivo = secciones.findIndex(s => s.id === objetivo.seccion)
  return orden.filter(c => {
    if (c.id === objetivo.id) return false
    const iSeccionC = secciones.findIndex(s => s.id === c.seccion)
    if (iSeccionC !== iSeccionObjetivo) return iSeccionC < iSeccionObjetivo
    // Misma sección: si el campo ya existe, solo cuentan los que están antes
    // de él en el orden real. Si es nuevo, entra al final de la sección, así
    // que todo lo que ya está ahí cuenta como anterior.
    return yaExiste ? orden.indexOf(c) < orden.indexOf(objetivo) : true
  })
}

/** Qué claves del catálogo usa hoy el formulario. */
export const clavesUsadas = (campos: Campo[]) =>
  new Set(campos.map(c => c.estandar).filter(Boolean) as ClaveEstandar[])

/**
 * Las opciones que le tocan a un campo, con los valores de esta empresa.
 *
 * Es el único lugar que resuelve esto. Antes la lista vivía dos veces —cableada
 * en el campo y editable en el catálogo— y el formulario usaba la cableada, así
 * que la pantalla de catálogos no cambiaba nada de lo que veía el cliente.
 */
export const opcionesDe = (c: Campo, catalogos: Record<string, string[]>): string[] =>
  c.catalogo ? (catalogos[c.catalogo] ?? []) : (c.opciones ?? [])
