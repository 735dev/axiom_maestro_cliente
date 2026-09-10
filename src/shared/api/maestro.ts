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
}
export type ApiPermiso = { id: string; codigo: string; nombre: string; descripcion: string; grupo: string; nivel: string }
export type ApiRol = { id: string; codigo: string; nombre: string; descripcion?: string; es_predefinido: boolean; empresa_id?: string | null; permisos: ApiPermiso[] }
export type ApiUsuario = { id: string; empresa_id?: string | null; ambito: string; email: string; nombre_completo: string; rol_id?: string | null; status: string; permisos_efectivos: string[] }
export type ApiFormulario = { numero_version: number; motivo: string; publicado_en: string; secciones: Array<{ id: string; nombre: string; orden: number; campos: Array<{ id: string; codigo: string; etiqueta: string; tipo_campo: string; orden: number; obligatorio: boolean; es_estandar: boolean; catalogo_ref?: string | null; ancho: string; condiciones_visibilidad?: unknown }> }> }

export const maestroApi = {
  login: (correo: string, clave: string) => httpClient.post<{ access_token: string }>('/auth/token', new URLSearchParams({ username: correo, password: clave }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(r => r.data),
  sesion: () => httpClient.get<ApiEnvelope<{ user_id: string; scope: 'tenant' | 'platform'; empresa_id: string | null; nombre: string; rol: string; permisos: string[] }>>('/auth/me').then(r => r.data.data),
  clientes: (params?: Record<string, string | number | boolean | undefined>) =>
    httpClient.get<ApiPagina<ApiCliente>>('/clientes/', { params }).then(r => r.data),
  usuarios: () => httpClient.get<ApiEnvelope<ApiUsuario[]>>('/administracion/usuarios').then(r => r.data.data),
  roles: () => httpClient.get<ApiEnvelope<ApiRol[]>>('/administracion/roles').then(r => r.data.data),
  permisos: () => httpClient.get<ApiEnvelope<ApiPermiso[]>>('/administracion/permisos').then(r => r.data.data),
  cambiarEstadoUsuario: (id: string, status: string) => httpClient.patch(`/administracion/usuarios/${id}/estado`, { status }),
  reemplazarPermisosRol: (id: string, permiso_ids: string[]) => httpClient.put(`/administracion/roles/${id}/permisos`, { permiso_ids }),
  excepcionUsuario: (id: string, permiso_id: string, concedido: boolean, motivo: string) =>
    httpClient.post(`/administracion/usuarios/${id}/permisos`, { permiso_id, concedido, motivo }),
  formularioVigente: () => httpClient.get<ApiEnvelope<ApiFormulario>>('/formulario/').then(r => r.data.data),
  publicarFormulario: (payload: unknown) => httpClient.post('/formulario/versiones', payload).then(r => r.data),
}
