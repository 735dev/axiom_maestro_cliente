import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { PERMISSIONS, conImplicados, dependenDe, type PermissionCode } from '@/shared/auth/permissions'
import type { RootState } from '@/shared/store'
import { crearEmpresa } from '@/features/plataforma/store/empresasSlice'

export type EstadoUsuario = 'ACTIVO' | 'INVITADO' | 'BLOQUEADO' | 'INACTIVO'

export type Rol = {
  id: string
  nombre: string
  descripcion: string
  permisos: PermissionCode[]
  /** Los roles de sistema no se pueden borrar: sostienen la separación de funciones. */
  sistema?: boolean
  /** Rol propio de una empresa. Los de sistema no lo tienen: son de todas. */
  empresaId?: string
  /** Rol del ámbito plataforma. No se le puede asignar a un usuario de empresa. */
  plataforma?: boolean
}

export type UsuarioSistema = {
  /**
   * La empresa a la que pertenece. `null` = personal de Axiom.
   *
   * Es la única diferencia entre un usuario de empresa y uno de plataforma:
   * son la misma entidad, en el mismo padrón. Separarlos en dos listas obliga
   * a duplicar cada pantalla que los muestra y termina en un "usuario" que
   * significa dos cosas distintas según dónde se lo mire.
   */
  empresaId: string | null
  id: string
  nombre: string
  correo: string
  rolId: string
  estado: EstadoUsuario
  ultimoAcceso?: string
  /** Excepciones individuales por encima del rol. */
  concedidos: PermissionCode[]
  revocados: PermissionCode[]
}

const P = PERMISSIONS

export const ROLES_INICIALES: Rol[] = [
  {
    id: 'comercializacion', nombre: 'Comercialización', sistema: true,
    descripcion: 'Registra al cliente y mantiene su ficha. No ve el resultado del screening.',
    permisos: [P.registrosVer, P.registrosCrear, P.registrosEditar, P.registrosPersonas, P.catalogosVer, P.formularioVer],
  },
  {
    id: 'oficial', nombre: 'Oficial de Cumplimiento', sistema: true,
    descripcion: 'Dirige la Unidad de Cumplimiento y configura sus criterios con justificación. No decide la aprobación comercial del cliente.',
    permisos: [P.registrosVer, P.catalogosVer, P.catalogosGestionar,
      P.formularioVer, P.bitacoraVer, P.reportesVer, P.reportesEmitir],
  },
  {
    id: 'analista', nombre: 'Analista', sistema: true,
    descripcion: 'Ejecuta consultas y prepara el expediente. No aprueba riesgo alto.',
    permisos: [P.registrosVer, P.catalogosVer, P.formularioVer, P.bitacoraVer, P.reportesVer, P.reportesEmitir],
  },
  {
    id: 'auditoria', nombre: 'Auditoría', sistema: true,
    descripcion: 'Consulta todo, incluida la bitácora completa. No crea ni modifica nada.',
    permisos: [P.registrosVer, P.catalogosVer, P.formularioVer, P.bitacoraVer, P.bitacoraExportar, P.reportesVer],
  },
  {
    id: 'administrador', nombre: 'Administrador', sistema: true,
    descripcion: 'Decide aprobar, rechazar o inhabilitar clientes ya revisados por la Unidad; además administra usuarios, roles y catálogos de su empresa.',
    permisos: [P.registrosVer, P.registrosAprobar, P.registrosInactivar,
      P.usuariosVer, P.usuariosGestionar, P.rolesGestionar, P.catalogosVer, P.catalogosGestionar,
      P.formularioVer, P.empresaConfigurar, P.bitacoraVer],
  },
  {
    id: 'superadmin', nombre: 'Super Admin', sistema: true, plataforma: true,
    descripcion: 'Personal de Axiom. Administra las empresas de la plataforma, sus formularios y sus accesos.',
    // Vacío a propósito: su poder no sale del catálogo de permisos de las
    // empresas, sino del ámbito, que ninguna empresa puede conceder.
    permisos: [],
  },
]

