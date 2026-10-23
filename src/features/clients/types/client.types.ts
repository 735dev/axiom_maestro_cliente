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

export const CLIENTS: Client[] = [
  {
    companyId: 'transvalor',
    code: '001', legalName: 'Banco Venezolano de Crédito, S.A.', rif: 'J-00002950-4',
    tipo: 'Sociedad Anónima', registro: 'Reg. Mercantil I, Tomo 42-A, Folio 77',
    address: 'Av. Alameda, Edif. Torre BVC, El Rosal, Caracas',
    phone: '+58 212 501-1111', email: 'cumplimiento@bvc.com.ve', web: 'www.venezolano.com',
    sector: 'Banca y servicios financieros', activity: 'Banca universal',
    fundOrigin: 'Operaciones propias', ingresos: 'Más de $50M',
    declaredAmount: '$4.500.000', frequency: 'Mensual',
    status: 'APROBADO', verificadoPor: 'Evelina Rodríguez', verificationDate: '2026-08-14',
    registeredBy: 'Oriana Méndez', registeredAt: '2026-08-11',
    people: [
      { id: 'p1', name: 'Óscar García Mendoza', document: 'V-6.911.204', nationality: 'Venezolana', rol: 'Accionista', porcentaje: 34, pep: false },
      { id: 'p2', name: 'Inversiones Alameda C.A.', document: 'J-30112998-1', nationality: 'Venezolana', rol: 'Accionista', porcentaje: 41, pep: false },
      { id: 'p3', name: 'María Teresa Lugo', document: 'V-10.442.881', nationality: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p4', name: 'Rafael Antonio Pérez', document: 'V-7.883.120', nationality: 'Venezolana', rol: 'Representante legal', cargo: 'Vicepresidente de Cumplimiento', pep: false },
    ],
  },
  {
    companyId: 'transvalor',
    code: '002', legalName: 'Banca Amiga, Banco Microfinanciero C.A.', rif: 'J-31234567-8',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil V, Tomo 18-A, Folio 121',
    address: 'Av. Francisco de Miranda, Torre Cavendes, Caracas',
    phone: '+58 212 700-2020', email: 'prevencion@bancaamiga.com', web: 'www.bancaamiga.com',
    sector: 'Banca y servicios financieros', activity: 'Banca microfinanciera',
    fundOrigin: 'Operaciones propias', ingresos: '$10M – $50M',
    declaredAmount: '$1.200.000', frequency: 'Quincenal',
    status: 'REVISADO',
    registeredBy: 'Oriana Méndez', registeredAt: '2026-08-22',
    people: [
      { id: 'p5', name: 'Luis Alberto Jiménez', document: 'V-9.220.117', nationality: 'Venezolana', rol: 'Accionista', porcentaje: 52, pep: true, pepRole: 'Ex-director de instituto autónomo', pepSince: '2019' },
      { id: 'p6', name: 'Carmen Elena Rojas', document: 'V-12.771.309', nationality: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p7', name: 'José Gregorio Salas', document: 'V-8.442.019', nationality: 'Venezolana', rol: 'Representante legal', cargo: 'Gerente General', pep: false },
    ],
  },
  {
    companyId: 'transvalor',
    code: '003', legalName: 'Central Madeirense C.A.', rif: 'J-00043210-6',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil II, Tomo 9-A, Folio 33',
    address: 'Zona Industrial La Yaguara, Caracas',
    phone: '+58 212 461-8080', email: 'admin@centralmadeirense.com', web: 'www.centralmadeirense.com',
    sector: 'Comercio al detal', activity: 'Cadena de supermercados',
    fundOrigin: 'Operaciones comerciales propias', ingresos: '$10M – $50M',
    declaredAmount: '$800.000', frequency: 'Semanal',
    status: 'PENDIENTE',
    registeredBy: 'Yeniré Castillo', registeredAt: '2026-08-25',
    people: [
      { id: 'p8', name: 'Manuel Freitas Sousa', document: 'V-5.112.887', nationality: 'Portuguesa', rol: 'Accionista', porcentaje: 60, pep: false },
      { id: 'p9', name: 'Ana Sofía Freitas', document: 'V-14.882.001', nationality: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p10', name: 'Pedro Nunes Barreto', document: 'V-6.330.712', nationality: 'Venezolana', rol: 'Representante legal', cargo: 'Director de Operaciones', pep: false },
    ],
  },
  {
    companyId: 'transvalor',
    code: '004', legalName: 'Inversiones Fórum 2010 C.A.', rif: 'J-29887654-0',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil IV, Tomo 55-A, Folio 12',
    address: 'Av. Libertador, Chacao, Caracas',
    phone: '+58 212 265-4400', email: 'contacto@forum2010.com', web: '—',
    sector: 'Inmobiliaria', activity: 'Desarrollo y alquiler de inmuebles',
    fundOrigin: 'Inversión de accionistas', ingresos: '$1M – $10M',
    declaredAmount: '$350.000', frequency: 'Mensual',
    status: 'PENDIENTE',
    registeredBy: 'Oriana Méndez', registeredAt: '2026-08-26',
    people: [
      { id: 'p11', name: 'Celestino Turmero Blanco', document: 'V-4.220.918', nationality: 'Venezolana', rol: 'Accionista', porcentaje: 70, pep: false },
      { id: 'p12', name: 'Gabriela Turmero León', document: 'V-16.004.223', nationality: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p13', name: 'Celestino Turmero Blanco', document: 'V-4.220.918', nationality: 'Venezolana', rol: 'Representante legal', cargo: 'Presidente', pep: false },
    ],
  },
  {
    companyId: 'transvalor',
    code: '005', legalName: 'Chocolates El Rey C.A.', rif: 'J-00035512-9',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil I, Tomo 3-A, Folio 88',
    address: 'Zona Industrial Barquisimeto, Lara',
    phone: '+58 251 442-1200', email: 'admin@chocolateselrey.com', web: 'www.chocolateselrey.com',
    sector: 'Manufactura', activity: 'Producción de chocolate',
    fundOrigin: 'Operaciones comerciales propias', ingresos: '$1M – $10M',
    declaredAmount: '$210.000', frequency: 'Mensual',
    status: 'RECHAZADO', verificadoPor: 'Evelina Rodríguez', verificationDate: '2026-08-19',
    registeredBy: 'Yeniré Castillo', registeredAt: '2026-08-15',
    people: [
      { id: 'p14', name: 'Jorge Redmond Schlageter', document: 'V-3.118.240', nationality: 'Venezolana', rol: 'Accionista', porcentaje: 45, pep: false },
      { id: 'p15', name: 'Viktor Anatolyevich Petrov', document: 'P-7712004', nationality: 'Rusa', rol: 'Beneficiario final', pep: false },
      { id: 'p16', name: 'Luisa Marcano Díaz', document: 'V-11.203.554', nationality: 'Venezolana', rol: 'Representante legal', cargo: 'Gerente de Administración', pep: false },
    ],
  },
  {
    companyId: 'transvalor',
    code: '007', legalName: 'Distribuidora Andina C.A.', rif: 'J-40551188-7',
    tipo: 'Compañía Anónima', registro: 'N.º 14, Tomo 8-A, Folio 55',
    address: '', phone: '', email: '', web: '',
    sector: 'Comercio al detal', activity: '',
    fundOrigin: 'Operaciones comerciales propias', ingresos: '$1M – $5M',
    declaredAmount: '', frequency: 'Mensual',
    status: 'BORRADOR', stepReached: 2,
    registeredBy: 'El propio cliente', registeredAt: '2026-08-30',
    people: [],
  },
]

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
export const AUDIT_LOG: AuditLogEntry[] = [
  { fecha: '2026-08-26 14:32', user: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', action: 'Alta de cliente', detalle: 'Inversiones Fórum 2010 C.A. — código 004 asignado' },
  { fecha: '2026-08-26 14:35', user: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', action: 'Alta de persona vinculada', detalle: 'Celestino Turmero Blanco — Accionista 70%' },
  { fecha: '2026-08-26 15:02', user: 'Marcos Ledezma', rol: 'Analista', sistema: 'Prevención', action: 'Consulta jerárquica', detalle: 'Cliente 004 y 3 personas vinculadas contra 10 listas' },
  { fecha: '2026-08-26 15:04', user: 'Marcos Ledezma', rol: 'Analista', sistema: 'Prevención', action: 'Coincidencia detectada', detalle: 'Celestino Turmero Blanco — PEP Nacionales — puntaje 88' },
  { fecha: '2026-08-25 11:20', user: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', action: 'Cambio de ponderación', detalle: 'Factor "País de residencia": 5 → 10', reason: 'Resolución SUDEBAN 042-2026 reclasifica Distrito Capital a riesgo alto' },
  { fecha: '2026-08-19 16:48', user: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', action: 'Expediente rechazado', detalle: 'Chocolates El Rey C.A. — código 005', reason: 'Beneficiario final con designación vigente en lista CSNU. Reporte obligatorio emitido a la Superintendencia.' },
  { fecha: '2026-08-19 16:44', user: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', action: 'Reporte emitido', detalle: 'Reporte de consulta TVO-2026-0188, código de verificación 7K4M-92XB' },
  { fecha: '2026-08-14 09:15', user: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', action: 'Expediente aprobado', detalle: 'Banco Venezolano de Crédito — código 001 — riesgo MODERADO', reason: 'Sin coincidencias en listas de sanciones. Perfil consistente con la actividad declarada.' },
  { fecha: '2026-08-14 09:15', user: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Maestro', action: 'Veredicto escrito', detalle: 'Cliente 001: estado APROBADO' },
  { fecha: '2026-08-11 08:40', user: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', action: 'Alta de cliente', detalle: 'Banco Venezolano de Crédito — código 001 asignado' },
]

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
