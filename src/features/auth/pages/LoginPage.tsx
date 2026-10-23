import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login } from '@/shared/store/slices/authSlice'
import { effectivePermissions } from '@/features/users/store/usersSlice'
import { maestroApi } from '@/shared/api/maestro'
import { PortalBrand } from '@/shared/components/brand/TransvalorIsotype'

/**
 * Acceso único del sistema.
 *
 * Entra la misma puerta el personal de una empresa y el de Axiom. Tener dos
 * direcciones distintas no protegía nada —quien prueba credenciales las prueba
 * en cualquiera de las dos— y obligaba a mantener por separado el límite de
 * intentos, el registro y el segundo factor, que es como terminan
 * desincronizados.
 *
 * Lo que decide a dónde va cada quien es el **ámbito** de su cuenta, que el
 * servidor emite y ninguna empresa puede concederse desde su panel.
 */
export const LoginPage = () => {
  const { users, roles } = useAppSelector(s => s.users)
  const companies = useAppSelector(s => s.companies.list)
  const token = useAppSelector(s => s.auth.token)
  const currentScope = useAppSelector(s => s.auth.user?.scope)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const start = (location.state as { start?: string } | null)?.start

  const [email, setEmail] = useState('')
  const [key, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Sin empresa quiere decir personal de Axiom. */
  const isAxiomStaff = (companyId: string | null) => companyId === null

  /**
   * A dónde va alguien de este ámbito, respetando de dónde venía.
   *
   * El destino recordado se valida contra el ámbito: si un usuario de empresa
   * venía rebotado de /plataforma, mandarlo ahí lo devuelve al guard, que lo
   * saca otra vez. Cuando el destino no le corresponde, va a su casa.
   */
  const destinationOf = (scope: 'plataforma' | 'empresa') => {
    const casa = scope === 'plataforma' ? '/plataforma' : '/panel'
    if (!start) return casa
    const destinationIsPlatform = start.startsWith('/plataforma')
    const leCorresponde = scope === 'plataforma' ? destinationIsPlatform : !destinationIsPlatform
    return leCorresponde ? start : casa
  }

  // Con sesión abierta esta pantalla no tiene sentido.
  if (token) return <Navigate to={destinationOf(currentScope ?? 'empresa')} replace />

  const signIn = async () => {
    if (!email.trim() || !key.trim()) return setError('Correo o contraseña incorrectos.')
    try {
      const apiToken = await maestroApi.login(email, key)
      // El token se instala de forma temporal para que /auth/me viaje con él.
      dispatch(login({ token: apiToken.access_token, user: { id: '', name: '', rol: '', permissions: [], scope: 'empresa', companyId: null } }))
      const session = await maestroApi.session()
      const scope = session.scope === 'platform' ? 'plataforma' : 'empresa'
      dispatch(login({ token: apiToken.access_token, user: { id: session.user_id, name: session.nombre, email: session.email, rol: session.rol, permissions: session.permisos, scope, companyId: session.empresa_id } }))
      navigate(destinationOf(scope), { replace: true })
    } catch {
      dispatch({ type: 'auth/logout' })
      setError('Correo o contraseña incorrectos.')
    }
  }
  /*const entrarMock = () => {
    const u = usuarios.find(x => x.correo.toLowerCase() === correo.trim().toLowerCase())
    // Mismo mensaje si el correo no existe o la clave está mal: decir cuál de
    // los dos falló convierte el formulario en un verificador de correos.
    if (!u || !clave.trim()) return setError('Correo o contraseña incorrectos.')
    if (u.estado === 'BLOQUEADO') return setError('Esta cuenta está bloqueada. Contacte al administrador.')

    dispatch(login({
      token: 'demo',
      usuario: {
        id: u.id, nombre: u.nombre, rol: roles.find(r => r.id === u.rolId)?.nombre ?? '—',
        permisos: permisosEfectivos(u, roles),
        // El ámbito sale de la cuenta, no de por dónde entró.
        ambito: esDeAxiom(u.empresaId) ? 'plataforma' : 'empresa',
        empresaId: u.empresaId,
      },
    }))
    navigate(destinoDe(esDeAxiom(u.empresaId) ? 'plataforma' : 'empresa'), { replace: true })
  }*/

  const whereAt = (companyId: string | null) =>
    companyId ? companies.find(e => e.id === companyId)?.name ?? companyId : 'Axiom Core Tech'

  return (
    <div className="login">
      <div className="login-marca">
        <div>
          <div className="login-id">
            <PortalBrand className="login-logo" title="Axiom" />
            <div>
              <b>Axiom</b>
              <span>Acceso al sistema</span>
            </div>
          </div>
          <p>
            Maestro de clientes y Prevención. Una sola cuenta, y el sistema lo lleva a donde le
            corresponde según su empresa.
          </p>
        </div>
        <small>Axiom Core Tech, C.A.</small>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <h2>Iniciar sesión</h2>
          <p className="login-sub">Con la cuenta de su empresa.</p>

          <div className="f" style={{ marginBottom: 12 }}>
            <label>Correo</label>
            <input autoFocus value={email} onChange={e => { setEmail(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="usuario@empresa.com" />
          </div>
          <div className="f" style={{ marginBottom: 12 }}>
            <label>Contraseña</label>
            <input type="password" value={key} onChange={e => { setPassword(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="••••••••" />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn pri" style={{ width: '100%', marginTop: 6 }} onClick={signIn}>Entrar</button>

          <div className="login-demo">
            <b>Cuentas de prueba</b>
            {/* Estas cuentas son las que siembra el backend al iniciar la
                instalación. Contraseña común: Maestro123* */}
            {[
              { name: 'Super Admin — Axiom Core Tech', email: 'superadmin@axiomcoretech.com', rol: 'Super Admin', company: 'Axiom Core Tech' },
              { name: 'Administrador — Transvalor Orinoco, C.A.', email: 'admin@transvalor.demo', rol: 'Administrador', company: 'Transvalor Orinoco, C.A.' },
              { name: 'Comercialización — Transvalor Orinoco, C.A.', email: 'comercial@transvalor.demo', rol: 'Comercialización', company: 'Transvalor Orinoco, C.A.' },
              { name: 'Auditoría — Transvalor Orinoco, C.A.', email: 'auditoria@transvalor.demo', rol: 'Auditoría', company: 'Transvalor Orinoco, C.A.' },
              { name: 'Administrador — Empresa Demo Dos, C.A.', email: 'admin@demodos.demo', rol: 'Administrador', company: 'Empresa Demo Dos, C.A.' },
            ].map(u => (
              <button key={u.email} onClick={() => { setEmail(u.email); setPassword('Maestro123*'); setError(null) }}>
                {u.name}
                <span>{u.rol} · {u.company}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
