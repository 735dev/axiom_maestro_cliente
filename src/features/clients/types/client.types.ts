/**
 * Flujo del expediente:
 *
 *   BORRADOR → PENDIENTE → EN REVISIÓN → REVISADO → APROBADO | RECHAZADO
 *                                                     APROBADO → INHABILITADO
 *
 * REVISADO lo escribe Axiom Prevención (el otro sistema): dice que la unidad
 * terminó de revisar, no que aprueba. La decisión —APROBADO o RECHAZADO— la
 * toma el administrador de la empresa acá, con el permiso `registros.aprobar`.
 * INHABILITADO solo se alcanza desde APROBADO, exige motivo escrito y no
 * borra nada: es la baja de un cliente que ya estaba habilitado.
 */
export type Status = 'BORRADOR' | 'PENDIENTE' | 'EN REVISIÓN' | 'REVISADO' | 'APROBADO' | 'RECHAZADO' | 'INHABILITADO'

export type Person = {
  id: string
  name: string
  document: string
  nationality: string
  rol: 'Accionista' | 'Beneficiario final' | 'Representante legal'
  porcentaje?: number
  cargo?: string
  pep: boolean
  pepRole?: string
  pepSince?: string
}

export type Client = {
  /** Dueño del dato. Va en toda entidad desde el día uno: agregarlo después,
   *  sobre datos vivos y con auditoría de cinco años, es un proyecto aparte. */
  companyId: string
  code: string
  legalName: string
  rif: string
  tipo: string
  registro: string
  registroNumero?: string
  registroTomo?: string
  registroFolio?: string
  subscribedCapital?: string
  currentCapital?: string
  redes?: string
  activityDetail?: string
  servicios?: string[]
  address: string
  phone: string
  email: string
  web: string
  sector: string
  activity: string
  fundOrigin: string
  ingresos: string
  declaredAmount: string
  frequency: string
  status: Status
  /** Resultado que escribió Prevención. La decisión comercial sigue en `estado`. */
  verificationStatus?: string
  riskLevel?: string
  reviewNotes?: string
  verificadoPor?: string
  verificationDate?: string
  registeredBy: string
  registeredAt: string
  /** Hasta qué bloque llegó el cliente si dejó el registro a medias. */
  stepReached?: number
  people: Person[]
  portalAnswers?: Record<string, unknown>
}

export const CLIENTS: Client[] = []

export type Lista = { name: string; agency: string; tipo: string; description: string; actualizada: string }
export const WATCHLISTS: Lista[] = [
  { name: 'Consejo de Seguridad ONU (CSNU)', agency: 'Naciones Unidas', tipo: 'Sanciones', description: 'Lista consolidada de personas y entidades sujetas a sanciones del Consejo de Seguridad. Única de reporte obligatorio.', actualizada: '2026-08-26 06:00' },
  { name: 'OFAC — SDN List', agency: 'Departamento del Tesoro, EE.UU.', tipo: 'Sanciones', description: 'Specially Designated Nationals and Blocked Persons.', actualizada: '2026-08-26 06:00' },
  { name: 'OFAC — Consolidated Sanctions', agency: 'Departamento del Tesoro, EE.UU.', tipo: 'Sanciones', description: 'Listados no-SDN: SSI, FSE, PLC y otros programas.', actualizada: '2026-08-26 06:00' },
  { name: 'Unión Europea — Sanciones financieras', agency: 'Comisión Europea', tipo: 'Sanciones', description: 'Listado consolidado de medidas restrictivas de la UE.', actualizada: '2026-08-25 18:00' },
  { name: 'Reino Unido — OFSI', agency: 'HM Treasury', tipo: 'Sanciones', description: 'Consolidated List of Financial Sanctions Targets.', actualizada: '2026-08-25 18:00' },
  { name: 'Canadá — SEMA / JVCFOA', agency: 'Global Affairs Canada', tipo: 'Sanciones', description: 'Personas y entidades sancionadas por Canadá.', actualizada: '2026-08-25 18:00' },
  { name: 'Interpol — Notificaciones rojas', agency: 'Interpol', tipo: 'Law enforcement', description: 'Personas buscadas con notificación roja vigente.', actualizada: '2026-08-26 06:00' },
  { name: 'PEP Internacionales', agency: 'Agregador del proveedor', tipo: 'PEP', description: 'Personas expuestas políticamente de jurisdicción extranjera, con cargo y período.', actualizada: '2026-08-26 06:00' },
  { name: 'PEP Nacionales', agency: 'Agregador del proveedor', tipo: 'PEP', description: 'Personas expuestas políticamente en Venezuela, con cargo y período.', actualizada: '2026-08-26 06:00' },
  { name: 'Medios adversos', agency: 'Agregador del proveedor', tipo: 'Medios adversos', description: 'Menciones en prensa vinculadas a delitos financieros, corrupción o crimen organizado.', actualizada: '2026-08-26 06:00' },
]

