import { httpClient } from './client'

export type ApiEnvelope<T> = { data: T; message?: string }
export type ApiPagina<T> = { data: T[]; pagination: { page: number; count: number; total: number; total_pages: number } }

export type ApiCliente = {
  id: string; empresa_id: string; codigo: string; tipo_persona: 'natural' | 'juridica'; documento: string
  razon_social?: string | null; primer_nombre?: string | null; primer_apellido?: string | null
  sector_economico?: string | null; actividad_economica?: string | null; origen_fondos?: string | null
  ingresos_estimados?: string | null; frecuencia_operacion?: string | null; direccion?: string | null
  email?: string | null; telefono?: string | null; estado_verificacion: string; estado_decision: string
  revisado_por?: string | null; fecha_revision?: string | null; created_at: string
  respuestas_portal?: Record<string, unknown> | null
}
export type ApiPersonaVinculada = {
  id: string; rol_vinculo: string; primer_nombre: string; segundo_nombre?: string | null
  primer_apellido: string; segundo_apellido?: string | null; documento?: string | null
  nacionalidad?: string | null; cargo?: string | null; porcentaje_participacion?: number | string | null
  es_pep: boolean; activo: boolean
}
export type ApiPermiso = { id: string; codigo: string; nombre: string; descripcion: string; grupo: string; nivel: string }
export type ApiCatalogoDef = { id: string; clave: string; nombre: string; descripcion?: string | null }
export type ApiCatalogoValor = { id: string; empresa_id: string; catalogo_clave: string; valor: string; orden: number; activo: boolean }
export type ApiRetencionBorrador = { empresa_id: string; empresa: string; dias: number }
export type ApiRol = { id: string; codigo: string; nombre: string; descripcion?: string; es_predefinido: boolean; empresa_id?: string | null; permisos: ApiPermiso[] }
export type ApiUsuario = { id: string; empresa_id?: string | null; empresa_nombre?: string | null; ambito: string; email: string; nombre_completo: string; rol_id?: string | null; status: string; permisos_efectivos: string[] }
export type ApiFormulario = { numero_version: number; motivo: string; publicado_en: string; secciones: Array<{ id: string; nombre: string; orden: number; campos: Array<{ id: string; codigo: string; etiqueta: string; tipo_campo: string; orden: number; obligatorio: boolean; es_estandar: boolean; catalogo_ref?: string | null; ancho: string; condiciones_visibilidad?: unknown }> }> }
export type ApiEmpresaPortal = { slug: string; nombre: string }
export type ApiPortalRegistro = {
  estado: 'en_progreso' | 'enviado' | 'requiere_verificacion'
  token?: string | null; paso_actual?: number | null; respuestas?: Record<string, unknown> | null
  cliente_codigo?: string | null; cliente_estado_decision?: string | null
}

export const maestroApi = {
  login: (correo: string, clave: string) => httpClient.post<{ access_token: string }>('/auth/token', new URLSearchParams({ username: correo, password: clave }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(r => r.data),
  sesion: () => httpClient.get<ApiEnvelope<{ user_id: string; scope: 'tenant' | 'platform'; empresa_id: string | null; nombre: string; email: string; rol: string; permisos: string[] }>>('/auth/me').then(r => r.data.data),
  clientes: (params?: Record<string, string | number | boolean | undefined>) =>
    httpClient.get<ApiPagina<ApiCliente>>('/clientes/', { params }).then(r => r.data),
  personasVinculadas: (clienteId: string) =>
    httpClient.get<ApiEnvelope<ApiPersonaVinculada[]>>(`/clientes/${clienteId}/personas-vinculadas/`).then(r => r.data.data),
  crearCliente: (payload: Record<string, unknown>) => httpClient.post<ApiEnvelope<ApiCliente>>('/clientes/', payload).then(r => r.data.data),
  aprobarCliente: (id: string, motivo: string) => httpClient.post(`/clientes/${id}/aprobar`, { motivo }),
  rechazarCliente: (id: string, motivo: string) => httpClient.post(`/clientes/${id}/rechazar`, { motivo }),
  inhabilitarCliente: (id: string, motivo: string) => httpClient.post(`/clientes/${id}/inhabilitar`, { motivo }),
  catalogosDefiniciones: () => httpClient.get<ApiEnvelope<ApiCatalogoDef[]>>('/catalogos/').then(r => r.data.data),
  catalogoValores: (clave: string) => httpClient.get<ApiEnvelope<ApiCatalogoValor[]>>(`/catalogos/${encodeURIComponent(clave)}/valores`).then(r => r.data.data),
  agregarValorCatalogo: (clave: string, valor: string) => httpClient.post<ApiEnvelope<ApiCatalogoValor>>(`/catalogos/${encodeURIComponent(clave)}/valores`, { valor, orden: 0 }).then(r => r.data.data),
  editarValorCatalogo: (id: string, valor: string) => httpClient.patch<ApiEnvelope<ApiCatalogoValor>>(`/catalogos/valores/${id}`, { valor }).then(r => r.data.data),
  inactivarValorCatalogo: (id: string) => httpClient.patch<ApiEnvelope<ApiCatalogoValor>>(`/catalogos/valores/${id}`, { activo: false }).then(r => r.data.data),
  usuarios: () => httpClient.get<ApiEnvelope<ApiUsuario[]>>('/administracion/usuarios').then(r => r.data.data),
  roles: () => httpClient.get<ApiEnvelope<ApiRol[]>>('/administracion/roles').then(r => r.data.data),
  permisos: () => httpClient.get<ApiEnvelope<ApiPermiso[]>>('/administracion/permisos').then(r => r.data.data),
  cambiarEstadoUsuario: (id: string, status: string) => httpClient.patch(`/administracion/usuarios/${id}/estado`, { status }),
  reemplazarPermisosRol: (id: string, permiso_ids: string[]) => httpClient.put(`/administracion/roles/${id}/permisos`, { permiso_ids }),
  retencionesBorradores: () => httpClient.get<ApiEnvelope<ApiRetencionBorrador[]>>('/administracion/retencion-borradores').then(r => r.data.data),
  actualizarRetencionBorradores: (empresaId: string, dias: number) => httpClient.patch<ApiEnvelope<ApiRetencionBorrador>>(`/administracion/retencion-borradores/${empresaId}`, { dias }).then(r => r.data.data),
  excepcionUsuario: (id: string, permiso_id: string, concedido: boolean, motivo: string) =>
    httpClient.post(`/administracion/usuarios/${id}/permisos`, { permiso_id, concedido, motivo }),
  formularioVigente: (companySlug?: string) => httpClient.get<ApiEnvelope<ApiFormulario>>('/formulario/', { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data.data),
  publicarFormulario: (payload: unknown, companySlug?: string) => httpClient.post('/formulario/versiones', payload, { params: companySlug ? { company_slug: companySlug } : undefined }).then(r => r.data),
  empresaPortal: (slug: string) => httpClient.get<ApiEnvelope<ApiEmpresaPortal>>(`/portal/${encodeURIComponent(slug)}`).then(r => r.data.data),
  iniciarPortal: (slug: string, rif: string) => httpClient.post<ApiEnvelope<ApiPortalRegistro>>(`/portal/${encodeURIComponent(slug)}/borradores`, { rif }).then(r => r.data.data),
  guardarPasoPortal: (slug: string, token: string, paso: number, respuestas: Record<string, unknown>) =>
    httpClient.patch<ApiEnvelope<ApiPortalRegistro>>(`/portal/${encodeURIComponent(slug)}/borradores/${encodeURIComponent(token)}/pasos/${paso}`, { respuestas }).then(r => r.data.data),
}
