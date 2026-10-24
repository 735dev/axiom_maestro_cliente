import type { Entry, Severity, Sistema } from './types'
import { currentVersion } from '@/features/platform/store/companiesSlice'

/**
 * Traduce una acción del store en una entrada de auditoría.
 *
 * Recibe el estado **antes** y **después**, que es lo que permite registrar el
 * valor anterior y el nuevo sin que cada reducer tenga que acordarse de
 * mandarlo.
 *
 * Devolver `null` significa "esta acción no se audita" —navegación, rehidratar
 * el estado guardado, abrir un diálogo—. Todo lo que cambia datos tiene que
 * estar en este archivo: si aparece una acción que cambia algo y no está acá,
 * el sistema lo registra igual como acción sin describir, para que la falta se
 * note en vez de pasar en silencio.
 */

type Status = any

/** Acciones que no dejan rastro porque no cambian nada del negocio. */
const IGNORADAS = new Set<string>([
  'persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER',
  'ui/toggleTheme', 'lang/changeLanguage',
  // Sincronizaciones de lectura: actualizan la proyección local desde la API,
  // pero no son cambios hechos por una persona y no deben llenar la bitácora.
  'clients/reemplazarClientesDesdeApi',
  'clients/reemplazarPersonasCliente',
  // Marcar una notificación como leída es del que la lee, no un hecho del
  // negocio: no toca ninguna de las porciones que vigila el catch-all de más
  // abajo, así que ni falta declararla acá — queda documentado para que se
  // note que es a propósito.
  'notifications/marcarLeidas',
])

const roleName = (s: Status, rolId: string) =>
  s.users.roles.find((r: any) => r.id === rolId)?.name ?? rolId

const companyName = (s: Status, id: string) =>
  s.companies.list.find((e: any) => e.id === id)?.name ?? id

const userName = (s: Status, id: string) =>
  s.users.users.find((u: any) => u.id === id)?.name ?? id

type Hecho = {
  sistema: Sistema
  action: string
  detalle: string
  entity?: Entry['entity']
  reason?: string
  before?: string
  after?: string
  companyId?: string | null
  severity?: Severity
}

