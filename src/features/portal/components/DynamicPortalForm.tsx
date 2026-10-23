import React, { useEffect, useMemo, useState } from 'react'
import { Card, Field, Pill } from '@/shared/ui'
import { maestroApi, type ApiForm, type ApiPortalRecord } from '@/shared/api/maestro'
import { RepeatableBlock, fieldVisible, packAnswers, rowErrors, visibleRows, prepareForm, RenderField } from '@/features/platform/form/RenderField'
import { sectionColumns } from '@/shared/utils/gridWidth'
import { widthOf } from '@/features/platform/form/types'
import type { FormField, Section } from '@/features/platform/form/types'
import { clientTypeFrom, validateField, validateIdentityDocument } from '@/features/platform/form/validateField'
import { portalSteps, type PortalStep } from '@/features/portal/portalSteps'

/** Already captured on the first step, or the receiving institution's letterhead. */
const DOCUMENT_ALREADY_ASKED = new Set(['pj_rif', 'pn_documento'])
const PLACE_HELP = 'Es la ciudad donde se llena esta ficha, al lado de la fecha. La dirección del cliente se pide más abajo, en Contacto.'
const ENCABEZADO_INSTITUCION = new Set([
  'pj_institucion_nombre', 'pj_institucion_rif', 'pj_institucion_sucursal',
  'pn_institucion_nombre', 'pn_institucion_rif', 'pn_institucion_sucursal',
])

const completeIdentity = (valores: Record<string, unknown>): Record<string, unknown> | null => {
  const next = { ...valores }
  let changed = false
  const rif = String(valores.rif ?? '').trim().toUpperCase()
  const tipo = String(valores.tipo_persona ?? '')
  const juridica = /jur[ií]d/i.test(tipo)
  if (rif) {
    const code = juridica ? 'pj_rif' : /natural/i.test(tipo) ? 'pn_documento' : ''
    if (code && next[code] !== rif) {
      next[code] = rif
      changed = true
    }
  }
  const institucion = String(valores.pj_institucion_nombre ?? '').trim()
  if (juridica && institucion && !String(valores.razon_social ?? '').trim()) {
    next.razon_social = institucion
    changed = true
  }
  return changed ? next : null
}

type Props = {
  slug: string
  form: ApiForm
  initialAnswers?: Record<string, unknown>
  tokenInitial?: string | null
  rifInitial?: string
  /** Index of the step to open. Each save stores the step the client advanced to. */
  pasoInitial?: number
  onGuardado?: (registro: ApiPortalRecord) => void
  onListo: () => void
}

