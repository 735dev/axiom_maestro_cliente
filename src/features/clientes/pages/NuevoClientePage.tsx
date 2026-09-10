import React, { useState } from 'react'
import { SERVICIOS, RANGOS_INGRESO, type Persona } from '../types/cliente.types'
import { Card, Field, Pill, Paginador } from '@/shared/ui'
import { usePaginacion } from '@/shared/hooks/usePaginacion'
import * as V from '../schemas/cliente.schema'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectCatalogosDe } from '@/features/catalogos/store/catalogosSlice'
import { crearCliente } from '../store/clientesSlice'
import { columnasSeccion } from '@/shared/utils/anchoGrid'

/**
 * Cuántas columnas le tocan a un bloque de `n` campos cortos. Este asistente
 * no tiene una definición de `Campo` con `ancho` propio —eso es del
 * formulario configurable de plataforma—, pero comparte el mismo criterio:
 * más campos por acomodar, más columnas, hasta 4.
 */
const grilla = (n: number) => `form-grid cols-${columnasSeccion(Array(n).fill('medio'))}`

const PASOS = [
  { n: 1, label: 'Identificación', sub: 'Quién es la empresa' },
  { n: 2, label: 'Contacto', sub: 'Dónde localizarla' },
  { n: 3, label: 'Estructura accionaria', sub: 'Quién está detrás' },
  { n: 4, label: 'Perfil financiero', sub: 'Qué declara mover' },
]

const VACIO = {
  razonSocial: '', rif: '', tipo: 'Compañía Anónima',
  registroNumero: '', registroTomo: '', registroFolio: '',
  capitalSuscrito: '', capitalActual: '',
  sector: 'Banca y servicios financieros',
  domicilio: '', telefono: '', correo: '', web: '', redes: '',
  actividad: '', actividadDetalle: '',
  origenFondos: 'Operaciones comerciales propias', ingresos: '$1M – $5M',
  montoDeclarado: '', frecuencia: 'Mensual',
}

