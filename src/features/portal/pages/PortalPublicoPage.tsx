import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppSelector } from '@/shared/store/hooks'
import { Modal, Field, Pill } from '@/shared/ui'
import { NuevoClientePage } from '@/features/clientes/pages/NuevoClientePage'
import { RIF_RE } from '@/features/clientes/schemas/cliente.schema'
import type { Cliente } from '@/features/clientes/types/cliente.types'
import { maestroApi, type ApiEmpresaPortal } from '@/shared/api/maestro'

const PASOS = ['Identificación', 'Contacto', 'Estructura accionaria', 'Perfil financiero']

/**
 * Portal público del cliente. Vive en `/`, sin sesión y sin nada del panel
 * interno: quien llega aquí ve el formulario y punto.
 *
 * "Continuar proceso" es el único otro camino: se pide el RIF y el sistema
 * decide qué corresponde según lo que encuentre.
 */
export const PortalPublicoPage = () => {
  const { empresaSlug } = useParams<{ empresaSlug: string }>()
  const clientes = useAppSelector(s => s.clientes.lista)
  const [empresa, setEmpresa] = useState<ApiEmpresaPortal | null>(null)
  const [empresaNoEncontrada, setEmpresaNoEncontrada] = useState(false)
  const [pidiendoRif, setPidiendoRif] = useState(false)
  /** Expediente que el cliente retomó con su RIF. */
  const [retomado, setRetomado] = useState<Cliente | null>(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!empresaSlug) return
    setEmpresa(null); setEmpresaNoEncontrada(false)
    maestroApi.empresaPortal(empresaSlug).then(setEmpresa).catch(() => setEmpresaNoEncontrada(true))
  }, [empresaSlug])

  const buscar = (rif: string) => clientes.find(c => c.rif === rif.trim().toUpperCase())

  if (empresaNoEncontrada) return <div className="portal"><div className="portal-body"><div className="portal-card"><h1>Empresa no encontrada</h1><p>Verifique el enlace recibido.</p></div></div></div>
  if (!empresa) return <div className="portal"><div className="portal-body"><div className="portal-card"><p>Verificando empresa…</p></div></div></div>

  return (
    <div className="portal">
      <header className="portal-top">
        <div>
          <b>{empresa.nombre}</b>
          <span>Registro de clientes</span>
        </div>
        <div className="portal-rif">
          {retomado
            ? <>
                <span className="num">{retomado.rif}</span>
                <button className="btn sm" onClick={() => { setRetomado(null); setEnviado(false) }}>Salir</button>
              </>
            : <button className="btn" onClick={() => setPidiendoRif(true)}>Continuar proceso</button>}
        </div>
      </header>

      <div className="portal-body">
        {enviado
          ? <Enviado onSalir={() => { setEnviado(false); setRetomado(null) }} />
          : retomado && retomado.estado !== 'BORRADOR'
            ? <Estado cliente={retomado} />
            : <div className="portal-form">
                <div className="portal-intro">
                  <h1>{retomado ? 'Continúe donde lo dejó' : 'Registro de cliente'}</h1>
                  <p>
                    {retomado
                      ? <>Su registro quedó a medias el <b className="num">{retomado.fechaRegistro}</b>. Lo que ya
                        cargó está guardado; retome desde el bloque <b>{PASOS[(retomado.pasoAlcanzado ?? 1) - 1]}</b>.</>
                      : <>Complete los cuatro bloques. Puede dejarlo a medias: con <b>Continuar proceso</b> y su
                        RIF retoma exactamente donde se quedó.</>}
                  </p>
                </div>
                <NuevoClientePage
                  key={retomado?.codigo ?? 'nuevo'}
                  borrador={retomado}
                  onBorradorGuardado={setRetomado}
                  onListo={() => { setEnviado(true); setRetomado(null) }}
                />
              </div>}
      </div>

      {pidiendoRif && (
        <PedirRif
          buscar={buscar}
          onClose={() => setPidiendoRif(false)}
          onRetomar={c => { setRetomado(c); setEnviado(false); setPidiendoRif(false) }} />
      )}
    </div>
  )
}

