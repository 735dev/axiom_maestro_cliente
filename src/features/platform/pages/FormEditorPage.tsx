import React, { useEffect, useState } from 'react'
import { Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { publishForm, replaceFormFromApi, currentVersion } from '../store/companiesSlice'
import {
  TYPES, STANDARD_FIELDS, PLATFORM_CATALOGS, catalogOf, standardOf, usedKeys,
  optionsOf, widthOf, previousFields, operadoresPara, OPERADORES, WIDTHS, NUMERIC_TYPES,
  type FormField, type Section, type FieldType, type SectionId, type StandardField,
  type Condition, type ConditionGroup, type Enlace, type FieldWidth,
} from '../form/types'
import { RenderField, fieldVisible } from '../form/RenderField'
import { compare, resumen, type Cambio } from '../form/compare'
import { selectCatalogsOf } from '@/features/catalogs/store/catalogsSlice'
import { sectionColumns } from '@/shared/utils/gridWidth'
import { maestroApi, type ApiFormAppearance } from '@/shared/api/maestro'
import { EMPTY_APPEARANCE, portalStyle, initials, hasBrand } from '../form/appearance'
import { FormAppearance } from '../form/FormAppearance'
import { FormulaEditor } from '../form/FormulaEditor'

/** Editor-only extras. Published JSON keeps the keys `formula` and `repetible`. */
type FieldEditor = FormField & { formula?: string }
type SectionEditor = Section & { repeatable?: boolean }

const formulaDe = (origen: object): string | undefined => {
  const value = (origen as { formula?: unknown }).formula
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'expresion' in value) {
    const text = (value as { expresion?: unknown }).expresion
    return typeof text === 'string' ? text : undefined
  }
  return undefined
}

const repeatableOf = (origen: object): boolean => {
  const raw = origen as { repetible?: unknown; repeatable?: unknown }
  return raw.repetible === true || raw.repeatable === true
}

/** Which published ficha a section belongs to, from its tipo_persona conditions. */
const recordOfSection = (sectionId: string, fields: FieldEditor[]): 'natural' | 'juridica' | 'comun' => {
  const valores = new Set<string>()
  for (const field of fields) {
    if (field.section !== sectionId) continue
    for (const condition of field.condition?.conditions ?? []) {
      if (condition.fieldId === 'tipo_persona' && condition.value) valores.add(String(condition.value))
    }
  }
  const natural = [...valores].some(value => /natural/i.test(value))
  const juridica = [...valores].some(value => /jur[ií]d/i.test(value))
  if (natural && !juridica) return 'natural'
  if (juridica && !natural) return 'juridica'
  return 'comun'
}

const typeFromApi = (tipo: string): FieldType => ({
  si_no: 'si-no', seleccion_multiple: 'multiple', email: 'email', documento_identidad: 'documento',
}[tipo] as FieldType ?? tipo as FieldType)
const tipoApi = (tipo: FieldType) => ({
  'si-no': 'si_no', multiple: 'seleccion_multiple', email: 'correo', document: 'documento_identidad', url: 'url',
} as Partial<Record<FieldType, string>>)[tipo] ?? tipo

const definitionForm = (sections: SectionEditor[], fields: FieldEditor[]) => ({
  secciones: sections.map((s, i) => ({
    nombre: s.name, orden: i + 1, repetible: s.repeatable === true,
    campos: fields.filter(c => c.section === s.id).map((c, j) => ({
      codigo: c.standard ?? c.id, etiqueta: c.label, tipo_campo: tipoApi(c.tipo), orden: j + 1,
      obligatorio: c.required, es_estandar: Boolean(c.standard), catalogo_ref: c.catalog,
      opciones: c.options ?? [], ancho: c.width ?? 'auto',
      ...(c.tipo === 'calculado' ? { formula: c.formula ?? '' } : {}),
      condiciones_visibilidad: c.condition ? {
        enlace: c.condition.enlace,
        condiciones: c.condition.conditions.map(x => ({
          campo_codigo: fields.find(y => y.id === x.fieldId)?.standard ?? x.fieldId,
          operador: x.operador, valor: x.value,
        })),
      } : undefined,
    })),
  })),
})

/**
 * Editor del formulario de una empresa.
 *
 * El formulario arranca vacío y la empresa lo arma. La plataforma no impone
 * secciones ni campos: aporta el catálogo de campos estándar, que son los que
 * tienen columna propia en la base y por eso se pueden buscar, filtrar y
 * consumir desde los procesos del sistema.
 */
