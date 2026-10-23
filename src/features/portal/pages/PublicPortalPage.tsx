import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Modal, Field, Pill } from '@/shared/ui'
import { NewClientPage } from '@/features/clients/pages/NewClientPage'
import type { Client } from '@/features/clients/types/client.types'
import { maestroApi, type ApiPortalCompany, type ApiPortalRecord } from '@/shared/api/maestro'
import { DynamicPortalForm } from '@/features/portal/components/DynamicPortalForm'
import { PortalBrand } from '@/shared/components/brand/TransvalorIsotype'
import { portalStyle, hasBrand } from '@/features/platform/form/appearance'
import type { ApiFormAppearance } from '@/shared/api/maestro'

const clientFromPortal = (answer: ApiPortalRecord, rif: string): Client => {
  const d = (answer.respuestas ?? {}) as Partial<Client> & Record<string, unknown>
  return {
    companyId: '', code: answer.cliente_codigo ?? '', legalName: String(d.legalName ?? ''),
    rif: String(d.rif ?? rif), tipo: String(d.tipo ?? 'Compañía Anónima'), registro: String(d.registro ?? ''),
    address: String(d.address ?? ''), phone: String(d.phone ?? ''), email: String(d.email ?? ''),
    web: String(d.web ?? ''), sector: String(d.sector ?? ''), activity: String(d.activity ?? ''),
    fundOrigin: String(d.fundOrigin ?? ''), ingresos: String(d.ingresos ?? ''),
    declaredAmount: String(d.declaredAmount ?? ''), frequency: String(d.frequency ?? ''),
    status: answer.estado === 'en_progreso' ? 'BORRADOR' : 'PENDIENTE',
    registeredBy: 'El propio cliente', registeredAt: String(d.registeredAt ?? new Date().toISOString().slice(0, 10)),
    stepReached: answer.paso_actual ?? 1, people: (d.people as Client['people']) ?? [],
    servicios: (d.servicios as string[]) ?? [], activityDetail: String(d.activityDetail ?? ''),
    redes: String(d.redes ?? ''), registroNumero: String(d.registroNumero ?? ''), registroTomo: String(d.registroTomo ?? ''),
    registroFolio: String(d.registroFolio ?? ''), subscribedCapital: String(d.subscribedCapital ?? ''), currentCapital: String(d.currentCapital ?? ''),
    portalAnswers: answer.respuestas ?? {},
  }
}

/**
 * La raíz no elige empresa. El formulario solo se abre con el enlace
 * `/:companySlug` que corresponde a cada una.
 */
const PortalHeader: React.FC<{ name?: string; sub: string; logoUrl?: string | null; children?: React.ReactNode }> = ({ name, sub, logoUrl, children }) => (
  <header className="portal-top">
    <div className="portal-brand">
      {logoUrl
        ? <img className="portal-logo-img" src={logoUrl} alt="" />
        : <PortalBrand className="portal-logo" />}
      <div><b>{name ?? 'Registro de clientes'}</b><span>{sub}</span></div>
    </div>
    {children}
  </header>
)

export const PublicEntryPage = () => (
  <div className="portal">
    <PortalHeader sub="Enlace de la empresa" />
    <div className="portal-body">
      <div className="portal-card">
        <span className="portal-kicker">FORMULARIO DIGITAL · INFORMACIÓN CONFIDENCIAL</span>
        <h1>Use el enlace de su empresa</h1>
        <p>
          Esta dirección no abre el registro de ninguna empresa. El formulario
          está en el enlace que le enviaron, con el nombre de la empresa en la ruta.
        </p>
      </div>
    </div>
  </div>
)

/**
 * Portal público del cliente. Vive en `/:companySlug`, sin sesión y sin nada
 * del panel interno: quien llega aquí ve el formulario y punto.
 *
 * "Continuar proceso" es el único otro camino: se pide el RIF y el sistema
 * decide qué corresponde según lo que encuentre.
 */
