import React from 'react'
import { Card, Kpi, Pill } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { selectCatalogosDeMiEmpresa } from '@/features/catalogos/store/catalogosSlice'
import { selectClientesDeMiEmpresa } from '@/features/clientes/store/clientesSlice'
import { selectUsuariosDeMiEmpresa, selectRolesDeMiEmpresa } from '@/features/usuarios/store/usuariosSlice'
import { selectAuditoriaDeMiEmpresa } from '@/shared/auditoria/selectores'
import { useCan } from '@/shared/hooks/useCan'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { versionVigente } from '@/features/plataforma/store/empresasSlice'
import { PERMISSIONS, tensiones } from '@/shared/auth/permissions'
import { catalogoDe } from '@/features/plataforma/formulario/tipos'
import { EstadoPill } from '@/features/clientes/components/Pills'
import { Barras } from '../components/Barras'
import type { Cliente } from '@/features/clientes/types/cliente.types'

/** En el prototipo la fecha es fija; el sistema real usa la del servidor. */
const HOY = '2026-09-01'
const dias = (desde: string) => Math.round((Date.parse(HOY) - Date.parse(desde)) / 86400000)
const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)

const ESTADOS = ['BORRADOR', 'PENDIENTE', 'EN REVISIÓN', 'REVISADO', 'APROBADO', 'RECHAZADO', 'INHABILITADO'] as const

/**
 * Tablero de la empresa.
 *
 * Se arma por bloques, cada uno detrás de su permiso: quien opera clientes ve
 * la cartera, quien administra ve accesos y configuración, y quien audita ve
 * movimientos. Un tablero con un permiso único deja a media plantilla con una
 * pantalla vacía, que es lo que pasaba antes.
 *
 * No muestra nada que salga de Prevención: el Maestro recibe el veredicto, no
 * lo produce.
 */
