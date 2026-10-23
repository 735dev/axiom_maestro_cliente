import React, { useEffect, useState } from 'react'
import { Card, Kpi, Pill } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { selectCatalogsOfMyCompany } from '@/features/catalogs/store/catalogsSlice'
import { selectClientsOfMyCompany } from '@/features/clients/store/clientsSlice'
import { selectUsersOfMyCompany, selectRolesOfMyCompany } from '@/features/users/store/usersSlice'
import { selectAuditOfMyCompany } from '@/shared/audit/selectors'
import { useCan } from '@/shared/hooks/useCan'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { currentVersion } from '@/features/platform/store/companiesSlice'
import { PERMISSIONS, tensions } from '@/shared/auth/permissions'
import { catalogOf } from '@/features/platform/form/types'
import { StatusPill } from '@/features/clients/components/Pills'
import { Bars } from '../components/Bars'
import type { Client } from '@/features/clients/types/client.types'
import { maestroApi } from '@/shared/api/maestro'
import { fromApi } from '@/features/clients/pages/ClientsPage'
import { replaceClientsFromApi } from '@/features/clients/store/clientsSlice'
import { useAppDispatch } from '@/shared/store/hooks'

/** Antigüedad real del expediente, nunca una fecha fija de demostración. */
const dias = (start: string) => {
  const fecha = start.includes('T') ? start : `${start}T00:00:00`
  return Math.max(0, Math.floor((Date.now() - Date.parse(fecha)) / 86400000))
}
const fmt = (iso: string) => iso.replace('T', ' ').replace(/[Z.].*$/, '').slice(0, 16)