export const PublicPortalPage = () => {
  const { companySlug } = useParams<{ companySlug: string }>()
  const [company, setCompany] = useState<ApiPortalCompany | null>(null)
  const [companyNotFound, setCompanyNotFound] = useState(false)
  const [pidiendoRif, setPidiendoRif] = useState(false)
  /** Expediente que el cliente retomó con su RIF. */
  const [retomado, setRetomado] = useState<Client | null>(null)
  const [tokenRetomado, setTokenRetomado] = useState<string | null>(null)
  const [verificarRif, setVerificarRif] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!companySlug) {
      setCompanyNotFound(true)
      return
    }
    setCompany(null); setCompanyNotFound(false)
    maestroApi.portalCompany(companySlug)
      .then(data => { if (data) setCompany(data); else setCompanyNotFound(true) })
      .catch(() => setCompanyNotFound(true))
  }, [companySlug])

  const search = async (rif: string) => {
    const normalizado = rif.trim().toUpperCase()
    const answer = await maestroApi.queryPortal(companySlug!, normalizado)
    if (answer.estado === 'requiere_verificacion') return { tipo: 'verificar' as const, rif: normalizado }
    return {
      tipo: 'borrador' as const,
      client: clientFromPortal(answer, normalizado),
      token: answer.token ?? null,
    }
  }

  if (companyNotFound) return (
    <div className="portal">
      <PortalHeader sub="Formulario digital" />
      <div className="portal-body"><div className="portal-card"><h1>Empresa no encontrada</h1><p>Verifique el enlace recibido.</p></div></div>
    </div>
  )
  if (!company) return (
    <div className="portal">
      <PortalHeader sub="Formulario digital" />
      <div className="portal-body"><div className="portal-card"><p>Verificando empresa…</p></div></div>
    </div>
  )

  const look: ApiFormAppearance | null | undefined = company.formulario?.apariencia
  const brand = hasBrand(look)
  const title = retomado ? 'Continúe donde lo dejó' : (look?.titulo || 'Registro de cliente')
  const introduccion = look?.texto_introduccion

  return (
    <div className={brand ? 'portal marca' : 'portal'} style={portalStyle(look)}>
      <PortalHeader name={company.nombre} sub={look?.subtitulo || 'Registro de clientes'} logoUrl={look?.logo_url}>
        <div className="portal-rif">
          {retomado || verificarRif
            ? <>
                <span className="num">{retomado?.rif ?? verificarRif}</span>
                <button className="btn sm" onClick={() => { setRetomado(null); setTokenRetomado(null); setVerificarRif(null); setEnviado(false) }}>Salir</button>
              </>
            : <button className="btn" onClick={() => setPidiendoRif(true)}>Continuar proceso</button>}
        </div>
      </PortalHeader>

      <div className="portal-body">
        {enviado
          ? <Enviado onSalir={() => { setEnviado(false); setRetomado(null) }} />
          : verificarRif
            ? <VerificationCode slug={company.slug} rif={verificarRif} onStatus={c => { setVerificarRif(null); setRetomado(c) }} />
          : retomado && retomado.status !== 'BORRADOR'
            ? <Status client={retomado} />
            : <div className="portal-form">
                <div className="portal-intro">
                  <span className="portal-kicker">FORMULARIO DIGITAL · INFORMACIÓN CONFIDENCIAL</span>
                  <h1>{title}</h1>
                  <p>
                    {retomado
                      ? <>Su registro quedó a medias el <b className="num">{retomado.registeredAt}</b>. Lo que ya
                        cargó está guardado.</>
                      : introduccion
                        ? introduccion
                        : <>Elija el tipo de cliente y complete los bloques de esa ficha. Puede dejarlo a medias: con <b>Continuar proceso</b> y su
                          RIF retoma exactamente donde se quedó.</>}
                  </p>
                </div>
                {company.formulario
                  ? <DynamicPortalForm
                      key={retomado?.code ?? 'nuevo'} slug={company.slug} form={company.formulario}
                      initialAnswers={retomado?.portalAnswers}
                      tokenInitial={tokenRetomado}
                      rifInitial={retomado?.rif}
                      pasoInitial={retomado?.stepReached}
                      onListo={() => { setEnviado(true); setRetomado(null) }} />
                  : <NewClientPage
                      key={retomado?.code ?? 'nuevo'} draft={retomado}
                      onDraftSaved={setRetomado}
                      onListo={() => { setEnviado(true); setRetomado(null) }} />}
              </div>}
      </div>

      {pidiendoRif && (
        <PedirRif
          search={search}
          onClose={() => setPidiendoRif(false)}
          onRetomar={c => { setRetomado(c.client); setTokenRetomado(c.token); setVerificarRif(null); setEnviado(false); setPidiendoRif(false) }}
          onVerificar={rif => { setVerificarRif(rif); setRetomado(null); setTokenRetomado(null); setEnviado(false); setPidiendoRif(false) }} />
      )}
    </div>
  )
}

/* Continuar proceso accepts a full RIF or a natural-person cédula. */
const DOCUMENT_CONTINUE_RE = /^(?:[VEJPG]-\d{8,9}-\d|[VEJPG]-?\d{1,2}(?:\.\d{3}){2}|[VEJPG]-?\d{6,9})$/

