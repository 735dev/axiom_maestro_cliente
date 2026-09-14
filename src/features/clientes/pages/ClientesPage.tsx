import React, { useEffect, useState, useMemo, useCallback } from 'react'
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
  const [actualizando, setActualizando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const sincronizar = useCallback((mostrarCarga = false) => {
    if (mostrarCarga) setCargando(true)
    else setActualizando(true)
    return maestroApi.clientes({ count: 100, estado: 'todos' }).then(({ data }) => {
      dispatch(reemplazarClientesDesdeApi(data.map(desdeApi)))
      setErrorApi(null)
    }).catch(() => {
      if (mostrarCarga) setErrorApi('No fue posible cargar clientes desde el servidor.')
    }).finally(() => {
      if (mostrarCarga) setCargando(false)
      else setActualizando(false)
    })
  }, [dispatch])

  useEffect(() => {
    let activo = true
    sincronizar(true)
    // El portal público puede enviar un cliente mientras esta pantalla está
    // abierta. Refrescamos solo lectura, sin reemplazar acciones del usuario.
    const intervalo = window.setInterval(() => { if (activo) sincronizar() }, 5000)
    const alVolver = () => { if (activo) sincronizar() }
    window.addEventListener('focus', alVolver)
    return () => {
      activo = false
      window.clearInterval(intervalo)
      window.removeEventListener('focus', alVolver)
    }
  }, [sincronizar])

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
        acciones={<div className="btn-row">
          <button className="btn sm" onClick={() => sincronizar()} disabled={actualizando}>
            {actualizando ? 'Actualizando…' : 'Actualizar'}
          </button>
          {can(PERMISSIONS.registrosCrear) && <button className="btn pri sm" onClick={onNuevo}>Nuevo cliente</button>}
        </div>}
        columnas={[
          { th: 'Código' }, { th: 'Razón social' }, { th: 'RIF' }, { th: 'Sector' },
          { th: 'Estado' }, { th: 'Registrado por' }, { th: 'Acciones' },
        ]}
        fila={c => (
          <>
            <td className="num"><b>{c.codigo}</b></td>
            <td>{c.razonSocial}</td>
            <td className="num">{c.rif}</td>
            <td className="td-sub">{c.sector}</td>
            <td><EstadoPill e={c.estado} /></td>
            <td className="td-sub">{c.registradoPor}</td>
            <td>
              <button className="btn sm" onClick={e => { e.stopPropagation(); onOpen(c) }}>Ver</button>
            </td>
          </>
        )}
      />
    </>
  )
}

export const desdeApi = (c: ApiCliente): Cliente => {
  const r = c.respuestas_portal ?? {}
  const texto = (k: string, fallback = '') => typeof r[k] === 'string' ? r[k] as string : fallback
  const nombre = c.razon_social ?? [c.primer_nombre, c.primer_apellido].filter(Boolean).join(' ')
  const estado = c.estado_decision === 'aprobado' ? 'APROBADO'
    : c.estado_decision === 'rechazado' ? 'RECHAZADO'
      : c.estado_decision === 'inhabilitado' ? 'INHABILITADO'
        : c.estado_verificacion === 'borrador' ? 'BORRADOR'
          : c.estado_verificacion === 'en_revision' ? 'EN REVISIÓN'
          : c.estado_verificacion.startsWith('revisado') ? 'REVISADO' : 'PENDIENTE'
  return {
    empresaId: c.empresa_id, codigo: c.codigo, razonSocial: nombre || 'Sin razón social', rif: c.documento,
    tipo: c.tipo_persona, registro: texto('registro'), registroNumero: texto('registroNumero'), registroTomo: texto('registroTomo'), registroFolio: texto('registroFolio'),
    capitalSuscrito: texto('capitalSuscrito'), capitalActual: texto('capitalActual'), domicilio: c.direccion ?? texto('domicilio'), telefono: c.telefono ?? texto('telefono'), correo: c.email ?? texto('correo'), web: texto('web'), redes: texto('redes'),
    sector: c.sector_economico ?? '', actividad: c.actividad_economica ?? '', origenFondos: c.origen_fondos ?? '',
    actividadDetalle: texto('actividadDetalle'), ingresos: c.ingresos_estimados ?? '', montoDeclarado: texto('montoDeclarado'), frecuencia: c.frecuencia_operacion ?? '', servicios: Array.isArray(r.servicios) ? r.servicios as string[] : [], estado,
    verificadoPor: c.revisado_por ?? undefined, fechaVerificacion: c.fecha_revision ?? undefined,
    registradoPor: 'Servidor', fechaRegistro: c.created_at.slice(0, 10), personas: [], respuestasPortal: r,
  }
}
