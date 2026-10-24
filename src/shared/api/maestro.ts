import { httpClient } from './client'

export type ApiEnvelope<T> = { data: T; message?: string }
export type ApiPage<T> = { data: T[]; pagination: { page: number; count: number; total: number; total_pages: number } }

export type ApiClient = {
  id: string; empresa_id: string; codigo: string; tipo_persona: 'natural' | 'juridica'; documento: string
  razon_social?: string | null; primer_nombre?: string | null; primer_apellido?: string | null
  sector_economico?: string | null; actividad_economica?: string | null; origen_fondos?: string | null
  ingresos_estimados?: string | null; frecuencia_operacion?: string | null; direccion?: string | null
  email?: string | null; telefono?: string | null; estado_verificacion: string; estado_decision: string
  nivel_riesgo?: string | null; observaciones?: string | null
  revisado_por?: string | null; fecha_revision?: string | null; created_at: string
  respuestas_portal?: Record<string, unknown> | null
}
export type ApiRelatedPerson = {
  id: string; rol_vinculo: string; primer_nombre: string; segundo_nombre?: string | null
  primer_apellido: string; segundo_apellido?: string | null; documento?: string | null
  nacionalidad?: string | null; cargo?: string | null; porcentaje_participacion?: number | string | null
  es_pep: boolean; activo: boolean
}
export type ApiPermission = { id: string; codigo: string; nombre: string; descripcion: string; grupo: string; nivel: string }
export type ApiCatalogDef = { id: string; clave: string; nombre: string; descripcion?: string | null }
export type ApiCatalogValue = { id: string; empresa_id: string; catalogo_clave: string; valor: string; orden: number; activo: boolean }
export type ApiDraftRetention = { empresa_id: string; empresa: string; dias: number }
export type ApiRole = { id: string; codigo: string; nombre: string; descripcion?: string; es_predefinido: boolean; empresa_id?: string | null; permisos: ApiPermission[] }
export type ApiUser = { id: string; empresa_id?: string | null; empresa_nombre?: string | null; ambito: string; email: string; nombre_completo: string; rol_id?: string | null; status: string; permisos_efectivos: string[]; concedidos?: string[]; revocados?: string[] }
export type ApiFormField = { id: string; codigo: string; etiqueta: string; tipo_campo: string; orden: number; obligatorio: boolean; es_estandar: boolean; catalogo_ref?: string | null; opciones?: string[]; ancho: string; condiciones_visibilidad?: { enlace: 'y' | 'o'; condiciones: Array<{ campo_codigo: string; operador: string; valor?: string | null }> } | null }
export type ApiFormAppearance = {
  logo_url?: string | null
  color_primario?: string | null
  color_acento?: string | null
  color_fondo?: string | null
  color_encabezado?: string | null
  color_texto?: string | null
  titulo?: string | null
  subtitulo?: string | null
  texto_introduccion?: string | null
  fuente?: 'sistema' | 'serif' | 'redondeada' | null
}
export type ApiForm = { numero_version: number; motivo: string; publicado_en: string; apariencia?: ApiFormAppearance | null; secciones: Array<{ id: string; nombre: string; orden: number; campos: ApiFormField[] }> }
export type ApiPortalCompany = { slug: string; nombre: string; formulario?: ApiForm | null }
export type ApiAuditLog = {
  id: string; actor_usuario_id?: string | null; actor_nombre: string; actor_rol?: string | null
  accion: string; entidad_tipo?: string | null; entidad_id?: string | null
  detalle?: Record<string, unknown> | null; resultado: string; ocurrido_en: string
}
export type ApiNotification = {
  id: string; titulo: string; detalle: string; entidad_tipo?: string | null; entidad_id?: string | null
  leida: boolean; created_at: string
}
export type ApiPortalRecord = {
  estado: 'en_progreso' | 'enviado' | 'requiere_verificacion'
  token?: string | null; paso_actual?: number | null; respuestas?: Record<string, unknown> | null
  cliente_codigo?: string | null; cliente_estado_decision?: string | null
}