export const FormEditor = ({ anclado = false, editable = true }: { anclado?: boolean; editable?: boolean }) => {
  const companies = useAppSelector(s => s.companies.list)
  const user = useAppSelector(s => s.auth.user)
  const dispatch = useAppDispatch()

  const [sel, setSel] = useState(companies[0]?.id ?? '')
  const company = companies.find(e => e.id === sel) ?? companies[0]
  const current = currentVersion(company)
  /** Los valores que esta empresa administra. La vista previa los usa tal cual. */
  const companyCatalogs = useAppSelector(selectCatalogsOf(company.id))

  /**
   * Qué versión se está mirando. `null` = la vigente, que es la única
   * editable. Elegir una anterior abre el archivo: se ve tal como estaba, no
   * se toca.
   */
  const [verVersion, setVerVersion] = useState<number | null>(null)
  const mostrada = verVersion === null ? current : company.form.find(v => v.version === verVersion)!
  const historico = verVersion !== null
  const urlPostulaciones = `${window.location.origin}/${company.slug}`

  /** Borrador local: nada se publica hasta que se justifique el cambio. */
  const [fields, setFields] = useState<FieldEditor[]>(current.fields)
  const [sections, setSections] = useState<SectionEditor[]>(current.sections)
  const [section, setSection] = useState<SectionId>(current.sections[0]?.id ?? '')
  const [editando, setEditando] = useState<FieldEditor | null>(null)
  const [creating, setCreando] = useState(false)
  const [catalog, setCatalog] = useState(false)
  const [sectionEdit, setSectionEdit] = useState<SectionEditor | null>(null)
  const [creatingSection, setCreatingSection] = useState(false)
  const [deletingSection, setDeletingSection] = useState<Section | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [historial, setHistorial] = useState(false)
  const [reason, setReason] = useState('')
  /** Valores de juguete para que la vista previa reaccione como la real. */
  const [demo, setDemo] = useState<Record<string, unknown>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [appearance, setAppearance] = useState<ApiFormAppearance>(EMPTY_APPEARANCE)
  const [publishedAppearance, setPublishedAppearance] = useState<ApiFormAppearance>(EMPTY_APPEARANCE)
  const [appearances, setAppearances] = useState<Record<number, ApiFormAppearance>>({})
  const [editingAppearance, setEditingAppearance] = useState(false)
  const [companyLoaded, setCompanyLoaded] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [serverDraftLoaded, setServerDraftLoaded] = useState(false)
  const [userEdit, setUserEdit] = useState(false)

  useEffect(() => {
    if (!user) return
    setListo(false)
    setCompanyLoaded(null)
    setServerDraftLoaded(false)
    setUserEdit(false)
    let active = true
    let pendingItems = 2
    const hecho = () => {
      pendingItems -= 1
      if (active && pendingItems <= 0) setListo(true)
    }
    const slugForPlatform = user?.scope === 'plataforma' ? company.slug : undefined
    maestroApi.currentForm(slugForPlatform).then(f => {
      if (!active) return
      const apiSections = f.secciones.sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, name: s.nombre, sub: '', repeatable: repeatableOf(s) }))
      const apiFields = f.secciones.flatMap(s => s.campos.sort((a, b) => a.orden - b.orden).map(c => ({
        id: c.codigo, section: s.id, label: c.etiqueta, tipo: typeFromApi(c.tipo_campo), required: c.obligatorio,
        standard: c.es_estandar ? c.codigo : undefined, catalog: c.catalogo_ref ?? undefined,
        options: c.opciones ?? [], width: c.ancho as FieldWidth, formula: formulaDe(c),
        condition: c.condiciones_visibilidad ? { enlace: c.condiciones_visibilidad.enlace, conditions: (c.condiciones_visibilidad.condiciones ?? []).map(x => ({ fieldId: x.campo_codigo, operador: x.operador as any, value: x.valor ?? undefined })) } : undefined,
      }))) as FieldEditor[]
      setSections(apiSections); setFields(apiFields); setSection(apiSections[0]?.id ?? '')
      const look = f.apariencia ?? EMPTY_APPEARANCE
      setAppearance(look); setPublishedAppearance(look)
      maestroApi.formDraft(slugForPlatform).then(draft => {
        if (!active) return
        if (draft?.formulario_version === f.numero_version && Object.prototype.hasOwnProperty.call(draft, 'apariencia')) {
          setAppearance(draft.apariencia ?? EMPTY_APPEARANCE)
        }
        const draftSecciones = Array.isArray(draft?.secciones) ? draft.secciones : null
        if (draft?.formulario_version === f.numero_version && draftSecciones && draftSecciones.length > 0) {
          const draftSections = draftSecciones.map((s: any, i: number) => ({ id: apiSections[i]?.id ?? crypto.randomUUID(), name: s.nombre ?? s.name, sub: '', repeatable: repeatableOf(s) }))
          const draftFields = draftSecciones.flatMap((s: any, i: number) => (s.campos ?? s.fields ?? []).map((c: any) => ({
            id: c.codigo ?? c.code, section: draftSections[i].id, label: c.etiqueta ?? c.label, tipo: typeFromApi(c.tipo_campo), required: c.obligatorio ?? c.required,
            standard: c.es_estandar ? (c.codigo ?? c.code) : undefined, catalog: c.catalogo_ref ?? undefined, options: c.opciones ?? c.options ?? [], width: c.ancho ?? c.width ?? 'auto',
            formula: formulaDe(c),
            condition: c.condiciones_visibilidad ? { enlace: c.condiciones_visibilidad.enlace, conditions: (c.condiciones_visibilidad.condiciones ?? []).map((x: any) => ({ fieldId: x.campo_codigo, operador: x.operador, value: x.valor ?? x.value })) } : undefined,
          }))) as FieldEditor[]
          setSections(draftSections); setFields(draftFields); setSection(draftSections[0]?.id ?? '')
        } else if (draft?.formulario_version === f.numero_version && draftSecciones && draftSecciones.length === 0 && apiSections.length > 0) {
          maestroApi.deleteFormDraft(slugForPlatform)
        }
      }).catch(() => undefined).finally(() => {
        if (active) {
          setServerDraftLoaded(true)
          setCompanyLoaded(company.id)
        }
        hecho()
      })
      dispatch(replaceFormFromApi({
        id: company.id,
        versions: [{
          version: f.numero_version, start: f.publicado_en.slice(0, 10),
          sections: apiSections, fields: apiFields,
          publicadaPor: 'Servidor', reason: f.motivo,
        }],
      }))
      return maestroApi.formHistory(slugForPlatform).then(historialApi =>
        Promise.all(historialApi.map(v => v.numero_version === f.numero_version
          ? Promise.resolve(f)
          : maestroApi.formVersion(v.numero_version, slugForPlatform)))
      ).then(apiVersions => {
        if (!active) return
        const versions = apiVersions.map(v => {
          const versionSections = v.secciones.slice().sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, name: s.nombre, sub: '', repeatable: repeatableOf(s) }))
          const versionFields = v.secciones.flatMap(s => s.campos.slice().sort((a, b) => a.orden - b.orden).map(c => ({
            id: c.codigo, section: s.id, label: c.etiqueta, tipo: typeFromApi(c.tipo_campo), required: c.obligatorio,
            standard: c.es_estandar ? c.codigo : undefined, catalog: c.catalogo_ref ?? undefined,
            options: c.opciones ?? [], width: c.ancho as FieldWidth, formula: formulaDe(c),
            condition: c.condiciones_visibilidad ? { enlace: c.condiciones_visibilidad.enlace, conditions: (c.condiciones_visibilidad.condiciones ?? []).map(x => ({ fieldId: x.campo_codigo, operador: x.operador as any, value: x.valor ?? undefined })) } : undefined,
          }))) as FieldEditor[]
          return { version: v.numero_version, start: v.publicado_en.slice(0, 10), sections: versionSections, fields: versionFields, publicadaPor: 'Servidor', reason: v.motivo }
        })
        dispatch(replaceFormFromApi({ id: company.id, versions }))
        setAppearances(Object.fromEntries(apiVersions.map(v => [v.numero_version, v.apariencia ?? EMPTY_APPEARANCE])))
      }).finally(hecho)
    }).catch(() => { if (active) { setApiError('No fue posible cargar el formulario vigente desde el servidor.'); setListo(true) } })
    return () => { active = false }
  }, [company.id, company.slug, user?.scope, dispatch])

  const changeCompany = (id: string) => {
    const v = currentVersion(companies.find(e => e.id === id)!)
    setListo(false)
    setSel(id); setFields(v.fields); setSections(v.sections)
    setSection(v.sections[0]?.id ?? ''); setDemo({}); setVerVersion(null)
    setAppearance(EMPTY_APPEARANCE); setPublishedAppearance(EMPTY_APPEARANCE)
  }

  /** Al abrir una versión pasada se descarta el borrador: son cosas distintas. */
  const abrirVersion = (n: number | null) => {
    const v = n === null ? current : company.form.find(x => x.version === n)!
    setVerVersion(n)
    setFields(v.fields); setSections(v.sections)
    setSection(v.sections[0]?.id ?? ''); setDemo({}); setHistorial(false)
    setAppearance(n === null ? publishedAppearance : appearances[n] ?? EMPTY_APPEARANCE)
  }

  const sucio = !historico && (JSON.stringify(fields) !== JSON.stringify(mostrada.fields)
    || JSON.stringify(sections) !== JSON.stringify(mostrada.sections)
    || JSON.stringify(appearance) !== JSON.stringify(publishedAppearance))
  /** Diferencias del borrador contra la versión vigente. */
  const cambios = sucio ? compare(current, { sections, fields }) : []

  useEffect(() => {
    if (companyLoaded !== company.id || !serverDraftLoaded || !userEdit || historico || !sucio) return
    const timer = window.setTimeout(() => {
      maestroApi.saveFormDraft({ formulario_version: current.version, ...definitionForm(sections, fields), apariencia: appearance }, user?.scope === 'plataforma' ? company.slug : undefined)
        .catch(() => setApiError('El borrador quedó guardado localmente, pero no pudo sincronizarse con el servidor.'))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [companyLoaded, serverDraftLoaded, userEdit, company.id, current.version, sections, fields, appearance, historico, sucio, company.slug, user?.scope])
  /**
   * Lo que se pinta sale siempre de la versión mostrada; el borrador local solo
   * existe mientras se edita la vigente. Mantener dos fuentes de verdad para lo
   * mismo es cómo la pantalla termina mostrando las secciones de una versión
   * con los campos de otra.
   */
  const viewSections = historico ? mostrada.sections : sections
  const viewFields = historico ? mostrada.fields : fields

  const currentSection = viewSections.find(b => b.id === section)
  const ofSection = viewFields.filter(c => c.section === section)
  const fieldType = viewFields.find(c => c.id === 'tipo_persona' || c.standard === 'tipo_persona')
  const naturalOption = fieldType?.options?.find(o => /natural/i.test(o)) ?? 'Persona natural'
  const legalEntityOption = fieldType?.options?.find(o => /jur[ií]d/i.test(o)) ?? 'Persona jurídica'
  const record: 'natural' | 'juridica' = /jur[ií]d/i.test(String(demo.tipo_persona ?? '')) ? 'juridica' : 'natural'
  const recordSections = viewSections.filter(s => {
    const cual = recordOfSection(s.id, viewFields)
    return cual === 'comun' || cual === record
  })

  useEffect(() => {
    if (String(demo.tipo_persona ?? '').trim() || !fieldType) return
    setDemo(current => current.tipo_persona ? current : { ...current, tipo_persona: naturalOption })
  }, [fieldType, demo.tipo_persona, naturalOption])

  useEffect(() => {
    if (!section || recordOfSection(section, viewFields) === 'comun') return
    if (recordOfSection(section, viewFields) === record) return
    const siguiente = viewSections.find(s => recordOfSection(s.id, viewFields) === record)
    if (siguiente) setSection(siguiente.id)
  }, [record, section, viewSections, viewFields])
  const reemplazar = (c: FieldEditor) => { setUserEdit(true); setFields(fields.map(x => x.id === c.id ? c : x)) }

  const add = (c: FieldEditor) => {
    setUserEdit(true)
    const ultimo = fields.map(x => x.section).lastIndexOf(c.section)
    const next = [...fields]
    next.splice(ultimo + 1, 0, c)
    setFields(next)
  }

  const move = (c: FieldEditor, dir: -1 | 1) => {
    setUserEdit(true)
    const hermanos = fields.filter(x => x.section === c.section)
    const i = hermanos.findIndex(x => x.id === c.id)
    if (i + dir < 0 || i + dir >= hermanos.length) return
    const next = [...hermanos]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    setFields(fields.filter(x => x.section !== c.section).concat(next)
      .sort((a, b) => sections.findIndex(x => x.id === a.section) - sections.findIndex(x => x.id === b.section)))
  }

  const moveSection = (b: SectionEditor, dir: -1 | 1) => {
    setUserEdit(true)
    const i = sections.findIndex(x => x.id === b.id)
    if (i + dir < 0 || i + dir >= sections.length) return
    const next = [...sections]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    setSections(next)
  }

  if (!listo) return null

  return (
    <>
      <div className="ef-top">
        {apiError && <div className="val-err">{apiError}</div>}
        <div className="ef-emp">
          {!anclado && <>
            <label>Company</label>
            <select value={company.id} onChange={e => changeCompany(e.target.value)}>
              {companies.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </>}
          <label className="ef-verlbl">Versión</label>
          <select value={verVersion ?? current.version}
            onChange={e => abrirVersion(Number(e.target.value) === current.version ? null : Number(e.target.value))}>
            {[...company.form].reverse().map(v => (
              <option key={v.version} value={v.version}>
                v{v.version} · {v.start}{v.version === current.version ? ' · vigente' : ''}
              </option>
            ))}
          </select>
          <button className="lnk" onClick={() => setHistorial(true)}>ver historial</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {historico ? (
            <>
              <button className="btn sm" onClick={() => setEditingAppearance(true)}>Apariencia</button>
              <button className="btn sm pri" onClick={() => abrirVersion(null)} title={`Volver a la versión vigente v${current.version}`}>
                Volver a la vigente
              </button>
            </>
          ) : editable ? (
            <>
              {sucio && <button className="btn sm"
                onClick={() => { setFields(current.fields); setSections(current.sections); setAppearance(publishedAppearance); maestroApi.deleteFormDraft(user?.scope === 'plataforma' ? company.slug : undefined) }}>Descartar</button>}
              <button className="btn sm" onClick={() => setEditingAppearance(true)}>Apariencia</button>
              <button className="btn sm" onClick={() => setCreatingSection(true)}>Agregar sección</button>
              <button className="btn sm" disabled={!currentSection} onClick={() => setCatalog(true)}>Del catálogo</button>
              <button className="btn sm" disabled={!currentSection} onClick={() => setCreando(true)}>Campo propio</button>
              <button className="btn sm pri" disabled={!sucio} onClick={() => { setReason(''); setPublicando(true) }}>
                Publicar v{current.version + 1}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Link para postulaciones</span>
        <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{urlPostulaciones}</code>
        <button className="btn sm" onClick={() => navigator.clipboard?.writeText(urlPostulaciones)}>Copiar</button>
        <a className="btn sm" href={urlPostulaciones} target="_blank" rel="noreferrer">Abrir</a>
      </div>

      {historico && (
        <div className="ef-hist">
          <b>Está viendo la v{mostrada.version}, que ya no es la vigente.</b>
          <span>
            Rigió desde el <span className="num">{mostrada.start}</span>. Los expedientes llenados
            en ese período se leen con esta definición, y por eso no se puede editar: cambiarla
            reescribiría el pasado. Publicada por {mostrada.publicadaPor} — {mostrada.reason}
          </span>
        </div>
      )}

      {!viewSections.length ? (
        <div className="ef-vacio">
          <h3>Este formulario está en blanco</h3>
          <p>
            Empiece creando una sección y después agréguele campos, del
            catálogo estándar o propios de {company.name}.
          </p>
          {editable && <button className="btn pri" onClick={() => setCreatingSection(true)}>Crear la primera sección</button>}
        </div>
      ) : (
        <>
          <div className="ef-fichas">
            <button type="button" className={record === 'natural' ? 'on' : ''} onClick={() => setDemo(current => ({ ...current, tipo_persona: naturalOption }))}>
              Persona natural
              <small>{viewSections.filter(s => recordOfSection(s.id, viewFields) === 'natural').length} secciones</small>
            </button>
            <button type="button" className={record === 'juridica' ? 'on' : ''} onClick={() => setDemo(current => ({ ...current, tipo_persona: legalEntityOption }))}>
              Persona jurídica
              <small>{viewSections.filter(s => recordOfSection(s.id, viewFields) === 'juridica').length} secciones</small>
            </button>
          </div>
          <p className="ef-ficha-nota">El postulante elige el tipo al empezar. Aquí solo se listan las secciones de esa ficha.</p>
          <div className="ef-secciones">
            {recordSections.map(b => (
              <button key={b.id} type="button" className={b.id === section ? 'on' : ''} onClick={() => setSection(b.id)}>
                {b.name}
                <span>{viewFields.filter(c => c.section === b.id).length}</span>
              </button>
            ))}
          </div>

          <div className="ef">
            {/* ---- configuración ---- */}
            <div className="ef-col">
              <div className="ef-h">
                <span>Campos de la sección<span className="num"> · {ofSection.length}</span>
                  {currentSection && repeatableOf(currentSection) && <Pill k="info">Se repite</Pill>}
                </span>
                {currentSection && !historico && editable && (
                  <span className="ef-seccion-a">
                    <button className="btn sm" disabled={sections[0]?.id === section} onClick={() => moveSection(currentSection, -1)} title="Mover la sección hacia arriba">←</button>
                    <button className="btn sm" disabled={sections[sections.length - 1]?.id === section} onClick={() => moveSection(currentSection, 1)} title="Mover la sección hacia abajo">→</button>
                    <button className="btn sm" onClick={() => setSectionEdit(currentSection)}>Renombrar</button>
                    <button className="btn sm" onClick={() => setDeletingSection(currentSection)}>Eliminar</button>
                  </span>
                )}
              </div>
              <div className="ef-lista">
                {ofSection.map((c, i) => {
                  const e = standardOf(c.standard)
                  return (
                    <div key={c.id} className="ef-campo">
                      <div className="ef-campo-i">
                        <div className="ef-campo-n">
                          {c.label}
                          {e ? <Pill k="ok">Estándar</Pill> : <Pill k="mut">Custom</Pill>}
                          {c.required && <Pill k="warn">Obligatorio</Pill>}
                        </div>
                        <div className="ef-campo-m">
                          {TYPES.find(t => t.id === c.tipo)?.name}
                          {c.options?.length ? ` · ${c.options.length} opciones` : ''}
                          {Boolean(c.condition?.conditions.length) && ' · condicionado'}
                          {c.width && c.width !== 'auto' && ` · ancho ${WIDTHS.find(a => a.id === c.width)?.name.toLowerCase()}`}
                          {e
                            ? <><span className="rp-sep">·</span><code>{e.column}</code>
                              {e.expuesto && <><span className="rp-sep">·</span><b>expuesto por la interfaz</b></>}</>
                            : <><span className="rp-sep">·</span><span className="ef-sin">sin índice</span></>}
                        </div>
                      </div>
                      {!historico && editable && <div className="ef-campo-a">
                        <button className="btn sm" disabled={i === 0} onClick={() => move(c, -1)} title="Subir">↑</button>
                        <button className="btn sm" disabled={i === ofSection.length - 1} onClick={() => move(c, 1)} title="Bajar">↓</button>
                        <button className="btn sm" onClick={() => setEditando(c)}>Editar</button>
                        <button className="btn sm" onClick={() => { setUserEdit(true); setFields(fields.filter(x => x.id !== c.id)) }}>Quitar</button>
                      </div>}
                    </div>
                  )
                })}
                {!ofSection.length && <div className="empty">Esta sección no tiene campos todavía.</div>}
              </div>
            </div>

            {/* ---- vista previa ---- */}
            <div className="ef-col ef-prev">
              <div className="ef-h">
                Vista previa
                <span className="ef-h-nota">Sección de la ficha {record === 'juridica' ? 'jurídica' : 'natural'}</span>
              </div>
              <div className="ef-prev-body" style={portalStyle(appearance)}>
                {hasBrand(appearance) && (
                  <div className="ef-look">
                    {appearance.logo_url
                      ? <img className="portal-logo-img" src={appearance.logo_url} alt="" />
                      : <span className="portal-mark">{initials(company.name)}</span>}
                    <div>
                      {appearance.titulo && <b>{appearance.titulo}</b>}
                      {appearance.texto_introduccion && <p>{appearance.texto_introduccion}</p>}
                    </div>
                  </div>
                )}
                <h3>{currentSection?.name}</h3>
                <p className="ef-prev-sub">{currentSection?.sub}</p>
                {(() => {
                  // El ancho de columnas se recalcula sobre lo que de verdad se
                  // ve: si una condición esconde campos, la sección se acomoda
                  // con lo que queda, no con lo que hay en total.
                  const visibleItems = ofSection.filter(c => fieldVisible(c, demo, viewFields))
                  const cols = sectionColumns(visibleItems.map(c => widthOf(c)))
                  return (
                    <div className={`form-grid cols-${cols}`}>
                      {visibleItems.map(c => (
                        <RenderField key={c.id} field={c} value={demo[c.id]} catalogs={companyCatalogs}
                          onChange={v => setDemo({ ...demo, [c.id]: v })} />
                      ))}
                    </div>
                  )
                })()}
                {!ofSection.length && <div className="empty">Sin campos que mostrar.</div>}
                {ofSection.some(c => c.id === 'tipo_persona') && (
                  <ol className="ef-sigue">
                    {recordSections.filter(s => recordOfSection(s.id, viewFields) !== 'comun').map(s => (
                      <li key={s.id}><button type="button" onClick={() => setSection(s.id)}>{s.name}</button></li>
                    ))}
                  </ol>
                )}
                {ofSection.some(c => c.condition?.conditions.length && c.id !== 'tipo_persona') &&
                  <p className="ef-prev-pie">
                    Hay campos que aparecen según lo que se responda en esta sección.
                  </p>}
              </div>
            </div>
          </div>
        </>
      )}

      {catalog && currentSection && (
        <CatalogModal
          usadas={usedKeys(fields)}
          onClose={() => setCatalog(false)}
          onAdd={keys => {
            const nuevos = keys.map((k, i) => {
              const e = STANDARD_FIELDS.find(x => x.key === k)!
              return {
                id: 'c' + Math.floor(performance.now() * 1000) + i,
                section: currentSection.id, standard: e.key, label: e.name, tipo: e.tipo,
                required: true, catalog: e.catalog, placeholder: e.placeholder, help: e.help,
              }
            })
            setUserEdit(true)
            setFields(prev => {
              const ultimo = prev.map(x => x.section).lastIndexOf(currentSection.id)
              const siguiente = [...prev]
              siguiente.splice(ultimo + 1, 0, ...nuevos)
              return siguiente
            })
            setCatalog(false)
          }} />
      )}

      {(creating || editando) && currentSection && (
        <FieldModal
          field={editando}
          sections={sections}
          initialSection={section}
          availableFields={fields}
          catalogs={companyCatalogs}
          onClose={() => { setCreando(false); setEditando(null) }}
          onSave={c => {
            if (editando) reemplazar(c); else add(c)
            setCreando(false); setEditando(null)
          }} />
      )}

      {(creatingSection || sectionEdit) && (
        <SectionModal
          section={sectionEdit}
          onClose={() => { setCreatingSection(false); setSectionEdit(null) }}
          onSave={b => {
            setUserEdit(true)
            if (sectionEdit) setSections(sections.map(x => x.id === b.id ? b : x))
            else { setSections([...sections, b]); setSection(b.id) }
            setCreatingSection(false); setSectionEdit(null)
          }} />
      )}

      {deletingSection && (
        <DeleteSection
          section={deletingSection}
          fields={fields.filter(c => c.section === deletingSection.id)}
          onClose={() => setDeletingSection(null)}
          onDelete={() => {
            setUserEdit(true)
            setSections(sections.filter(x => x.id !== deletingSection.id))
            setFields(fields.filter(c => c.section !== deletingSection.id))
            if (section === deletingSection.id) setSection(sections.find(x => x.id !== deletingSection.id)?.id ?? '')
            setDeletingSection(null)
          }} />
      )}

      {publicando && (
        <Modal title={`Publicar v${current.version + 1} de ${company.name}`} onClose={() => setPublicando(false)}
          footer={<><button className="btn" onClick={() => setPublicando(false)}>Cancelar</button>
            <button className="btn pri" disabled={reason.trim().length < 10}
              onClick={() => {
                const payload = { motivo: reason, ...definitionForm(sections, fields), apariencia: appearance }
                maestroApi.publishForm(payload, user?.scope === 'plataforma' ? company.slug : undefined).then(() => {
                  dispatch(publishForm({ id: company.id, sections, fields, reason, user: user!.name }))
                  maestroApi.deleteFormDraft(user?.scope === 'plataforma' ? company.slug : undefined)
                  setPublicando(false)
                }).catch(() => setApiError('No fue posible publicar el formulario en el servidor.'))
              }}>Publicar</button></>}>
          <p className="dlg-txt">
            La v{current.version} no se modifica: queda como está y esta se agrega encima. Los
            expedientes llenados con v{current.version} se siguen leyendo con v{current.version}.
          </p>

          <div className="sec">Qué cambia · {resumen(cambios)}</div>
          <ChangeList cambios={cambios} />

          <Field label="Motivo del cambio (obligatorio)">
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Por qué cambia el formulario de esta empresa" />
          </Field>
        </Modal>
      )}

      {editingAppearance && (
        <FormAppearance
          value={appearance}
          companyName={company.name}
          readOnly={historico || !editable}
          onClose={() => setEditingAppearance(false)}
          onSave={siguiente => { setUserEdit(true); setAppearance(siguiente); setEditingAppearance(false) }}
        />
      )}

      {historial && (
        <Modal title={`Historial del formulario de ${company.name}`} onClose={() => setHistorial(false)}
          footer={<button className="btn pri" onClick={() => setHistorial(false)}>Cerrar</button>}>
          <p className="dlg-txt">
            Cada versión queda entera. Un caseFile se lee siempre con la que regía el día que se
            llenó, así que ninguna se pisa ni se borra.
          </p>
          {[...company.form].reverse().map((v, i, arr) => {
            const previa = arr[i + 1]
            const dif = previa ? compare(previa, v) : []
            return (
              <div key={v.version} className="hv">
                <div className="hv-h">
                  <div>
                    <b className="num">v{v.version}</b>
                    {v.version === current.version ? <Pill k="ok">Current</Pill> : <Pill k="mut">Archivada</Pill>}
                    <span className="hv-m">
                      start <span className="num">{v.start}</span>
                      {previa && <> · {resumen(dif)}</>}
                      {!previa && <> · versión initial, {v.fields.length} fields</>}
                    </span>
                  </div>
                  <button className="btn sm" onClick={() => abrirVersion(v.version === current.version ? null : v.version)}>
                    Ver
                  </button>
                </div>
                <div className="hv-b">
                  <b>{v.publicadaPor}</b> — {v.reason}
                </div>
                {dif.length > 0 && <ChangeList cambios={dif} />}
              </div>
            )
          })}
        </Modal>
      )}
    </>
  )
}

/* ---------------- Catálogo de campos estándar ---------------- */
const CatalogModal: React.FC<{
  usadas: Set<string>
  onClose: () => void
  onAdd: (keys: string[]) => void
}> = ({ usadas, onClose, onAdd }) => {
  const [elegidas, setElegidas] = useState<string[]>([])
  const [q, setQ] = useState('')
  /** Los ya usados se esconden: un selector no debe ofrecer lo que no es opción. */
  const [verUsados, setVerUsados] = useState(false)

  const coincide = (c: StandardField) =>
    (c.name + c.group + c.column).toLowerCase().includes(q.trim().toLowerCase())

  const libres = STANDARD_FIELDS.filter(c => !usadas.has(c.key))
  const visibleItems = (verUsados ? STANDARD_FIELDS : libres).filter(coincide)
  const groups = Array.from(new Set(visibleItems.map(c => c.group)))

  const alternar = (k: string) =>
    setElegidas(elegidas.includes(k) ? elegidas.filter(x => x !== k) : [...elegidas, k])

  // Nada que ofrecer: se dice, en vez de mostrar una lista entera en gris.
  if (!libres.length && !verUsados) {
    return (
      <Modal title="Agregar del catálogo estándar" onClose={onClose}
        footer={<button className="btn pri" onClick={onClose}>Cerrar</button>}>
        <div className="empty" style={{ padding: '28px 16px' }}>
          <b>Este form ya usa los {STANDARD_FIELDS.length} fields del catálogo.</b>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
            No queda ninguno por add. Lo que necesite de acá en adelante va como
            <b> field custom</b>, o se pide sumar un field new al catálogo de la platform —eso
            implies una column new en la base y lo hace Axiom, no la company.
          </p>
          <button className="btn" style={{ marginTop: 14 }} onClick={() => setVerUsados(true)}>
            Ver los que ya están
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Agregar del catálogo estándar" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={!elegidas.length} onClick={() => onAdd(elegidas)}>
          Agregar {elegidas.length || ''}
        </button></>}>
      <p className="dlg-txt">
        Estos fields tienen <b>column propia en la base</b>: se pueden search, filtrar y ordenar, y
        son los que leen los procesos del sistema. Un field custom se guarda igual, pero sin índice.
        Ninguno es required; tome los que le sirvan.
      </p>

      <div className="cat-barra">
        <input className="rp-find" placeholder="Buscar campo" value={q} onChange={e => setQ(e.target.value)} />
        <span className="cat-cuenta">
          <b className="num">{libres.length}</b> por agregar de <b className="num">{STANDARD_FIELDS.length}</b>
          {usadas.size > 0 && (
            <button className="lnk" onClick={() => setVerUsados(!verUsados)}>
              {verUsados ? 'ocultar los que ya están' : `ver los ${usadas.size} que ya están`}
            </button>
          )}
        </span>
      </div>

      <div className="cat">
        {groups.map(g => (
          <div key={g}>
            <div className="sec">{g}</div>
            {visibleItems.filter(c => c.group === g).map(c => {
              const ya = usadas.has(c.key)
              return (
                <label key={c.key} className={'cat-i' + (ya ? ' ya' : '')}>
                  <input type="checkbox" disabled={ya}
                    checked={ya || elegidas.includes(c.key)} onChange={() => alternar(c.key)} />
                  <span className="cat-t">
                    <span>{c.name} {ya && <Pill k="mut">Ya está</Pill>}</span>
                    <span className="cat-m">
                      {TYPES.find(t => t.id === c.tipo)?.name}
                      <span className="rp-sep">·</span><code>{c.column}</code>
                      {c.expuesto && <><span className="rp-sep">·</span><b>expuesto por la interfaz</b></>}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        ))}
        {!visibleItems.length && <div className="empty">Ningún campo por agregar coincide con “{q}”.</div>}
      </div>
    </Modal>
  )
}

/** Con qué arranca una condición nueva, según el tipo del campo elegido como disparador. */
const initialCondition = (disparador: FormField): Condition => ({
  fieldId: disparador.id,
  operador: operadoresPara(disparador.tipo)[0],
  value: disparador.tipo === 'si-no' ? 'si' : '',
})

/* ---------------- Alta y edición de un campo ---------------- */
const FieldModal: React.FC<{
  field: FieldEditor | null
  sections: Section[]
  initialSection: SectionId
  availableFields: FormField[]
  catalogs: Record<string, string[]>
  onClose: () => void
  onSave: (c: FieldEditor) => void
}> = ({ field, sections, initialSection, availableFields, catalogs, onClose, onSave }) => {
  const est: StandardField | undefined = standardOf(field?.standard)
  const [d, setD] = useState<FieldEditor>(field ?? {
    id: 'x' + Math.floor(performance.now() * 1000),
    section: initialSection, label: '', tipo: 'texto', required: false,
  })
  const [options, setOptions] = useState((field?.options ?? []).join('\n'))
  const [tocado, setTocado] = useState(false)

  const needsOptions = d.tipo === 'lista' || d.tipo === 'multiple'
  /** De dónde salen las opciones: de un catálogo de la empresa o fijas. */
  const [origen, setOrigen] = useState<'catalogo' | 'fijas'>(field?.catalog ? 'catalogo' : 'fijas')
  const labelError = d.label.trim().length < 3 ? 'Escriba al menos 3 caracteres.' : null
  const optionsError = needsOptions && origen === 'fijas'
    && options.split('\n').filter(o => o.trim()).length < 2
    ? 'Necesita al menos dos opciones, una por línea.' : null
  const catalogError = needsOptions && origen === 'catalogo' && !d.catalog
    ? 'Elija de qué catálogo salen las opciones.' : null
  const ok = !labelError && !optionsError && !catalogError

  // Solo campos que ya existen antes que este en el formulario: depender de
  // uno posterior no se ofrece siquiera como opción.
  const disponibles = previousFields(sections, availableFields, d)
  const condition: ConditionGroup = d.condition ?? { enlace: 'y', conditions: [] }

  const setCondition = (g: ConditionGroup | undefined) => setD({ ...d, condition: g })
  const addCondition = () => {
    if (!disponibles.length) return
    setCondition({ enlace: condition.enlace, conditions: [...condition.conditions, initialCondition(disponibles[0])] })
  }
  const updateCondition = (i: number, patch: Partial<Condition>) =>
    setCondition({ ...condition, conditions: condition.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) })
  const removeCondition = (i: number) => {
    const nuevas = condition.conditions.filter((_, idx) => idx !== i)
    setCondition(nuevas.length ? { ...condition, conditions: nuevas } : undefined)
  }

  const save = () => {
    if (!ok) { setTocado(true); return }
    // Defensivo: si mientras se editaba cambió la sección o el orden y una
    // condición quedó apuntando a un campo que ya no es anterior, se descarta
    // en vez de guardar una referencia que ya no tiene sentido.
    const validCondition = condition.conditions.filter(c => disponibles.some(x => x.id === c.fieldId))
    onSave({
      ...d, label: d.label.trim(),
      // Una cosa o la otra, nunca las dos: dos fuentes para la misma lista es
      // exactamente el problema que este cambio vino a resolver.
      catalog: needsOptions && origen === 'catalogo' ? d.catalog : undefined,
      options: needsOptions && origen === 'fijas'
        ? options.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
      condition: validCondition.length ? { enlace: condition.enlace, conditions: validCondition } : undefined,
      formula: d.tipo === 'calculado' ? (d.formula ?? '') : undefined,
    })
  }

  return (
    <Modal title={field ? `Editar “${field.label}”` : 'Campo propio'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={save}>{field ? 'Guardar' : 'Agregar'}</button></>}>

      {est ? (
        <p className="dlg-txt">
          <b>Campo estándar.</b> Guarda en <code>{est.column}</code>, así que es buscable y
          filtrable{est.expuesto ? <>, y <b>lo leen los otros sistemas del grupo</b> por la interfaz
          de consulta</> : null}. La etiqueta se puede cambiar —el cliente ve la suya y la columna
          sigue siendo la misma—, el tipo no.
        </p>
      ) : field === null ? (
        <p className="dlg-txt">
          Un campo propio se guarda sin esquema: aparece en el expediente pero <b>no se indexa</b>, y
          buscar por él obliga a recorrer todo. Si lo va a consultar seguido, fíjese primero si está
          en el catálogo estándar.
        </p>
      ) : null}

      <Field label="Etiqueta que ve el cliente" error={tocado ? labelError ?? undefined : undefined}>
        <input autoFocus value={d.label} onChange={e => setD({ ...d, label: e.target.value })}
          placeholder="Ej. Organismo donde ejerce el cargo" />
      </Field>

      <div className="grid">
        <Field label="Sección">
          <select value={d.section} onChange={e => setD({ ...d, section: e.target.value })}>
            {sections.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Tipo" hint={TYPES.find(t => t.id === d.tipo)?.nota}>
          <select value={d.tipo} disabled={Boolean(est)} onChange={e => setD({ ...d, tipo: e.target.value as FieldType })}>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>

      {d.tipo === 'calculado' && (
        <FormulaEditor value={d.formula ?? ''} onChange={formula => setD({ ...d, formula })} />
      )}

      {needsOptions && (
        <>
          <Field label="De dónde salen las opciones"
            hint={origen === 'catalogo'
              ? 'Cada empresa administra los valores de su catálogo, sin pedirle nada a Axiom.'
              : 'Fijas para todas las empresas. Cambiarlas requiere publicar una versión nueva.'}>
            <select value={origen} disabled={Boolean(est)} onChange={e => setOrigen(e.target.value as 'catalogo' | 'fijas')}>
              <option value="catalogo">De un catálogo de la empresa</option>
              <option value="fijas">Opciones fijas</option>
            </select>
          </Field>

          {origen === 'catalogo' ? (
            <Field label="Catálogo" error={tocado ? catalogError ?? undefined : undefined}
              hint={catalogOf(d.catalog)?.description}>
              <select value={d.catalog ?? ''} disabled={Boolean(est)}
                onChange={e => setD({ ...d, catalog: e.target.value || undefined })}>
                <option value="">Elija un catálogo</option>
                {PLATFORM_CATALOGS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Opciones, una por línea" error={tocado ? optionsError ?? undefined : undefined}>
              <textarea rows={4} value={options} onChange={e => setOptions(e.target.value)}
                placeholder={'Nacional\nRegional\nMunicipal'} />
            </Field>
          )}
        </>
      )}

      <Field label="Texto de ayuda" hint="Opcional. Aparece bajo el campo.">
        <input value={d.help ?? ''} onChange={e => setD({ ...d, help: e.target.value || undefined })}
          placeholder="Aclaración para el cliente" />
      </Field>

      {disponibles.length > 0 && (
        <div className="cond">
          <div className="cond-h">
            <span>Mostrar solo si se cumple</span>
            <button type="button" className="btn sm" onClick={addCondition}>+ Agregar condición</button>
          </div>
          {!condition.conditions.length && <p className="cond-vacio">Sin condición: el campo se muestra siempre.</p>}
          {condition.conditions.map((c, i) => {
            const disparador = disponibles.find(x => x.id === c.fieldId)
            const ops = operadoresPara(disparador?.tipo)
            const necesitaValue = OPERADORES.find(o => o.id === c.operador)?.necesitaValue
            const esNumerico = disparador && NUMERIC_TYPES.includes(disparador.tipo)
            return (
              <div key={i} className="cond-fila">
                {i > 0 && (
                  <select className="cond-enlace" value={condition.enlace}
                    onChange={e => setCondition({ ...condition, enlace: e.target.value as Enlace })}>
                    <option value="y">Y</option>
                    <option value="o">O</option>
                  </select>
                )}
                <select value={c.fieldId} onChange={e => {
                  const next = disponibles.find(x => x.id === e.target.value)
                  if (next) updateCondition(i, initialCondition(next))
                }}>
                  {disponibles.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
                <select value={c.operador}
                  onChange={e => updateCondition(i, { operador: e.target.value as Condition['operador'], value: '' })}>
                  {ops.map(o => <option key={o} value={o}>{OPERADORES.find(x => x.id === o)?.name}</option>)}
                </select>
                {necesitaValue && disparador?.tipo === 'si-no' ? (
                  <select value={c.value ?? 'si'} onChange={e => updateCondition(i, { value: e.target.value })}>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                ) : necesitaValue && c.operador === 'en' ? (
                  <div className="cond-multi">
                    {optionsOf(disparador!, catalogs).map(o => {
                      const marcadas = (c.value ?? '').split(',').filter(Boolean)
                      return (
                        <label key={o} className="chk">
                          <input type="checkbox" checked={marcadas.includes(o)}
                            onChange={() => updateCondition(i, {
                              value: (marcadas.includes(o) ? marcadas.filter(x => x !== o) : [...marcadas, o]).join(','),
                            })} />
                          <span>{o}</span>
                        </label>
                      )
                    })}
                    {!optionsOf(disparador!, catalogs).length && <span className="cond-sinop">Ese field no tiene options cargadas.</span>}
                  </div>
                ) : necesitaValue && disparador?.tipo === 'lista' ? (
                  <select value={c.value ?? ''} onChange={e => updateCondition(i, { value: e.target.value })}>
                    <option value="">Elija…</option>
                    {optionsOf(disparador, catalogs).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : necesitaValue ? (
                  <input type={esNumerico ? 'number' : 'text'} value={c.value ?? ''}
                    onChange={e => updateCondition(i, { value: e.target.value })} placeholder="Valor" />
                ) : null}
                <button type="button" className="btn sm" onClick={() => removeCondition(i)}>Remove</button>
              </div>
            )
          })}
        </div>
      )}

      <Field label="Ancho" hint="Automático decide según el tipo: párrafo y archivo ocupan la fila entera, el resto comparte.">
        <select value={d.width ?? 'auto'} onChange={e => setD({ ...d, width: e.target.value as FieldWidth })}>
          {WIDTHS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>

      <label className="sw-fila" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={d.required}
          onChange={e => setD({ ...d, required: e.target.checked })} />
        <span className={'sw' + (d.required ? ' on' : '')} aria-hidden />
        <span>Required</span>
      </label>
    </Modal>
  )
}

/* ---------------- Alta y edición de un seccion ---------------- */
const SectionModal: React.FC<{
  section: SectionEditor | null
  onClose: () => void
  onSave: (b: SectionEditor) => void
}> = ({ section, onClose, onSave }) => {
  const [d, setD] = useState<SectionEditor>(section ?? {
    id: 'b' + Math.floor(performance.now() * 1000), name: '', sub: '', repeatable: false,
  })
  const [tocado, setTocado] = useState(false)
  const err = d.name.trim().length < 3 ? 'Escriba al menos 3 caracteres.' : null

  const save = () => {
    if (err) { setTocado(true); return }
    onSave({ ...d, name: d.name.trim(), sub: d.sub.trim(), repeatable: d.repeatable === true })
  }

  return (
    <Modal title={section ? `Renombrar “${section.name}”` : 'Agregar sección'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={save}>{section ? 'Guardar' : 'Agregar'}</button></>}>
      <Field label="Nombre de la sección" error={tocado ? err ?? undefined : undefined}>
        <input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && save()} placeholder="Ej. Datos de la empresa" />
      </Field>
      <Field label="Descripción" hint="Opcional. Aparece bajo el título de la sección.">
        <input value={d.sub} onChange={e => setD({ ...d, sub: e.target.value })}
          placeholder="Una línea que explique qué se pide acá" />
      </Field>
      <div className="f" style={{ marginTop: 14 }}>
        <label className="sw-fila">
          <input type="checkbox" checked={d.repeatable === true}
            onChange={e => setD({ ...d, repeatable: e.target.checked })} />
          <span className={'sw' + (d.repeatable ? ' on' : '')} aria-hidden />
          <span>Se repite</span>
        </label>
        <span className="hint">Junta, shareholders o beneficiarios, una row por person.</span>
      </div>
    </Modal>
  )
}

/* ---------------- Eliminar un seccion ---------------- */
const DeleteSection: React.FC<{
  section: Section
  fields: FormField[]
  onClose: () => void
  onDelete: () => void
}> = ({ section, fields, onClose, onDelete }) => {
  const expuestos = fields
    .map(c => standardOf(c.standard))
    .filter((e): e is StandardField => Boolean(e?.expuesto))

  return (
    <Modal title={`Eliminar “${section.name}”`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={onDelete}>Eliminar la sección</button></>}>
      <p className="dlg-txt">
        Se quitan del form los <b className="num">{fields.length}</b> fields de la sección. Esta
        company deja de pedírselos a sus clients.
      </p>

      {expuestos.length > 0 && (
        <>
          <p className="dlg-txt">
            <b style={{ color: 'var(--warn)' }}>Hay fields que otros sistemas del group leen</b> por
            la interfaz de consulta. Si dejan de pedirse, van a llegar vacíos:
          </p>
          <ul className="dlg-lista">
            {expuestos.map(e => <li key={e.key}><code>{e.column}</code> — {e.name}</li>)}
          </ul>
          <p className="dlg-txt">
            Qué hace cada sistema con ese dato se ve allá, no acá.
          </p>
        </>
      )}

      <p className="dlg-txt">
        Los caseFiles ya llenados no se tocan: siguen leyéndose con la versión que tenían.
      </p>
    </Modal>
  )
}

/* ---------------- Lista de diferencias entre dos versiones ---------------- */
const ChangeList: React.FC<{ cambios: Cambio[] }> = ({ cambios }) => {
  if (!cambios.length) return <p className="dlg-txt">La definición no cambió.</p>
  return (
    <ul className="cbs">
      {cambios.map((c, i) => (
        <li key={i} className={'cbs-i ' + c.clase}>
          <span className="cbs-s">{c.clase === 'agregado' ? '+' : c.clase === 'quitado' ? '−' : '~'}</span>
          <span>
            <b>{c.scope}</b> {c.text}
            {c.detalle && <span className="cbs-d">{c.detalle}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