export type Match = {
  id: string
  person: string
  list: string
  tipo: string
  score: number
  detalle: string
  alias?: string
  nacimiento?: string
  status: 'nuevo' | 'falso-positivo' | 'confirmado'
  justification?: string
}

export const INITIAL_MATCHES: Record<string, Match[]> = {
  '002': [
    { id: 'm1', person: 'Luis Alberto Jiménez', list: 'PEP Nacionales', tipo: 'PEP', score: 96, detalle: 'Director de instituto autónomo del sector transporte entre 2016 y 2019. Cargo cesado; dentro del lapso de cinco años.', nacimiento: '1968-04-11', status: 'nuevo' },
    { id: 'm2', person: 'Carmen Elena Rojas', list: 'OFAC — SDN List', tipo: 'Sanciones', score: 71, detalle: 'Coincidencia parcial de nombre con persona designada en programa VENEZUELA-EO13850. Fecha de nacimiento y documento no coinciden.', alias: 'Carmen E. Rojas Peña', nacimiento: '1959-11-02', status: 'nuevo' },
  ],
  '004': [
    { id: 'm3', person: 'Celestino Turmero Blanco', list: 'PEP Nacionales', tipo: 'PEP', score: 88, detalle: 'Registro histórico: figuró como PEP hasta 2022 por cargo en organismo de seguridad. El lapso de cinco años se cumplió; hoy no figura activo.', nacimiento: '1962-07-30', status: 'nuevo' },
  ],
  '005': [
    { id: 'm4', person: 'Viktor Anatolyevich Petrov', list: 'Consejo de Seguridad ONU (CSNU)', tipo: 'Sanciones', score: 99, detalle: 'Persona designada en la lista consolidada del Consejo de Seguridad. Coincidencia de nombre, fecha de nacimiento y número de pasaporte.', nacimiento: '1971-03-18', status: 'confirmado' },
    { id: 'm5', person: 'Viktor Anatolyevich Petrov', list: 'Unión Europea — Sanciones financieras', tipo: 'Sanciones', score: 97, detalle: 'Medida restrictiva vigente de la Unión Europea sobre la misma persona.', nacimiento: '1971-03-18', status: 'confirmado' },
  ],
}

export type RiskFactor = { id: string; name: string; peso: number; description: string }
export const FACTORS: RiskFactor[] = [
  { id: 'pep', name: 'Condición PEP', peso: 30, description: 'La persona vinculada figura como expuesta políticamente' },
  { id: 'nac', name: 'Nacionalidad', peso: 15, description: 'Jurisdicción de la persona o de la empresa' },
  { id: 'sec', name: 'Sector económico', peso: 20, description: 'Actividad declarada por el cliente' },
  { id: 'fon', name: 'Origen de fondos', peso: 15, description: 'Procedencia declarada de los recursos' },
  { id: 'ing', name: 'Rango de ingresos', peso: 10, description: 'Volumen declarado del cliente' },
  { id: 'res', name: 'País de residencia', peso: 10, description: 'Domicilio fiscal y de operación' },
]

export type AuditLogEntry = {
  fecha: string; user: string; rol: string; sistema: 'Maestro' | 'Prevención'
  action: string; detalle: string; reason?: string
}
export const AUDIT_LOG: AuditLogEntry[] = []

export const CATALOGS: Record<string, string[]> = {
  'Actividad económica': ['Banca universal', 'Banca microfinanciera', 'Casa de cambio', 'Seguros', 'Cadena de supermercados', 'Producción de alimentos', 'Desarrollo inmobiliario', 'Transporte de valores', 'Juegos de azar'],
  'Sector económico': ['Banca y servicios financieros', 'Seguros', 'Comercio al detal', 'Manufactura', 'Inmobiliaria', 'Casino y juegos de azar', 'Transporte de valores', 'Otro'],
  'Tipo de empresa jurídica': ['Compañía Anónima', 'Sociedad Anónima', 'Sociedad de Responsabilidad Limitada', 'Firma Personal', 'Cooperativa', 'Fundación'],
  'Origen de fondos': ['Operaciones comerciales propias', 'Operaciones propias', 'Inversión de accionistas', 'Créditos bancarios', 'Rendimientos financieros', 'Mixto', 'Otro'],
}

export const SERVICES = ['Custodia de valores', 'Traslado de valores', 'Carga de cajeros automáticos']

export const INCOME_RANGES = ['Menos de $100k', '$100k – $500k', '$500k – $1M', '$1M – $5M', '$5M – $10M', '$10M – $50M', 'Más de $50M']

export const USERS = [
  { name: 'Oriana Méndez', rol: 'Comercialización', sistemas: 'Maestro' },
  { name: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistemas: 'Maestro (lectura) · Prevención' },
  { name: 'Marcos Ledezma', rol: 'Analista', sistemas: 'Maestro (lectura) · Prevención' },
  { name: 'Luis Bermúdez', rol: 'Auditoría', sistemas: 'Los dos, solo lectura' },
  { name: 'Yeniré Castillo', rol: 'Comercialización', sistemas: 'Maestro' },
]