export const DynamicPortalForm: React.FC<Props> = ({ slug, form, initialAnswers = {}, tokenInitial, rifInitial = '', pasoInitial = 0, onGuardado, onListo }) => {
  const { sections, fields, formulas, repeatables } = useMemo(() => prepareForm(form), [form])
  const [valores, setValores] = useState<Record<string, unknown>>(() => {
    const initials: Record<string, unknown> = { ...initialAnswers, rif: rifInitial }
    if (initials.document === undefined && initials.rif) initials.document = initials.rif
    return initials
  })
  const [paso, setPaso] = useState(() => (pasoInitial > 0 ? pasoInitial : 0))
  const [token, setToken] = useState(tokenInitial ?? null)
  // Errors belong to the step the user tried to leave. Keeping that flag
  // after a successful advance painted the next step's empty fields red.
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pasos = useMemo(() => portalSteps(sections, fields, valores), [sections, fields, valores])
  const indice = pasos.length === 0 ? 0 : Math.min(paso, pasos.length - 1)
  const current: PortalStep | undefined = pasos[indice]
  const tipoElegido = String(valores.tipo_persona ?? '').trim() !== ''
  const esUltimo = tipoElegido && indice === pasos.length - 1
  const mensajeDe = (c: FormField) => (fieldVisible(c, valores, fields) ? validateField(c, valores[c.id], valores) : null)
  const hasDocument = fields.some(c => c.id === 'documento' || c.id === 'rif')
  const mensajeRif = !hasDocument
    ? (String(valores.rif ?? '').trim()
      ? validateIdentityDocument(String(valores.rif), clientTypeFrom(valores))
      : 'Este campo es obligatorio.')
    : null
  useEffect(() => {
    if (paso > pasos.length - 1) setPaso(Math.max(0, pasos.length - 1))
  }, [paso, pasos.length])

  useEffect(() => {
    const copiados = completeIdentity(valores)
    if (copiados) setValores(copiados)
  }, [valores])

  const sectionError = (section: Section) => {
    const ofSection = fields.filter(c => c.section === section.id)
    if (repeatables.has(section.id)) {
      const rows = visibleRows(valores, section.id, ofSection)
      const hallados = rowErrors(ofSection, fields, rows, valores)
      return Boolean(hallados.general || Object.keys(hallados.byField).length)
    }
    return ofSection.some(c => mensajeDe(c))
  }

  const errorEn = (indice: number) => {
    if (indice === 0 && mensajeRif) return true
    const step = pasos[indice]
    if (!step) return false
    return step.sections.some(sectionError)
  }

  const obtenerRif = () => String(
    valores.rif || valores.document || valores['cliente.documento'] || ''
  ).trim().toUpperCase()

  const asegurarToken = async () => {
    if (token) return token
    const rif = obtenerRif()
    if (!rif) throw new Error('Indique el RIF antes de guardar el formulario.')
    const registro = await maestroApi.startPortal(slug, rif)
    if (!registro.token) throw new Error('Este RIF ya tiene un expediente enviado.')
    setToken(registro.token)
    return registro.token
  }

  const save = async (final: boolean) => {
    setError(null)
    if (!final) {
      if (errorEn(indice)) {
        setAttemptedStep(indice)
        return
      }
    } else {
      const mal = pasos.findIndex((_, i) => errorEn(i))
      if (mal >= 0) {
        setAttemptedStep(mal)
        if (mal !== paso) setPaso(mal)
        return
      }
    }
    setAttemptedStep(null)
    setGuardando(true)
    try {
      const auth = await asegurarToken()
      const { answers, archivos } = packAnswers(fields, formulas, repeatables, valores)
      // El archivo viaja aparte. El nombre queda en las respuestas para que el
      // campo obligatorio no se vea vacío al cerrar el paso.
      // En el último paso el token se invalida al enviar el expediente; los
      // archivos deben viajar antes de cerrar el borrador.
      if (final) {
        for (const item of archivos) await maestroApi.uploadPortalDocument(slug, auth, item.field, item.archivo)
      }
      const registro = await maestroApi.savePortalStep(
        slug, auth, final ? Math.max(sections.length, pasos.length) : indice + 1, answers,
      )
      if (!final) {
        for (const item of archivos) await maestroApi.uploadPortalDocument(slug, auth, item.field, item.archivo)
      }
      onGuardado?.(registro)
      if (final) {
        if (registro.estado === 'enviado') onListo()
        else setError('El registro sigue abierto. Revise los campos obligatorios y vuelva a enviar.')
      } else setPaso(p => Math.min(p + 1, pasos.length - 1))
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      const faltantes = Array.isArray(detail?.faltantes) ? detail.faltantes.filter((x: unknown) => typeof x === 'string') : []
      setError(faltantes.length
        ? `Faltan campos obligatorios: ${faltantes.join(', ')}.`
        : typeof detail === 'string' && detail.trim()
        ? detail
        : detail?.message ?? e?.message ?? 'No fue posible guardar el avance.')
    } finally { setGuardando(false) }
  }

  if (!pasos.length || !current) return <Card><Pill k="warn">Formulario no configurado</Pill><p>La empresa todavía no ha publicado campos para este registro.</p></Card>
  return <>
    {error && <div className="portal-alert">{error}</div>}
    <div className="portal-wizard">
      <aside className="portal-sidebar">
        <nav className="portal-steps" aria-label="Pasos del registro">
          {pasos.map((step, i) => <button key={step.id} className={(i === indice ? 'on ' : '') + (i < indice ? 'done' : '')} disabled={i > indice} onClick={() => i <= indice && setPaso(i)}>
            <span>{i < indice ? '✓' : i + 1}</span><b>{step.title}</b><small>{i === indice ? 'En progreso' : i < indice ? 'Completado' : 'Pendiente'}</small>
          </button>)}
        </nav>
        <p className="portal-sidebar-note">Puedes guardar tu avance y continuar después usando tu RIF.</p>
      </aside>
      <main className="portal-current">
    {indice === 0 && !hasDocument && <div className="portal-rif-card"><Field label="RIF del cliente *" hint="Lo usamos para guardar tu avance y retomar el registro después." error={attemptedStep === indice && mensajeRif ? mensajeRif : undefined}>
      <input value={String(valores.rif ?? '')} placeholder="J-00000000-0" onChange={e => setValores(x => ({ ...x, rif: e.target.value.toUpperCase() }))} />
    </Field></div>}
    {current.sections.map((section, sectionIndex) => {
      const currentFields = fields.filter(c => c.section === section.id)
      const rifPortal = String(valores.rif ?? '').trim()
      const hidden = (c: FormField) => ENCABEZADO_INSTITUCION.has(c.id) || (Boolean(rifPortal) && DOCUMENT_ALREADY_ASKED.has(c.id))
      const visibleItems = currentFields.filter(c => fieldVisible(c, valores, fields) && !hidden(c))
      if (!visibleItems.length) return null
      return (
        <div className="portal-section-card" key={section.id}>
          <Card title={section.name} sub={sectionIndex === 0 ? 'Completa la información solicitada. Los campos marcados con * son obligatorios.' : undefined}>
            {repeatables.has(section.id) ? (
              <RepeatableBlock sectionId={section.id} fields={currentFields} todos={fields} formulas={formulas} valores={valores}
                mostrarErrores={attemptedStep === indice}
                gridClass={`form-grid cols-${sectionColumns(visibleItems.map(widthOf))}`}
                onValores={setValores} />
            ) : (
              <div className={`form-grid cols-${sectionColumns(visibleItems.map(widthOf))}`}>
                {rifPortal && currentFields.some(c => DOCUMENT_ALREADY_ASKED.has(c.id) && fieldVisible(c, valores, fields)) && (
                  <p className="ficha-nota">RIF del cliente: {rifPortal}. Quedó guardado al inicio.</p>
                )}
                {visibleItems.map(c => <RenderField key={c.id} field={c} value={valores[c.id]} catalogs={{}} formula={formulas[c.id]} valores={valores} help={c.id === 'pn_lugar' || c.id === 'pj_lugar' ? PLACE_HELP : undefined} error={attemptedStep === indice ? mensajeDe(c) ?? undefined : undefined} onChange={v => setValores(x => ({ ...x, [c.id]: v, ...(c.id === 'documento' || c.id === 'cliente.documento' || c.id === 'rif' ? { rif: v } : {}) }))} />)}
              </div>
            )}
          </Card>
        </div>
      )
    })}
    <div className="portal-actions"><div className="btn-row" style={{ justifyContent: 'space-between' }}>
      <span className="portal-save-note">Tus datos se guardan de forma segura al continuar.</span>
      <span className="btn-row">
        {indice > 0 && <button className="btn" onClick={() => setPaso(p => p - 1)}>Atrás</button>}
        {esUltimo
          ? <button className="btn pri" disabled={guardando} onClick={() => save(true)}>Enviar registro</button>
          : <button className="btn pri" disabled={guardando} onClick={() => save(false)}>Guardar y continuar</button>}
      </span>
    </div></div>
      </main>
    </div>
  </>
}