/** Qué pasó, en términos del negocio. */
function hechoDe(tipo: string, p: any, before: Status, after: Status): Hecho | null {
  switch (tipo) {
    /* ---------------- Sesión ---------------- */
    case 'auth/login':
      return {
        sistema: p.user.scope === 'plataforma' ? 'Plataforma' : 'Maestro',
        action: 'Inicio de sesión',
        detalle: `${p.user.name} entró como ${p.user.rol}`,
        companyId: p.user.companyId,
        severity: p.user.scope === 'plataforma' ? 'sensible' : 'normal',
      }
    case 'auth/logout':
      return { sistema: 'Maestro', action: 'Cierre de sesión', detalle: 'La sesión terminó' }

    /* ---------------- Clientes ---------------- */
    case 'clients/crearCliente': {
      const created = after.clients.list.find((c: any) => !before.clients.list.some((x: any) => x.code === c.code))
      return {
        sistema: 'Maestro', action: 'Alta de cliente',
        detalle: `${p.client.legalName} — código ${created?.code ?? '—'} asignado`,
        entity: { tipo: 'cliente', id: created?.code ?? '—', name: p.client.legalName },
        companyId: p.client.companyId,
      }
    }
    case 'clients/guardarBorradorPortal': {
      const client = p.client
      const esEnvio = client?.status === 'PENDIENTE'
      return {
        sistema: 'Maestro',
        action: esEnvio ? 'Envío de expediente desde el portal' : 'Guardado de avance del portal',
        detalle: `${client?.legalName || 'Client sin razón social'}${p.code ? ` — código ${p.code}` : ''}${esEnvio ? ' — enviado a Prevención' : ` — bloque ${client?.stepReached ?? '—'}`}`,
        entity: { tipo: 'cliente', id: p.code ?? 'nuevo', name: client?.legalName },
        companyId: client?.companyId,
        severity: esEnvio ? 'sensible' : 'normal',
      }
    }
    case 'clients/editarCliente': {
      const prev = before.clients.list.find((c: any) => c.code === p.code)
      const fields = Object.keys(p.cambios ?? {}).filter(k => prev && prev[k] !== p.cambios[k])
      if (!fields.length) return null
      return {
        sistema: 'Maestro', action: 'Edición de la ficha',
        detalle: `Cliente ${p.code}: ${fields.join(', ')}`,
        entity: { tipo: 'cliente', id: p.code, name: prev?.legalName },
        before: fields.map(k => `${k}: ${prev[k] || '—'}`).join(' · '),
        after: fields.map(k => `${k}: ${p.cambios[k] || '—'}`).join(' · '),
        companyId: prev?.companyId,
      }
    }
    case 'clients/cambiarEstadoRegistro': {
      const prev = before.clients.list.find((c: any) => c.code === p.code)
      return {
        sistema: 'Maestro', action: 'Cambio de estado del expediente',
        detalle: `Cliente ${p.code}: ${prev?.status} → ${p.status}`,
        entity: { tipo: 'cliente', id: p.code, name: prev?.legalName },
        before: prev?.status, after: p.status, reason: p.reason,
        companyId: prev?.companyId, severity: 'sensible',
      }
    }
    case 'clients/agregarPersona':
      return {
        sistema: 'Maestro', action: 'Alta de persona vinculada',
        detalle: `${p.person?.name ?? '—'} en el cliente ${p.code}`,
        entity: { tipo: 'cliente', id: p.code },
        severity: 'sensible',
      }
    case 'clients/quitarPersona':
      return {
        sistema: 'Maestro', action: 'Baja de persona vinculada',
        detalle: `Persona retirada del cliente ${p.code}`,
        entity: { tipo: 'cliente', id: p.code },
        reason: p.reason, severity: 'sensible',
      }

    /* ---------------- Usuarios, roles y permisos ---------------- */
    case 'users/crearUsuario':
      return {
        sistema: 'Maestro', action: 'Alta de usuario',
        detalle: `${p.name} (${p.email}) con rol ${roleName(after, p.rolId)}`,
        entity: { tipo: 'usuario', id: p.email, name: p.name },
        companyId: p.companyId, severity: 'sensible',
      }
    case 'users/editarUsuario': {
      const prev = before.users.users.find((u: any) => u.id === p.id)
      const rol = roleName(after, p.cambios?.rolId ?? prev?.rolId)
      return {
        sistema: 'Maestro', action: 'Edición de usuario',
        detalle: `${prev?.name ?? p.cambios?.name}: ${prev?.name} → ${p.cambios?.name ?? prev?.name}, rol ${rol}`,
        entity: { tipo: 'usuario', id: p.id, name: p.cambios?.name ?? prev?.name },
        companyId: prev?.companyId, severity: 'sensible',
      }
    }
    case 'users/cambiarEstadoUsuario': {
      const prev = before.users.users.find((u: any) => u.id === p.id)
      return {
        sistema: 'Maestro', action: 'Cambio de estado de usuario',
        detalle: `${prev?.name}: ${prev?.status} → ${p.status}`,
        entity: { tipo: 'usuario', id: p.id, name: prev?.name },
        before: prev?.status, after: p.status,
        companyId: prev?.companyId, severity: 'sensible',
      }
    }
    case 'users/alternarExcepcion':
      return {
        sistema: 'Maestro', action: 'Excepción de permiso sobre un usuario',
        detalle: `${userName(before, p.id)}: ${p.permission} → ${p.modo}`,
        entity: { tipo: 'usuario', id: p.id, name: userName(before, p.id) },
        after: p.modo, severity: 'sensible',
      }
    case 'users/alternarPermisoRol': {
      const prev = before.users.roles.find((r: any) => r.id === p.rolId)
      const tenia = prev?.permissions.includes(p.permission)
      return {
        sistema: 'Maestro', action: tenia ? 'Permiso retirado de un rol' : 'Permiso concedido a un rol',
        detalle: `Rol ${prev?.name}: ${p.permission}`,
        entity: { tipo: 'rol', id: p.rolId, name: prev?.name },
        severity: 'sensible',
      }
    }
    case 'users/fijarPermisosRol': {
      const prev = before.users.roles.find((r: any) => r.id === p.rolId)
      return {
        sistema: 'Maestro', action: p.value ? 'Permisos concedidos en bloque' : 'Permisos retirados en bloque',
        detalle: `Rol ${prev?.name}: ${p.permissions.length} permisos`,
        entity: { tipo: 'rol', id: p.rolId, name: prev?.name },
        before: `${prev?.permissions.length} permisos`,
        after: `${after.users.roles.find((r: any) => r.id === p.rolId)?.permissions.length} permisos`,
        severity: 'sensible',
      }
    }
    case 'users/crearRol':
      return {
        sistema: 'Maestro', action: 'Alta de rol',
        detalle: p.copiarDe ? `${p.name}, copiado de ${roleName(before, p.copiarDe)}` : p.name,
        entity: { tipo: 'rol', id: p.name, name: p.name },
        severity: 'sensible',
      }
    case 'users/editarRol': {
      const prev = before.users.roles.find((r: any) => r.id === p.id)
      return {
        sistema: 'Maestro', action: 'Rol renombrado',
        detalle: `${prev?.name} → ${p.name}`,
        entity: { tipo: 'rol', id: p.id, name: p.name },
        before: prev?.name, after: p.name,
      }
    }
    case 'users/borrarRol': {
      const prev = before.users.roles.find((r: any) => r.id === p)
      if (!prev || after.users.roles.some((r: any) => r.id === p)) {
        // El reducer se negó: rol de sistema o con usuarios asignados.
        return {
          sistema: 'Maestro', action: 'Intento de borrar un rol',
          detalle: `${prev?.name ?? p} — rechazado por el sistema`,
          entity: { tipo: 'rol', id: String(p), name: prev?.name },
          severity: 'sensible',
        }
      }
      return {
        sistema: 'Maestro', action: 'Baja de rol', detalle: prev.name,
        entity: { tipo: 'rol', id: String(p), name: prev.name }, severity: 'sensible',
      }
    }

    /* ---------------- Catálogos ---------------- */
    case 'catalogs/agregarValor':
      return {
        sistema: 'Maestro', action: 'Valor agregado a un catálogo',
        detalle: `${p.catalog}: “${p.value}”`,
        entity: { tipo: 'catálogo', id: p.catalog },
      }
    case 'catalogs/quitarValor':
      return {
        sistema: 'Maestro', action: 'Valor retirado de un catálogo',
        detalle: `${p.catalog}: “${p.value}”`,
        entity: { tipo: 'catálogo', id: p.catalog }, severity: 'sensible',
      }

    /* ---------------- Plataforma ---------------- */
    case 'companies/crearEmpresa':
      return {
        sistema: 'Plataforma', action: 'Alta de empresa con su administrador',
        detalle: `${p.name} (${p.rif}) · portal /${p.slug} · administrador ${p.admin.name} <${p.admin.email}>`,
        entity: { tipo: 'empresa', id: p.id, name: p.name },
        companyId: p.id, severity: 'sensible',
      }
    case 'companies/deleteCompany': {
      const prev = before.companies.list.find((e: any) => e.id === p)
      return {
        sistema: 'Plataforma', action: 'Empresa borrada',
        detalle: `${prev?.name} (${prev?.rif}) se eliminó porque no tenía clientes ni formulario.`,
        entity: { tipo: 'empresa', id: p, name: prev?.name },
        companyId: null, severity: 'sensible',
      }
    }
    case 'companies/cambiarEstadoEmpresa': {
      const prev = before.companies.list.find((e: any) => e.id === p.id)
      return {
        sistema: 'Plataforma', action: p.status === 'SUSPENDIDA' ? 'Empresa suspendida' : 'Empresa reactivada',
        detalle: `${prev?.name}: ${prev?.status} → ${p.status}`,
        entity: { tipo: 'empresa', id: p.id, name: prev?.name },
        before: prev?.status, after: p.status,
        companyId: null, severity: 'sensible',
      }
    }
    case 'companies/publicarFormulario': {
      const prevE = before.companies.list.find((e: any) => e.id === p.id)
      const created = currentVersion(after.companies.list.find((e: any) => e.id === p.id))
      return {
        sistema: 'Plataforma', action: 'Nueva versión del formulario',
        detalle: `${companyName(before, p.id)}: v${created.version} with ${created.sections.length} sections and ${created.fields.length} fields`,
        entity: { tipo: 'formulario', id: p.id, name: prevE?.name },
        before: `v${currentVersion(prevE).version}`, after: `v${created.version}`,
        reason: p.reason, companyId: p.id, severity: 'sensible',
      }
    }
  }
  return null
}