export const USUARIOS_INICIALES: UsuarioSistema[] = [
  { empresaId: 'transvalor', id: 'u1', nombre: 'Oriana Méndez', correo: 'omendez@transvalor.com', rolId: 'comercializacion', estado: 'ACTIVO', ultimoAcceso: '2026-08-31 15:40', concedidos: [], revocados: [] },
  { empresaId: 'transvalor', id: 'u2', nombre: 'Evelina Rodríguez', correo: 'erodriguez@transvalor.com', rolId: 'oficial', estado: 'ACTIVO', ultimoAcceso: '2026-08-31 16:35', concedidos: [], revocados: [] },
  { empresaId: 'transvalor', id: 'u3', nombre: 'Marcos Ledezma', correo: 'mledezma@transvalor.com', rolId: 'analista', estado: 'ACTIVO', ultimoAcceso: '2026-08-31 14:02', concedidos: [P.reportesVer], revocados: [] },
  { empresaId: 'transvalor', id: 'u4', nombre: 'Luis Bermúdez', correo: 'lbermudez@transvalor.com', rolId: 'auditoria', estado: 'ACTIVO', ultimoAcceso: '2026-08-28 09:10', concedidos: [], revocados: [] },
  { empresaId: 'transvalor', id: 'u5', nombre: 'Yeniré Castillo', correo: 'ycastillo@transvalor.com', rolId: 'comercializacion', estado: 'ACTIVO', ultimoAcceso: '2026-08-30 11:25', concedidos: [], revocados: [P.registrosEditar] },
  { empresaId: 'transvalor', id: 'u6', nombre: 'Rosa Marcano', correo: 'rmarcano@transvalor.com', rolId: 'administrador', estado: 'ACTIVO', ultimoAcceso: '2026-08-29 08:00', concedidos: [], revocados: [] },
  { empresaId: 'transvalor', id: 'u7', nombre: 'Gabriel Ortega', correo: 'gortega@transvalor.com', rolId: 'analista', estado: 'INVITADO', concedidos: [], revocados: [] },
  { empresaId: 'transvalor', id: 'u8', nombre: 'Pedro Alvarado', correo: 'palvarado@transvalor.com', rolId: 'comercializacion', estado: 'BLOQUEADO', ultimoAcceso: '2026-07-14 16:48', concedidos: [], revocados: [] },
  // Toda empresa tiene su administrador desde el alta.
  { empresaId: 'demo-seguros', id: 'u9', nombre: 'Andreína Salas', correo: 'asalas@segurosdelcentro.com', rolId: 'administrador', estado: 'ACTIVO', ultimoAcceso: '2026-08-28 10:12', concedidos: [], revocados: [] },
  { empresaId: 'demo-seguros', id: 'u10', nombre: 'Héctor Peña', correo: 'hpena@segurosdelcentro.com', rolId: 'comercializacion', estado: 'ACTIVO', ultimoAcceso: '2026-08-27 09:40', concedidos: [], revocados: [] },
  { empresaId: 'demo-casa', id: 'u11', nombre: 'Ricardo Ovalles', correo: 'rovalles@cbandina.com', rolId: 'administrador', estado: 'INVITADO', concedidos: [], revocados: [] },
  // Personal de Axiom: mismo padrón, sin empresa.
  { empresaId: null, id: 'sa1', nombre: 'Jerson Arias', correo: 'jerson@axiomcoretech.com', rolId: 'superadmin', estado: 'ACTIVO', ultimoAcceso: '2026-09-01 08:20', concedidos: [], revocados: [] },
  { empresaId: null, id: 'sa2', nombre: 'Soporte Axiom', correo: 'soporte@axiomcoretech.com', rolId: 'superadmin', estado: 'ACTIVO', ultimoAcceso: '2026-08-30 17:05', concedidos: [], revocados: [] },
]

