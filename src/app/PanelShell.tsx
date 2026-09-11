import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login, logout } from '@/shared/store/slices/authSlice'
import { PERMISSIONS, type PermissionCode } from '@/shared/auth/permissions'
import { useCan } from '@/shared/hooks/useCan'
import { useTheme } from '@/shared/hooks/useTheme'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { MaestroClientes } from '@/features/clientes/pages/ClientesPage'
import { MaestroFicha } from '@/features/clientes/pages/FichaPage'
import { NuevoClientePage } from '@/features/clientes/pages/NuevoClientePage'
import { MaestroCatalogos } from '@/features/catalogos/pages/CatalogosPage'
import { BitacoraPage } from '@/features/bitacora/pages/BitacoraPage'
import { UsuariosPage } from '@/features/usuarios/pages/UsuariosPage'
import { DashboardEmpresa } from '@/features/dashboard/pages/DashboardEmpresa'
import { Campana } from '@/shared/notificaciones/Campana'
import { maestroApi } from '@/shared/api/maestro'
import { MiPerfilPage } from '@/features/auth/pages/MiPerfilPage'

const RUTAS = [
  // El tablero no pide permiso: adentro cada tarjeta se muestra según lo que
  // el usuario pueda ver. Pedirle `registros.ver` dejaba sin inicio a quien
  // administra la empresa pero no toca clientes.
  { id: 'inicio', label: 'Dashboard', titulo: 'Resumen', sub: 'Qué hay hoy y qué está esperando.', permiso: undefined },
  { id: 'clientes', label: 'Clientes', titulo: 'Clientes', sub: 'Registro único del grupo. Cada cliente con su código.', permiso: PERMISSIONS.registrosVer },
  { id: 'catalogos', label: 'Catálogos', titulo: 'Catálogos', sub: 'Listas desplegables administradas por el negocio.', permiso: PERMISSIONS.catalogosVer },
  { id: 'bitacora', label: 'Bitácora', titulo: 'Bitácora de auditoría', sub: 'Quién, cuándo y por qué. Sin edición ni borrado.', permiso: PERMISSIONS.bitacoraVer },
  { id: 'usuarios', label: 'Usuarios y roles', titulo: 'Usuarios y roles', sub: 'Identidad única para los dos sistemas.', permiso: PERMISSIONS.usuariosVer },
] as const satisfies readonly { id: string; label: string; titulo: string; sub: string; permiso?: PermissionCode }[]

/** Panel interno. Solo se monta detrás de RutaProtegida. */
export function PanelShell() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const token = useAppSelector(s => s.auth.token)
  const usuario = useAppSelector(s => s.auth.usuario)
  /** La marca es de la empresa de la sesión, no una constante. */
  const empresa = useEmpresaActual()
  const can = useCan()
  useTheme()
  const [vista, setVista] = useState<string>('inicio')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [perfil, setPerfil] = useState(false)

  // Los permisos viven en el servidor. Refrescarlos al entrar al panel hace
  // que una actualización de roles se refleje sin obligar a borrar sesión.
  useEffect(() => {
    if (!token || !usuario) return
    maestroApi.sesion().then(sesion => {
      dispatch(login({
        token,
        usuario: {
          id: sesion.user_id,
          nombre: sesion.nombre,
          rol: sesion.rol,
          permisos: sesion.permisos,
          email: sesion.email,
          ambito: sesion.scope === 'platform' ? 'plataforma' : 'empresa',
          empresaId: sesion.empresa_id,
        },
      }))
    }).catch(() => undefined)
  }, [dispatch, token])

  const visibles = RUTAS.filter(r => !r.permiso || can(r.permiso))
  /**
   * La vista que realmente se muestra.
   *
   * Si la elegida no está entre las visibles —porque el rol no la alcanza— se
   * cae a la primera. Todo lo que se pinta abajo sale de acá y no de `vista`:
   * con dos fuentes de verdad el encabezado terminaba diciendo una cosa y el
   * contenido mostrando otra.
   */
  const actual = visibles.find(r => r.id === vista) ?? visibles[0]
  const enVista = actual?.id

  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand">
          <b>{empresa?.nombre ?? '—'}</b><span>Maestro de clientes</span>
        </div>
        <nav className="nav">
          {visibles.map(r => (
            <a key={r.id} href="#" className={enVista === r.id && !codigo && !creando ? 'on' : ''}
              onClick={e => { e.preventDefault(); setVista(r.id); setPerfil(false); setCodigo(null); setCreando(false) }}>{r.label}</a>
          ))}
        </nav>
        <div className="side-user">
          <button className="side-profile" onClick={() => { setPerfil(true); setCodigo(null); setCreando(false) }}>
            {usuario?.nombre ?? '—'}
          </button>
          {/* El rol dice qué puede; la empresa, sobre qué datos. En un sistema
              multi-empresa las dos hacen falta para saber dónde está parado. */}
          <span>{usuario?.rol ?? ''}{empresa && <> · {empresa.nombre}</>}</span>
          <button className="btn sm" style={{ marginTop: 10, width: '100%' }}
            onClick={() => { dispatch(logout()); navigate('/acceso', { replace: true }) }}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <div>
            <h1>{perfil ? 'Mi perfil' : creando ? 'Nuevo cliente' : codigo ? 'Ficha del cliente' : actual?.titulo}</h1>
            <p>{perfil ? 'Información de su cuenta y permisos efectivos.' : creando ? 'Alta en el registro único. Se asigna el código al guardar.'
              : codigo ? 'Registro en el Maestro · código ' + codigo : actual?.sub}</p>
          </div>
          <Campana />
        </header>
        <div className="content">
          {perfil ? <MiPerfilPage onBack={() => setPerfil(false)} />
            : creando ? <NuevoClientePage onListo={() => setCreando(false)} onCancelar={() => setCreando(false)} />
            : codigo ? <MaestroFicha codigo={codigo} onBack={() => setCodigo(null)} />
              : enVista === 'inicio' ? <DashboardEmpresa onAbrir={c => setCodigo(c.codigo)} />
                : enVista === 'clientes' ? <MaestroClientes onOpen={c => setCodigo(c.codigo)} onNuevo={() => setCreando(true)} />
                : enVista === 'catalogos' ? <MaestroCatalogos />
                  : enVista === 'bitacora' ? <BitacoraPage />
                    : <UsuariosPage />}
        </div>
      </main>
    </div>
  )
}
