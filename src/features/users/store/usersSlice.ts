import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { PERMISSIONS, withImplied, dependOn, type PermissionCode } from '@/shared/auth/permissions'
import type { RootState } from '@/shared/store'
import { createCompany, companyRemoved } from '@/features/platform/store/companiesSlice'

export type UserStatus = 'ACTIVO' | 'INVITADO' | 'BLOQUEADO' | 'INACTIVO'

export type Rol = {
  id: string
  name: string
  description: string
  permissions: PermissionCode[]
  /** Los roles de sistema no se pueden borrar: sostienen la separación de funciones. */
  sistema?: boolean
  /** Rol propio de una empresa. Los de sistema no lo tienen: son de todas. */
  companyId?: string
  /** Rol del ámbito plataforma. No se le puede asignar a un usuario de empresa. */
  platform?: boolean
}

export type SystemUser = {
  /**
   * La empresa a la que pertenece. `null` = personal de Axiom.
   *
   * Es la única diferencia entre un usuario de empresa y uno de plataforma:
   * son la misma entidad, en el mismo padrón. Separarlos en dos listas obliga
   * a duplicar cada pantalla que los muestra y termina en un "usuario" que
   * significa dos cosas distintas según dónde se lo mire.
   */
  companyId: string | null
  companyName?: string
  id: string
  name: string
  email: string
  rolId: string
  status: UserStatus
  lastAccess?: string
  /** Excepciones individuales por encima del rol. */
  granted: PermissionCode[]
  revoked: PermissionCode[]
}

const P = PERMISSIONS

export const INITIAL_ROLES: Rol[] = [
  {
    id: 'comercializacion', name: 'Comercialización', sistema: true,
    description: 'Registra al cliente y mantiene su ficha. No ve el resultado del screening.',
    permissions: [P.recordsView, P.recordsCreate, P.recordsEdit, P.recordsPeople, P.catalogsView, P.formView],
  },
  {
    id: 'oficial', name: 'Oficial de Cumplimiento', sistema: true,
    description: 'Dirige la Unidad de Cumplimiento y configura sus criterios con justificación. No decide la aprobación comercial del cliente.',
    permissions: [P.recordsView, P.catalogsView, P.catalogsManage,
      P.formView, P.auditLogView, P.reportsView, P.reportsIssue],
  },
  {
    id: 'analista', name: 'Analista', sistema: true,
    description: 'Ejecuta consultas y prepara el expediente. No aprueba riesgo alto.',
    permissions: [P.recordsView, P.catalogsView, P.formView, P.auditLogView, P.reportsView, P.reportsIssue],
  },
  {
    id: 'auditoria', name: 'Auditoría', sistema: true,
    description: 'Consulta todo, incluida la bitácora completa. No crea ni modifica nada.',
    permissions: [P.recordsView, P.catalogsView, P.formView, P.auditLogView, P.auditLogExport, P.reportsView],
  },
  {
    id: 'administrador', name: 'Administrador', sistema: true,
    description: 'Decide aprobar, rechazar o inhabilitar clientes ya revisados por la Unidad; además administra usuarios, roles y catálogos de su empresa.',
    permissions: [P.recordsView, P.recordsApprove, P.recordsDeactivate,
      P.usersView, P.usersManage, P.rolesManage, P.catalogsView, P.catalogsManage,
      P.formView, P.companyConfigure, P.auditLogView],
  },
  {
    id: 'superadmin', name: 'Super Admin', sistema: true, platform: true,
    description: 'Personal de Axiom. Administra las empresas de la plataforma, sus formularios y sus accesos.',
    // Vacío a propósito: su poder no sale del catálogo de permisos de las
    // empresas, sino del ámbito, que ninguna empresa puede conceder.
    permissions: [],
  },
]

