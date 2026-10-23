import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login, logout } from '@/shared/store/slices/authSlice'
import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import { useCan } from '@/shared/hooks/useCan'
import { useTheme } from '@/shared/hooks/useTheme'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { MasterClients } from '@/features/clients/pages/ClientsPage'
import { MasterRecord } from '@/features/clients/pages/ClientRecordPage'
import { ClientIntakePage } from '@/features/clients/pages/ClientIntakePage'
import { FormEditor } from '@/features/platform/pages/FormEditorPage'
import { MasterCatalogs } from '@/features/catalogs/pages/CatalogsPage'
import { AuditLogPage } from '@/features/audit-log/pages/AuditLogPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { CompanyDashboard } from '@/features/dashboard/pages/CompanyDashboard'
import { Bell } from '@/shared/notifications/Bell'
import { maestroApi } from '@/shared/api/maestro'
import { PortalBrand } from '@/shared/components/brand/TransvalorIsotype'
import { MyProfilePage } from '@/features/auth/pages/MyProfilePage'
import { Module } from './Module'

const RUTAS = [
  // El tablero no pide permiso: adentro cada tarjeta se muestra según lo que
  // el usuario pueda ver. Pedirle `registros.ver` dejaba sin inicio a quien
  // administra la empresa pero no toca clientes.
  { id: 'inicio', label: 'Dashboard', title: 'Resumen', sub: 'Qué hay hoy y qué está esperando.', permission: undefined },
  { id: 'clientes', label: 'Clientes', title: 'Clientes', sub: 'Registro único del grupo. Cada cliente con su código.', permission: PERMISSIONS.recordsView },
  { id: 'catalogos', label: 'Catálogos', title: 'Catálogos', sub: 'Listas desplegables administradas por el negocio.', permission: PERMISSIONS.catalogsView },
  { id: 'formulario', label: 'Formulario', title: 'Formulario de captación', sub: 'Lo que completa el cliente en el portal y en el alta interna.', permission: PERMISSIONS.formView },
  { id: 'bitacora', label: 'Bitácora', title: 'Bitácora de auditoría', sub: 'Quién, cuándo y por qué. Sin edición ni borrado.', permission: PERMISSIONS.auditLogView },
  { id: 'usuarios', label: 'Usuarios y roles', title: 'Usuarios y roles', sub: 'Identidad única para los dos sistemas.', permission: PERMISSIONS.usersView },
] as const satisfies readonly { id: string; label: string; title: string; sub: string; permission?: PermissionCode }[]

const MODULES = new Set<string>(RUTAS.map(r => r.id))

type Place = { module: string; profile: boolean; creating: boolean; code: string | null }

/** La dirección es la pantalla. Recargar tiene que abrir lo mismo que había. */
function placeFrom(splat: string | undefined): Place {
  const [head, rest] = (splat ?? '').split('/').filter(Boolean)
  if (head === 'perfil') return { module: 'inicio', profile: true, creating: false, code: null }
  if (head === 'clientes' && rest === 'nuevo') return { module: 'clientes', profile: false, creating: true, code: null }
  if (head === 'clientes' && rest) return { module: 'clientes', profile: false, creating: false, code: decodeURIComponent(rest) }
  if (head && MODULES.has(head)) return { module: head, profile: false, creating: false, code: null }
  return { module: 'inicio', profile: false, creating: false, code: null }
}

function pathFor(module: string, lugar: Place, keep: boolean) {
  if (keep && lugar.profile) return '/panel/perfil'
  if (keep && lugar.creating) return '/panel/clientes/nuevo'
  if (keep && lugar.code) return `/panel/clientes/${encodeURIComponent(lugar.code)}`
  return module === 'inicio' ? '/panel' : `/panel/${module}`
}

