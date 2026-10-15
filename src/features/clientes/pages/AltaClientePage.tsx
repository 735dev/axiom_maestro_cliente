import React, { useEffect, useMemo, useState } from 'react'
import { maestroApi, type ApiFormulario } from '@/shared/api/maestro'
import { NuevoClientePage } from './NuevoClientePage'
import { RenderCampo, campoVisible } from '@/features/plataforma/formulario/RenderCampo'
import type { Campo, Seccion, TipoCampo } from '@/features/plataforma/formulario/tipos'
import { mostrarAviso } from '@/shared/store/slices/uiSlice'
import { useAppDispatch } from '@/shared/store/hooks'

type Props = { onListo: () => void; onCancelar?: () => void }

const tipoDesdeApi = (tipo: string): TipoCampo => ({
  si_no: 'si-no', seleccion_multiple: 'multiple', correo: 'email', documento_identidad: 'documento',
}[tipo] as TipoCampo ?? tipo as TipoCampo)

const preparar = (formulario: ApiFormulario) => {
  const secciones: Seccion[] = formulario.secciones.slice().sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, nombre: s.nombre, sub: '' }))
  const campos: Campo[] = formulario.secciones.flatMap(s => s.campos.slice().sort((a, b) => a.orden - b.orden).map(c => ({
    id: c.codigo, seccion: s.id, etiqueta: c.etiqueta, tipo: tipoDesdeApi(c.tipo_campo), obligatorio: c.obligatorio,
    estandar: c.es_estandar ? c.codigo : undefined, catalogo: c.catalogo_ref ?? undefined,
    opciones: c.opciones ?? [], ancho: c.ancho as Campo['ancho'],
  })))
  return { secciones, campos }
}

/** Alta interna. Si hay formulario publicado, usa esos campos. Si no, el asistente fijo. */
export const AltaClientePage: React.FC<Props> = ({ onListo, onCancelar }) => {
  const dispatch = useAppDispatch()
  const [formulario, setFormulario] = useState<ApiFormulario | null | undefined>(undefined)
  const [valores, setValores] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    maestroApi.formularioVigente().then(setFormulario).catch(() => setFormulario(null))
  }, [])

  const preparado = useMemo(() => (formulario && formulario.secciones.some(s => s.campos.length) ? preparar(formulario) : null), [formulario])

  if (formulario === undefined) return <p>Cargando formulario…</p>
  if (!preparado) return <NuevoClientePage onListo={onListo} onCancelar={onCancelar} />

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const texto = (k: string) => {
        const valor = valores[k]
        return valor == null ? '' : String(valor).trim()
      }
      const tipo = texto('tipo_persona').toLowerCase()
      const natural = tipo === 'natural' || tipo === 'persona natural'
      const nombre = texto('nombre') || texto('razon_social')
      const partes = nombre.split(/\s+/).filter(Boolean)
      const payload: Record<string, unknown> = {
        tipo_persona: natural ? 'natural' : 'juridica',
        documento: texto('documento') || texto('rif'),
        razon_social: natural ? undefined : (texto('razon_social') || nombre || undefined),
        primer_nombre: natural ? (texto('primer_nombre') || partes[0]) : undefined,
        primer_apellido: natural ? (texto('primer_apellido') || partes[1] || 'Sin apellido') : undefined,
        sector_economico: texto('sector') || texto('sector_economico') || undefined,
        actividad_economica: texto('actividad') || texto('actividad_economica') || undefined,
        email: texto('correo') || texto('email') || undefined,
        telefono: texto('telefono') || undefined,
        direccion: texto('domicilio') || texto('direccion') || undefined,
        origen_fondos: texto('origen_fondos') || undefined,
        ingresos_estimados: texto('ingresos') || texto('ingresos_estimados') || undefined,
        frecuencia_operacion: texto('frecuencia') || texto('frecuencia_operacion') || undefined,
        es_pep: valores.cliente_pep === true || valores.cliente_pep === 'si' || valores.es_pep === true || valores.es_pep === 'si',
        respuestas_portal: valores,
      }
      if (!payload.documento) throw new Error('Indique el documento.')
      if (!natural && !payload.razon_social) throw new Error('Indique la razón social.')
      await maestroApi.crearCliente(payload)
      dispatch(mostrarAviso({ tipo: 'info', texto: 'Cliente registrado.' }))
      onListo()
    } catch (e) {
      const detalle = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      setError(typeof detalle === 'string' ? detalle : e instanceof Error ? e.message : 'No fue posible registrar el cliente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      {error && <div className="val-err">{error}</div>}
      {preparado.secciones.map(seccion => (
        <section key={seccion.id}>
          <div className="sec">{seccion.nombre}</div>
          <div className="grid">
            {preparado.campos.filter(c => c.seccion === seccion.id && campoVisible(c, valores, preparado.campos)).map(c => (
              <RenderCampo key={c.id} campo={c} valor={valores[c.id]} catalogos={{}}
                onChange={valor => setValores(x => ({ ...x, [c.id]: valor }))} />
            ))}
          </div>
        </section>
      ))}
      <div className="btn-row" style={{ marginTop: 16 }}>
        {onCancelar && <button className="btn" onClick={onCancelar}>Cancelar</button>}
        <button className="btn pri" disabled={guardando} onClick={() => void guardar()}>
          {guardando ? 'Guardando…' : 'Registrar cliente'}
        </button>
      </div>
    </div>
  )
}
