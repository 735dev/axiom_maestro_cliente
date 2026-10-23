import React, { useState } from 'react'
import { Field, Modal } from '@/shared/ui'
import type { ApiFormAppearance } from '@/shared/api/maestro'
import { PALETAS, portalStyle, initials } from './appearance'

const FONTS: { id: NonNullable<ApiFormAppearance['fuente']>; name: string; muestra: string }[] = [
  { id: 'sistema', name: 'Sistema', muestra: 'Inter' },
  { id: 'serif', name: 'Serif', muestra: 'Georgia' },
  { id: 'redondeada', name: 'Redonda', muestra: 'Avenir' },
]

const COLORES: { key: keyof ApiFormAppearance; name: string; empty: string }[] = [
  { key: 'color_primario', name: 'Botones', empty: '#16325c' },
  { key: 'color_acento', name: 'Detalle', empty: '#c4a15a' },
  { key: 'color_encabezado', name: 'Barra', empty: '#0d1c33' },
  { key: 'color_fondo', name: 'Fondo', empty: '#f6f3ec' },
  { key: 'color_texto', name: 'Texto', empty: '#1b2330' },
]

const limpiar = (value: ApiFormAppearance): ApiFormAppearance => {
  const salida: ApiFormAppearance = {}
  ;(Object.keys(value) as (keyof ApiFormAppearance)[]).forEach(key => {
    const pieza = value[key]
    if (pieza == null || String(pieza).trim() === '') return
    salida[key] = String(pieza).trim() as never
  })
  return salida
}

export const VistaBrand: React.FC<{ appearance: ApiFormAppearance; name: string }> = ({ appearance, name }) => {
  const estilo = portalStyle(appearance)
  return (
    <div className="portal marca marca-frame" style={estilo}>
      <header className="portal-top">
        <div className="portal-brand">
          {appearance.logo_url
            ? <img className="portal-logo-img" src={appearance.logo_url} alt="" />
            : <span className="portal-mark">{initials(name)}</span>}
          <div>
            <b>{name}</b>
            <span>{appearance.subtitulo || 'Registro de clientes'}</span>
          </div>
        </div>
        <div className="portal-rif"><button className="btn sm" type="button">Continuar</button></div>
      </header>
      <div className="portal-body">
        <div className="portal-form">
          <div className="portal-intro">
            <span className="portal-kicker">Form DIGITAL</span>
            <h1>{appearance.titulo || 'Registro de cliente'}</h1>
            <p>{appearance.texto_introduccion || 'El cliente verá este texto debajo del título, antes de empezar.'}</p>
          </div>
          <div className="portal-section-card">
            <div className="card-h"><h3>Identificación</h3></div>
            <div className="card-b">
              <div className="f"><label>Document</label><input readOnly value="" placeholder="J-00000000-0" /></div>
            </div>
          </div>
          <button className="btn pri" type="button">Guardar y continuar</button>
        </div>
      </div>
    </div>
  )
}

export const FormAppearance: React.FC<{
  value: ApiFormAppearance
  companyName: string
  readOnly: boolean
  onClose: () => void
  onSave: (value: ApiFormAppearance) => void
}> = ({ value, companyName, readOnly, onClose, onSave }) => {
  const [d, setD] = useState<ApiFormAppearance>(value)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const poner = (patch: Partial<ApiFormAppearance>) => setD(prev => ({ ...prev, ...patch }))
  const aplicarPaleta = (paleta: ApiFormAppearance) => setD(prev => ({ ...prev, ...paleta }))

  const leerLogo = (file: File | undefined) => {
    setErrorLogo(null)
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      setErrorLogo('Use png, jpeg, gif o webp.')
      return
    }
    if (file.size > 140_000) {
      setErrorLogo('El logo debe pesar menos de 140 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => poner({ logo_url: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <Modal title="Apariencia del formulario" wide onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        {!readOnly && <button className="btn" onClick={() => setD({})}>Remove brand</button>}
        {!readOnly && <button className="btn pri" onClick={() => onSave(limpiar(d))}>Guardar</button>}
      </>}>
      <div className="marca-estudio">
        <div>
          <p className="dlg-txt">Elija una base y ajústela. El recuadro de la derecha es el portal.</p>
          <div className="marca-paletas">
            {PALETAS.map(paleta => (
              <button key={paleta.id} type="button" className="marca-paleta" disabled={readOnly}
                onClick={() => aplicarPaleta(paleta.appearance)}>
                <i style={{ background: `linear-gradient(90deg, ${paleta.appearance.color_encabezado} 0 46%, ${paleta.appearance.color_primario} 46% 74%, ${paleta.appearance.color_acento} 74%)` }} />
                <b>{paleta.name}</b>
                <span>{paleta.nota}</span>
              </button>
            ))}
          </div>

          <div className="marca-logo">
            {d.logo_url
              ? <img src={d.logo_url} alt="" />
              : <span className="portal-mark">{initials(companyName)}</span>}
            <div>
              <Field label="Logo" error={errorLogo ?? undefined} hint="PNG, JPEG, GIF o WebP, hasta 140 KB. También vale una dirección http(s).">
                <input value={d.logo_url?.startsWith('data:') ? '' : (d.logo_url ?? '')} disabled={readOnly}
                  placeholder="https://…" onChange={e => poner({ logo_url: e.target.value || null })} />
              </Field>
              <div className="marca-logo-a">
                <label className="btn sm">{d.logo_url ? 'Cambiar archivo' : 'Subir archivo'}
                  <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={readOnly}
                    onChange={e => leerLogo(e.target.files?.[0])} />
                </label>
                {d.logo_url && !readOnly && <button className="btn sm" type="button" onClick={() => poner({ logo_url: null })}>Remove</button>}
              </div>
            </div>
          </div>

          <Field label="Título del formulario">
            <input value={d.titulo ?? ''} disabled={readOnly} maxLength={120}
              placeholder="Registro de cliente" onChange={e => poner({ titulo: e.target.value })} />
          </Field>
          <Field label="Línea del encabezado">
            <input value={d.subtitulo ?? ''} disabled={readOnly} maxLength={80}
              placeholder="Registro de clientes" onChange={e => poner({ subtitulo: e.target.value })} />
          </Field>
          <Field label="Texto de introducción">
            <textarea rows={3} value={d.texto_introduccion ?? ''} disabled={readOnly} maxLength={500}
              onChange={e => poner({ texto_introduccion: e.target.value })} />
          </Field>

          <div className="marca-fuentes">
            {FONTS.map(source => (
              <button key={source.id} type="button" disabled={readOnly}
                className={'marca-fuente' + ((d.fuente || 'sistema') === source.id ? ' on' : '')}
                onClick={() => poner({ fuente: source.id })}>
                <b style={portalStyle({ fuente: source.id })}>{source.muestra}</b>
                <span>{source.name}</span>
              </button>
            ))}
          </div>

          <div className="marca-colores">
            {COLORES.map(color => (
              <label key={color.key}>
                <input type="color" disabled={readOnly}
                  value={(d[color.key] as string) || color.empty}
                  onChange={e => poner({ [color.key]: e.target.value })} />
                <span>{color.name}</span>
              </label>
            ))}
          </div>
        </div>
        <VistaBrand appearance={d} name={companyName} />
      </div>
    </Modal>
  )
}