export const INITIAL_USERS: SystemUser[] = [
  { companyId: 'fondo-ganadero', id: 'u1', name: 'Administrador — Fondo Ganadero, C.A.', email: 'admin@fondoganadero.demo', rolId: 'administrador', status: 'ACTIVO', lastAccess: '2026-10-24 09:00', granted: [], revoked: [] },
  { companyId: 'fondo-ganadero', id: 'u2', name: 'Comercialización — Fondo Ganadero, C.A.', email: 'comercial@fondoganadero.demo', rolId: 'comercializacion', status: 'ACTIVO', lastAccess: '2026-10-24 09:00', granted: [], revoked: [] },
  { companyId: 'fondo-ganadero', id: 'u3', name: 'Auditoría — Fondo Ganadero, C.A.', email: 'auditoria@fondoganadero.demo', rolId: 'auditoria', status: 'ACTIVO', lastAccess: '2026-10-24 09:00', granted: [], revoked: [] },
  { companyId: null, id: 'sa1', name: 'Jerson Arias', email: 'jerson@axiomcoretech.com', rolId: 'superadmin', status: 'ACTIVO', lastAccess: '2026-10-24 08:20', granted: [], revoked: [] },
  { companyId: null, id: 'sa2', name: 'Soporte Axiom', email: 'soporte@axiomcoretech.com', rolId: 'superadmin', status: 'ACTIVO', lastAccess: '2026-10-24 08:20', granted: [], revoked: [] },
]

type State = { users: SystemUser[]; roles: Rol[] }
const initialState: State = { users: INITIAL_USERS, roles: INITIAL_ROLES }