/** Panel interno. Solo se monta detrás de RutaProtegida. */
export function AppShell() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { '*': splat } = useParams()
  const token = useAppSelector(s => s.auth.token)
  const user = useAppSelector(s => s.auth.user)
  /** El nombre es de la empresa de la sesión. La marca es del producto. */
  const company = useCurrentCompany()
  const can = useCan()
  useTheme()
  const mainRef = useRef<HTMLElement>(null)
  const lugar = placeFrom(splat)

  // Los permisos viven en el servidor. Refrescarlos al entrar al panel hace
  // que una actualización de roles se refleje sin obligar a borrar sesión.
  useEffect(() => {
    if (!token || !user) return
    maestroApi.session().then(session => {
      dispatch(login({
        token,
        user: {
          id: session.user_id,
          name: session.nombre,
          rol: session.rol,
          permissions: session.permisos,
          email: session.email,
          scope: session.scope === 'platform' ? 'plataforma' : 'empresa',
          companyId: session.empresa_id,
        },
      }))
    }).catch(() => undefined)
  }, [dispatch, token])

  const visibleItems = RUTAS.filter(r => !r.permission || can(r.permission))
  /**
   * La vista que realmente se muestra.
   *
   * Si la elegida no está entre las visibles —porque el rol no la alcanza— se
   * cae a la primera. Todo lo que se pinta abajo sale de acá y no de `vista`:
   * con dos fuentes de verdad el encabezado terminaba diciendo una cosa y el
   * contenido mostrando otra.
   */
  const keep = visibleItems.some(r => r.id === lugar.module)
  const module = keep ? lugar.module : (visibleItems[0]?.id ?? 'inicio')
  const profile = keep && lugar.profile
  const creating = keep && lugar.creating
  const code = keep ? lugar.code : null
  const current = visibleItems.find(r => r.id === module) ?? visibleItems[0]
  const enVista = current?.id
  const inModule = !profile && !creating && !code
  const direccion = pathFor(module, lugar, keep)

  // Una dirección que no existe, o un módulo que este rol no ve, se corrige
  // sin dejar la barra en un sitio y la pantalla en otro.
  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/'
    if (path !== direccion) navigate(direccion, { replace: true })
  }, [direccion, location.pathname, navigate])

  const volver = (fallback: string) => {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback)
  }

  // El scroll vive en el panel, no en la ventana. Al cambiar de módulo se
  // pone arriba antes de pintar: si no, el módulo nuevo aparece a mitad
  // de página, donde había quedado el anterior.
  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand">
          <PortalBrand className="side-logo" title="Maestro de clientes" />
          <div><b>{company?.name ?? '—'}</b><span>Maestro de clientes</span></div>
        </div>
        <nav className="nav">
          {visibleItems.map(r => (
            <button key={r.id} type="button" className={enVista === r.id && inModule ? 'on' : ''}
              onClick={() => navigate(r.id === 'inicio' ? '/panel' : `/panel/${r.id}`)}>{r.label}</button>
          ))}
        </nav>
        <div className="side-user">
          <button className="side-profile" onClick={() => navigate('/panel/perfil')}>
            {user?.name ?? '—'}
          </button>
          {/* El rol dice qué puede; la empresa, sobre qué datos. En un sistema
              multi-empresa las dos hacen falta para saber dónde está parado. */}
          <span>{user?.rol ?? ''}{company && <> · {company.name}</>}</span>
          <button className="btn sm" style={{ marginTop: 10, width: '100%' }}
            onClick={() => { dispatch(logout()); navigate('/acceso', { replace: true }) }}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="main" ref={mainRef}>
        <header className="top">
          <div>
            <h1>{profile ? 'Mi perfil' : creating ? 'Nuevo cliente' : code ? 'Ficha del cliente' : current?.title}</h1>
            <p>{profile ? 'Información de su cuenta y permisos efectivos.' : creating ? 'Alta en el registro único. Se asigna el código al guardar.'
              : code ? 'Registro en el Maestro · código ' + code : current?.sub}</p>
          </div>
          <Bell />
        </header>
        <div className="content">
          <Module lazy active={profile}><MyProfilePage onBack={() => volver('/panel')} /></Module>
          <Module lazy active={!profile && creating}>
            <ClientIntakePage onListo={() => navigate('/panel/clientes', { replace: true })} onCancelar={() => volver('/panel/clientes')} />
          </Module>
          <Module lazy active={!profile && !creating && code != null}>
            {code && <MasterRecord code={code} onBack={() => volver('/panel/clientes')} />}
          </Module>
          {visibleItems.some(r => r.id === 'inicio') && <Module active={inModule && enVista === 'inicio'}>
            <CompanyDashboard onAbrir={c => navigate(`/panel/clientes/${encodeURIComponent(c.code)}`)} />
          </Module>}
          {visibleItems.some(r => r.id === 'clientes') && <Module active={inModule && enVista === 'clientes'}>
            <MasterClients onOpen={c => navigate(`/panel/clientes/${encodeURIComponent(c.code)}`)} onNew={() => navigate('/panel/clientes/nuevo')} />
          </Module>}
          {visibleItems.some(r => r.id === 'catalogos') && <Module active={inModule && enVista === 'catalogos'}><MasterCatalogs /></Module>}
          {visibleItems.some(r => r.id === 'formulario') && <Module active={inModule && enVista === 'formulario'}>
            <FormEditor anclado editable={can(PERMISSIONS.formManage)} />
          </Module>}
          {visibleItems.some(r => r.id === 'bitacora') && <Module active={inModule && enVista === 'bitacora'}><AuditLogPage /></Module>}
          {visibleItems.some(r => r.id === 'usuarios') && <Module active={inModule && enVista === 'usuarios'}><UsersPage /></Module>}
        </div>
      </main>
    </div>
  )
}
