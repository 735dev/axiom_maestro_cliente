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
  registrosVer: 'registros.ver',
  registrosCrear: 'registros.crear',
  registrosEditar: 'registros.editar',
  registrosPersonas: 'registros.personas',
  registrosInactivar: 'registros.inactivar',
  registrosAprobar: 'registros.aprobar',
  registrosExportar: 'registros.exportar',

  catalogosVer: 'catalogos.ver',
  catalogosGestionar: 'catalogos.gestionar',
  formularioVer: 'formulario.ver',
  empresaConfigurar: 'empresa.configurar',

  usuariosVer: 'usuarios.ver',
  usuariosGestionar: 'usuarios.gestionar',
  rolesGestionar: 'roles.gestionar',

  bitacoraVer: 'bitacora.ver',
  bitacoraExportar: 'bitacora.exportar',
  reportesVer: 'reportes.ver',
  reportesEmitir: 'reportes.emitir',
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
export type Nivel = 'lectura' | 'escritura' | 'critico'

export type Grupo = 'Clientes' | 'Configuración' | 'Administración' | 'Auditoría'

export type DefinicionPermiso = {
  codigo: PermissionCode
  nombre: string
  /** Qué habilita, en concreto. Sin esto un rol se arma a ciegas. */
  descripcion: string
  grupo: Grupo
  nivel: Nivel
  /** Permisos sin los cuales este no sirve. Se conceden junto con él. */
  implica?: PermissionCode[]
  /**
   * Con cuáles no debería convivir en el mismo rol, y por qué.
   *
   * No se prohíbe: se advierte. Hay empresas chicas donde la misma persona
   * hace las dos cosas, y esa decisión es del negocio. Lo que el sistema no
   * puede hacer es dejar que ocurra sin que nadie se entere.
   */
  tension?: { con: PermissionCode; porque: string }
}

const P = PERMISSIONS