const STATUSES = ['BORRADOR', 'PENDIENTE', 'EN REVISIÓN', 'REVISADO', 'APROBADO', 'RECHAZADO', 'INHABILITADO'] as const

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
export const CompanyDashboard: React.FC<{ onAbrir: (c: Client) => void }> = ({ onAbrir }) => {
  const clients = useAppSelector(selectClientsOfMyCompany)
  const users = useAppSelector(selectUsersOfMyCompany)
  const roles = useAppSelector(selectRolesOfMyCompany)
  const audit = useAppSelector(selectAuditOfMyCompany)
  const catalogs = useAppSelector(selectCatalogsOfMyCompany)
  const company = useCurrentCompany()
  const user = useAppSelector(s => s.auth.user)
  const can = useCan()
  const dispatch = useAppDispatch()
  const canViewClients = useAppSelector(s => Boolean(s.auth.user?.permissions?.includes(PERMISSIONS.recordsView)))
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!canViewClients) {
      setListo(true)
      return
    }
    let active = true
    maestroApi.clients({ count: 100, status: 'todos' })
      .then(({ data }) => { if (active) dispatch(replaceClientsFromApi(data.map(fromApi))) })
      .catch(() => undefined)
      .finally(() => { if (active) setListo(true) })
    return () => { active = false }
  }, [user?.email, canViewClients, dispatch])

  const viewClients = can(PERMISSIONS.recordsView)
  const viewUsers = can(PERMISSIONS.usersView)
  const viewCatalogs = can(PERMISSIONS.catalogsView)
  const viewAuditLog = can(PERMISSIONS.auditLogView)

  /* ---- cartera ---- */
  const enCola = clients
    // Incluye REVISADO: Prevención ya terminó, y ahí es donde más urge que
    // alguien mire, porque el expediente está parado esperando al Maestro.
    .filter(c => c.status === 'PENDIENTE' || c.status === 'EN REVISIÓN' || c.status === 'REVISADO')
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
  const byStatus = STATUSES
    .map(e => ({ label: e[0] + e.slice(1).toLowerCase(), value: clients.filter(c => c.status === e).length }))
    .filter(f => f.value > 0)
  const porSector = Object.entries(clients.reduce<Record<string, number>>((m, c) => {
    if (c.sector) m[c.sector] = (m[c.sector] ?? 0) + 1
    return m
  }, {})).map(([label, value]) => ({ label, value }))

  /* ---- accesos ---- */
  const invitados = users.filter(u => u.status === 'INVITADO')
  const conExcepciones = users.filter(u => u.granted.length || u.revoked.length)
  const rolesInTension = roles.filter(r => tensions(r.permissions).length > 0)
  const rolesSinUso = roles.filter(r => !users.some(u => u.rolId === r.id))

  /* ---- configuración ---- */
  const current = company ? currentVersion(company) : undefined
  const catalogValueList = Object.values(catalogs).reduce((s, v) => s + v.length, 0)

  const sensitiveItems = audit.filter(e => e.severity === 'sensible')

  if (!viewClients && !viewUsers && !viewCatalogs && !viewAuditLog) {
    return (
      <div className="empty" style={{ padding: '48px 16px' }}>
        Su rol no alcanza ninguno de los indicadores del tablero. Use el menú para ir a lo que sí le
        corresponde.
      </div>
    )
  }

  if (!listo) return null

  return (
    <>
      <div className="kpis">
        {viewClients && <>
          <Kpi label="Clientes" value={clients.length} foot="registrados en el Maestro" />
          <Kpi label="En cola" value={enCola.length}
            foot={enCola.length ? `el más viejo lleva ${dias(enCola[0].registeredAt)} días` : 'nada esperando'} />
        </>}
        {viewUsers && <>
          <Kpi label="Usuarios activos" value={users.filter(u => u.status === 'ACTIVO').length}
            foot={`de ${users.length} en la empresa`} />
          <Kpi label="Sin estrenar" value={invitados.length} foot="invitados que nunca entraron" />
        </>}
        {!viewClients && !viewUsers && viewCatalogs && (
          <Kpi label="Valores en catálogos" value={catalogValueList} foot={`en ${Object.keys(catalogs).length} listas`} />
        )}
        {viewAuditLog && (
          <Kpi label="Movimientos sensibles" value={sensitiveItems.length} foot="permisos, estados y bajas" />
        )}
      </div>

      <div className="dash">
        {/* ---------- Operación ---------- */}
        {viewClients && (
          <div className="ancho">
          <Card title="Esperando decisión" sub="Ordenados por antigüedad. Lo de arriba lleva más tiempo parado." flush>
            {enCola.length ? (
              <table>
                <thead><tr><th>Código</th><th>Client</th><th>Estado</th><th style={{ textAlign: 'right' }}>Espera</th></tr></thead>
                <tbody>
                  {enCola.slice(0, 6).map(c => {
                    const d = dias(c.registeredAt)
                    return (
                      <tr key={c.code} className="click" onClick={() => onAbrir(c)}>
                        <td className="num"><b>{c.code}</b></td>
                        <td>{c.legalName}</td>
                        <td><StatusPill e={c.status} /></td>
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

        {viewClients && (
          <Card title="Cartera por estado" sub="Cuántos clientes hay en cada punto del proceso.">
            <Bars rows={byStatus} unidad="clientes" />
          </Card>
        )}

        {viewClients && (
          <Card title="Por sector económico" sub="En qué se concentra la cartera.">
            <Bars rows={porSector} unidad="clientes" tope={5} />
          </Card>
        )}

        {/* ---------- Accesos ---------- */}
        {viewUsers && (
          <Card title="Quién tiene qué" sub="Cuánta gente hay en cada rol de la empresa.">
            <Bars
              rows={roles.map(r => ({
                label: r.name,
                value: users.filter(u => u.rolId === r.id).length,
                nota: `${r.permissions.length} permisos`,
              }))}
              unidad="usuarios" />
          </Card>
        )}

        {viewUsers && (
          <Card title="Revisar en accesos" sub="Lo que conviene mirar cada tanto." flush>
            <table>
              <thead><tr><th>Qué</th><th style={{ textAlign: 'right' }}>Cuántos</th></tr></thead>
              <tbody>
                <tr>
                  <td>
                    Roles con permissions en tensión
                    <div className="td-sub">
                      {rolesInTension.length
                        ? rolesInTension.map(r => r.name).join(', ')
                        : 'Ninguno junta registrar y aprobar.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {rolesInTension.length}
                    {rolesInTension.length > 0 && <> <Pill k="warn">Revisar</Pill></>}
                  </td>
                </tr>
                <tr>
                  <td>
                    Users con excepciones sobre su rol
                    <div className="td-sub">
                      {conExcepciones.length
                        ? conExcepciones.map(u => u.name).join(', ')
                        : 'Todos con los permisos de su rol, sin ajustes.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{conExcepciones.length}</td>
                </tr>
                <tr>
                  <td>
                    Invitaciones sin usar
                    <div className="td-sub">
                      {invitados.length ? invitados.map(u => u.name).join(', ') : 'Nadie quedó a mitad de camino.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{invitados.length}</td>
                </tr>
                <tr>
                  <td>
                    Roles sin nadie asignado
                    <div className="td-sub">
                      {rolesSinUso.length ? rolesSinUso.map(r => r.name).join(', ') : 'Todos los roles están en uso.'}
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{rolesSinUso.length}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------- Configuración ---------- */}
        {viewCatalogs && (
          <Card title="Configuración de la empresa" sub="Qué se le pide al cliente y con qué listas." flush>
            <table>
              <tbody>
                <tr>
                  <td>Form de captación
                    <div className="td-sub">Lo publica Axiom; la company lo consulta.</div></td>
                  <td style={{ textAlign: 'right' }}>
                    {current
                      ? <><b className="num">v{current.version}</b>
                        <div className="td-sub">start {current.start} · {current.fields.length} fields</div></>
                      : <span className="td-sub">Sin publicar</span>}
                  </td>
                </tr>
                <tr>
                  <td>Sections del form
                    <div className="td-sub">Cada una es un paso para el client.</div></td>
                  <td className="num" style={{ textAlign: 'right' }}>{current?.sections.length ?? 0}</td>
                </tr>
                <tr>
                  <td>Valores en catálogos
                    <div className="td-sub">
                      {Object.keys(catalogs).map(id => catalogOf(id)?.name ?? id).join(' · ')}
                    </div></td>
                  <td className="num" style={{ textAlign: 'right' }}>{catalogValueList}</td>
                </tr>
                <tr>
                  <td>Portal del client
                    <div className="td-sub">Por donde entran a autogestionarse.</div></td>
                  <td className="td-sub" style={{ textAlign: 'right' }}>{company ? `/${company.slug}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------- Auditoría ---------- */}
        {viewAuditLog && (
          <Card title="Movimientos sensibles" sub="Permisos, estados y bajas. Lo que un auditor mira primero." flush>
            {sensitiveItems.length ? (
              <table>
                <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th></tr></thead>
                <tbody>
                  {sensitiveItems.slice(0, 6).map(e => (
                    <tr key={e.id}>
                      <td className="num td-sub" style={{ whiteSpace: 'nowrap' }}>{fmt(e.fecha)}</td>
                      <td>
                        <b style={{ fontWeight: 500, fontSize: 13 }}>{e.actor.name}</b>
                        <div className="td-sub">{e.actor.rol}</div>
                      </td>
                      <td className="td-m">
                        {e.action}
                        <div className="td-sub">{e.detalle}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty">Sin movimientos sensitiveItems todavía.</div>}
          </Card>
        )}
      </div>

      <p className="dash-pie">
        Sesión de <b>{user?.name}</b> · {user?.rol}. Lo que ve depende de sus permissions.
      </p>
    </>
  )
}