export const DashboardEmpresa: React.FC<{ onAbrir: (c: Cliente) => void }> = ({ onAbrir }) => {
  const clientes = useAppSelector(selectClientesDeMiEmpresa)
  const usuarios = useAppSelector(selectUsuariosDeMiEmpresa)
  const roles = useAppSelector(selectRolesDeMiEmpresa)
  const auditoria = useAppSelector(selectAuditoriaDeMiEmpresa)
  const catalogos = useAppSelector(selectCatalogosDeMiEmpresa)
  const empresa = useEmpresaActual()
  const usuario = useAppSelector(s => s.auth.usuario)
  const can = useCan()

  const verClientes = can(PERMISSIONS.registrosVer)
  const verUsuarios = can(PERMISSIONS.usuariosVer)
  const verCatalogos = can(PERMISSIONS.catalogosVer)
  const verBitacora = can(PERMISSIONS.bitacoraVer)

  /* ---- cartera ---- */
  const enCola = clientes
    // Incluye REVISADO: Prevención ya terminó, y ahí es donde más urge que
    // alguien mire, porque el expediente está parado esperando al Maestro.
    .filter(c => c.estado === 'PENDIENTE' || c.estado === 'EN REVISIÓN' || c.estado === 'REVISADO')
    .sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro))
  const porEstado = ESTADOS
    .map(e => ({ etiqueta: e[0] + e.slice(1).toLowerCase(), valor: clientes.filter(c => c.estado === e).length }))
    .filter(f => f.valor > 0)
  const porSector = Object.entries(clientes.reduce<Record<string, number>>((m, c) => {
    if (c.sector) m[c.sector] = (m[c.sector] ?? 0) + 1
    return m
  }, {})).map(([etiqueta, valor]) => ({ etiqueta, valor }))

  /* ---- accesos ---- */
  const invitados = usuarios.filter(u => u.estado === 'INVITADO')
  const conExcepciones = usuarios.filter(u => u.concedidos.length || u.revocados.length)
  const rolesEnTension = roles.filter(r => tensiones(r.permisos).length > 0)
  const rolesSinUso = roles.filter(r => !usuarios.some(u => u.rolId === r.id))

  /* ---- configuración ---- */
  const vigente = empresa ? versionVigente(empresa) : undefined
  const valoresCatalogo = Object.values(catalogos).reduce((s, v) => s + v.length, 0)

  const sensibles = auditoria.filter(e => e.gravedad === 'sensible')

  if (!verClientes && !verUsuarios && !verCatalogos && !verBitacora) {
    return (
      <div className="empty" style={{ padding: '48px 16px' }}>
        Su rol no alcanza ninguno de los indicadores del tablero. Use el menú para ir a lo que sí le
        corresponde.
      </div>
    )
  }

  return (
    <>
      <div className="kpis">
        {verClientes && <>
          <Kpi label="Clientes" value={clientes.length} foot="registrados en el Maestro" />
          <Kpi label="En cola" value={enCola.length}
            foot={enCola.length ? `el más viejo lleva ${dias(enCola[0].fechaRegistro)} días` : 'nada esperando'} />
        </>}
        {verUsuarios && <>
          <Kpi label="Usuarios activos" value={usuarios.filter(u => u.estado === 'ACTIVO').length}
            foot={`de ${usuarios.length} en la empresa`} />
          <Kpi label="Sin estrenar" value={invitados.length} foot="invitados que nunca entraron" />
        </>}
        {!verClientes && !verUsuarios && verCatalogos && (
          <Kpi label="Valores en catálogos" value={valoresCatalogo} foot={`en ${Object.keys(catalogos).length} listas`} />
        )}
        {verBitacora && (
          <Kpi label="Movimientos sensibles" value={sensibles.length} foot="permisos, estados y bajas" />
        )}
      </div>

      <div className="dash">
        {/* ---------- Operación ---------- */}
        {verClientes && (
          <div className="ancho">
          <Card title="Esperando decisión" sub="Ordenados por antigüedad. Lo de arriba lleva más tiempo parado." flush>
            {enCola.length ? (
              <table>
                <thead><tr><th>Código</th><th>Cliente</th><th>Estado</th><th style={{ textAlign: 'right' }}>Espera</th></tr></thead>
                <tbody>
                  {enCola.slice(0, 6).map(c => {
                    const d = dias(c.fechaRegistro)
                    return (
                      <tr key={c.codigo} className="click" onClick={() => onAbrir(c)}>
                        <td className="num"><b>{c.codigo}</b></td>
                        <td>{c.razonSocial}</td>
                        <td><EstadoPill e={c.estado} /></td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {d} d{d >= 15 && <> <Pill k="warn">Demorado</Pill></>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <div className="empty">Nada esperando decisión.</div>}
          </Card>
          </div>
        )}

        {verClientes && (
          <Card title="Cartera por estado" sub="Cuántos clientes hay en cada punto del proceso.">
            <Barras datos={porEstado} unidad="clientes" />
          </Card>
        )}

        {verClientes && (
          <Card title="Por sector económico" sub="En qué se concentra la cartera.">
            <Barras datos={porSector} unidad="clientes" tope={5} />
          </Card>
        )}

        {/* ---------- Accesos ---------- */}
        {verUsuarios && (
          <Card title="Quién tiene qué" sub="Cuánta gente hay en cada rol de la empresa.">
            <Barras
              datos={roles.map(r => ({
                etiqueta: r.nombre,
                valor: usuarios.filter(u => u.rolId === r.id).length,
                nota: `${r.permisos.length} permisos`,
              }))}
              unidad="usuarios" />
          </Card>
        )}

        {verUsuarios && (
          <Card title="Revisar en accesos" sub="Lo que conviene mirar cada tanto." flush>
            <table>
              <thead><tr><th>Qué</th><th style={{ textAlign: 'right' }}>Cuántos</th></tr></thead>
              <tbody>
                <tr>
                  <td>
                    Roles con permisos en tensión
                    <div className="td-sub">
                      {rolesEnTension.length
                        ? rolesEnTension.map(r => r.nombre).join(', ')
                        : 'Ninguno junta registrar y aprobar.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {rolesEnTension.length}
                    {rolesEnTension.length > 0 && <> <Pill k="warn">Revisar</Pill></>}
                  </td>
                </tr>
                <tr>
                  <td>
                    Usuarios con excepciones sobre su rol
                    <div className="td-sub">
                      {conExcepciones.length
                        ? conExcepciones.map(u => u.nombre).join(', ')
                        : 'Todos con los permisos de su rol, sin ajustes.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{conExcepciones.length}</td>
                </tr>
                <tr>
                  <td>
                    Invitaciones sin usar
                    <div className="td-sub">
                      {invitados.length ? invitados.map(u => u.nombre).join(', ') : 'Nadie quedó a mitad de camino.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{invitados.length}</td>
                </tr>
                <tr>
                  <td>
                    Roles sin nadie asignado
                    <div className="td-sub">
                      {rolesSinUso.length ? rolesSinUso.map(r => r.nombre).join(', ') : 'Todos los roles están en uso.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{rolesSinUso.length}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------- Configuración ---------- */}
        {verCatalogos && (
          <Card title="Configuración de la empresa" sub="Qué se le pide al cliente y con qué listas." flush>
            <table>
              <tbody>
                <tr>
                  <td>Formulario de captación
                    <div className="td-sub">Lo publica Axiom; la empresa lo consulta.</div></td>
                  <td style={{ textAlign: 'right' }}>
                    {vigente
                      ? <><b className="num">v{vigente.version}</b>
                        <div className="td-sub">desde {vigente.desde} · {vigente.campos.length} campos</div></>
                      : <span className="td-sub">Sin publicar</span>}
                  </td>
                </tr>
                <tr>
                  <td>Secciones del formulario
                    <div className="td-sub">Cada una es un paso para el cliente.</div></td>
                  <td className="num" style={{ textAlign: 'right' }}>{vigente?.secciones.length ?? 0}</td>
                </tr>
                <tr>
                  <td>Valores en catálogos
                    <div className="td-sub">
                      {Object.keys(catalogos).map(id => catalogoDe(id)?.nombre ?? id).join(' · ')}
                    </div></td>
                  <td className="num" style={{ textAlign: 'right' }}>{valoresCatalogo}</td>
                </tr>
                <tr>
                  <td>Portal del cliente
                    <div className="td-sub">Por donde entran a autogestionarse.</div></td>
                  <td className="td-sub" style={{ textAlign: 'right' }}>{empresa?.dominio ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------- Auditoría ---------- */}
        {verBitacora && (
          <Card title="Movimientos sensibles" sub="Permisos, estados y bajas. Lo que un auditor mira primero." flush>
            {sensibles.length ? (
              <table>
                <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th></tr></thead>
                <tbody>
                  {sensibles.slice(0, 6).map(e => (
                    <tr key={e.id}>
                      <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
                      <td>
                        <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.nombre}</b>
                        <div className="td-sub">{e.actor.rol}</div>
                      </td>
                      <td className="td-m">
                        {e.accion}
                        <div className="td-sub">{e.detalle}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">Sin movimientos sensibles todavía.</div>}
          </Card>
        )}
      </div>

      <p className="dash-pie">
        Sesión de <b>{usuario?.nombre}</b> · {usuario?.rol}. Lo que ve depende de sus permisos.
      </p>
    </>
  )
}