export const CATALOGO: DefinicionPermiso[] = [
  /* ---------------- Clientes ---------------- */
  {
    codigo: P.registrosVer, nombre: 'Ver clientes', grupo: 'Clientes', nivel: 'lectura',
    descripcion: 'Entrar al listado de clientes y abrir la ficha de cualquiera de ellos.',
  },
  {
    codigo: P.registrosCrear, nombre: 'Registrar clientes', grupo: 'Clientes', nivel: 'escritura',
    descripcion: 'Dar de alta un cliente nuevo. El sistema le asigna su código.',
    implica: [P.registrosVer],
    tension: {
      con: P.registrosAprobar,
      porque: 'Quien registra un expediente no debería ser quien lo aprueba. El sistema ya impide que la misma persona haga las dos cosas sobre el mismo cliente, pero tener ambos permisos deja esa protección apoyada en un solo control.',
    },
  },
  {
    codigo: P.registrosEditar, nombre: 'Editar la ficha', grupo: 'Clientes', nivel: 'escritura',
    descripcion: 'Corregir los datos de un cliente ya registrado. No incluye el veredicto, que lo escribe Prevención.',
    implica: [P.registrosVer],
  },
  {
    codigo: P.registrosPersonas, nombre: 'Gestionar personas vinculadas', grupo: 'Clientes', nivel: 'escritura',
    descripcion: 'Agregar y quitar accionistas, beneficiarios finales y representantes legales.',
    implica: [P.registrosVer],
  },
  {
    codigo: P.registrosInactivar, nombre: 'Inactivar clientes', grupo: 'Clientes', nivel: 'critico',
    descripcion: 'Sacar un cliente de circulación. No borra: conserva toda su historia y exige motivo escrito.',
    implica: [P.registrosVer],
  },
  {
    codigo: P.registrosAprobar, nombre: 'Aprobar o rechazar', grupo: 'Clientes', nivel: 'critico',
    descripcion: 'Decidir si un cliente queda habilitado. Es la decisión que el regulador va a revisar.',
    implica: [P.registrosVer],
    tension: {
      con: P.registrosCrear,
      porque: 'Registrar y aprobar en la misma persona rompe la separación de funciones que sostiene el expediente.',
    },
  },
  {
    codigo: P.registrosExportar, nombre: 'Exportar clientes', grupo: 'Clientes', nivel: 'critico',
    descripcion: 'Descargar el listado con sus datos. Saca información personal fuera del sistema, donde ya no hay control sobre ella.',
    implica: [P.registrosVer],
  },

  /* ---------------- Configuración ---------------- */
  {
    codigo: P.catalogosVer, nombre: 'Ver catálogos', grupo: 'Configuración', nivel: 'lectura',
    descripcion: 'Consultar las listas desplegables del sistema: sectores, actividades, origen de fondos.',
  },
  {
    codigo: P.catalogosGestionar, nombre: 'Administrar catálogos', grupo: 'Configuración', nivel: 'escritura',
    descripcion: 'Agregar y quitar valores de esas listas. Los cambios se ven de inmediato en los formularios.',
    implica: [P.catalogosVer],
  },
  {
    codigo: P.formularioVer, nombre: 'Ver el formulario de captación', grupo: 'Configuración', nivel: 'lectura',
    descripcion: 'Consultar qué se le pide al cliente y en qué versión está. La definición la publica Axiom.',
  },
  {
    codigo: P.empresaConfigurar, nombre: 'Configurar la empresa', grupo: 'Configuración', nivel: 'critico',
    descripcion: 'Cambiar los datos de la empresa, su marca y a qué correos llegan los avisos.',
  },

  /* ---------------- Administración ---------------- */
  {
    codigo: P.usuariosVer, nombre: 'Ver usuarios y roles', grupo: 'Administración', nivel: 'lectura',
    descripcion: 'Consultar quién tiene cuenta, con qué rol y qué permisos efectivos.',
  },
  {
    codigo: P.usuariosGestionar, nombre: 'Administrar usuarios', grupo: 'Administración', nivel: 'critico',
    descripcion: 'Invitar, bloquear y reactivar personas, y darles excepciones de permisos por encima de su rol.',
    implica: [P.usuariosVer],
  },
  {
    codigo: P.rolesGestionar, nombre: 'Administrar roles y permisos', grupo: 'Administración', nivel: 'critico',
    descripcion: 'Crear roles y decidir qué puede hacer cada uno. Quien tiene esto puede concederse cualquier otro permiso de esta lista.',
    implica: [P.usuariosVer],
  },

  /* ---------------- Auditoría ---------------- */
  {
    codigo: P.bitacoraVer, nombre: 'Consultar la bitácora', grupo: 'Auditoría', nivel: 'lectura',
    descripcion: 'Ver todo lo que pasó en el sistema: quién, cuándo, qué y por qué.',
  },
  {
    codigo: P.bitacoraExportar, nombre: 'Exportar la bitácora', grupo: 'Auditoría', nivel: 'critico',
    descripcion: 'Descargar el registro para entregarlo a un auditor o al regulador.',
    implica: [P.bitacoraVer],
  },
  {
    codigo: P.reportesVer, nombre: 'Ver reportes', grupo: 'Auditoría', nivel: 'lectura',
    descripcion: 'Consultar los reportes emitidos y verificar uno por su código.',
  },
  {
    codigo: P.reportesEmitir, nombre: 'Emitir reportes', grupo: 'Auditoría', nivel: 'escritura',
    descripcion: 'Generar un reporte de consulta con código verificable. Queda en la bitácora a nombre de quien lo emitió.',
    implica: [P.reportesVer],
  },
]

export const GRUPOS: Grupo[] = ['Clientes', 'Configuración', 'Administración', 'Auditoría']

export const definicionDe = (c: string) => CATALOGO.find(p => p.codigo === c)

/**
 * Agrega los permisos que el elegido necesita para servir de algo.
 *
 * Conceder "Registrar clientes" sin "Ver clientes" da un rol que no puede
 * abrir la pantalla donde está el botón. En vez de dejar que alguien lo
 * descubra en producción, se conceden juntos.
 */
export function conImplicados(permisos: PermissionCode[]): PermissionCode[] {
  const set = new Set(permisos)
  let creció = true
  while (creció) {
    creció = false
    set.forEach(c => definicionDe(c)?.implica?.forEach(i => {
      if (!set.has(i)) { set.add(i); creció = true }
    }))
  }
  return Array.from(set)
}

/** Permisos que quedarían sin sentido si se quita este. */
export const dependenDe = (c: PermissionCode) =>
  CATALOGO.filter(p => p.implica?.includes(c)).map(p => p.codigo)

/** Pares en tensión dentro de un mismo conjunto de permisos. */
export function tensiones(permisos: PermissionCode[]) {
  const set = new Set(permisos)
  const vistos = new Set<string>()
  return CATALOGO.flatMap(p => {
    if (!p.tension || !set.has(p.codigo) || !set.has(p.tension.con)) return []
    const llave = [p.codigo, p.tension.con].sort().join('|')
    if (vistos.has(llave)) return []
    vistos.add(llave)
    return [{ a: p.codigo, b: p.tension.con, porque: p.tension.porque }]
  })
}
