import React from 'react'
import { Card, Kpi, Pill } from '@/shared/ui'
import { useAppSelector } from '@/shared/store/hooks'
import { versionVigente } from '../store/empresasSlice'
import { CAMPOS_ESTANDAR, estandarDe } from '../formulario/tipos'
import { Barras } from '@/features/dashboard/components/Barras'

/**
 * Tablero de la plataforma. No mira la operación de ninguna empresa —eso es de
 * cada una— sino el negocio de Axiom: quién está adentro, quién arrancó y qué
 * partes del producto se usan.
 */
export const DashboardPlataforma = () => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const clientes = useAppSelector(s => s.clientes.lista)
  const usuarios = useAppSelector(s => s.usuarios.usuarios)

  const activas = empresas.filter(e => e.estado === 'ACTIVA')
  /** Dada de alta pero sin formulario: no puede recibir un solo cliente. */
  const sinArrancar = empresas.filter(e => !versionVigente(e).campos.length)

  const porEmpresa = empresas.map(e => ({
    etiqueta: e.nombre,
    valor: clientes.filter(c => c.empresaId === e.id).length,
    nota: `${usuarios.filter(u => u.empresaId === e.id).length} usuarios`,
  }))

  /** Cuántas empresas usan cada campo del catálogo. Dice qué vale la pena
   *  mantener y qué campo nuevo pedirían varias a la vez. */
  const usoCatalogo = CAMPOS_ESTANDAR.map(ce => ({
    etiqueta: ce.nombre,
    valor: empresas.filter(e => versionVigente(e).campos.some(c => c.estandar === ce.clave)).length,
  })).filter(f => f.valor > 0)

  const propiosPorEmpresa = empresas.flatMap(e =>
    versionVigente(e).campos.filter(c => !c.estandar).map(c => ({ empresa: e.nombre, campo: c.etiqueta })))

  return (
    <>
      <div className="kpis">
        <Kpi label="Empresas" value={empresas.length} foot={`${activas.length} activas`} />
        <Kpi label="Sin arrancar" value={sinArrancar.length} foot="dadas de alta, sin formulario" />
        <Kpi label="Clientes" value={clientes.length} foot="sumando todas las empresas" />
        <Kpi label="Usuarios" value={usuarios.length} foot="sumando todas las empresas" />
      </div>

      {sinArrancar.length > 0 && (
        <Card title="Empresas que no arrancaron"
          sub="Tienen cuenta pero su formulario está vacío: hoy no pueden recibir ni un cliente." flush>
          <table>
            <thead><tr><th>Empresa</th><th>Alta</th><th>Portal</th><th>Estado</th></tr></thead>
            <tbody>
              {sinArrancar.map(e => (
                <tr key={e.id}>
                  <td><b style={{ fontWeight: 500 }}>{e.nombre}</b></td>
                  <td className="num">{e.desde}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{e.dominio}</td>
                  <td>{e.estado === 'ACTIVA' ? <Pill k="warn">Activa sin uso</Pill> : <Pill k="bad">Suspendida</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="dash">
        <Card title="Clientes por empresa" sub="Quién está usando la plataforma de verdad.">
          <Barras datos={porEmpresa} unidad="clientes" />
        </Card>

        <Card title="Uso del catálogo estándar"
          sub="Cuántas empresas usan cada campo. Los de abajo quizá sobran; lo que falta se pide seguido.">
          <Barras datos={usoCatalogo} unidad="empresas" tope={8} />
        </Card>

        <Card title="Campos propios en uso"
          sub="Lo que las empresas tuvieron que inventar. Si se repite, es candidato al catálogo." flush>
          {propiosPorEmpresa.length ? (
            <table>
              <thead><tr><th>Campo</th><th>Empresa</th></tr></thead>
              <tbody>
                {propiosPorEmpresa.map((p, i) => (
                  <tr key={i}>
                    <td>{p.campo}<div style={{ color: 'var(--muted)', fontSize: 11.5 }}>sin índice</div></td>
                    <td style={{ fontSize: 12.5 }}>{p.empresa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">Ninguna empresa necesitó campos fuera del catálogo.</div>}
        </Card>

        <Card title="Formularios" sub="En qué versión va cada empresa y qué tan armado está." flush>
          <table>
            <thead><tr><th>Empresa</th><th>Versión</th><th>Secciones</th><th>Campos</th><th>Estándar</th></tr></thead>
            <tbody>
              {empresas.map(e => {
                const v = versionVigente(e)
                const est = v.campos.filter(c => estandarDe(c.estandar)).length
                return (
                  <tr key={e.id}>
                    <td><b style={{ fontWeight: 500 }}>{e.nombre}</b></td>
                    <td className="num">v{v.version}</td>
                    <td className="num">{v.secciones.length}</td>
                    <td className="num">{v.campos.length}</td>
                    <td className="num">{est} de {v.campos.length}</td>
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
