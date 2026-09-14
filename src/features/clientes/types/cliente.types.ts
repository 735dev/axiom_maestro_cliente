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
export type Estado = 'BORRADOR' | 'PENDIENTE' | 'EN REVISIÓN' | 'REVISADO' | 'APROBADO' | 'RECHAZADO' | 'INHABILITADO'

export type Persona = {
  id: string
  nombre: string
  documento: string
  nacionalidad: string
  rol: 'Accionista' | 'Beneficiario final' | 'Representante legal'
  porcentaje?: number
  cargo?: string
  pep: boolean
  pepCargo?: string
  pepDesde?: string
}

export type Cliente = {
  /** Dueño del dato. Va en toda entidad desde el día uno: agregarlo después,
   *  sobre datos vivos y con auditoría de cinco años, es un proyecto aparte. */
  empresaId: string
  codigo: string
  razonSocial: string
  rif: string
  tipo: string
  registro: string
  registroNumero?: string
  registroTomo?: string
  registroFolio?: string
  capitalSuscrito?: string
  capitalActual?: string
  redes?: string
  actividadDetalle?: string
  servicios?: string[]
  domicilio: string
  telefono: string
  correo: string
  web: string
  sector: string
  actividad: string
  origenFondos: string
  ingresos: string
  montoDeclarado: string
  frecuencia: string
  estado: Estado
  /** El riesgo lo lleva Prevención. El Maestro solo sabe en qué punto del
   *  flujo está el expediente — ver `Estado` —, nunca cuán riesgoso es. */
  verificadoPor?: string
  fechaVerificacion?: string
  registradoPor: string
  fechaRegistro: string
  /** Hasta qué bloque llegó el cliente si dejó el registro a medias. */
  pasoAlcanzado?: number
  personas: Persona[]
  respuestasPortal?: Record<string, unknown>
}