/** `onCancelar` opcional: en el portal público no hay a dónde volver. */
export const NuevoClientePage: React.FC<{ onListo: () => void; onCancelar?: () => void }> = ({ onListo, onCancelar }) => {
  const [paso, setPaso] = useState(1)
  // El asistente es secuencial: no se abre un bloque sin cerrar el anterior.
  const [desbloqueado, setDesbloqueado] = useState(1)
  const [d, setD] = useState(VACIO)
  // Un campo solo muestra su error después de que el usuario lo tocó.
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const marcar = (k: string) => () => setTocado(t => ({ ...t, [k]: true }))
  const [personas, setPersonas] = useState<Persona[]>([])
  const [servicios, setServicios] = useState<string[]>([])
  const dispatch = useAppDispatch()
  const empresa = useEmpresaActual()
  const usuario = useAppSelector(s => s.auth.usuario)
  const rifsExistentes = useAppSelector(s => s.clientes.lista.map(c => c.rif))
  const CATALOGOS = useAppSelector(selectCatalogosDe(empresa?.id))

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value })

  // El RIF se normaliza a mayúscula: escribir "j-123..." es correcto.
  const setRif = (e: React.ChangeEvent<HTMLInputElement>) =>
    setD({ ...d, rif: e.target.value.toUpperCase() })

  const accionistas = personas.filter(p => p.rol === 'Accionista')
  const suma = accionistas.reduce((a, p) => a + (p.porcentaje || 0), 0)
  const hayRepresentante = personas.some(p => p.rol === 'Representante legal')

  // Errores por campo. null = válido.
  const err = {
    razonSocial: V.razonSocial(d.razonSocial),
    rif: V.rif(d.rif, rifsExistentes),
    registroNumero: d.registroNumero.trim() && !/^\d+$/.test(d.registroNumero.trim()) ? 'Solo números.' : null,
    registroTomo: d.registroTomo.trim() && !/^[\dA-Za-z-]+$/.test(d.registroTomo.trim()) ? 'Ejemplo: 42-A' : null,
    registroFolio: d.registroFolio.trim() && !/^\d+$/.test(d.registroFolio.trim()) ? 'Solo números.' : null,
    capitalSuscrito: V.montoOpcional(d.capitalSuscrito),
    capitalActual: V.montoOpcional(d.capitalActual),
    domicilio: V.domicilio(d.domicilio),
    telefono: V.telefono(d.telefono),
    correo: V.correo(d.correo),
    web: V.web(d.web),
    actividad: V.seleccion(d.actividad, 'Seleccione la actividad económica'),
    actividadDetalle: d.actividadDetalle.trim().length > 0 && d.actividadDetalle.trim().length < 15
      ? 'Describa la actividad con más detalle.' : null,
    montoDeclarado: V.monto(d.montoDeclarado, 'El monto a movilizar'),
  } as Record<string, string | null>

  // Solo se muestra el error si el campo fue tocado o si ya se intentó avanzar.
  const e = (k: string) => (tocado[k] ? err[k] ?? undefined : undefined)

  const sinErrores = (ks: string[]) => ks.every(k => !err[k])

  const valido: Record<number, boolean> = {
    1: sinErrores(['razonSocial', 'rif', 'registroNumero', 'registroTomo', 'registroFolio', 'capitalSuscrito', 'capitalActual']),
    2: sinErrores(['domicilio', 'telefono', 'correo', 'web']),
    3: accionistas.length > 0 && hayRepresentante && suma <= 100,
    4: sinErrores(['actividad', 'actividadDetalle', 'montoDeclarado']),
  }
  const completo = Object.values(valido).every(Boolean)

  /** Al pasar de bloque, se marcan sus campos como tocados para que los errores salgan. */
  const CAMPOS_PASO: Record<number, string[]> = {
    1: ['razonSocial', 'rif', 'registroNumero', 'registroTomo', 'registroFolio', 'capitalSuscrito', 'capitalActual'],
    2: ['domicilio', 'telefono', 'correo', 'web'],
    3: [],
    4: ['actividad', 'actividadDetalle', 'montoDeclarado'],
  }
  /** Solo se puede volver a un bloque ya desbloqueado. Hacia adelante, ver avanzar(). */
  const irA = (n: number) => { if (n <= desbloqueado) setPaso(n) }

  /** Avanza si el bloque actual está completo; si no, marca sus campos y se queda. */
  const avanzar = () => {
    setTocado(t => ({ ...t, ...Object.fromEntries(CAMPOS_PASO[paso].map(k => [k, true])) }))
    if (!valido[paso]) return
    const siguiente = Math.min(paso + 1, PASOS.length)
    setDesbloqueado(d => Math.max(d, siguiente))
    setPaso(siguiente)
  }

  const guardar = () => {
    if (!completo) return
    dispatch(crearCliente({
      cliente: {
        ...d,
        empresaId: empresa?.id ?? '',
        montoDeclarado: V.formatearMonto(d.montoDeclarado),
        capitalSuscrito: d.capitalSuscrito ? V.formatearMonto(d.capitalSuscrito) : '',
        capitalActual: d.capitalActual ? V.formatearMonto(d.capitalActual) : '',
        registro: [d.registroNumero && `N.º ${d.registroNumero}`, d.registroTomo && `Tomo ${d.registroTomo}`, d.registroFolio && `Folio ${d.registroFolio}`].filter(Boolean).join(', '),
        servicios,
        estado: 'PENDIENTE',
        registradoPor: usuario?.nombre ?? '—',
        fechaRegistro: new Date().toISOString().slice(0, 10),
        personas,
      },
      usuario: usuario?.nombre ?? '—', rol: usuario?.rol ?? '—',
    }))
    onListo()
  }

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 14 }}>
        {onCancelar && <button className="btn sm" onClick={onCancelar}>← Cancelar y volver</button>}
      </div>

      <div className="nc-wizard">
        {/* riel de pasos: columna a la izquierda en pantallas anchas, fila
            horizontal con scroll arriba del contenido en móvil (ver .nc-wizard) */}
        <div className="card nc-pasos" style={{ marginBottom: 0 }}>
          <div className="card-b" style={{ padding: 10 }}>
            {PASOS.map(p => {
              const bloqueado = p.n > desbloqueado
              const listo = valido[p.n] && p.n < paso
              const estado = listo ? 'ok' : p.n === paso ? 'actual' : bloqueado ? 'bloq' : 'pend'
              return (
                <button key={p.n} className="nc-paso" onClick={() => irA(p.n)} disabled={bloqueado}
                  title={bloqueado ? 'Complete el bloque anterior para continuar' : undefined}
                  style={{
                    cursor: bloqueado ? 'not-allowed' : 'pointer',
                    opacity: bloqueado ? .45 : 1,
                    background: p.n === paso ? 'var(--surface)' : 'transparent',
                    boxShadow: p.n === paso ? 'inset 2px 0 0 var(--pri)' : 'none',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="num" style={{
                      width: 19, height: 19, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      fontSize: 10.5, flex: '0 0 19px',
                      background: estado === 'ok' ? 'var(--ok)' : estado === 'actual' ? 'var(--pri)' : 'var(--border)',
                      color: estado === 'ok' || estado === 'actual' ? '#fff' : 'var(--muted)',
                    }}>{estado === 'ok' ? '✓' : estado === 'bloq' ? '·' : p.n}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.label}</div>
                      <div className="nc-paso-sub" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {estado === 'ok' ? 'Completo' : estado === 'bloq' ? 'Bloqueado' : p.sub}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {paso === 1 && (
            <Card title="Identificación de la empresa" sub="Los datos con los que se identifica al cliente ante la Superintendencia.">
              <div className={grilla(4)}>
                <Field label="Razón social" error={e('razonSocial')}>
                  <input value={d.razonSocial} onChange={set('razonSocial')} onBlur={marcar('razonSocial')} placeholder="Nombre legal completo" />
                </Field>
                <Field label="RIF" error={e('rif')} hint="Se admite en minúscula; el sistema lo normaliza.">
                  <input value={d.rif} onChange={setRif} onBlur={marcar('rif')} placeholder="J-00000000-0" />
                </Field>
                <Field label="Tipo de empresa jurídica">
                  <select value={d.tipo} onChange={set('tipo')}>
                    {(CATALOGOS.tipo_empresa ?? []).map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Sector económico">
                  <select value={d.sector} onChange={set('sector')}>
                    {(CATALOGOS.sector ?? []).map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>

              <div className="sec">Registro mercantil</div>
              <div className={grilla(3)}>
                <Field label="Número" error={e('registroNumero')}><input value={d.registroNumero} onChange={set('registroNumero')} onBlur={marcar('registroNumero')} placeholder="77" /></Field>
                <Field label="Tomo" error={e('registroTomo')}><input value={d.registroTomo} onChange={set('registroTomo')} onBlur={marcar('registroTomo')} placeholder="42-A" /></Field>
                <Field label="Folio" error={e('registroFolio')}><input value={d.registroFolio} onChange={set('registroFolio')} onBlur={marcar('registroFolio')} placeholder="121" /></Field>
              </div>
              <div className={grilla(2)}>
                <Field label="Capital social suscrito" error={e('capitalSuscrito')} hint="Solo números. Opcional.">
                  <input value={d.capitalSuscrito} onChange={set('capitalSuscrito')} onBlur={marcar('capitalSuscrito')} placeholder="Según documento constitutivo" /></Field>
                <Field label="Capital actual" error={e('capitalActual')} hint="Solo números. Opcional.">
                  <input value={d.capitalActual} onChange={set('capitalActual')} onBlur={marcar('capitalActual')} placeholder="Según última acta de asamblea" /></Field>
              </div>
            </Card>
          )}

          {paso === 2 && (
            <Card title="Contacto y domicilio" sub="Por dónde Transvalor se comunica con el cliente.">
              <div className={grilla(5)}>
                <Field label="Domicilio fiscal" error={e('domicilio')}>
                  <input value={d.domicilio} onChange={set('domicilio')} onBlur={marcar('domicilio')} placeholder="Dirección completa" /></Field>
                <Field label="Teléfono" error={e('telefono')}>
                  <input value={d.telefono} onChange={set('telefono')} onBlur={marcar('telefono')} placeholder="+58 212 000-0000" /></Field>
                <Field label="Correo corporativo" error={e('correo')}>
                  <input value={d.correo} onChange={set('correo')} onBlur={marcar('correo')} placeholder="contacto@empresa.com" /></Field>
                <Field label="Página web" error={e('web')} hint="Opcional.">
                  <input value={d.web} onChange={set('web')} onBlur={marcar('web')} placeholder="www.empresa.com" /></Field>
                <Field label="Redes sociales"><input value={d.redes} onChange={set('redes')} placeholder="Perfil oficial, si tiene" /></Field>
              </div>
            </Card>
          )}

          {paso === 3 && (
            <EstructuraAccionaria personas={personas} setPersonas={setPersonas} suma={suma}
              hayRepresentante={hayRepresentante} />
          )}

          {paso === 4 && (
            <Card title="Perfil financiero y transaccional" sub="Lo que el cliente declara. Es la base contra la que después se compara.">
              <div className={grilla(2)}>
                <Field label="Actividad económica" error={e('actividad')}>
                  <select value={d.actividad} onChange={set('actividad')} onBlur={marcar('actividad')}>
                    <option value="">Seleccione…</option>
                    {(CATALOGOS.actividad ?? []).map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Origen de fondos">
                  <select value={d.origenFondos} onChange={set('origenFondos')}>
                    {(CATALOGOS.origen_fondos ?? []).map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Descripción detallada de la actividad" error={e('actividadDetalle')} hint="Opcional, pero si la escribe debe ser descriptiva.">
                <textarea rows={3} value={d.actividadDetalle} onChange={set('actividadDetalle')} onBlur={marcar('actividadDetalle')}
                  placeholder="Qué hace la empresa en concreto" />
              </Field>

              <div className="sec">Perfil transaccional</div>
              <div className={grilla(3)}>
                <Field label="Rango de ingresos anuales">
                  <select value={d.ingresos} onChange={set('ingresos')}>
                    {RANGOS_INGRESO.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Monto que espera movilizar" error={e('montoDeclarado')} hint="Solo números. Ejemplo: 250000">
                  <input value={d.montoDeclarado} onChange={set('montoDeclarado')} onBlur={marcar('montoDeclarado')} placeholder="250000" /></Field>
                <Field label="Frecuencia">
                  <select value={d.frecuencia} onChange={set('frecuencia')}>
                    {['Semanal', 'Quincenal', 'Mensual', 'Trimestral'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>

              <div className="sec">Servicios que contrata</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SERVICIOS.map(s => (
                  <label key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', cursor: 'pointer',
                    border: '1px solid ' + (servicios.includes(s) ? 'var(--pri)' : 'var(--border)'),
                    borderRadius: 999, fontSize: 12.5,
                    background: servicios.includes(s) ? 'color-mix(in srgb,var(--pri) 8%,var(--bg))' : 'var(--bg)',
                  }}>
                    <input type="checkbox" checked={servicios.includes(s)} style={{ accentColor: 'var(--pri)' }}
                      onChange={e => setServicios(e.target.checked ? [...servicios, s] : servicios.filter(x => x !== s))} />
                    {s}
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* pie de navegación */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
                <span className="num" style={{ color: 'var(--muted)' }}>Bloque {paso} de {PASOS.length}</span>
                {valido[paso]
                  ? <Pill k="ok">Este bloque está completo</Pill>
                  : <span style={{ color: 'var(--muted)' }}>Complete este bloque para continuar</span>}
              </div>
              <div className="btn-row">
                {paso > 1 && <button className="btn" onClick={() => irA(paso - 1)}>Atrás</button>}
                {paso < PASOS.length
                  ? <button className="btn pri" onClick={avanzar} disabled={!valido[paso]}>
                      Guardar y continuar
                    </button>
                  : <button className="btn pri" onClick={guardar} disabled={!completo}>Crear cliente</button>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/* ---------------- Paso 3: estructura accionaria ---------------- */
const NUEVA: Omit<Persona, 'id'> = {
  nombre: '', documento: '', rol: 'Accionista', nacionalidad: 'Venezolana', pep: false,
}

const EstructuraAccionaria: React.FC<{
  personas: Persona[]; setPersonas: (p: Persona[]) => void; suma: number; hayRepresentante: boolean
}> = ({ personas, setPersonas, suma, hayRepresentante }) => {
  const [f, setF] = useState<Omit<Persona, 'id'> & { porcentajeTxt: string }>({ ...NUEVA, porcentajeTxt: '' })
  const personasPag = usePaginacion(personas)
  const listo = f.nombre.trim().length > 3 && f.documento.trim().length > 4

  const agregar = () => {
    setPersonas([...personas, {
      ...f, id: 'p' + Date.now(),
      porcentaje: f.rol === 'Accionista' && f.porcentajeTxt ? Number(f.porcentajeTxt) : undefined,
      cargo: f.rol === 'Representante legal' ? f.cargo : undefined,
      pepCargo: f.pep ? f.pepCargo : undefined,
    }])
    setF({ ...NUEVA, porcentajeTxt: '' })
  }

  return (
    <>
      <Card title="Estructura legal y accionaria"
        sub="Quién está detrás de la empresa. Es lo que el screening necesita para no quedarse en la fachada.">
        {personas.length > 0 ? (
          <>
            <table>
              <thead><tr><th>Nombre</th><th>Documento</th><th>Rol</th><th>%</th><th>Nacionalidad</th><th>PEP</th><th /></tr></thead>
              <tbody>
                {personasPag.visibles.map(p => (
                  <tr key={p.id}>
                    <td>{p.nombre}{p.cargo && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.cargo}</div>}</td>
                    <td className="num">{p.documento}</td><td>{p.rol}</td>
                    <td className="num">{p.porcentaje ? p.porcentaje + '%' : '—'}</td>
                    <td>{p.nacionalidad}</td>
                    <td>{p.pep ? <Pill k="warn">Sí</Pill> : <span style={{ color: 'var(--muted)' }}>No</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn sm" onClick={() => setPersonas(personas.filter(x => x.id !== p.id))}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginador p={personasPag.paginador} etiqueta="personas" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Suma de participación accionaria</span>
              <div className="bar" style={{ flex: 1, maxWidth: 240 }}>
                <i style={{ width: Math.min(suma, 100) + '%', background: suma > 100 ? 'var(--bad)' : 'var(--pri)' }} />
              </div>
              <b className="num" style={{ color: suma > 100 ? 'var(--bad)' : 'var(--fg)' }}>{suma}%</b>
              {suma > 100 && <Pill k="bad">Excede 100%</Pill>}
              {!hayRepresentante && <Pill k="warn">Falta un representante legal</Pill>}
            </div>
          </>
        ) : (
          <div className="empty">
            Sin personas vinculadas. Se necesita al menos <b>un accionista</b> y <b>un representante legal</b>.
          </div>
        )}
      </Card>

      <Card title="Agregar persona vinculada">
        <div className={grilla(f.rol === 'Accionista' || f.rol === 'Representante legal' ? 5 : 4)}>
          <Field label="Nombre completo"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Nombres y apellidos" /></Field>
          <Field label="Documento"><input value={f.documento} onChange={e => setF({ ...f, documento: e.target.value })} placeholder="V-00.000.000" /></Field>
          <Field label="Rol">
            <select value={f.rol} onChange={e => setF({ ...f, rol: e.target.value as Persona['rol'] })}>
              <option>Accionista</option><option>Beneficiario final</option><option>Representante legal</option>
            </select>
          </Field>
          <Field label="Nacionalidad">
            <select value={f.nacionalidad} onChange={e => setF({ ...f, nacionalidad: e.target.value })}>
              <option>Venezolana</option><option>Portuguesa</option><option>Española</option>
              <option>Colombiana</option><option>Rusa</option><option>Otra</option>
            </select>
          </Field>
          {f.rol === 'Accionista' &&
            <Field label="Participación (%)"><input value={f.porcentajeTxt} onChange={e => setF({ ...f, porcentajeTxt: e.target.value })} placeholder="0 a 100" /></Field>}
          {f.rol === 'Representante legal' &&
            <Field label="Cargo"><input value={f.cargo ?? ''} onChange={e => setF({ ...f, cargo: e.target.value })} placeholder="Cargo que ocupa" /></Field>}
        </div>

        <div style={{ marginTop: 14, padding: 13, background: 'var(--surface)', borderRadius: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13.5 }}>
            <input type="checkbox" checked={f.pep} onChange={e => setF({ ...f, pep: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--pri)' }} />
            <b>¿Es persona expuesta políticamente (PEP)?</b>
          </label>
          {f.pep ? (
            <div className={grilla(2)} style={{ marginTop: 13 }}>
              <Field label="Cargo público"><input value={f.pepCargo ?? ''} onChange={e => setF({ ...f, pepCargo: e.target.value })} placeholder="Cargo que ocupa u ocupó" /></Field>
              <Field label="Desde"><input value={f.pepDesde ?? ''} onChange={e => setF({ ...f, pepDesde: e.target.value })} placeholder="Año" /></Field>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 9 }}>
              Los campos de cargo y período aparecen solo si la respuesta es sí.
            </p>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn pri" disabled={!listo} onClick={agregar}>Agregar a la lista</button>
        </div>
      </Card>
    </>
  )
}
