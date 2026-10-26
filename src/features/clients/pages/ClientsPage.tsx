import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { type Client } from '../types/client.types'
import { Listing, Kpi } from '@/shared/ui'
import { StatusPill } from '../components/Pills'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { replaceClientsFromApi, selectClientsOfMyCompany } from '../store/clientsSlice'
import { useCan } from '@/shared/hooks/useCan'
import { PERMISSIONS } from '@/shared/auth/permissions'
import { maestroApi, type ApiClient } from '@/shared/api/maestro'

const STATUSES = ['Todos', 'BORRADOR', 'PENDIENTE', 'EN REVISIÓN', 'REVISADO', 'APROBADO', 'RECHAZADO', 'INHABILITADO']

export const MasterClients: React.FC<{ onOpen: (c: Client) => void; onNew: () => void }> = ({ onOpen, onNew }) => {
  const clients = useAppSelector(selectClientsOfMyCompany)
  const dispatch = useAppDispatch()
  const can = useCan()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Todos')
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const sincronizar = useCallback((mostrarCarga = false) => {
    if (mostrarCarga) setLoading(true)
    else setActualizando(true)
    return maestroApi.clients({ count: 100, status: 'todos' }).then(({ data }) => {
      dispatch(replaceClientsFromApi(data.map(fromApi)))
      setErrorApi(null)
    }).catch(() => {
      if (mostrarCarga) setErrorApi('No fue posible cargar clientes desde el servidor.')
    }).finally(() => {
      if (mostrarCarga) {
        setLoading(false)
        setListo(true)
      } else setActualizando(false)
    })
  }, [dispatch])

  useEffect(() => {
    void sincronizar(true)
  }, [sincronizar])

  const list = useMemo(() => clients.filter(c =>
    (status === 'Todos' || c.status === status) &&
    (c.legalName + c.rif + c.code).toLowerCase().includes(q.toLowerCase())
  ), [q, status, clients])

  if (!listo) return null

  return (
    <>
      <div className="kpis">
        <Kpi label="Clientes" value={clients.length} foot="registrados en el Maestro" />
        <Kpi label="Aprobados" value={clients.filter(c => c.status === 'APROBADO').length} foot="habilitados para operar" />
        <Kpi label="En cola" value={clients.filter(c => c.status === 'PENDIENTE' || c.status === 'EN REVISIÓN').length} foot="esperando a Prevención" />
        <Kpi label="En decisión" value={clients.filter(c => c.status === 'REVISADO').length} foot="esperando al administrador" />
      </div>

      <Listing
        title="Clientes"
        sub="El registro único del grupo. El código identifica al cliente en todos los sistemas."
        rows={list}
        rowKey={c => c.code}
        label="clientes"
        empty={loading ? 'Cargando clientes…' : errorApi ?? 'Sin clientes que coincidan.'}
        onRow={onOpen}
        search={{ value: q, onChange: setQ, placeholder: 'Buscar por razón social, RIF o código' }}
        filters={[{ value: status, onChange: setStatus, options: STATUSES }]}
        actions={<div className="btn-row">
          <button className="btn sm" onClick={() => sincronizar()} disabled={actualizando}>
            {actualizando ? 'Actualizando…' : 'Actualizar'}
          </button>
          {can(PERMISSIONS.recordsCreate) && <button className="btn pri sm" onClick={onNew}>Nuevo cliente</button>}
        </div>}
        columns={[
          { th: 'Código', sort: c => c.code },
          { th: 'Razón social', sort: c => c.legalName },
          { th: 'RIF', sort: c => c.rif },
          { th: 'Sector', sort: c => c.sector },
          { th: 'Estado', sort: c => c.status },
          { th: 'Registrado por', sort: c => c.registeredBy },
          { th: 'Acciones' },
        ]}
        row={c => (
          <>
            <td className="num"><b>{c.code}</b></td>
            <td>{c.legalName}</td>
            <td className="num">{c.rif}</td>
            <td className="td-sub">{c.sector}</td>
            <td>
              <StatusPill e={c.status} />
              {c.verificationStatus === 'revisado_con_riesgo' && (
                <span className="pill bad" style={{ marginLeft: 6 }}><i className="dot" />Con riesgo</span>
              )}
            </td>
            <td className="td-sub">{c.registeredBy}</td>
            <td>
              <button className="btn sm" onClick={e => { e.stopPropagation(); onOpen(c) }}>Ver</button>
            </td>
          </>
        )}
      />
    </>
  )
}

export const fromApi = (c: ApiClient): Client => {
  const r = c.respuestas_portal ?? {}
  const text = (k: string, fallback = '') => typeof r[k] === 'string' ? r[k] as string : fallback
  const name = c.razon_social ?? [c.primer_nombre, c.primer_apellido].filter(Boolean).join(' ')
  const status = c.estado_decision === 'aprobado' ? 'APROBADO'
    : c.estado_decision === 'rechazado' ? 'RECHAZADO'
      : c.estado_decision === 'inhabilitado' ? 'INHABILITADO'
        : c.estado_verificacion === 'borrador' ? 'BORRADOR'
          : c.estado_verificacion === 'en_revision' ? 'EN REVISIÓN'
          : c.estado_verificacion.startsWith('revisado') ? 'REVISADO' : 'PENDIENTE'
  return {
    companyId: c.empresa_id, code: c.codigo, legalName: name || 'Sin razón social', rif: c.documento,
    tipo: c.tipo_persona, registro: text('registro'), registroNumero: text('registroNumero'), registroTomo: text('registroTomo'), registroFolio: text('registroFolio'),
    subscribedCapital: text('capitalSuscrito'), currentCapital: text('capitalActual'), address: c.direccion ?? text('domicilio'), phone: c.telefono ?? text('telefono'), email: c.email ?? text('correo'), web: text('web'), redes: text('redes'),
    sector: c.sector_economico ?? '', activity: c.actividad_economica ?? '', fundOrigin: c.origen_fondos ?? '',
    activityDetail: text('actividadDetalle'), ingresos: c.ingresos_estimados ?? '', declaredAmount: text('montoDeclarado'), frequency: c.frecuencia_operacion ?? '', servicios: Array.isArray(r.servicios) ? r.servicios as string[] : [], status,
    verificationStatus: c.estado_verificacion,
    riskLevel: c.nivel_riesgo ?? undefined,
    reviewNotes: c.observaciones ?? undefined,
    verificadoPor: c.revisado_por ?? undefined, verificationDate: c.fecha_revision ?? undefined,
    registeredBy: 'Servidor', registeredAt: c.created_at.slice(0, 10), people: [], portalAnswers: r,
  }
}