export const CLIENTES: Cliente[] = [
  {
    empresaId: 'transvalor',
    codigo: '001', razonSocial: 'Banco Venezolano de Crédito, S.A.', rif: 'J-00002950-4',
    tipo: 'Sociedad Anónima', registro: 'Reg. Mercantil I, Tomo 42-A, Folio 77',
    domicilio: 'Av. Alameda, Edif. Torre BVC, El Rosal, Caracas',
    telefono: '+58 212 501-1111', correo: 'cumplimiento@bvc.com.ve', web: 'www.venezolano.com',
    sector: 'Banca y servicios financieros', actividad: 'Banca universal',
    origenFondos: 'Operaciones propias', ingresos: 'Más de $50M',
    montoDeclarado: '$4.500.000', frecuencia: 'Mensual',
    estado: 'APROBADO', verificadoPor: 'Evelina Rodríguez', fechaVerificacion: '2026-08-14',
    registradoPor: 'Oriana Méndez', fechaRegistro: '2026-08-11',
    personas: [
      { id: 'p1', nombre: 'Óscar García Mendoza', documento: 'V-6.911.204', nacionalidad: 'Venezolana', rol: 'Accionista', porcentaje: 34, pep: false },
      { id: 'p2', nombre: 'Inversiones Alameda C.A.', documento: 'J-30112998-1', nacionalidad: 'Venezolana', rol: 'Accionista', porcentaje: 41, pep: false },
      { id: 'p3', nombre: 'María Teresa Lugo', documento: 'V-10.442.881', nacionalidad: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p4', nombre: 'Rafael Antonio Pérez', documento: 'V-7.883.120', nacionalidad: 'Venezolana', rol: 'Representante legal', cargo: 'Vicepresidente de Cumplimiento', pep: false },
    ],
  },
  {
    empresaId: 'transvalor',
    codigo: '002', razonSocial: 'Banca Amiga, Banco Microfinanciero C.A.', rif: 'J-31234567-8',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil V, Tomo 18-A, Folio 121',
    domicilio: 'Av. Francisco de Miranda, Torre Cavendes, Caracas',
    telefono: '+58 212 700-2020', correo: 'prevencion@bancaamiga.com', web: 'www.bancaamiga.com',
    sector: 'Banca y servicios financieros', actividad: 'Banca microfinanciera',
    origenFondos: 'Operaciones propias', ingresos: '$10M – $50M',
    montoDeclarado: '$1.200.000', frecuencia: 'Quincenal',
    estado: 'REVISADO',
    registradoPor: 'Oriana Méndez', fechaRegistro: '2026-08-22',
    personas: [
      { id: 'p5', nombre: 'Luis Alberto Jiménez', documento: 'V-9.220.117', nacionalidad: 'Venezolana', rol: 'Accionista', porcentaje: 52, pep: true, pepCargo: 'Ex-director de instituto autónomo', pepDesde: '2019' },
      { id: 'p6', nombre: 'Carmen Elena Rojas', documento: 'V-12.771.309', nacionalidad: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p7', nombre: 'José Gregorio Salas', documento: 'V-8.442.019', nacionalidad: 'Venezolana', rol: 'Representante legal', cargo: 'Gerente General', pep: false },
    ],
  },
  {
    empresaId: 'transvalor',
    codigo: '003', razonSocial: 'Central Madeirense C.A.', rif: 'J-00043210-6',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil II, Tomo 9-A, Folio 33',
    domicilio: 'Zona Industrial La Yaguara, Caracas',
    telefono: '+58 212 461-8080', correo: 'admin@centralmadeirense.com', web: 'www.centralmadeirense.com',
    sector: 'Comercio al detal', actividad: 'Cadena de supermercados',
    origenFondos: 'Operaciones comerciales propias', ingresos: '$10M – $50M',
    montoDeclarado: '$800.000', frecuencia: 'Semanal',
    estado: 'PENDIENTE',
    registradoPor: 'Yeniré Castillo', fechaRegistro: '2026-08-25',
    personas: [
      { id: 'p8', nombre: 'Manuel Freitas Sousa', documento: 'V-5.112.887', nacionalidad: 'Portuguesa', rol: 'Accionista', porcentaje: 60, pep: false },
      { id: 'p9', nombre: 'Ana Sofía Freitas', documento: 'V-14.882.001', nacionalidad: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p10', nombre: 'Pedro Nunes Barreto', documento: 'V-6.330.712', nacionalidad: 'Venezolana', rol: 'Representante legal', cargo: 'Director de Operaciones', pep: false },
    ],
  },
  {
    empresaId: 'transvalor',
    codigo: '004', razonSocial: 'Inversiones Fórum 2010 C.A.', rif: 'J-29887654-0',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil IV, Tomo 55-A, Folio 12',
    domicilio: 'Av. Libertador, Chacao, Caracas',
    telefono: '+58 212 265-4400', correo: 'contacto@forum2010.com', web: '—',
    sector: 'Inmobiliaria', actividad: 'Desarrollo y alquiler de inmuebles',
    origenFondos: 'Inversión de accionistas', ingresos: '$1M – $10M',
    montoDeclarado: '$350.000', frecuencia: 'Mensual',
    estado: 'PENDIENTE',
    registradoPor: 'Oriana Méndez', fechaRegistro: '2026-08-26',
    personas: [
      { id: 'p11', nombre: 'Celestino Turmero Blanco', documento: 'V-4.220.918', nacionalidad: 'Venezolana', rol: 'Accionista', porcentaje: 70, pep: false },
      { id: 'p12', nombre: 'Gabriela Turmero León', documento: 'V-16.004.223', nacionalidad: 'Venezolana', rol: 'Beneficiario final', pep: false },
      { id: 'p13', nombre: 'Celestino Turmero Blanco', documento: 'V-4.220.918', nacionalidad: 'Venezolana', rol: 'Representante legal', cargo: 'Presidente', pep: false },
    ],
  },
  {
    empresaId: 'transvalor',
    codigo: '005', razonSocial: 'Chocolates El Rey C.A.', rif: 'J-00035512-9',
    tipo: 'Compañía Anónima', registro: 'Reg. Mercantil I, Tomo 3-A, Folio 88',
    domicilio: 'Zona Industrial Barquisimeto, Lara',
    telefono: '+58 251 442-1200', correo: 'admin@chocolateselrey.com', web: 'www.chocolateselrey.com',
    sector: 'Manufactura', actividad: 'Producción de chocolate',
    origenFondos: 'Operaciones comerciales propias', ingresos: '$1M – $10M',
    montoDeclarado: '$210.000', frecuencia: 'Mensual',
    estado: 'RECHAZADO', verificadoPor: 'Evelina Rodríguez', fechaVerificacion: '2026-08-19',
    registradoPor: 'Yeniré Castillo', fechaRegistro: '2026-08-15',
    personas: [
      { id: 'p14', nombre: 'Jorge Redmond Schlageter', documento: 'V-3.118.240', nacionalidad: 'Venezolana', rol: 'Accionista', porcentaje: 45, pep: false },
      { id: 'p15', nombre: 'Viktor Anatolyevich Petrov', documento: 'P-7712004', nacionalidad: 'Rusa', rol: 'Beneficiario final', pep: false },
      { id: 'p16', nombre: 'Luisa Marcano Díaz', documento: 'V-11.203.554', nacionalidad: 'Venezolana', rol: 'Representante legal', cargo: 'Gerente de Administración', pep: false },
    ],
  },
  {
    empresaId: 'transvalor',
    codigo: '007', razonSocial: 'Distribuidora Andina C.A.', rif: 'J-40551188-7',
    tipo: 'Compañía Anónima', registro: 'N.º 14, Tomo 8-A, Folio 55',
    domicilio: '', telefono: '', correo: '', web: '',
    sector: 'Comercio al detal', actividad: '',
    origenFondos: 'Operaciones comerciales propias', ingresos: '$1M – $5M',
    montoDeclarado: '', frecuencia: 'Mensual',
    estado: 'BORRADOR', pasoAlcanzado: 2,
    registradoPor: 'El propio cliente', fechaRegistro: '2026-08-30',
    personas: [],
  },
]

export type Lista = { nombre: string; organismo: string; tipo: string; descripcion: string; actualizada: string }
export const LISTAS: Lista[] = [
  { nombre: 'Consejo de Seguridad ONU (CSNU)', organismo: 'Naciones Unidas', tipo: 'Sanciones', descripcion: 'Lista consolidada de personas y entidades sujetas a sanciones del Consejo de Seguridad. Única de reporte obligatorio.', actualizada: '2026-08-26 06:00' },
  { nombre: 'OFAC — SDN List', organismo: 'Departamento del Tesoro, EE.UU.', tipo: 'Sanciones', descripcion: 'Specially Designated Nationals and Blocked Persons.', actualizada: '2026-08-26 06:00' },
  { nombre: 'OFAC — Consolidated Sanctions', organismo: 'Departamento del Tesoro, EE.UU.', tipo: 'Sanciones', descripcion: 'Listados no-SDN: SSI, FSE, PLC y otros programas.', actualizada: '2026-08-26 06:00' },
  { nombre: 'Unión Europea — Sanciones financieras', organismo: 'Comisión Europea', tipo: 'Sanciones', descripcion: 'Listado consolidado de medidas restrictivas de la UE.', actualizada: '2026-08-25 18:00' },
  { nombre: 'Reino Unido — OFSI', organismo: 'HM Treasury', tipo: 'Sanciones', descripcion: 'Consolidated List of Financial Sanctions Targets.', actualizada: '2026-08-25 18:00' },
  { nombre: 'Canadá — SEMA / JVCFOA', organismo: 'Global Affairs Canada', tipo: 'Sanciones', descripcion: 'Personas y entidades sancionadas por Canadá.', actualizada: '2026-08-25 18:00' },
  { nombre: 'Interpol — Notificaciones rojas', organismo: 'Interpol', tipo: 'Law enforcement', descripcion: 'Personas buscadas con notificación roja vigente.', actualizada: '2026-08-26 06:00' },
  { nombre: 'PEP Internacionales', organismo: 'Agregador del proveedor', tipo: 'PEP', descripcion: 'Personas expuestas políticamente de jurisdicción extranjera, con cargo y período.', actualizada: '2026-08-26 06:00' },
  { nombre: 'PEP Nacionales', organismo: 'Agregador del proveedor', tipo: 'PEP', descripcion: 'Personas expuestas políticamente en Venezuela, con cargo y período.', actualizada: '2026-08-26 06:00' },
  { nombre: 'Medios adversos', organismo: 'Agregador del proveedor', tipo: 'Medios adversos', descripcion: 'Menciones en prensa vinculadas a delitos financieros, corrupción o crimen organizado.', actualizada: '2026-08-26 06:00' },
]

export type Match = {
  id: string
  persona: string
  lista: string
  tipo: string
  puntaje: number
  detalle: string
  alias?: string
  nacimiento?: string
  estado: 'nuevo' | 'falso-positivo' | 'confirmado'
  justificacion?: string
}

export const MATCHES_INICIALES: Record<string, Match[]> = {
  '002': [
    { id: 'm1', persona: 'Luis Alberto Jiménez', lista: 'PEP Nacionales', tipo: 'PEP', puntaje: 96, detalle: 'Director de instituto autónomo del sector transporte entre 2016 y 2019. Cargo cesado; dentro del lapso de cinco años.', nacimiento: '1968-04-11', estado: 'nuevo' },
    { id: 'm2', persona: 'Carmen Elena Rojas', lista: 'OFAC — SDN List', tipo: 'Sanciones', puntaje: 71, detalle: 'Coincidencia parcial de nombre con persona designada en programa VENEZUELA-EO13850. Fecha de nacimiento y documento no coinciden.', alias: 'Carmen E. Rojas Peña', nacimiento: '1959-11-02', estado: 'nuevo' },
  ],
  '004': [
    { id: 'm3', persona: 'Celestino Turmero Blanco', lista: 'PEP Nacionales', tipo: 'PEP', puntaje: 88, detalle: 'Registro histórico: figuró como PEP hasta 2022 por cargo en organismo de seguridad. El lapso de cinco años se cumplió; hoy no figura activo.', nacimiento: '1962-07-30', estado: 'nuevo' },
  ],
  '005': [
    { id: 'm4', persona: 'Viktor Anatolyevich Petrov', lista: 'Consejo de Seguridad ONU (CSNU)', tipo: 'Sanciones', puntaje: 99, detalle: 'Persona designada en la lista consolidada del Consejo de Seguridad. Coincidencia de nombre, fecha de nacimiento y número de pasaporte.', nacimiento: '1971-03-18', estado: 'confirmado' },
    { id: 'm5', persona: 'Viktor Anatolyevich Petrov', lista: 'Unión Europea — Sanciones financieras', tipo: 'Sanciones', puntaje: 97, detalle: 'Medida restrictiva vigente de la Unión Europea sobre la misma persona.', nacimiento: '1971-03-18', estado: 'confirmado' },
  ],
}

export type FactorRiesgo = { id: string; nombre: string; peso: number; descripcion: string }
export const FACTORES: FactorRiesgo[] = [
  { id: 'pep', nombre: 'Condición PEP', peso: 30, descripcion: 'La persona vinculada figura como expuesta políticamente' },
  { id: 'nac', nombre: 'Nacionalidad', peso: 15, descripcion: 'Jurisdicción de la persona o de la empresa' },
  { id: 'sec', nombre: 'Sector económico', peso: 20, descripcion: 'Actividad declarada por el cliente' },
  { id: 'fon', nombre: 'Origen de fondos', peso: 15, descripcion: 'Procedencia declarada de los recursos' },
  { id: 'ing', nombre: 'Rango de ingresos', peso: 10, descripcion: 'Volumen declarado del cliente' },
  { id: 'res', nombre: 'País de residencia', peso: 10, descripcion: 'Domicilio fiscal y de operación' },
]

export type EntradaBitacora = {
  fecha: string; usuario: string; rol: string; sistema: 'Maestro' | 'Prevención'
  accion: string; detalle: string; motivo?: string
}
export const BITACORA: EntradaBitacora[] = [
  { fecha: '2026-08-26 14:32', usuario: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', accion: 'Alta de cliente', detalle: 'Inversiones Fórum 2010 C.A. — código 004 asignado' },
  { fecha: '2026-08-26 14:35', usuario: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', accion: 'Alta de persona vinculada', detalle: 'Celestino Turmero Blanco — Accionista 70%' },
  { fecha: '2026-08-26 15:02', usuario: 'Marcos Ledezma', rol: 'Analista', sistema: 'Prevención', accion: 'Consulta jerárquica', detalle: 'Cliente 004 y 3 personas vinculadas contra 10 listas' },
  { fecha: '2026-08-26 15:04', usuario: 'Marcos Ledezma', rol: 'Analista', sistema: 'Prevención', accion: 'Coincidencia detectada', detalle: 'Celestino Turmero Blanco — PEP Nacionales — puntaje 88' },
  { fecha: '2026-08-25 11:20', usuario: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', accion: 'Cambio de ponderación', detalle: 'Factor "País de residencia": 5 → 10', motivo: 'Resolución SUDEBAN 042-2026 reclasifica Distrito Capital a riesgo alto' },
  { fecha: '2026-08-19 16:48', usuario: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', accion: 'Expediente rechazado', detalle: 'Chocolates El Rey C.A. — código 005', motivo: 'Beneficiario final con designación vigente en lista CSNU. Reporte obligatorio emitido a la Superintendencia.' },
  { fecha: '2026-08-19 16:44', usuario: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', accion: 'Reporte emitido', detalle: 'Reporte de consulta TVO-2026-0188, código de verificación 7K4M-92XB' },
  { fecha: '2026-08-14 09:15', usuario: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Prevención', accion: 'Expediente aprobado', detalle: 'Banco Venezolano de Crédito — código 001 — riesgo MODERADO', motivo: 'Sin coincidencias en listas de sanciones. Perfil consistente con la actividad declarada.' },
  { fecha: '2026-08-14 09:15', usuario: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistema: 'Maestro', accion: 'Veredicto escrito', detalle: 'Cliente 001: estado APROBADO' },
  { fecha: '2026-08-11 08:40', usuario: 'Oriana Méndez', rol: 'Comercialización', sistema: 'Maestro', accion: 'Alta de cliente', detalle: 'Banco Venezolano de Crédito — código 001 asignado' },
]

export const CATALOGOS: Record<string, string[]> = {
  'Actividad económica': ['Banca universal', 'Banca microfinanciera', 'Casa de cambio', 'Seguros', 'Cadena de supermercados', 'Producción de alimentos', 'Desarrollo inmobiliario', 'Transporte de valores', 'Juegos de azar'],
  'Sector económico': ['Banca y servicios financieros', 'Seguros', 'Comercio al detal', 'Manufactura', 'Inmobiliaria', 'Casino y juegos de azar', 'Transporte de valores', 'Otro'],
  'Tipo de empresa jurídica': ['Compañía Anónima', 'Sociedad Anónima', 'Sociedad de Responsabilidad Limitada', 'Firma Personal', 'Cooperativa', 'Fundación'],
  'Origen de fondos': ['Operaciones comerciales propias', 'Operaciones propias', 'Inversión de accionistas', 'Créditos bancarios', 'Rendimientos financieros', 'Mixto', 'Otro'],
}

export const SERVICIOS = ['Custodia de valores', 'Traslado de valores', 'Carga de cajeros automáticos']

export const RANGOS_INGRESO = ['Menos de $100k', '$100k – $500k', '$500k – $1M', '$1M – $5M', '$5M – $10M', '$10M – $50M', 'Más de $50M']

export const USUARIOS = [
  { nombre: 'Oriana Méndez', rol: 'Comercialización', sistemas: 'Maestro' },
  { nombre: 'Evelina Rodríguez', rol: 'Oficial de Cumplimiento', sistemas: 'Maestro (lectura) · Prevención' },
  { nombre: 'Marcos Ledezma', rol: 'Analista', sistemas: 'Maestro (lectura) · Prevención' },
  { nombre: 'Luis Bermúdez', rol: 'Auditoría', sistemas: 'Los dos, solo lectura' },
  { nombre: 'Yeniré Castillo', rol: 'Comercialización', sistemas: 'Maestro' },
]