/** Contador local: dos acciones en el mismo milisegundo no comparten id. */
let secuencia = 0

export function describe(action: any, before: Status, after: Status): Entry | null {
  const tipo: string = action?.type ?? ''
  if (!tipo || IGNORADAS.has(tipo)) return null

  const hecho = hechoDe(tipo, action.payload, before, after)

  // Una acción que cambió datos y nadie describió no puede desaparecer: se
  // registra en crudo para que la omisión se vea en la bitácora.
  if (!hecho) {
    const cambio = ['clientes', 'usuarios', 'catalogos', 'empresas']
      .some(k => before?.[k] !== after?.[k])
    if (!cambio) return null
  }

  const u = after.auth?.user ?? before.auth?.user
  secuencia += 1

  return {
    id: `a${Date.now()}-${secuencia}`,
    fecha: new Date().toISOString(),
    actor: {
      id: u?.id ?? 'anónimo',
      name: u?.name ?? 'Sin sesión',
      rol: u?.rol ?? '—',
      scope: u?.scope ?? 'empresa',
    },
    companyId: hecho?.companyId !== undefined ? hecho.companyId : (u?.companyId ?? null),
    sistema: hecho?.sistema ?? 'Maestro',
    action: hecho?.action ?? `Acción sin describir (${tipo})`,
    entity: hecho?.entity,
    detalle: hecho?.detalle ?? 'Cambió el estado del sistema y esta acción no está descrita en la auditoría.',
    reason: hecho?.reason,
    before: hecho?.before,
    after: hecho?.after,
    resultado: 'ok',
    severity: hecho?.severity ?? 'normal',
  }
}