export const maestroApi = {
  login: (email: string, password: string) => httpClient.post<{ access_token: string }>('/auth/token', new URLSearchParams({ username: email, password }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(r => r.data),
  session: () => httpClient.get<ApiEnvelope<{ user_id: string; scope: 'tenant' | 'platform'; empresa_id: string | null; nombre: string; email: string; rol: string; permisos: string[] }>>('/auth/me').then(r => r.data.data),
  clients: (params?: Record<string, string | number | boolean | undefined>) =>
    httpClient.get<ApiPage<ApiClient>>('/clientes/', { params }).then(r => r.data),
  relatedPeople: (clientId: string) =>
    httpClient.get<ApiEnvelope<ApiRelatedPerson[]>>(`/clientes/${clientId}/personas-vinculadas/`).then(r => r.data.data),
  createClient: (payload: Record<string, unknown>) => httpClient.post<ApiEnvelope<ApiClient>>('/clientes/', payload).then(r => r.data.data),
  editClient: (id: string, payload: Record<string, unknown>) => httpClient.patch<ApiEnvelope<ApiClient>>(`/clientes/${id}`, payload).then(r => r.data.data),
  createPerson: (clientId: string, payload: Record<string, unknown>) =>
    httpClient.post<ApiEnvelope<ApiRelatedPerson>>(`/clientes/${clientId}/personas-vinculadas/`, payload).then(r => r.data.data),
  deactivatePerson: (clientId: string, personId: string) =>
    httpClient.post(`/clientes/${clientId}/personas-vinculadas/${personId}/inactivar`, {}),
  auditLog: () => httpClient.get<ApiEnvelope<ApiAuditLog[]>>('/bitacora/').then(r => r.data.data),
  exportAuditLog: () => httpClient.get<Blob>('/bitacora/exportar', { responseType: 'blob' }).then(r => r.data),
  notifications: () => httpClient.get<ApiEnvelope<ApiNotification[]>>('/notificaciones/').then(r => r.data.data),
  markNotifications: (ids: string[]) => httpClient.post('/notificaciones/leidas', { ids }),
  confirmPortal: (slug: string, rif: string, code: string) =>
    httpClient.post<ApiEnvelope<ApiPortalRecord>>(`/portal/${encodeURIComponent(slug)}/verificacion`, { rif, codigo: code }).then(r => r.data.data),
  approveClient: (id: string, reason: string) => httpClient.post(`/clientes/${id}/aprobar`, { motivo: reason }),
  rejectClient: (id: string, reason: string) => httpClient.post(`/clientes/${id}/rechazar`, { motivo: reason }),
  disableClient: (id: string, reason: string) => httpClient.post(`/clientes/${id}/inhabilitar`, { motivo: reason }),
  catalogDefinitions: () => httpClient.get<ApiEnvelope<ApiCatalogDef[]>>('/catalogos/').then(r => r.data.data),
  catalogValues: (key: string) => httpClient.get<ApiEnvelope<ApiCatalogValue[]>>(`/catalogos/${encodeURIComponent(key)}/valores`).then(r => r.data.data),
  addCatalogValue: (key: string, value: string) => httpClient.post<ApiEnvelope<ApiCatalogValue>>(`/catalogos/${encodeURIComponent(key)}/valores`, { valor: value, orden: 0 }).then(r => r.data.data),
  editCatalogValue: (id: string, value: string) => httpClient.patch<ApiEnvelope<ApiCatalogValue>>(`/catalogos/valores/${id}`, { valor: value }).then(r => r.data.data),
  deactivateCatalogValue: (id: string) => httpClient.patch<ApiEnvelope<ApiCatalogValue>>(`/catalogos/valores/${id}`, { activo: false }).then(r => r.data.data),
  users: () => httpClient.get<ApiEnvelope<ApiUser[]>>('/administracion/usuarios').then(r => r.data.data),
  roles: () => httpClient.get<ApiEnvelope<ApiRole[]>>('/administracion/roles').then(r => r.data.data),
  permissions: () => httpClient.get<ApiEnvelope<ApiPermission[]>>('/administracion/permisos').then(r => r.data.data),
  changeUserStatus: (id: string, status: string) => httpClient.patch(`/administracion/usuarios/${id}/estado`, { status }),
  editUser: (id: string, name: string, roleId: string) =>
    httpClient.patch<ApiEnvelope<ApiUser>>(`/administracion/usuarios/${id}`, { nombre_completo: name, rol_id: roleId }).then(r => r.data.data),
  replaceRolePermissions: (id: string, permiso_ids: string[]) => httpClient.put(`/administracion/roles/${id}/permisos`, { permiso_ids }),
  deleteCompany: (id: string) => httpClient.delete(`/administracion/empresas/${id}`),
  draftRetentions: () => httpClient.get<ApiEnvelope<ApiDraftRetention[]>>('/administracion/retencion-borradores').then(r => r.data.data),
  updateDraftRetention: (companyId: string, days: number) => httpClient.patch<ApiEnvelope<ApiDraftRetention>>(`/administracion/retencion-borradores/${companyId}`, { dias: days }).then(r => r.data.data),
  userException: (id: string, permiso_id: string, granted: boolean, reason: string) =>
    httpClient.post(`/administracion/usuarios/${id}/permisos`, { permiso_id, concedido: granted, motivo: reason }),
  currentForm: (companySlug?: string) => httpClient.get<ApiEnvelope<ApiForm>>('/formulario/', { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data.data),
  formHistory: (companySlug?: string) => httpClient.get<ApiEnvelope<Array<{ numero_version: number; motivo: string; publicado_en: string }>>>('/formulario/versiones', { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data.data),
  formVersion: (numero: number, companySlug?: string) => httpClient.get<ApiEnvelope<ApiForm>>(`/formulario/versiones/${numero}`, { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data.data),
  formDraft: (companySlug?: string) => httpClient.get<ApiEnvelope<any>>('/formulario/borrador', { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data.data),
  saveFormDraft: (payload: unknown, companySlug?: string) => httpClient.put('/formulario/borrador', payload, { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data),
  deleteFormDraft: (companySlug?: string) => httpClient.delete('/formulario/borrador', { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data),
  publishForm: (payload: unknown, companySlug?: string) => httpClient.post('/formulario/versiones', payload, { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data),
  portalCompany: (slug: string) => httpClient.get<ApiEnvelope<ApiPortalCompany>>(`/portal/${encodeURIComponent(slug)}`).then(r => r.data.data),
  startPortal: (slug: string, rif: string) => httpClient.post<ApiEnvelope<ApiPortalRecord>>(`/portal/${encodeURIComponent(slug)}/borradores`, { rif }).then(r => r.data.data),
  queryPortal: (slug: string, rif: string) => httpClient.post<ApiEnvelope<ApiPortalRecord>>(`/portal/${encodeURIComponent(slug)}/consulta`, { rif }).then(r => r.data.data),
  savePortalStep: (slug: string, token: string, step: number, answers: Record<string, unknown>) =>
    httpClient.patch<ApiEnvelope<ApiPortalRecord>>(`/portal/${encodeURIComponent(slug)}/borradores/${encodeURIComponent(token)}/pasos/${step}`, { respuestas: answers }).then(r => r.data.data),
  uploadPortalDocument: (slug: string, token: string, fieldKey: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    body.append('field_key', fieldKey)
    return httpClient.post<ApiEnvelope<Record<string, unknown>>>(`/portal/${encodeURIComponent(slug)}/borradores/${encodeURIComponent(token)}/documentos`, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
  },
}
