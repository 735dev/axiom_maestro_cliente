import React, { useEffect, useMemo, useState } from 'react'
import { maestroApi, type ApiForm } from '@/shared/api/maestro'
import { NewClientPage } from './NewClientPage'
import { RepeatableBlock, fieldVisible, packAnswers, rowErrors, visibleRows, prepareForm, RenderField } from '@/features/platform/form/RenderField'
import { validateField } from '@/features/platform/form/validateField'
import { showNotice } from '@/shared/store/slices/uiSlice'
import { useAppDispatch } from '@/shared/store/hooks'
import { portalStyle, initials, hasBrand } from '@/features/platform/form/appearance'
import { ACCEPT_DOCUMENTS, fileAllowed, apiErrorMessage, FILE_TYPE_MESSAGE, uploadClientDocument } from '@/features/clients/api/documents'

type Props = { onListo: () => void; onCancelar?: () => void }

/** Alta interna. Si hay formulario publicado, usa esos campos. Si no, el asistente fijo. */
export const ClientIntakePage: React.FC<Props> = ({ onListo, onCancelar }) => {
  const dispatch = useAppDispatch()
  const [form, setForm] = useState<ApiForm | null | undefined>(undefined)
  const [valores, setValores] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [intento, setIntento] = useState(false)
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [subidos, setSubidos] = useState<string[]>([])

  useEffect(() => {
    maestroApi.currentForm().then(setForm).catch(() => setForm(null))
  }, [])

  const preparado = useMemo(() => (form && form.secciones.some(s => s.campos.length) ? prepareForm(form) : null), [form])

  if (form === undefined) return <p>Loading form…</p>
  if (!form || !preparado) return <NewClientPage onListo={onListo} onCancelar={onCancelar} />
  const look = form.apariencia

  const save = async () => {
    setIntento(true)
    const siguientes: Record<string, string> = {}
    for (const field of preparado.fields) {
      if (preparado.repeatables.has(field.section)) continue
      if (!fieldVisible(field, valores, preparado.fields)) continue
      const mensaje = validateField(field, valores[field.id], valores)
      if (mensaje) siguientes[field.id] = mensaje
    }
    for (const section of preparado.sections) {
      if (!preparado.repeatables.has(section.id)) continue
      const ofSection = preparado.fields.filter(c => c.section === section.id)
      const hallados = rowErrors(ofSection, preparado.fields, visibleRows(valores, section.id, ofSection), valores)
      if (hallados.general) siguientes[section.id] = hallados.general
      for (const [key, mensaje] of Object.entries(hallados.byField)) siguientes[`${section.id}:${key}`] = mensaje
    }
    setErrores(siguientes)
    if (Object.keys(siguientes).length > 0) {
      setError(Object.values(siguientes).includes('La suma de los porcentajes no puede superar 100.')
        ? 'La suma de los porcentajes no puede superar 100.'
        : 'Revise los campos marcados.')
      return
    }
    const { answers, archivos } = packAnswers(preparado.fields, preparado.formulas, preparado.repeatables, valores)
    if (archivos.some(item => !fileAllowed(item.archivo))) {
      setError(FILE_TYPE_MESSAGE)
      return
    }
    setGuardando(true)
    setError(null)
    const hechos = new Set(subidos)
    let id = createdClientId
    try {
      const text = (k: string) => {
        const value = answers[k]
        return value == null ? '' : String(value).trim()
      }
      const tipo = text('tipo_persona').toLowerCase()
      const natural = tipo === 'natural' || tipo === 'persona natural'
      const name = text('nombre') || text('razon_social')
      const partes = name.split(/\s+/).filter(Boolean)
      const payload: Record<string, unknown> = {
        tipo_persona: natural ? 'natural' : 'juridica',
        document: text('documento') || text('rif'),
        razon_social: natural ? undefined : (text('razon_social') || name || undefined),
        primer_nombre: natural ? (text('primer_nombre') || partes[0]) : undefined,
        primer_apellido: natural ? (text('primer_apellido') || partes[1] || 'Sin apellido') : undefined,
        sector_economico: text('sector') || text('sector_economico') || undefined,
        actividad_economica: text('actividad') || text('actividad_economica') || undefined,
        email: text('correo') || text('email') || undefined,
        phone: text('telefono') || undefined,
        direccion: text('domicilio') || text('direccion') || undefined,
        origen_fondos: text('origen_fondos') || undefined,
        ingresos_estimados: text('ingresos') || text('ingresos_estimados') || undefined,
        frecuencia_operacion: text('frecuencia') || text('frecuencia_operacion') || undefined,
        es_pep: answers.cliente_pep === true || answers.cliente_pep === 'si' || answers.es_pep === true || answers.es_pep === 'si',
        respuestas_portal: answers,
      }
      if (!payload.document) throw new Error('Indique el documento.')
      if (!natural && !payload.razon_social) throw new Error('Indique la razón social.')
      if (!id) {
        const creado = await maestroApi.createClient(payload)
        id = creado.id
        setCreatedClientId(id)
      }
      for (const item of archivos) {
        if (hechos.has(item.key)) continue
        await uploadClientDocument(id, item.field, item.archivo)
        hechos.add(item.key)
        setSubidos([...hechos])
      }
      dispatch(showNotice({ tipo: 'info', text: 'Cliente registrado.' }))
      onListo()
    } catch (e) {
      const fallback = id ? 'No fue posible subir el documento.' : 'No fue posible registrar el cliente.'
      const custom = e instanceof Error && !(e as { response?: unknown }).response ? e.message : fallback
      setError(apiErrorMessage(e, custom))
    } finally {
      setGuardando(false)
    }
  }

  const brand = hasBrand(look)
  return (
    <div className={brand ? 'portal marca alta-marca' : undefined} style={portalStyle(look)}>
      {brand && (
        <header className="portal-top">
          <div className="portal-brand">
            {look?.logo_url
              ? <img className="portal-logo-img" src={look.logo_url} alt="" />
              : <span className="portal-mark">{initials(look?.titulo || 'Registro')}</span>}
            <div>
              <b>{look?.titulo || 'Registro de cliente'}</b>
              {look?.texto_introduccion && <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>{look.texto_introduccion}</span>}
            </div>
          </div>
        </header>
      )}
      {error && <div className="val-err">{error}</div>}
      {preparado.sections.map(section => {
        const ofSection = preparado.fields.filter(c => c.section === section.id)
        return (
        <section key={section.id}>
          <div className="sec">{section.name}</div>
          {preparado.repeatables.has(section.id) ? (
            <RepeatableBlock sectionId={section.id} fields={ofSection} todos={preparado.fields} formulas={preparado.formulas}
              valores={valores} mostrarErrores={intento} gridClass="grid" accept={ACCEPT_DOCUMENTS}
              validateFile={archivo => fileAllowed(archivo) ? null : FILE_TYPE_MESSAGE}
              onValores={setValores} />
          ) : (
          <div className="grid">
            {ofSection.filter(c => fieldVisible(c, valores, preparado.fields)).map(c => (
              <RenderField key={c.id} field={c} value={valores[c.id]} catalogs={{}} error={errores[c.id]}
                formula={preparado.formulas[c.id]} valores={valores} accept={c.tipo === 'archivo' ? ACCEPT_DOCUMENTS : undefined}
                onChange={value => {
                  if (value instanceof File && !fileAllowed(value)) {
                    setValores(x => ({ ...x, [c.id]: null }))
                    setErrores(prev => ({ ...prev, [c.id]: FILE_TYPE_MESSAGE }))
                    return
                  }
                  setValores(x => ({ ...x, [c.id]: value }))
                  setErrores(prev => {
                    if (!prev[c.id]) return prev
                    const next = { ...prev }
                    delete next[c.id]
                    return next
                  })
                }} />
            ))}
          </div>
          )}
        </section>
        )
      })}
      <div className="btn-row" style={{ marginTop: 16 }}>
        {onCancelar && <button className="btn" onClick={onCancelar}>Cancelar</button>}
        <button className="btn pri" disabled={guardando} onClick={() => void save()}>
          {guardando ? 'Guardando…' : 'Registrar cliente'}
        </button>
      </div>
    </div>
  )
}
