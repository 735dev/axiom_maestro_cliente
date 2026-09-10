import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { login } from '@/shared/store/slices/authSlice'
import { permisosEfectivos } from '@/features/usuarios/store/usuariosSlice'
import { maestroApi } from '@/shared/api/maestro'

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
  const { usuarios, roles } = useAppSelector(s => s.usuarios)
  const empresas = useAppSelector(s => s.empresas.lista)
  const token = useAppSelector(s => s.auth.token)
  const ambitoActual = useAppSelector(s => s.auth.usuario?.ambito)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const desde = (location.state as { desde?: string } | null)?.desde

  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Sin empresa quiere decir personal de Axiom. */
  const esDeAxiom = (empresaId: string | null) => empresaId === null

  /**
   * A dónde va alguien de este ámbito, respetando de dónde venía.
   *
   * El destino recordado se valida contra el ámbito: si un usuario de empresa
   * venía rebotado de /plataforma, mandarlo ahí lo devuelve al guard, que lo
   * saca otra vez. Cuando el destino no le corresponde, va a su casa.
   */
  const destinoDe = (ambito: 'plataforma' | 'empresa') => {
    const casa = ambito === 'plataforma' ? '/plataforma' : '/panel'
    if (!desde) return casa
    const destinoEsDePlataforma = desde.startsWith('/plataforma')
    const leCorresponde = ambito === 'plataforma' ? destinoEsDePlataforma : !destinoEsDePlataforma
    return leCorresponde ? desde : casa
  }

  // Con sesión abierta esta pantalla no tiene sentido.
  if (token) return <Navigate to={destinoDe(ambitoActual ?? 'empresa')} replace />

  const entrar = async () => {
    if (!correo.trim() || !clave.trim()) return setError('Correo o contraseña incorrectos.')
    try {
      const tokenApi = await maestroApi.login(correo, clave)
      // El token se instala de forma temporal para que /auth/me viaje con él.
      dispatch(login({ token: tokenApi.access_token, usuario: { id: '', nombre: '', rol: '', permisos: [], ambito: 'empresa', empresaId: null } }))
      const sesion = await maestroApi.sesion()
      const ambito = sesion.scope === 'platform' ? 'plataforma' : 'empresa'
      dispatch(login({ token: tokenApi.access_token, usuario: { id: sesion.user_id, nombre: sesion.nombre, rol: sesion.rol, permisos: sesion.permisos, ambito, empresaId: sesion.empresa_id } }))
      navigate(destinoDe(ambito), { replace: true })
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

  const donde = (empresaId: string | null) =>
    empresaId ? empresas.find(e => e.id === empresaId)?.nombre ?? empresaId : 'Axiom Core Tech'

  return (
    <div className="login">
      <div className="login-marca">
        <div>
          <b>Axiom</b>
          <span>Acceso al sistema</span>
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
            <input autoFocus value={correo} onChange={e => { setCorreo(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && entrar()} placeholder="usuario@empresa.com" />
          </div>
          <div className="f" style={{ marginBottom: 12 }}>
            <label>Contraseña</label>
            <input type="password" value={clave} onChange={e => { setClave(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && entrar()} placeholder="••••••••" />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn pri" style={{ width: '100%', marginTop: 6 }} onClick={entrar}>Entrar</button>

          <div className="login-demo">
            <b>Cuentas de prueba</b>
            {/* Una cuenta por ámbito y una por empresa: sin un administrador de
                otra empresa no se puede comprobar que cada una ve solo lo suyo. */}
            {[
              usuarios.find(u => u.empresaId === null),
              usuarios.find(u => u.empresaId === 'transvalor' && u.rolId === 'administrador'),
              usuarios.find(u => u.empresaId === 'transvalor' && u.rolId === 'oficial'),
              usuarios.find(u => u.empresaId === 'demo-seguros' && u.rolId === 'administrador'),
            ].filter(Boolean).map(u => (
              <button key={u!.id} onClick={() => { setCorreo(u!.correo); setClave('demo'); setError(null) }}>
                {u!.nombre}
                <span>{roles.find(r => r.id === u!.rolId)?.nombre} · {donde(u!.empresaId)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
