import React, { useState, useMemo } from 'react'
import { type Cliente } from '../types/cliente.types'
import { Listado, Kpi } from '@/shared/ui'
import { EstadoPill } from '../components/Pills'
import { useAppSelector } from '@/shared/store/hooks'
import { selectClientesDeMiEmpresa } from '../store/clientesSlice'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS } from '@/shared/auth/permissions'

const ESTADOS = ['Todos', 'BORRADOR', 'PENDIENTE', 'EN REVISIÓN', 'REVISADO', 'APROBADO', 'RECHAZADO', 'INHABILITADO']

export const MaestroClientes: React.FC<{ onOpen: (c: Cliente) => void; onNuevo: () => void }> = ({ onOpen, onNuevo }) => {
  const clientes = useAppSelector(selectClientesDeMiEmpresa)
  const can = useCan()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('Todos')

  const lista = useMemo(() => clientes.filter(c =>
    (estado === 'Todos' || c.estado === estado) &&
    (c.razonSocial + c.rif + c.codigo).toLowerCase().includes(q.toLowerCase())
  ), [q, estado, clientes])

  return (
    <>
      <div className="kpis">
        <Kpi label="Clientes" value={clientes.length} foot="registrados en el Maestro" />
        <Kpi label="Aprobados" value={clientes.filter(c => c.estado === 'APROBADO').length} foot="habilitados para operar" />
        <Kpi label="En cola" value={clientes.filter(c => c.estado === 'PENDIENTE' || c.estado === 'EN REVISIÓN').length} foot="esperando a Prevención" />
        <Kpi label="En decisión" value={clientes.filter(c => c.estado === 'REVISADO').length} foot="esperando al administrador" />
      </div>

      <Listado
        titulo="Clientes"
        sub="El registro único del grupo. El código identifica al cliente en todos los sistemas."
        datos={lista}
        clave={c => c.codigo}
        etiqueta="clientes"
        vacio="Sin clientes que coincidan."
        onFila={onOpen}
        buscar={{ valor: q, onChange: setQ, marcador: 'Buscar por razón social, RIF o código' }}
        filtros={[{ valor: estado, onChange: setEstado, opciones: ESTADOS }]}
        acciones={can(PERMISSIONS.registrosCrear)
          ? <button className="btn pri sm" onClick={onNuevo}>Nuevo cliente</button> : undefined}
        columnas={[
          { th: 'Código' }, { th: 'Razón social' }, { th: 'RIF' }, { th: 'Sector' },
          { th: 'Estado' }, { th: 'Registrado por' },
        ]}
        fila={c => (
          <>
            <td className="num"><b>{c.codigo}</b></td>
            <td>{c.razonSocial}</td>
            <td className="num">{c.rif}</td>
            <td className="td-sub">{c.sector}</td>
            <td><EstadoPill e={c.estado} /></td>
            <td className="td-sub">{c.registradoPor}</td>
          </>
        )}
      />
    </>
  )
}
