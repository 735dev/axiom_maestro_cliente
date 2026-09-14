import React, { useMemo, useState } from 'react'
import { Card, Field, Pill } from '@/shared/ui'
import { maestroApi, type ApiFormulario, type ApiPortalRegistro } from '@/shared/api/maestro'
import { campoVisible, RenderCampo } from '@/features/plataforma/formulario/RenderCampo'
import { columnasSeccion } from '@/shared/utils/anchoGrid'
import { anchoDe } from '@/features/plataforma/formulario/tipos'
import type { Campo, Seccion, TipoCampo } from '@/features/plataforma/formulario/tipos'

type Props = {
  slug: string
  formulario: ApiFormulario
  respuestasIniciales?: Record<string, unknown>
  tokenInicial?: string | null
  rifInicial?: string
  onGuardado?: (registro: ApiPortalRegistro) => void
  onListo: () => void
}

const tipoDesdeApi = (tipo: string): TipoCampo => ({
  si_no: 'si-no', seleccion_multiple: 'multiple', correo: 'email',
  documento_identidad: 'documento', calculado: 'calculado',
}[tipo] as TipoCampo ?? tipo as TipoCampo)

const preparar = (formulario: ApiFormulario) => {
  const secciones: Seccion[] = formulario.secciones.slice().sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, nombre: s.nombre, sub: '' }))
  const campos: Campo[] = formulario.secciones.flatMap(s => s.campos.slice().sort((a, b) => a.orden - b.orden).map(c => ({
    id: c.codigo, seccion: s.id, etiqueta: c.etiqueta, tipo: tipoDesdeApi(c.tipo_campo), obligatorio: c.obligatorio,
    estandar: c.es_estandar ? c.codigo : undefined, catalogo: c.catalogo_ref ?? undefined,
    opciones: c.opciones ?? [], ancho: c.ancho as Campo['ancho'],
    condicion: c.condiciones_visibilidad ? {
      enlace: c.condiciones_visibilidad.enlace,
      condiciones: c.condiciones_visibilidad.condiciones.map(x => ({ campoId: x.campo_codigo, operador: x.operador as any, valor: x.valor ?? undefined })),
    } : undefined,
  })))
  return { secciones, campos }
}

export const FormularioDinamicoPortal: React.FC<Props> = ({ slug, formulario, respuestasIniciales = {}, tokenInicial, rifInicial = '', onGuardado, onListo }) => {
  const { secciones, campos } = useMemo(() => preparar(formulario), [formulario])
  const [valores, setValores] = useState<Record<string, unknown>>(() => {
    const iniciales: Record<string, unknown> = { ...respuestasIniciales, rif: rifInicial }
    if (iniciales.documento === undefined && iniciales.rif) iniciales.documento = iniciales.rif
    return iniciales
  })
  const [paso, setPaso] = useState(0)
  const [token, setToken] = useState(tokenInicial ?? null)
  const [tocado, setTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actual = secciones[paso]
  const camposActuales = campos.filter(c => c.seccion === actual?.id)
  const visibles = campos.filter(c => campoVisible(c, valores, campos))
  const faltantes = visibles.filter(c => {
    const valor = valores[c.id]
    return c.obligatorio && (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0))
  })
  const completo = faltantes.length === 0
  const faltantesActuales = camposActuales.filter(c => {
    const valor = valores[c.id]
    return campoVisible(c, valores, campos) && c.obligatorio && (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0))
  })
  const tieneDocumento = campos.some(c => c.id === 'documento' || c.id === 'rif')

  const obtenerRif = () => String(
    valores.rif || valores.documento || valores['cliente.documento'] || ''
  ).trim().toUpperCase()

  const asegurarToken = async () => {
    if (token) return token
    const rif = obtenerRif()
    if (!rif) throw new Error('Indique el RIF antes de guardar el formulario.')
    const registro = await maestroApi.iniciarPortal(slug, rif)
    if (!registro.token) throw new Error('Este RIF ya tiene un expediente enviado.')
    setToken(registro.token)
    return registro.token
  }

  const guardar = async (final: boolean) => {
    setTocado(true); setError(null)
    if ((!final && faltantesActuales.length > 0) || (final && !completo)) return
    setGuardando(true)
    try {
      const auth = await asegurarToken()
      const registro = await maestroApi.guardarPasoPortal(slug, auth, final ? secciones.length : paso + 1, valores)
      onGuardado?.(registro)
      if (final) onListo()
      else setPaso(p => Math.min(p + 1, secciones.length - 1))
    } catch (e: any) {
      setError(e?.response?.data?.detail?.message ?? e?.message ?? 'No fue posible guardar el avance.')
    } finally { setGuardando(false) }
  }

  if (!secciones.length) return <Card><Pill k="warn">Formulario no configurado</Pill><p>La empresa todavía no ha publicado campos para este registro.</p></Card>
  return <>
    {error && <div className="portal-alert">{error}</div>}
    <div className="portal-wizard">
      <aside className="portal-sidebar">
        <nav className="portal-steps" aria-label="Pasos del registro">
          {secciones.map((s, i) => <button key={s.id} className={(i === paso ? 'on ' : '') + (i < paso ? 'done' : '')} disabled={i > paso} onClick={() => i <= paso && setPaso(i)}>
            <span>{i < paso ? '✓' : i + 1}</span><b>{s.nombre}</b><small>{i === paso ? 'En progreso' : i < paso ? 'Completado' : 'Pendiente'}</small>
          </button>)}
        </nav>
        <p className="portal-sidebar-note">Puedes guardar tu avance y continuar después usando tu RIF.</p>
      </aside>
      <main className="portal-current">
    {!tieneDocumento && <div className="portal-rif-card"><Field label="RIF del cliente *" hint="Lo usamos para guardar tu avance y retomar el registro después.">
      <input value={String(valores.rif ?? '')} placeholder="J-00000000-0" onChange={e => setValores(x => ({ ...x, rif: e.target.value.toUpperCase() }))} />
    </Field></div>}
    <div className="portal-section-card"><Card title={actual.nombre} sub="Completa la información solicitada. Los campos marcados con * son obligatorios.">
      <div className={`form-grid cols-${columnasSeccion(camposActuales.filter(c => campoVisible(c, valores, campos)).map(anchoDe))}`}>
        {camposActuales.filter(c => campoVisible(c, valores, campos)).map(c => <RenderCampo key={c.id} campo={c} valor={valores[c.id]} catalogos={{}} error={tocado && c.obligatorio && faltantes.includes(c) ? 'Este campo es obligatorio.' : undefined} onChange={v => setValores(x => ({ ...x, [c.id]: v, ...(c.id === 'documento' || c.id === 'cliente.documento' || c.id === 'rif' ? { rif: v } : {}) }))} />)}
      </div>
      {!camposActuales.length && <p>Esta sección no tiene campos.</p>}
    </Card></div>
    <div className="portal-actions"><div className="btn-row" style={{ justifyContent: 'space-between' }}>
      <span className="portal-save-note">Tus datos se guardan de forma segura al continuar.</span>
      <span className="btn-row">
        {paso > 0 && <button className="btn" onClick={() => setPaso(p => p - 1)}>Atrás</button>}
        {paso < secciones.length - 1
          ? <button className="btn pri" disabled={guardando} onClick={() => guardar(false)}>Guardar y continuar</button>
          : <button className="btn pri" disabled={guardando} onClick={() => guardar(true)}>Enviar registro</button>}
      </span>
    </div></div>
      </main>
    </div>
  </>
}
