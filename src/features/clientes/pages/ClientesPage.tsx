import React, { useEffect, useState, useMemo } from 'react'
import { type Cliente } from '../types/cliente.types'
import { Listado, Kpi } from '@/shared/ui'
import { EstadoPill } from '../components/Pills'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { reemplazarClientesDesdeApi, selectClientesDeMiEmpresa } from '../store/clientesSlice'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS } from '@/shared/auth/permissions'
import { maestroApi, type ApiCliente } from '@/shared/api/maestro'

const ESTADOS = ['Todos', 'BORRADOR', 'PENDIENTE', 'EN REVISIÓN', 'REVISADO', 'APROBADO', 'RECHAZADO', 'INHABILITADO']

export const MaestroClientes: React.FC<{ onOpen: (c: Cliente) => void; onNuevo: () => void }> = ({ onOpen, onNuevo }) => {
  const clientes = useAppSelector(selectClientesDeMiEmpresa)
  const dispatch = useAppDispatch()
  const can = useCan()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [cargando, setCargando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    maestroApi.clientes({ count: 100, estado: 'todos' }).then(({ data }) => {
      if (activo) dispatch(reemplazarClientesDesdeApi(data.map(desdeApi)))
    }).catch(() => { if (activo) setErrorApi('No fue posible cargar clientes desde el servidor.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [dispatch])

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
        vacio={cargando ? 'Cargando clientes…' : errorApi ?? 'Sin clientes que coincidan.'}
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

const desdeApi = (c: ApiCliente): Cliente => {
  const nombre = c.razon_social ?? [c.primer_nombre, c.primer_apellido].filter(Boolean).join(' ')
  const estado = c.estado_decision === 'aprobado' ? 'APROBADO'
    : c.estado_decision === 'rechazado' ? 'RECHAZADO'
      : c.estado_decision === 'inhabilitado' ? 'INHABILITADO'
        : c.estado_verificacion === 'en_revision' ? 'EN REVISIÓN'
          : c.estado_verificacion.startsWith('revisado') ? 'REVISADO' : 'PENDIENTE'
  return {
    empresaId: c.empresa_id, codigo: c.codigo, razonSocial: nombre || c.documento, rif: c.documento,
    tipo: c.tipo_persona, registro: '', domicilio: c.direccion ?? '', telefono: c.telefono ?? '', correo: c.email ?? '', web: '',
    sector: c.sector_economico ?? '', actividad: c.actividad_economica ?? '', origenFondos: c.origen_fondos ?? '',
    ingresos: c.ingresos_estimados ?? '', montoDeclarado: '', frecuencia: c.frecuencia_operacion ?? '', estado,
    verificadoPor: c.revisado_por ?? undefined, fechaVerificacion: c.fecha_revision ?? undefined,
    registradoPor: 'Servidor', fechaRegistro: c.created_at.slice(0, 10), personas: [],
  }
}
