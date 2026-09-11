import type { Entrada, Gravedad, Sistema } from './tipos'
import { versionVigente } from '@/features/plataforma/store/empresasSlice'

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

type Estado = any

/** Acciones que no dejan rastro porque no cambian nada del negocio. */
const IGNORADAS = new Set<string>([
  'persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER',
  'ui/alternarTema', 'lang/cambiarIdioma',
  // Sincronizaciones de lectura: actualizan la proyección local desde la API,
  // pero no son cambios hechos por una persona y no deben llenar la bitácora.
  'clientes/reemplazarClientesDesdeApi',
  'clientes/reemplazarPersonasCliente',
  // Marcar una notificación como leída es del que la lee, no un hecho del
  // negocio: no toca ninguna de las porciones que vigila el catch-all de más
  // abajo, así que ni falta declararla acá — queda documentado para que se
  // note que es a propósito.
  'notificaciones/marcarLeidas',
])

const nombreRol = (s: Estado, rolId: string) =>
  s.usuarios.roles.find((r: any) => r.id === rolId)?.nombre ?? rolId

const nombreEmpresa = (s: Estado, id: string) =>
  s.empresas.lista.find((e: any) => e.id === id)?.nombre ?? id

const nombreUsuario = (s: Estado, id: string) =>
  s.usuarios.usuarios.find((u: any) => u.id === id)?.nombre ?? id

type Hecho = {
  sistema: Sistema
  accion: string
  detalle: string
  entidad?: Entrada['entidad']
  motivo?: string
  antes?: string
  despues?: string
  empresaId?: string | null
  gravedad?: Gravedad
}