type State = { usuarios: UsuarioSistema[]; roles: Rol[] }
const initialState: State = { usuarios: USUARIOS_INICIALES, roles: ROLES_INICIALES }

const slice = createSlice({
  name: 'usuarios',
  initialState,
  reducers: {
    crearUsuario(s, a: PayloadAction<Omit<UsuarioSistema, 'id'>>) {
      s.usuarios.unshift({ ...a.payload, id: 'u' + Date.now() })
    },
    sincronizarAdministracion(s, a: PayloadAction<{ usuarios: UsuarioSistema[]; roles: Rol[] }>) {
      s.usuarios = a.payload.usuarios
      s.roles = a.payload.roles
    },
    editarUsuario(s, a: PayloadAction<{ id: string; cambios: Partial<UsuarioSistema> }>) {
      const u = s.usuarios.find(x => x.id === a.payload.id)
      if (u) Object.assign(u, a.payload.cambios)
    },
    cambiarEstadoUsuario(s, a: PayloadAction<{ id: string; estado: EstadoUsuario }>) {
      const u = s.usuarios.find(x => x.id === a.payload.id)
      if (u) u.estado = a.payload.estado
    },
    alternarExcepcion(s, a: PayloadAction<{ id: string; permiso: PermissionCode; modo: 'conceder' | 'revocar' | 'heredar' }>) {
      const u = s.usuarios.find(x => x.id === a.payload.id)
      if (!u) return
      u.concedidos = u.concedidos.filter(p => p !== a.payload.permiso)
      u.revocados = u.revocados.filter(p => p !== a.payload.permiso)
      if (a.payload.modo === 'conceder') u.concedidos.push(a.payload.permiso)
      if (a.payload.modo === 'revocar') u.revocados.push(a.payload.permiso)
    },
    /**
     * Marca o desmarca un permiso, arrastrando lo que corresponda.
     *
     * Al conceder se agregan sus implicados: "Registrar clientes" sin "Ver
     * clientes" da un rol que no puede abrir la pantalla donde está el botón.
     * Al quitar se van los que dependían de él, por la misma razón al revés.
     *
     * Va en el reducer y no en la pantalla para que la regla valga siempre,
     * venga de donde venga la acción.
     */
    alternarPermisoRol(s, a: PayloadAction<{ rolId: string; permiso: PermissionCode }>) {
      const r = s.roles.find(x => x.id === a.payload.rolId)
      if (!r) return
      const p = a.payload.permiso
      if (r.permisos.includes(p)) {
        const caen = new Set<string>([p, ...dependenDe(p)])
        r.permisos = r.permisos.filter(x => !caen.has(x))
      } else {
        r.permisos = conImplicados([...r.permisos, p])
      }
    },
    /** Crea un rol. Con `copiarDe` nace con los permisos de otro: así escalar a N roles
     *  no obliga a marcar diez casillas cada vez. */
    /**
     * Crea un rol. Con `copiarDe` nace con los permisos de otro.
     *
     * `sistema` lo marca como plantilla de la plataforma: queda disponible
     * para todas las empresas. Solo la consola de Axiom lo manda en true; el
     * panel de una empresa crea roles propios, que llevan su `empresaId`.
     */
    crearRol(s, a: PayloadAction<{
      nombre: string; descripcion: string; copiarDe?: string
      sistema?: boolean; empresaId?: string
    }>) {
      const base = a.payload.copiarDe ? s.roles.find(r => r.id === a.payload.copiarDe) : undefined
      s.roles.push({
        id: 'r' + Date.now(), nombre: a.payload.nombre,
        descripcion: a.payload.descripcion, permisos: base ? [...base.permisos] : [],
        sistema: a.payload.sistema, empresaId: a.payload.empresaId,
      })
    },
    editarRol(s, a: PayloadAction<{ id: string; nombre: string; descripcion: string }>) {
      const r = s.roles.find(x => x.id === a.payload.id)
      if (r) { r.nombre = a.payload.nombre; r.descripcion = a.payload.descripcion }
    },
    /** Un rol de sistema no se borra, y uno con usuarios asignados tampoco: se quedarían sin permisos. */
    borrarRol(s, a: PayloadAction<string>) {
      const r = s.roles.find(x => x.id === a.payload)
      if (!r || r.sistema) return
      if (s.usuarios.some(u => u.rolId === a.payload)) return
      s.roles = s.roles.filter(x => x.id !== a.payload)
    },
    /** Marca o desmarca de un golpe todos los permisos de un grupo. */
    fijarPermisosRol(s, a: PayloadAction<{ rolId: string; permisos: PermissionCode[]; valor: boolean }>) {
      const r = s.roles.find(x => x.id === a.payload.rolId)
      if (!r) return
      if (a.payload.valor) {
        r.permisos = conImplicados([...r.permisos, ...a.payload.permisos])
      } else {
        const caen = new Set<string>(a.payload.permisos.flatMap(p => [p, ...dependenDe(p)]))
        r.permisos = r.permisos.filter(p => !caen.has(p))
      }
    },
  },

  /**
   * Toda empresa nace con su administrador.
   *
   * Se resuelve escuchando el alta de la empresa en vez de pedirle a la
   * pantalla que despache dos acciones: así no existe ningún camino —ni un
   * formulario nuevo, ni una importación, ni una prueba— que cree una empresa
   * sin nadie que pueda entrar a configurarla.
   *
   * Queda INVITADO: existe, pero no entra hasta que use su invitación.
   */
  extraReducers: builder => {
    builder.addCase(crearEmpresa, (s, a) => {
      s.usuarios.unshift({
        empresaId: a.payload.id,
        id: 'u' + a.payload.id,
        nombre: a.payload.admin.nombre,
        correo: a.payload.admin.correo,
        rolId: 'administrador',
        estado: 'INVITADO',
        concedidos: [], revocados: [],
      })
    })
  },
})

