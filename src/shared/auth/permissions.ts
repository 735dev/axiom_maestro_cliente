/**
 * Catálogo CERRADO de permisos.
 *
 * Lo define el sistema, no la pantalla: un permiso inventado desde la interfaz
 * no haría nada porque ningún proceso lo consulta. Agregar uno nuevo es
 * desarrollo, y por eso el control no se puede burlar creando permisos de
 * adorno.
 *
 * Cada permiso se describe acá y no en la pantalla que lo muestra. Quien arme
 * un rol el día de mañana tiene que poder leer qué habilita cada uno sin
 * preguntarle a quien escribió el código.
 */

export const PERMISSIONS = {
  recordsView: 'registros.ver',
  recordsCreate: 'registros.crear',
  recordsEdit: 'registros.editar',
  recordsPeople: 'registros.personas',
  recordsDeactivate: 'registros.inactivar',
  recordsApprove: 'registros.aprobar',
  recordsExport: 'registros.exportar',

  catalogsView: 'catalogos.ver',
  catalogsManage: 'catalogos.gestionar',
  formView: 'formulario.ver',
  formManage: 'formulario.gestionar',
  companyConfigure: 'empresa.configurar',
  integrationsManage: 'integraciones.gestionar',

  companiesView: 'empresas.ver',
  companiesCreate: 'empresas.crear',
  companiesEdit: 'empresas.editar',
  companiesSuspend: 'empresas.suspender',
  companiesDelete: 'empresas.borrar',
  retentionManage: 'retencion.gestionar',

  usersView: 'usuarios.ver',
  usersManage: 'usuarios.gestionar',
  rolesManage: 'roles.gestionar',

  auditLogView: 'bitacora.ver',
  auditLogExport: 'bitacora.exportar',
  reportsView: 'reportes.ver',
  reportsIssue: 'reportes.emitir',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Cuánto pesa un permiso.
 *
 * - `lectura`  Deja ver. No cambia nada.
 * - `escritura` Cambia datos del día a día.
 * - `critico`  Decide, saca datos del sistema o reparte poder. Es lo que un
 *              auditor va a revisar primero.
 */
export type Level = 'lectura' | 'escritura' | 'critico'

export type Group = 'Clientes' | 'Configuración' | 'Plataforma' | 'Administración' | 'Auditoría'

export type PermissionDefinition = {
  code: PermissionCode
  name: string
  /** Qué habilita, en concreto. Sin esto un rol se arma a ciegas. */
  description: string
  group: Group
  level: Level
  /**
   * `platform` solo lo ejerce el Super Admin (ámbito plataforma).
   * No se concede ni se muestra en roles de una empresa.
   */
  scope?: 'tenant' | 'platform'
  /** Permisos sin los cuales este no sirve. Se conceden junto con él. */
  implies?: PermissionCode[]
  /**
   * Con cuáles no debería convivir en el mismo rol, y por qué.
   *
   * No se prohíbe: se advierte. Hay empresas chicas donde la misma persona
   * hace las dos cosas, y esa decisión es del negocio. Lo que el sistema no
   * puede hacer es dejar que ocurra sin que nadie se entere.
   */
  tension?: { con: PermissionCode; because: string }
}

const P = PERMISSIONS

export const CATALOG: PermissionDefinition[] = [
  /* ---------------- Clientes ---------------- */
  {
    code: P.recordsView, name: 'Ver clientes', group: 'Clientes', level: 'lectura',
    description: 'Entrar al listado de clientes y abrir la ficha de cualquiera de ellos.',
  },
  {
    code: P.recordsCreate, name: 'Registrar clientes', group: 'Clientes', level: 'escritura',
    description: 'Dar de alta un cliente nuevo. El sistema le asigna su código.',
    implies: [P.recordsView],
    tension: {
      con: P.recordsApprove,
      because: 'Quien registra un expediente no debería ser quien lo aprueba. El sistema ya impide que la misma persona haga las dos cosas sobre el mismo cliente, pero tener ambos permisos deja esa protección apoyada en un solo control.',
    },
  },
  {
    code: P.recordsEdit, name: 'Editar la ficha', group: 'Clientes', level: 'escritura',
    description: 'Corregir los datos de un cliente ya registrado. No incluye el veredicto, que lo escribe Prevención.',
    implies: [P.recordsView],
  },
  {
    code: P.recordsPeople, name: 'Gestionar personas vinculadas', group: 'Clientes', level: 'escritura',
    description: 'Agregar y quitar accionistas, beneficiarios finales y representantes legales.',
    implies: [P.recordsView],
  },
  {
    code: P.recordsDeactivate, name: 'Inactivar clientes', group: 'Clientes', level: 'critico',
    description: 'Sacar un cliente de circulación. No borra: conserva toda su historia y exige motivo escrito.',
    implies: [P.recordsView],
  },
  {
    code: P.recordsApprove, name: 'Aprobar, rechazar o inhabilitar', group: 'Clientes', level: 'critico',
    description: 'Decidir si un cliente queda habilitado. Es la decisión que el regulador va a revisar.',
    implies: [P.recordsView],
    tension: {
      con: P.recordsCreate,
      because: 'Registrar y aprobar en la misma persona rompe la separación de funciones que sostiene el expediente.',
    },
  },
  {
    code: P.recordsExport, name: 'Exportar clientes', group: 'Clientes', level: 'critico',
    description: 'Descargar el listado con sus datos. Saca información personal fuera del sistema, donde ya no hay control sobre ella.',
    implies: [P.recordsView],
  },

  /* ---------------- Configuración ---------------- */
  {
    code: P.catalogsView, name: 'Ver catálogos', group: 'Configuración', level: 'lectura',
    description: 'Consultar las listas desplegables del sistema: sectores, actividades, origen de fondos.',
  },
  {
    code: P.catalogsManage, name: 'Administrar catálogos', group: 'Configuración', level: 'escritura',
    description: 'Agregar y quitar valores de esas listas. Los cambios se ven de inmediato en los formularios.',
    implies: [P.catalogsView],
  },
  {
    code: P.formView, name: 'Ver el formulario de captación', group: 'Configuración', level: 'lectura',
    description: 'Consultar qué se le pide al cliente y en qué versión está.',
  },
  {
    code: P.formManage, name: 'Componer el formulario de captación', group: 'Configuración', level: 'critico',
    description: 'Agregar secciones y campos, definir condiciones de visibilidad, y publicar una versión nueva con su motivo.',
    implies: [P.formView],
  },
  {
    code: P.companyConfigure, name: 'Configurar la empresa', group: 'Configuración', level: 'critico',
    description: 'Cambiar los datos de la empresa y sus datos de contacto.',
  },
  {
    code: P.integrationsManage, name: 'Administrar credenciales de integración', group: 'Configuración', level: 'critico',
    description: 'Emitir y revocar las credenciales que usan otros sistemas del grupo, como Axiom Prevención, para conectarse a esta empresa.',
  },

  /* ---------------- Plataforma ----------------
   * No se arman en un rol de empresa. El Super Admin las ejerce porque su
   * cuenta es de ámbito plataforma, no porque alguien se las haya concedido.
   */
  {
    code: P.companiesView, name: 'Ver empresas', group: 'Plataforma', level: 'lectura',
    scope: 'platform',
    description: 'Ver el padrón de empresas en la consola de plataforma. Solo Super Admin.',
  },
  {
    code: P.companiesCreate, name: 'Crear empresas', group: 'Plataforma', level: 'critico',
    scope: 'platform',
    description: 'Dar de alta una empresa y a su administrador. Solo Super Admin.',
    implies: [P.companiesView],
  },
  {
    code: P.companiesEdit, name: 'Editar empresas', group: 'Plataforma', level: 'escritura',
    scope: 'platform',
    description: 'Corregir el nombre, el RIF y el portal de una empresa. Solo Super Admin.',
    implies: [P.companiesView],
  },
  {
    code: P.companiesSuspend, name: 'Suspender empresas', group: 'Plataforma', level: 'critico',
    scope: 'platform',
    description: 'Suspender o reactivar una empresa. No la borra. Solo Super Admin.',
    implies: [P.companiesView],
  },
  {
    code: P.companiesDelete, name: 'Borrar empresas vacías', group: 'Plataforma', level: 'critico',
    scope: 'platform',
    description: 'Dar de baja una empresa que no tiene clientes ni formulario. Si ya hay expedientes, no se borra. Solo Super Admin.',
    implies: [P.companiesView],
  },
  {
    code: P.retentionManage, name: 'Administrar la retención', group: 'Plataforma', level: 'critico',
    scope: 'platform',
    description: 'Definir cuántos días se conserva un borrador abandonado de cada empresa. Solo Super Admin.',
  },

  /* ---------------- Administración ---------------- */
  {
    code: P.usersView, name: 'Ver usuarios y roles', group: 'Administración', level: 'lectura',
    description: 'Consultar quién tiene cuenta, con qué rol y qué permisos efectivos.',
  },
  {
    code: P.usersManage, name: 'Administrar usuarios', group: 'Administración', level: 'critico',
    description: 'Invitar, bloquear y reactivar personas, y darles excepciones de permisos por encima de su rol.',
    implies: [P.usersView],
  },
  {
    code: P.rolesManage, name: 'Administrar roles y permisos', group: 'Administración', level: 'critico',
    description: 'Crear roles y decidir qué puede hacer cada uno. Quien tiene esto puede concederse cualquier otro permiso de esta lista.',
    implies: [P.usersView],
  },

  /* ---------------- Auditoría ---------------- */
  {
    code: P.auditLogView, name: 'Consultar la bitácora', group: 'Auditoría', level: 'lectura',
    description: 'Ver todo lo que pasó en el sistema: quién, cuándo, qué y por qué.',
  },
  {
    code: P.auditLogExport, name: 'Exportar la bitácora', group: 'Auditoría', level: 'critico',
    description: 'Descargar el registro para entregarlo a un auditor o al regulador.',
    implies: [P.auditLogView],
  },
  {
    code: P.reportsView, name: 'Ver reportes', group: 'Auditoría', level: 'lectura',
    description: 'Consultar los reportes emitidos y verificar uno por su código.',
  },
  {
    code: P.reportsIssue, name: 'Emitir reportes', group: 'Auditoría', level: 'escritura',
    description: 'Generar un reporte de consulta con código verificable. Queda en la bitácora a nombre de quien lo emitió.',
    implies: [P.reportsView],
  },
]

export const GROUPS: Group[] = ['Clientes', 'Configuración', 'Plataforma', 'Administración', 'Auditoría']

export const definitionOf = (c: string) => CATALOG.find(p => p.code === c)

export const isPlatformPermission = (c: string) => definitionOf(c)?.scope === 'platform'

/** Lo que una empresa puede conceder. Lo de plataforma no entra. */
export const TENANT_CATALOG = CATALOG.filter(p => p.scope !== 'platform')
export const TENANT_GROUPS: Group[] = GROUPS.filter(g => g !== 'Plataforma')

/**
 * Agrega los permisos que el elegido necesita para servir de algo.
 *
 * Conceder "Registrar clientes" sin "Ver clientes" da un rol que no puede
 * abrir la pantalla donde está el botón. En vez de dejar que alguien lo
 * descubra en producción, se conceden juntos.
 */
export function withImplied(permissions: PermissionCode[]): PermissionCode[] {
  const set = new Set(permissions)
  let creció = true
  while (creció) {
    creció = false
    set.forEach(c => definitionOf(c)?.implies?.forEach(i => {
      if (!set.has(i)) { set.add(i); creció = true }
    }))
  }
  return Array.from(set)
}

/** Permisos que quedarían sin sentido si se quita este. */
export const dependOn = (c: PermissionCode) =>
  CATALOG.filter(p => p.implies?.includes(c)).map(p => p.code)

/** Pares en tensión dentro de un mismo conjunto de permisos. */
export function tensions(permissions: PermissionCode[]) {
  const set = new Set(permissions)
  const vistos = new Set<string>()
  return CATALOG.flatMap(p => {
    if (!p.tension || !set.has(p.code) || !set.has(p.tension.con)) return []
    const llave = [p.code, p.tension.con].sort().join('|')
    if (vistos.has(llave)) return []
    vistos.add(llave)
    return [{ a: p.code, b: p.tension.con, because: p.tension.because }]
  })
}