/** Qué pasó, en términos del negocio. */
function hechoDe(tipo: string, p: any, antes: Estado, despues: Estado): Hecho | null {
  switch (tipo) {
    /* ---------------- Sesión ---------------- */
    case 'auth/login':
      return {
        sistema: p.usuario.ambito === 'plataforma' ? 'Plataforma' : 'Maestro',
        accion: 'Inicio de sesión',
        detalle: `${p.usuario.nombre} entró como ${p.usuario.rol}`,
        empresaId: p.usuario.empresaId,
        gravedad: p.usuario.ambito === 'plataforma' ? 'sensible' : 'normal',
      }
    case 'auth/logout':
      return { sistema: 'Maestro', accion: 'Cierre de sesión', detalle: 'La sesión terminó' }

    /* ---------------- Clientes ---------------- */
    case 'clientes/crearCliente': {
      const nuevo = despues.clientes.lista.find((c: any) => !antes.clientes.lista.some((x: any) => x.codigo === c.codigo))
      return {
        sistema: 'Maestro', accion: 'Alta de cliente',
        detalle: `${p.cliente.razonSocial} — código ${nuevo?.codigo ?? '—'} asignado`,
        entidad: { tipo: 'cliente', id: nuevo?.codigo ?? '—', nombre: p.cliente.razonSocial },
        empresaId: p.cliente.empresaId,
      }
    }
    case 'clientes/guardarBorradorPortal': {
      const cliente = p.cliente
      const esEnvio = cliente?.estado === 'PENDIENTE'
      return {
        sistema: 'Maestro',
        accion: esEnvio ? 'Envío de expediente desde el portal' : 'Guardado de avance del portal',
        detalle: `${cliente?.razonSocial || 'Cliente sin razón social'}${p.codigo ? ` — código ${p.codigo}` : ''}${esEnvio ? ' — enviado a Prevención' : ` — bloque ${cliente?.pasoAlcanzado ?? '—'}`}`,
        entidad: { tipo: 'cliente', id: p.codigo ?? 'nuevo', nombre: cliente?.razonSocial },
        empresaId: cliente?.empresaId,
        gravedad: esEnvio ? 'sensible' : 'normal',
      }
    }
    case 'clientes/editarCliente': {
      const prev = antes.clientes.lista.find((c: any) => c.codigo === p.codigo)
      const campos = Object.keys(p.cambios ?? {}).filter(k => prev && prev[k] !== p.cambios[k])
      if (!campos.length) return null
      return {
        sistema: 'Maestro', accion: 'Edición de la ficha',
        detalle: `Cliente ${p.codigo}: ${campos.join(', ')}`,
        entidad: { tipo: 'cliente', id: p.codigo, nombre: prev?.razonSocial },
        antes: campos.map(k => `${k}: ${prev[k] || '—'}`).join(' · '),
        despues: campos.map(k => `${k}: ${p.cambios[k] || '—'}`).join(' · '),
        empresaId: prev?.empresaId,
      }
    }
    case 'clientes/cambiarEstadoRegistro': {
      const prev = antes.clientes.lista.find((c: any) => c.codigo === p.codigo)
      return {
        sistema: 'Maestro', accion: 'Cambio de estado del expediente',
        detalle: `Cliente ${p.codigo}: ${prev?.estado} → ${p.estado}`,
        entidad: { tipo: 'cliente', id: p.codigo, nombre: prev?.razonSocial },
        antes: prev?.estado, despues: p.estado, motivo: p.motivo,
        empresaId: prev?.empresaId, gravedad: 'sensible',
      }
    }
    case 'clientes/agregarPersona':
      return {
        sistema: 'Maestro', accion: 'Alta de persona vinculada',
        detalle: `${p.persona?.nombre ?? '—'} en el cliente ${p.codigo}`,
        entidad: { tipo: 'cliente', id: p.codigo },
        gravedad: 'sensible',
      }
    case 'clientes/quitarPersona':
      return {
        sistema: 'Maestro', accion: 'Baja de persona vinculada',
        detalle: `Persona retirada del cliente ${p.codigo}`,
        entidad: { tipo: 'cliente', id: p.codigo },
        motivo: p.motivo, gravedad: 'sensible',
      }

    /* ---------------- Usuarios, roles y permisos ---------------- */
    case 'usuarios/crearUsuario':
      return {
        sistema: 'Maestro', accion: 'Alta de usuario',
        detalle: `${p.nombre} (${p.correo}) con rol ${nombreRol(despues, p.rolId)}`,
        entidad: { tipo: 'usuario', id: p.correo, nombre: p.nombre },
        empresaId: p.empresaId, gravedad: 'sensible',
      }
    case 'usuarios/cambiarEstadoUsuario': {
      const prev = antes.usuarios.usuarios.find((u: any) => u.id === p.id)
      return {
        sistema: 'Maestro', accion: 'Cambio de estado de usuario',
        detalle: `${prev?.nombre}: ${prev?.estado} → ${p.estado}`,
        entidad: { tipo: 'usuario', id: p.id, nombre: prev?.nombre },
        antes: prev?.estado, despues: p.estado,
        empresaId: prev?.empresaId, gravedad: 'sensible',
      }
    }
    case 'usuarios/alternarExcepcion':
      return {
        sistema: 'Maestro', accion: 'Excepción de permiso sobre un usuario',
        detalle: `${nombreUsuario(antes, p.id)}: ${p.permiso} → ${p.modo}`,
        entidad: { tipo: 'usuario', id: p.id, nombre: nombreUsuario(antes, p.id) },
        despues: p.modo, gravedad: 'sensible',
      }
    case 'usuarios/alternarPermisoRol': {
      const prev = antes.usuarios.roles.find((r: any) => r.id === p.rolId)
      const tenia = prev?.permisos.includes(p.permiso)
      return {
        sistema: 'Maestro', accion: tenia ? 'Permiso retirado de un rol' : 'Permiso concedido a un rol',
        detalle: `Rol ${prev?.nombre}: ${p.permiso}`,
        entidad: { tipo: 'rol', id: p.rolId, nombre: prev?.nombre },
        gravedad: 'sensible',
      }
    }
    case 'usuarios/fijarPermisosRol': {
      const prev = antes.usuarios.roles.find((r: any) => r.id === p.rolId)
      return {
        sistema: 'Maestro', accion: p.valor ? 'Permisos concedidos en bloque' : 'Permisos retirados en bloque',
        detalle: `Rol ${prev?.nombre}: ${p.permisos.length} permisos`,
        entidad: { tipo: 'rol', id: p.rolId, nombre: prev?.nombre },
        antes: `${prev?.permisos.length} permisos`,
        despues: `${despues.usuarios.roles.find((r: any) => r.id === p.rolId)?.permisos.length} permisos`,
        gravedad: 'sensible',
      }
    }
    case 'usuarios/crearRol':
      return {
        sistema: 'Maestro', accion: 'Alta de rol',
        detalle: p.copiarDe ? `${p.nombre}, copiado de ${nombreRol(antes, p.copiarDe)}` : p.nombre,
        entidad: { tipo: 'rol', id: p.nombre, nombre: p.nombre },
        gravedad: 'sensible',
      }
    case 'usuarios/editarRol': {
      const prev = antes.usuarios.roles.find((r: any) => r.id === p.id)
      return {
        sistema: 'Maestro', accion: 'Rol renombrado',
        detalle: `${prev?.nombre} → ${p.nombre}`,
        entidad: { tipo: 'rol', id: p.id, nombre: p.nombre },
        antes: prev?.nombre, despues: p.nombre,
      }
    }
    case 'usuarios/borrarRol': {
      const prev = antes.usuarios.roles.find((r: any) => r.id === p)
      if (!prev || despues.usuarios.roles.some((r: any) => r.id === p)) {
        // El reducer se negó: rol de sistema o con usuarios asignados.
        return {
          sistema: 'Maestro', accion: 'Intento de borrar un rol',
          detalle: `${prev?.nombre ?? p} — rechazado por el sistema`,
          entidad: { tipo: 'rol', id: String(p), nombre: prev?.nombre },
          gravedad: 'sensible',
        }
      }
      return {
        sistema: 'Maestro', accion: 'Baja de rol', detalle: prev.nombre,
        entidad: { tipo: 'rol', id: String(p), nombre: prev.nombre }, gravedad: 'sensible',
      }
    }

    /* ---------------- Catálogos ---------------- */
    case 'catalogos/agregarValor':
      return {
        sistema: 'Maestro', accion: 'Valor agregado a un catálogo',
        detalle: `${p.catalogo}: “${p.valor}”`,
        entidad: { tipo: 'catálogo', id: p.catalogo },
      }
    case 'catalogos/quitarValor':
      return {
        sistema: 'Maestro', accion: 'Valor retirado de un catálogo',
        detalle: `${p.catalogo}: “${p.valor}”`,
        entidad: { tipo: 'catálogo', id: p.catalogo }, gravedad: 'sensible',
      }

    /* ---------------- Plataforma ---------------- */
    case 'empresas/crearEmpresa':
      return {
        sistema: 'Plataforma', accion: 'Alta de empresa con su administrador',
        detalle: `${p.nombre} (${p.rif}) · portal ${p.dominio} · administrador ${p.admin.nombre} <${p.admin.correo}>`,
        entidad: { tipo: 'empresa', id: p.id, nombre: p.nombre },
        empresaId: p.id, gravedad: 'sensible',
      }
    case 'empresas/cambiarEstadoEmpresa': {
      const prev = antes.empresas.lista.find((e: any) => e.id === p.id)
      return {
        sistema: 'Plataforma', accion: p.estado === 'SUSPENDIDA' ? 'Empresa suspendida' : 'Empresa reactivada',
        detalle: `${prev?.nombre}: ${prev?.estado} → ${p.estado}`,
        entidad: { tipo: 'empresa', id: p.id, nombre: prev?.nombre },
        antes: prev?.estado, despues: p.estado,
        empresaId: null, gravedad: 'sensible',
      }
    }
    case 'empresas/publicarFormulario': {
      const prevE = antes.empresas.lista.find((e: any) => e.id === p.id)
      const nueva = versionVigente(despues.empresas.lista.find((e: any) => e.id === p.id))
      return {
        sistema: 'Plataforma', accion: 'Nueva versión del formulario',
        detalle: `${nombreEmpresa(antes, p.id)}: v${nueva.version} con ${nueva.secciones.length} secciones y ${nueva.campos.length} campos`,
        entidad: { tipo: 'formulario', id: p.id, nombre: prevE?.nombre },
        antes: `v${versionVigente(prevE).version}`, despues: `v${nueva.version}`,
        motivo: p.motivo, empresaId: p.id, gravedad: 'sensible',
      }
    }
  }
  return null
}