export const {
  crearUsuario, editarUsuario, cambiarEstadoUsuario,
  sincronizarAdministracion,
  alternarExcepcion, alternarPermisoRol, crearRol,
  editarRol, borrarRol, fijarPermisosRol,
} = slice.actions
export default slice.reducer

/** Permisos efectivos: los del rol, más los concedidos, menos los revocados. */
export function permisosEfectivos(u: UsuarioSistema, roles: Rol[]): PermissionCode[] {
  const base = roles.find(r => r.id === u.rolId)?.permisos ?? []
  return Array.from(new Set([...base, ...u.concedidos])).filter(p => !u.revocados.includes(p))
}

/**
 * Los usuarios de la empresa de la sesión.
 *
 * El personal de Axiom tiene `empresaId: null`, así que nunca cae acá: una
 * empresa no ve —ni puede tocar— a quien administra la plataforma.
 */
export const selectUsuariosDeMiEmpresa = (s: RootState) => {
  const empresaId = s.auth.usuario?.empresaId
  return empresaId ? s.usuarios.usuarios.filter(u => u.empresaId === empresaId) : []
}

/** Todo el padrón. Solo para el ámbito plataforma. */
export const selectTodosLosUsuarios = (s: RootState) =>
  s.auth.usuario?.ambito === 'plataforma' ? s.usuarios.usuarios : []

/**
 * Roles que una empresa puede ver y asignar: los de sistema más los suyos.
 * Los del ámbito plataforma quedan fuera, así no aparecen en su selector.
 */
export const selectRolesDeMiEmpresa = (s: RootState) => {
  const empresaId = s.auth.usuario?.empresaId
  return s.usuarios.roles.filter(r => !r.plataforma && (r.sistema || r.empresaId === empresaId))
}

/**
 * Las cuentas de Axiom. Sale del mismo padrón que todo el resto: lo único que
 * las distingue es no tener empresa.
 */
export const selectCuentasDeAxiom = (s: RootState) =>
  s.usuarios.usuarios.filter(u => u.empresaId === null)