const slice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    createUser(s, a: PayloadAction<Omit<SystemUser, 'id'>>) {
      s.users.unshift({ ...a.payload, id: 'u' + Date.now() })
    },
    sincronizarAdministracion(s, a: PayloadAction<{ users: SystemUser[]; roles: Rol[] }>) {
      s.users = a.payload.users
      s.roles = a.payload.roles
    },
    editUser(s, a: PayloadAction<{ id: string; cambios: Partial<SystemUser> }>) {
      const u = s.users.find(x => x.id === a.payload.id)
      if (u) Object.assign(u, a.payload.cambios)
    },
    changeUserStatus(s, a: PayloadAction<{ id: string; status: UserStatus }>) {
      const u = s.users.find(x => x.id === a.payload.id)
      if (u) u.status = a.payload.status
    },
    alternarExcepcion(s, a: PayloadAction<{ id: string; permission: PermissionCode; modo: 'conceder' | 'revocar' }>) {
      const u = s.users.find(x => x.id === a.payload.id)
      if (!u) return
      u.granted = u.granted.filter(p => p !== a.payload.permission)
      u.revoked = u.revoked.filter(p => p !== a.payload.permission)
      if (a.payload.modo === 'conceder') u.granted.push(a.payload.permission)
      if (a.payload.modo === 'revocar') u.revoked.push(a.payload.permission)
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
    toggleRolePermission(s, a: PayloadAction<{ rolId: string; permission: PermissionCode }>) {
      const r = s.roles.find(x => x.id === a.payload.rolId)
      if (!r) return
      const p = a.payload.permission
      if (r.permissions.includes(p)) {
        const caen = new Set<string>([p, ...dependOn(p)])
        r.permissions = r.permissions.filter(x => !caen.has(x))
      } else {
        r.permissions = withImplied([...r.permissions, p])
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
    createRole(s, a: PayloadAction<{
      name: string; description: string; copiarDe?: string
      sistema?: boolean; companyId?: string
    }>) {
      const base = a.payload.copiarDe ? s.roles.find(r => r.id === a.payload.copiarDe) : undefined
      s.roles.push({
        id: 'r' + Date.now(), name: a.payload.name,
        description: a.payload.description, permissions: base ? [...base.permissions] : [],
        sistema: a.payload.sistema, companyId: a.payload.companyId,
      })
    },
    editRole(s, a: PayloadAction<{ id: string; name: string; description: string }>) {
      const r = s.roles.find(x => x.id === a.payload.id)
      if (r) { r.name = a.payload.name; r.description = a.payload.description }
    },
    /** Un rol de sistema no se borra, y uno con usuarios asignados tampoco: se quedarían sin permisos. */
    deleteRole(s, a: PayloadAction<string>) {
      const r = s.roles.find(x => x.id === a.payload)
      if (!r || r.sistema) return
      if (s.users.some(u => u.rolId === a.payload)) return
      s.roles = s.roles.filter(x => x.id !== a.payload)
    },
    /** Marca o desmarca de un golpe todos los permisos de un grupo. */
    setRolePermissions(s, a: PayloadAction<{ rolId: string; permissions: PermissionCode[]; value: boolean }>) {
      const r = s.roles.find(x => x.id === a.payload.rolId)
      if (!r) return
      if (a.payload.value) {
        r.permissions = withImplied([...r.permissions, ...a.payload.permissions])
      } else {
        const caen = new Set<string>(a.payload.permissions.flatMap(p => [p, ...dependOn(p)]))
        r.permissions = r.permissions.filter(p => !caen.has(p))
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
   * Queda ACTIVO: el administrador inicial recibe acceso inmediato para
   * terminar de configurar la empresa.
   */
  extraReducers: builder => {
    builder.addCase(createCompany, (s, a) => {
      s.users.unshift({
        companyId: a.payload.id,
        id: 'u' + a.payload.id,
        name: a.payload.admin.name,
        email: a.payload.admin.email,
        rolId: 'administrador',
        status: 'ACTIVO',
        granted: [], revoked: [],
      })
    })
    builder.addCase(companyRemoved, (s, a) => {
      s.users = s.users.filter(u => u.companyId !== a.payload)
      s.roles = s.roles.filter(r => r.companyId !== a.payload)
    })
  },
})

export const {
  createUser, editUser, changeUserStatus,
  sincronizarAdministracion,
  alternarExcepcion, toggleRolePermission, createRole,
  editRole, deleteRole, setRolePermissions,
} = slice.actions
export default slice.reducer

/** Permisos efectivos: los del rol, más los concedidos, menos los revocados. */
export function effectivePermissions(u: SystemUser, roles: Rol[]): PermissionCode[] {
  const base = roles.find(r => r.id === u.rolId)?.permissions ?? []
  return Array.from(new Set([...base, ...u.granted])).filter(p => !u.revoked.includes(p))
}

/**
 * Los usuarios de la empresa de la sesión.
 *
 * El personal de Axiom tiene `empresaId: null`, así que nunca cae acá: una
 * empresa no ve —ni puede tocar— a quien administra la plataforma.
 */
const EMPTY_USERS: SystemUser[] = []
export const selectUsersOfMyCompany = createSelector(
  [(s: RootState) => s.auth.user?.companyId, (s: RootState) => s.users.users],
  (companyId, users) => companyId ? users.filter(u => u.companyId === companyId) : EMPTY_USERS,
)

/** Todo el padrón. Solo para el ámbito plataforma. */
export const selectAllUsers = (s: RootState) =>
  s.auth.user?.scope === 'plataforma' ? s.users.users : []

/**
 * Roles que una empresa puede ver y asignar: los de sistema más los suyos.
 * Los del ámbito plataforma quedan fuera, así no aparecen en su selector.
 */
const EMPTY_ROLES: Rol[] = []
export const selectRolesOfMyCompany = createSelector(
  [(s: RootState) => s.auth.user?.companyId, (s: RootState) => s.users.roles],
  (companyId, roles) => companyId
    ? roles.filter(r => !r.platform && (r.sistema || r.companyId === companyId))
    : EMPTY_ROLES,
)

/**
 * Las cuentas de Axiom. Sale del mismo padrón que todo el resto: lo único que
 * las distingue es no tener empresa.
 */
export const selectCuentasDeAxiom = (s: RootState) =>
  s.users.users.filter(u => u.companyId === null)
