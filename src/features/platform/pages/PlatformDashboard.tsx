import React from 'react'
import { Card, Kpi, Pill } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { currentVersion } from '../store/companiesSlice'
import { STANDARD_FIELDS, standardOf } from '../form/types'
import { Bars } from '@/features/dashboard/components/Bars'

/**
 * Tablero de la plataforma. No mira la operación de ninguna empresa —eso es de
 * cada una— sino el negocio de Axiom: quién está adentro, quién arrancó y qué
 * partes del producto se usan.
 */
export const PlatformDashboard = () => {
  const companies = useAppSelector(s => s.companies.list)
  const clients = useAppSelector(s => s.clients.list)
  const users = useAppSelector(s => s.users.users)

  const activas = companies.filter(e => e.status === 'ACTIVA')
  /** Dada de alta pero sin formulario: no puede recibir un solo cliente. */
  const sinArrancar = companies.filter(e => !currentVersion(e).fields.length)

  const byCompany = companies.map(e => ({
    label: e.name,
    value: clients.filter(c => c.companyId === e.id).length,
    nota: `${users.filter(u => u.companyId === e.id).length} usuarios`,
  }))

  /** Cuántas empresas usan cada campo del catálogo. Dice qué vale la pena
   *  mantener y qué campo nuevo pedirían varias a la vez. */
  const catalogUsage = STANDARD_FIELDS.map(ce => ({
    label: ce.name,
    value: companies.filter(e => currentVersion(e).fields.some(c => c.standard === ce.key)).length,
  })).filter(f => f.value > 0)

  const customByCompany = companies.flatMap(e =>
    currentVersion(e).fields.filter(c => !c.standard).map(c => ({ company: e.name, field: c.label })))

  return (
    <>
      <div className="kpis">
        <Kpi label="Empresas" value={companies.length} foot={`${activas.length} activas`} />
        <Kpi label="Sin arrancar" value={sinArrancar.length} foot="dadas de alta, sin formulario" />
        <Kpi label="Clientes" value={clients.length} foot="sumando todas las empresas" />
        <Kpi label="Usuarios" value={users.length} foot="sumando todas las empresas" />
      </div>

      {sinArrancar.length > 0 && (
        <Card title="Empresas que no arrancaron"
          sub="Tienen cuenta pero su formulario está vacío: hoy no pueden recibir ni un cliente." flush>
          <table>
            <thead><tr><th>Company</th><th>Intake</th><th>Portal</th><th>Estado</th></tr></thead>
            <tbody>
              {sinArrancar.map(e => (
                <tr key={e.id}>
                  <td><b style={{ fontWeight: 500 }}>{e.name}</b></td>
                  <td className="num">{e.start}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>/{e.slug}</td>
                  <td>{e.status === 'ACTIVA' ? <Pill k="warn">Activa sin uso</Pill> : <Pill k="bad">Suspendida</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="dash">
        <Card title="Clientes por empresa" sub="Quién está usando la plataforma de verdad.">
          <Bars rows={byCompany} unidad="clientes" />
        </Card>

        <Card title="Uso del catálogo estándar"
          sub="Cuántas empresas usan cada campo. Los de abajo quizá sobran; lo que falta se pide seguido.">
          <Bars rows={catalogUsage} unidad="empresas" tope={8} />
        </Card>

        <Card title="Campos propios en uso"
          sub="Lo que las empresas tuvieron que inventar. Si se repite, es candidato al catálogo." flush>
          {customByCompany.length ? (
            <table>
              <thead><tr><th>Field</th><th>Company</th></tr></thead>
              <tbody>
                {customByCompany.map((p, i) => (
                  <tr key={i}>
                    <td>{p.field}<div style={{ color: 'var(--muted)', fontSize: 11.5 }}>sin índice</div></td>
                    <td style={{ fontSize: 12.5 }}>{p.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">Ninguna company necesitó fields fuera del catálogo.</div>}
        </Card>

        <Card title="Formularios" sub="En qué versión va cada empresa y qué tan armado está." flush>
          <table>
            <thead><tr><th>Company</th><th>Versión</th><th>Sections</th><th>Fields</th><th>Estándar</th></tr></thead>
            <tbody>
              {companies.map(e => {
                const v = currentVersion(e)
                const est = v.fields.filter(c => standardOf(c.standard)).length
                return (
                  <tr key={e.id}>
                    <td><b style={{ fontWeight: 500 }}>{e.name}</b></td>
                    <td className="num">v{v.version}</td>
                    <td className="num">{v.sections.length}</td>
                    <td className="num">{v.fields.length}</td>
                    <td className="num">{est} de {v.fields.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}