/* ---------------- Continuar proceso: se pide el RIF ---------------- */
const PedirRif: React.FC<{
  buscar: (rif: string) => Cliente | undefined
  onClose: () => void
  onRetomar: (c: Cliente) => void
}> = ({ buscar, onClose, onRetomar }) => {
  const [rif, setRif] = useState('')
  const [error, setError] = useState<string | null>(null)

  const continuar = () => {
    const t = rif.trim().toUpperCase()
    if (!RIF_RE.test(t)) return setError('Formato esperado: J-00000000-0.')
    const c = buscar(t)
    if (!c) return setError('No hay ningún registro con ese RIF. Complete el formulario para iniciarlo.')
    onRetomar(c)
  }

  return (
    <Modal title="Continuar proceso" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={continuar}>Continuar</button></>}>
      <p className="dlg-txt">
        Escriba el RIF con el que empezó. Si el registro quedó a medias, lo retoma donde lo dejó;
        si ya lo envió, le mostramos en qué va.
      </p>
      <Field label="RIF de la empresa" error={error ?? undefined}>
        <input autoFocus value={rif} placeholder="J-00000000-0"
          onChange={e => { setRif(e.target.value.toUpperCase()); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && continuar()} />
      </Field>
    </Modal>
  )
}

/* ---------------- Ya enviado: se informa ---------------- */
const Estado: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  const texto: Record<string, { pill: 'ok' | 'warn' | 'bad' | 'mut'; titulo: string; cuerpo: React.ReactNode }> = {
    'PENDIENTE': {
      pill: 'mut', titulo: 'Su expediente está en cola',
      cuerpo: <>Recibimos su registro y está esperando revisión de la Unidad de Prevención. Le
        escribiremos a <b>{cliente.correo}</b> cuando haya una decisión.</>,
    },
    'EN REVISIÓN': {
      pill: 'warn', titulo: 'Su expediente está en revisión',
      cuerpo: <>La Unidad de Prevención está verificando su información. No hace falta que haga nada;
        le escribiremos a <b>{cliente.correo}</b> si necesitamos algo más.</>,
    },
    'APROBADO': {
      pill: 'ok', titulo: 'Su registro fue aprobado',
      cuerpo: <>Ya puede contratar los servicios de Transvalor. Su código de cliente es{' '}
        <b className="num">{cliente.codigo}</b>.</>,
    },
    'RECHAZADO': {
      pill: 'bad', titulo: 'Su registro no fue aprobado',
      cuerpo: <>La Unidad de Prevención no aprobó el expediente. Comuníquese con su ejecutivo
        comercial para conocer el detalle.</>,
    },
  }
  const t = texto[cliente.estado] ?? texto['PENDIENTE']

  return (
    <div className="portal-card">
      <Pill k={t.pill}>{cliente.estado[0] + cliente.estado.slice(1).toLowerCase()}</Pill>
      <h1>{t.titulo}</h1>
      <p>{t.cuerpo}</p>

      <div className="portal-datos">
        <div><span>Razón social</span><b>{cliente.razonSocial}</b></div>
        <div><span>RIF</span><b className="num">{cliente.rif}</b></div>
        <div><span>Recibido el</span><b className="num">{cliente.fechaRegistro}</b></div>
        {cliente.fechaVerificacion && <div><span>Decidido el</span><b className="num">{cliente.fechaVerificacion}</b></div>}
      </div>

      <p className="portal-pie">
        Su expediente no se puede editar mientras está en revisión. Si necesita corregir algo,
        escriba a su ejecutivo comercial.
      </p>
    </div>
  )
}

/* ---------------- Acabado de enviar ---------------- */
const Enviado: React.FC<{ onSalir: () => void }> = ({ onSalir }) => (
  <div className="portal-card">
    <Pill k="ok">Registro enviado</Pill>
    <h1>Recibimos su registro</h1>
    <p>
      Su expediente pasó a la cola de la Unidad de Prevención. Le escribiremos al correo que
      indicó cuando haya una decisión. Con <b>Continuar proceso</b> y su RIF puede consultar
      en qué va cuando quiera.
    </p>
    <button className="btn pri" onClick={onSalir}>Listo</button>
  </div>
)