/** Contador local: dos acciones en el mismo milisegundo no comparten id. */
let secuencia = 0

export function describir(action: any, antes: Estado, despues: Estado): Entrada | null {
  const tipo: string = action?.type ?? ''
  if (!tipo || IGNORADAS.has(tipo)) return null

  const hecho = hechoDe(tipo, action.payload, antes, despues)

  // Una acción que cambió datos y nadie describió no puede desaparecer: se
  // registra en crudo para que la omisión se vea en la bitácora.
  if (!hecho) {
    const cambio = ['clientes', 'usuarios', 'catalogos', 'empresas']
      .some(k => antes?.[k] !== despues?.[k])
    if (!cambio) return null
  }

  const u = despues.auth?.usuario ?? antes.auth?.usuario
  secuencia += 1

  return {
    id: `a${Date.now()}-${secuencia}`,
    fecha: new Date().toISOString(),
    actor: {
      id: u?.id ?? 'anónimo',
      nombre: u?.nombre ?? 'Sin sesión',
      rol: u?.rol ?? '—',
      ambito: u?.ambito ?? 'empresa',
    },
    empresaId: hecho?.empresaId !== undefined ? hecho.empresaId : (u?.empresaId ?? null),
    sistema: hecho?.sistema ?? 'Maestro',
    accion: hecho?.accion ?? `Acción sin describir (${tipo})`,
    entidad: hecho?.entidad,
    detalle: hecho?.detalle ?? 'Cambió el estado del sistema y esta acción no está descrita en la auditoría.',
    motivo: hecho?.motivo,
    antes: hecho?.antes,
    despues: hecho?.despues,
    resultado: 'ok',
    gravedad: hecho?.gravedad ?? 'normal',
  }
}