/* ---------------- Continuar proceso: se pide el RIF o la cédula ---------------- */
const PedirRif: React.FC<{
  search: (rif: string) => Promise<{ tipo: 'borrador'; client: Client; token: string | null } | { tipo: 'verificar'; rif: string }>
  onClose: () => void
  onRetomar: (c: { client: Client; token: string | null }) => void
  onVerificar: (rif: string) => void
}> = ({ search, onClose, onRetomar, onVerificar }) => {
  const [rif, setRif] = useState('')
  const [error, setError] = useState<string | null>(null)

  const continuar = async () => {
    const t = rif.trim().toUpperCase()
    if (!DOCUMENT_CONTINUE_RE.test(t)) {
      return setError('Persona natural: V-12345678 o V-12345678-0. Empresa: J-00000000-0.')
    }
    try {
      const hallado = await search(t)
      if (hallado.tipo === 'verificar') onVerificar(hallado.rif)
      else onRetomar(hallado)
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      setError(typeof detail === 'string' && detail.trim()
        ? detail
        : 'No fue posible abrir el registro. Verifique el RIF e intente nuevamente.')
    }
  }

  return (
    <Modal title="Continuar proceso" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={continuar}>Continuar</button></>}>
      <p className="dlg-txt">
        Escriba el RIF o la cédula con la que empezó. Si hay un proceso a medias, lo retoma.
        Si ya lo envió, le mandamos un código al email. Si no hay proceso, se lo indicamos.
      </p>
      <Field label="RIF o cédula" error={error ?? undefined}>
        <input autoFocus value={rif} placeholder="V-12345678 o J-00000000-0"
          onChange={e => { setRif(e.target.value.toUpperCase()); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && continuar()} />
      </Field>
    </Modal>
  )
}

const VerificationCode: React.FC<{
  slug: string
  rif: string
  onStatus: (c: Client) => void
}> = ({ slug, rif, onStatus }) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const confirm = async () => {
    setEnviando(true)
    setError(null)
    try {
      const answer = await maestroApi.confirmPortal(slug, rif, code.trim())
      const decision = answer.cliente_estado_decision
      const status = decision === 'aprobado' ? 'APROBADO' : decision === 'rechazado' || decision === 'inhabilitado' ? 'RECHAZADO' : 'PENDIENTE'
      onStatus({
        ...clientFromPortal({ ...answer, estado: 'enviado' }, rif),
        status,
        code: answer.cliente_codigo ?? '',
      })
    } catch {
      setError('El código no es válido o ya venció.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="portal-card">
      <h1>Confirme su email</h1>
      <p>Enviamos un código al email declarado en el registro <b className="num">{rif}</b>. Con ese código puede ver en qué va.</p>
      <Field label="Código" error={error ?? undefined}>
        <input value={code} inputMode="numeric" autoFocus placeholder="000000"
          onChange={e => { setCode(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && void confirm()} />
      </Field>
      <button className="btn pri" disabled={enviando || code.trim().length < 4} onClick={() => void confirm()}>
        {enviando ? 'Verificando…' : 'Ver estado'}
      </button>
    </div>
  )
}

/* ---------------- Ya enviado: se informa ---------------- */
const Status: React.FC<{ client: Client }> = ({ client }) => {
  const text: Record<string, { pill: 'ok' | 'warn' | 'bad' | 'mut'; title: string; body: React.ReactNode }> = {
    'PENDIENTE': {
      pill: 'mut', title: 'Su expediente está en cola',
      body: <>Recibimos su registro y está esperando revisión de la Unidad de Prevención. Le
        escribiremos a <b>{client.email}</b> cuando haya una decisión.</>,
    },
    'EN REVISIÓN': {
      pill: 'warn', title: 'Su expediente está en revisión',
      body: <>La Unidad de Prevención está verificando su información. No hace falta que haga nada;
        le escribiremos a <b>{client.email}</b> si necesitamos algo más.</>,
    },
    'APROBADO': {
      pill: 'ok', title: 'Su registro fue aprobado',
      body: <>Ya puede contratar los servicios de Transvalor. Su código de cliente es{' '}
        <b className="num">{client.code}</b>.</>,
    },
    'RECHAZADO': {
      pill: 'bad', title: 'Su registro no fue aprobado',
      body: <>La Unidad de Prevención no aprobó el expediente. Comuníquese con su ejecutivo
        comercial para conocer el detalle.</>,
    },
  }
  const t = text[client.status] ?? text['PENDIENTE']

  return (
    <div className="portal-card">
      <Pill k={t.pill}>{client.status[0] + client.status.slice(1).toLowerCase()}</Pill>
      <h1>{t.title}</h1>
      <p>{t.body}</p>

      <div className="portal-datos">
        <div><span>Razón social</span><b>{client.legalName}</b></div>
        <div><span>RIF</span><b className="num">{client.rif}</b></div>
        <div><span>Recibido el</span><b className="num">{client.registeredAt}</b></div>
        {client.verificationDate && <div><span>Decidido el</span><b className="num">{client.verificationDate}</b></div>}
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
      Su expediente pasó a la cola de la Unidad de Prevención. Le escribiremos al email que
      indicó cuando haya una decisión. Con <b>Continuar proceso</b> y su RIF puede consultar
      en qué va cuando quiera.
    </p>
    <button className="btn pri" onClick={onSalir}>Listo</button>
  </div>
)
