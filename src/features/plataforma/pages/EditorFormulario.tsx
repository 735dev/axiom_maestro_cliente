import React, { useEffect, useState } from 'react'
import { Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { publicarFormulario, versionVigente } from '../store/empresasSlice'
import {
  TIPOS, CAMPOS_ESTANDAR, CATALOGOS_PLATAFORMA, catalogoDe, estandarDe, clavesUsadas,
  opcionesDe, anchoDe, camposAnteriores, operadoresPara, OPERADORES, ANCHOS, TIPOS_NUMERICOS,
  type Campo, type Seccion, type TipoCampo, type SeccionId, type CampoEstandar,
  type Condicion, type CondicionGrupo, type Enlace, type AnchoCampo,
} from '../formulario/tipos'
import { RenderCampo, campoVisible } from '../formulario/RenderCampo'
import { comparar, resumen, type Cambio } from '../formulario/comparar'
import { selectCatalogosDe } from '@/features/catalogos/store/catalogosSlice'
import { columnasSeccion } from '@/shared/utils/anchoGrid'
import { maestroApi } from '@/shared/api/maestro'

const tipoDesdeApi = (tipo: string): TipoCampo => ({
  si_no: 'si-no', seleccion_multiple: 'multiple', correo: 'email', documento_identidad: 'documento',
}[tipo] as TipoCampo ?? tipo as TipoCampo)
const tipoApi = (tipo: TipoCampo) => ({
  'si-no': 'si_no', multiple: 'seleccion_multiple', email: 'correo', documento: 'documento_identidad', url: 'texto',
} as Partial<Record<TipoCampo, string>>)[tipo] ?? tipo

/**
 * Editor del formulario de una empresa.
 *
 * El formulario arranca vacío y la empresa lo arma. La plataforma no impone
 * secciones ni campos: aporta el catálogo de campos estándar, que son los que
 * tienen columna propia en la base y por eso se pueden buscar, filtrar y
 * consumir desde los procesos del sistema.
 */
export const EditorFormulario = () => {
  const empresas = useAppSelector(s => s.empresas.lista)
  const usuario = useAppSelector(s => s.auth.usuario)
  const dispatch = useAppDispatch()

  const [sel, setSel] = useState(empresas[0]?.id ?? '')
  const empresa = empresas.find(e => e.id === sel) ?? empresas[0]
  const vigente = versionVigente(empresa)
  /** Los valores que esta empresa administra. La vista previa los usa tal cual. */
  const catalogosEmpresa = useAppSelector(selectCatalogosDe(empresa.id))

  /**
   * Qué versión se está mirando. `null` = la vigente, que es la única
   * editable. Elegir una anterior abre el archivo: se ve tal como estaba, no
   * se toca.
   */
  const [verVersion, setVerVersion] = useState<number | null>(null)
  const mostrada = verVersion === null ? vigente : empresa.formulario.find(v => v.version === verVersion)!
  const historico = verVersion !== null

  /** Borrador local: nada se publica hasta que se justifique el cambio. */
  const [campos, setCampos] = useState<Campo[]>(vigente.campos)
  const [secciones, setSecciones] = useState<Seccion[]>(vigente.secciones)
  const [seccion, setSeccion] = useState<SeccionId>(vigente.secciones[0]?.id ?? '')
  const [editando, setEditando] = useState<Campo | null>(null)
  const [creando, setCreando] = useState(false)
  const [catalogo, setCatalogo] = useState(false)
  const [editSeccion, setEditSeccion] = useState<Seccion | null>(null)
  const [creandoSeccion, setCreandoSeccion] = useState(false)
  const [borrandoSeccion, setBorrandoSeccion] = useState<Seccion | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [historial, setHistorial] = useState(false)
  const [motivo, setMotivo] = useState('')
  /** Valores de juguete para que la vista previa reaccione como la real. */
  const [demo, setDemo] = useState<Record<string, unknown>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    maestroApi.formularioVigente().then(f => {
      if (!activo) return
      const seccionesApi = f.secciones.sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, nombre: s.nombre, sub: '' }))
      const camposApi = f.secciones.flatMap(s => s.campos.sort((a, b) => a.orden - b.orden).map(c => ({
        id: c.id, seccion: s.id, etiqueta: c.etiqueta, tipo: tipoDesdeApi(c.tipo_campo), obligatorio: c.obligatorio,
        estandar: c.es_estandar ? c.codigo : undefined, catalogo: c.catalogo_ref ?? undefined,
        ancho: c.ancho as AnchoCampo,
      }))) as Campo[]
      setSecciones(seccionesApi); setCampos(camposApi); setSeccion(seccionesApi[0]?.id ?? '')
    }).catch(() => { if (activo) setApiError('No fue posible cargar el formulario vigente desde el servidor.') })
    return () => { activo = false }
  }, [])

  const cambiarEmpresa = (id: string) => {
    const v = versionVigente(empresas.find(e => e.id === id)!)
    setSel(id); setCampos(v.campos); setSecciones(v.secciones)
    setSeccion(v.secciones[0]?.id ?? ''); setDemo({}); setVerVersion(null)
  }

  /** Al abrir una versión pasada se descarta el borrador: son cosas distintas. */
  const abrirVersion = (n: number | null) => {
    const v = n === null ? vigente : empresa.formulario.find(x => x.version === n)!
    setVerVersion(n)
    setCampos(v.campos); setSecciones(v.secciones)
    setSeccion(v.secciones[0]?.id ?? ''); setDemo({}); setHistorial(false)
  }

  const sucio = !historico && (JSON.stringify(campos) !== JSON.stringify(mostrada.campos)
    || JSON.stringify(secciones) !== JSON.stringify(mostrada.secciones))
  /** Diferencias del borrador contra la versión vigente. */
  const cambios = sucio ? comparar(vigente, { secciones, campos }) : []
  /**
   * Lo que se pinta sale siempre de la versión mostrada; el borrador local solo
   * existe mientras se edita la vigente. Mantener dos fuentes de verdad para lo
   * mismo es cómo la pantalla termina mostrando las secciones de una versión
   * con los campos de otra.
   */
  const seccionesVista = historico ? mostrada.secciones : secciones
  const camposVista = historico ? mostrada.campos : campos

  const seccionActual = seccionesVista.find(b => b.id === seccion)
  const delSeccion = camposVista.filter(c => c.seccion === seccion)
  const reemplazar = (c: Campo) => setCampos(campos.map(x => x.id === c.id ? c : x))

  const agregar = (c: Campo) => {
    const ultimo = campos.map(x => x.seccion).lastIndexOf(c.seccion)
    const nuevo = [...campos]
    nuevo.splice(ultimo + 1, 0, c)
    setCampos(nuevo)
  }

  const mover = (c: Campo, dir: -1 | 1) => {
    const hermanos = campos.filter(x => x.seccion === c.seccion)
    const i = hermanos.findIndex(x => x.id === c.id)
    if (i + dir < 0 || i + dir >= hermanos.length) return
    const nuevo = [...hermanos]
    ;[nuevo[i], nuevo[i + dir]] = [nuevo[i + dir], nuevo[i]]
    setCampos(campos.filter(x => x.seccion !== c.seccion).concat(nuevo)
      .sort((a, b) => secciones.findIndex(x => x.id === a.seccion) - secciones.findIndex(x => x.id === b.seccion)))
  }

  const moverSeccion = (b: Seccion, dir: -1 | 1) => {
    const i = secciones.findIndex(x => x.id === b.id)
    if (i + dir < 0 || i + dir >= secciones.length) return
    const nuevo = [...secciones]
    ;[nuevo[i], nuevo[i + dir]] = [nuevo[i + dir], nuevo[i]]
    setSecciones(nuevo)
  }

  return (
    <>
      <div className="ef-top">
        {apiError && <div className="val-err">{apiError}</div>}
        <div className="ef-emp">
          <label>Empresa</label>
          <select value={empresa.id} onChange={e => cambiarEmpresa(e.target.value)}>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <label className="ef-verlbl">Versión</label>
          <select value={verVersion ?? vigente.version}
            onChange={e => abrirVersion(Number(e.target.value) === vigente.version ? null : Number(e.target.value))}>
            {[...empresa.formulario].reverse().map(v => (
              <option key={v.version} value={v.version}>
                v{v.version} · {v.desde}{v.version === vigente.version ? ' · vigente' : ''}
              </option>
            ))}
          </select>
          <button className="lnk" onClick={() => setHistorial(true)}>ver historial</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {historico ? (
            <button className="btn sm pri" onClick={() => abrirVersion(null)}>
              Volver a la vigente (v{vigente.version})
            </button>
          ) : (
            <>
              {sucio && <button className="btn sm"
                onClick={() => { setCampos(vigente.campos); setSecciones(vigente.secciones) }}>Descartar</button>}
              <button className="btn sm" onClick={() => setCreandoSeccion(true)}>Agregar sección</button>
              <button className="btn sm" disabled={!seccionActual} onClick={() => setCatalogo(true)}>Del catálogo</button>
              <button className="btn sm" disabled={!seccionActual} onClick={() => setCreando(true)}>Campo propio</button>
              <button className="btn sm pri" disabled={!sucio} onClick={() => { setMotivo(''); setPublicando(true) }}>
                Publicar v{vigente.version + 1}
              </button>
            </>
          )}
        </div>
      </div>

      {historico && (
        <div className="ef-hist">
          <b>Está viendo la v{mostrada.version}, que ya no es la vigente.</b>
          <span>
            Rigió desde el <span className="num">{mostrada.desde}</span>. Los expedientes llenados
            en ese período se leen con esta definición, y por eso no se puede editar: cambiarla
            reescribiría el pasado. Publicada por {mostrada.publicadaPor} — {mostrada.motivo}
          </span>
        </div>
      )}

      {sucio && (
        <div className="ef-borr">
          <b>Borrador sin publicar</b>
          <span>{resumen(cambios)} respecto de la v{vigente.version}.</span>
          <button className="lnk" onClick={() => setPublicando(true)}>ver el detalle y publicar</button>
        </div>
      )}

      {!seccionesVista.length ? (
        <div className="ef-vacio">
          <h3>Este formulario está en blanco</h3>
          <p>
            Empiece creando una sección y después agréguele campos, del
            catálogo estándar o propios de {empresa.nombre}.
          </p>
          <button className="btn pri" onClick={() => setCreandoSeccion(true)}>Crear la primera sección</button>
        </div>
      ) : (
        <>
          <div className="tags" style={{ marginBottom: 14 }}>
            {seccionesVista.map(b => (
              <button key={b.id} className={'tag' + (b.id === seccion ? ' on' : '')} onClick={() => setSeccion(b.id)}>
                {b.nombre}<span style={{ opacity: .6 }} className="num">{camposVista.filter(c => c.seccion === b.id).length}</span>
              </button>
            ))}
          </div>

          <div className="ef">
            {/* ---- configuración ---- */}
            <div className="ef-col">
              <div className="ef-h">
                <span>Campos de la sección<span className="num"> · {delSeccion.length}</span></span>
                {seccionActual && !historico && (
                  <span className="ef-seccion-a">
                    <button className="btn sm" disabled={secciones[0]?.id === seccion} onClick={() => moverSeccion(seccionActual, -1)} title="Mover la sección hacia arriba">←</button>
                    <button className="btn sm" disabled={secciones[secciones.length - 1]?.id === seccion} onClick={() => moverSeccion(seccionActual, 1)} title="Mover la sección hacia abajo">→</button>
                    <button className="btn sm" onClick={() => setEditSeccion(seccionActual)}>Renombrar</button>
                    <button className="btn sm" onClick={() => setBorrandoSeccion(seccionActual)}>Eliminar</button>
                  </span>
                )}
              </div>
              <div className="ef-lista">
                {delSeccion.map((c, i) => {
                  const e = estandarDe(c.estandar)
                  return (
                    <div key={c.id} className="ef-campo">
                      <div className="ef-campo-i">
                        <div className="ef-campo-n">
                          {c.etiqueta}
                          {e ? <Pill k="ok">Estándar</Pill> : <Pill k="mut">Propio</Pill>}
                          {c.obligatorio && <Pill k="warn">Obligatorio</Pill>}
                        </div>
                        <div className="ef-campo-m">
                          {TIPOS.find(t => t.id === c.tipo)?.nombre}
                          {c.opciones?.length ? ` · ${c.opciones.length} opciones` : ''}
                          {Boolean(c.condicion?.condiciones.length) && ' · condicionado'}
                          {c.ancho && c.ancho !== 'auto' && ` · ancho ${ANCHOS.find(a => a.id === c.ancho)?.nombre.toLowerCase()}`}
                          {e
                            ? <><span className="rp-sep">·</span><code>{e.columna}</code>
                              {e.expuesto && <><span className="rp-sep">·</span><b>expuesto por la interfaz</b></>}</>
                            : <><span className="rp-sep">·</span><span className="ef-sin">sin índice</span></>}
                        </div>
                      </div>
                      {!historico && <div className="ef-campo-a">
                        <button className="btn sm" disabled={i === 0} onClick={() => mover(c, -1)} title="Subir">↑</button>
                        <button className="btn sm" disabled={i === delSeccion.length - 1} onClick={() => mover(c, 1)} title="Bajar">↓</button>
                        <button className="btn sm" onClick={() => setEditando(c)}>Editar</button>
                        <button className="btn sm" onClick={() => setCampos(campos.filter(x => x.id !== c.id))}>Quitar</button>
                      </div>}
                    </div>
                  )
                })}
                {!delSeccion.length && <div className="empty">Esta sección no tiene campos todavía.</div>}
              </div>
            </div>

            {/* ---- vista previa ---- */}
            <div className="ef-col ef-prev">
              <div className="ef-h">
                Vista previa
                <span className="ef-h-nota">Tal como lo verá el cliente en {empresa.dominio}</span>
              </div>
              <div className="ef-prev-body">
                <h3>{seccionActual?.nombre}</h3>
                <p className="ef-prev-sub">{seccionActual?.sub}</p>
                {(() => {
                  // El ancho de columnas se recalcula sobre lo que de verdad se
                  // ve: si una condición esconde campos, la sección se acomoda
                  // con lo que queda, no con lo que hay en total.
                  const visibles = delSeccion.filter(c => campoVisible(c, demo, delSeccion))
                  const cols = columnasSeccion(visibles.map(c => anchoDe(c)))
                  return (
                    <div className={`form-grid cols-${cols}`}>
                      {visibles.map(c => (
                        <RenderCampo key={c.id} campo={c} valor={demo[c.id]} catalogos={catalogosEmpresa}
                          onChange={v => setDemo({ ...demo, [c.id]: v })} />
                      ))}
                    </div>
                  )
                })()}
                {!delSeccion.length && <div className="empty">Sin campos que mostrar.</div>}
                {delSeccion.some(c => c.condicion?.condiciones.length) &&
                  <p className="ef-prev-pie">
                    Hay campos condicionados: respóndalos arriba para ver cómo aparecen y desaparecen.
                  </p>}
              </div>
            </div>
          </div>
        </>
      )}

      {catalogo && seccionActual && (
        <CatalogoModal
          usadas={clavesUsadas(campos)}
          onClose={() => setCatalogo(false)}
          onAgregar={claves => {
            claves.forEach((k, i) => {
              const e = CAMPOS_ESTANDAR.find(x => x.clave === k)!
              agregar({
                id: 'c' + Math.floor(performance.now() * 1000) + i,
                seccion: seccionActual.id, estandar: e.clave, etiqueta: e.nombre, tipo: e.tipo,
                obligatorio: true, catalogo: e.catalogo, marcador: e.marcador, ayuda: e.ayuda,
              })
            })
            setCatalogo(false)
          }} />
      )}

      {(creando || editando) && seccionActual && (
        <CampoModal
          campo={editando}
          secciones={secciones}
          seccionInicial={seccion}
          camposDisponibles={campos}
          catalogos={catalogosEmpresa}
          onClose={() => { setCreando(false); setEditando(null) }}
          onGuardar={c => {
            if (editando) reemplazar(c); else agregar(c)
            setCreando(false); setEditando(null)
          }} />
      )}

      {(creandoSeccion || editSeccion) && (
        <SeccionModal
          seccion={editSeccion}
          onClose={() => { setCreandoSeccion(false); setEditSeccion(null) }}
          onGuardar={b => {
            if (editSeccion) setSecciones(secciones.map(x => x.id === b.id ? b : x))
            else { setSecciones([...secciones, b]); setSeccion(b.id) }
            setCreandoSeccion(false); setEditSeccion(null)
          }} />
      )}

      {borrandoSeccion && (
        <BorrarSeccion
          seccion={borrandoSeccion}
          campos={campos.filter(c => c.seccion === borrandoSeccion.id)}
          onClose={() => setBorrandoSeccion(null)}
          onBorrar={() => {
            setSecciones(secciones.filter(x => x.id !== borrandoSeccion.id))
            setCampos(campos.filter(c => c.seccion !== borrandoSeccion.id))
            if (seccion === borrandoSeccion.id) setSeccion(secciones.find(x => x.id !== borrandoSeccion.id)?.id ?? '')
            setBorrandoSeccion(null)
          }} />
      )}

      {publicando && (
        <Modal title={`Publicar v${vigente.version + 1} de ${empresa.nombre}`} onClose={() => setPublicando(false)}
          footer={<><button className="btn" onClick={() => setPublicando(false)}>Cancelar</button>
            <button className="btn pri" disabled={motivo.trim().length < 10}
              onClick={() => {
                const payload = { motivo, secciones: secciones.map((s, i) => ({ nombre: s.nombre, orden: i + 1, campos: campos.filter(c => c.seccion === s.id).map((c, j) => ({ codigo: c.estandar ?? c.id, etiqueta: c.etiqueta, tipo_campo: tipoApi(c.tipo), orden: j + 1, obligatorio: c.obligatorio, es_estandar: Boolean(c.estandar), catalogo_ref: c.catalogo, ancho: c.ancho ?? 'auto' })) })) }
                maestroApi.publicarFormulario(payload).then(() => {
                  dispatch(publicarFormulario({ id: empresa.id, secciones, campos, motivo, usuario: usuario!.nombre }))
                  setPublicando(false)
                }).catch(() => setApiError('No fue posible publicar el formulario en el servidor.'))
              }}>Publicar</button></>}>
          <p className="dlg-txt">
            La v{vigente.version} no se modifica: queda como está y esta se agrega encima. Los
            expedientes llenados con v{vigente.version} se siguen leyendo con v{vigente.version}.
          </p>

          <div className="sec">Qué cambia · {resumen(cambios)}</div>
          <ListaCambios cambios={cambios} />

          <Field label="Motivo del cambio (obligatorio)">
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Por qué cambia el formulario de esta empresa" />
          </Field>
        </Modal>
      )}

      {historial && (
        <Modal title={`Historial del formulario de ${empresa.nombre}`} onClose={() => setHistorial(false)}
          footer={<button className="btn pri" onClick={() => setHistorial(false)}>Cerrar</button>}>
          <p className="dlg-txt">
            Cada versión queda entera. Un expediente se lee siempre con la que regía el día que se
            llenó, así que ninguna se pisa ni se borra.
          </p>
          {[...empresa.formulario].reverse().map((v, i, arr) => {
            const previa = arr[i + 1]
            const dif = previa ? comparar(previa, v) : []
            return (
              <div key={v.version} className="hv">
                <div className="hv-h">
                  <div>
                    <b className="num">v{v.version}</b>
                    {v.version === vigente.version ? <Pill k="ok">Vigente</Pill> : <Pill k="mut">Archivada</Pill>}
                    <span className="hv-m">
                      desde <span className="num">{v.desde}</span>
                      {previa && <> · {resumen(dif)}</>}
                      {!previa && <> · versión inicial, {v.campos.length} campos</>}
                    </span>
                  </div>
                  <button className="btn sm" onClick={() => abrirVersion(v.version === vigente.version ? null : v.version)}>
                    Ver
                  </button>
                </div>
                <div className="hv-b">
                  <b>{v.publicadaPor}</b> — {v.motivo}
                </div>
                {dif.length > 0 && <ListaCambios cambios={dif} />}
              </div>
            )
          })}
        </Modal>
      )}
    </>
  )
}

/* ---------------- Catálogo de campos estándar ---------------- */
const CatalogoModal: React.FC<{
  usadas: Set<string>
  onClose: () => void
  onAgregar: (claves: string[]) => void
}> = ({ usadas, onClose, onAgregar }) => {
  const [elegidas, setElegidas] = useState<string[]>([])
  const [q, setQ] = useState('')
  /** Los ya usados se esconden: un selector no debe ofrecer lo que no es opción. */
  const [verUsados, setVerUsados] = useState(false)

  const coincide = (c: CampoEstandar) =>
    (c.nombre + c.grupo + c.columna).toLowerCase().includes(q.trim().toLowerCase())

  const libres = CAMPOS_ESTANDAR.filter(c => !usadas.has(c.clave))
  const visibles = (verUsados ? CAMPOS_ESTANDAR : libres).filter(coincide)
  const grupos = Array.from(new Set(visibles.map(c => c.grupo)))

  const alternar = (k: string) =>
    setElegidas(elegidas.includes(k) ? elegidas.filter(x => x !== k) : [...elegidas, k])

  // Nada que ofrecer: se dice, en vez de mostrar una lista entera en gris.
  if (!libres.length && !verUsados) {
    return (
      <Modal title="Agregar del catálogo estándar" onClose={onClose}
        footer={<button className="btn pri" onClick={onClose}>Cerrar</button>}>
        <div className="empty" style={{ padding: '28px 16px' }}>
          <b>Este formulario ya usa los {CAMPOS_ESTANDAR.length} campos del catálogo.</b>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
            No queda ninguno por agregar. Lo que necesite de acá en adelante va como
            <b> campo propio</b>, o se pide sumar un campo nuevo al catálogo de la plataforma —eso
            implica una columna nueva en la base y lo hace Axiom, no la empresa.
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
        <button className="btn pri" disabled={!elegidas.length} onClick={() => onAgregar(elegidas)}>
          Agregar {elegidas.length || ''}
        </button></>}>
      <p className="dlg-txt">
        Estos campos tienen <b>columna propia en la base</b>: se pueden buscar, filtrar y ordenar, y
        son los que leen los procesos del sistema. Un campo propio se guarda igual, pero sin índice.
        Ninguno es obligatorio; tome los que le sirvan.
      </p>

      <div className="cat-barra">
        <input className="rp-find" placeholder="Buscar campo" value={q} onChange={e => setQ(e.target.value)} />
        <span className="cat-cuenta">
          <b className="num">{libres.length}</b> por agregar de <b className="num">{CAMPOS_ESTANDAR.length}</b>
          {usadas.size > 0 && (
            <button className="lnk" onClick={() => setVerUsados(!verUsados)}>
              {verUsados ? 'ocultar los que ya están' : `ver los ${usadas.size} que ya están`}
            </button>
          )}
        </span>
      </div>

      <div className="cat">
        {grupos.map(g => (
          <div key={g}>
            <div className="sec">{g}</div>
            {visibles.filter(c => c.grupo === g).map(c => {
              const ya = usadas.has(c.clave)
              return (
                <label key={c.clave} className={'cat-i' + (ya ? ' ya' : '')}>
                  <input type="checkbox" disabled={ya}
                    checked={ya || elegidas.includes(c.clave)} onChange={() => alternar(c.clave)} />
                  <span className="cat-t">
                    <span>{c.nombre} {ya && <Pill k="mut">Ya está</Pill>}</span>
                    <span className="cat-m">
                      {TIPOS.find(t => t.id === c.tipo)?.nombre}
                      <span className="rp-sep">·</span><code>{c.columna}</code>
                      {c.expuesto && <><span className="rp-sep">·</span><b>expuesto por la interfaz</b></>}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        ))}
        {!visibles.length && <div className="empty">Ningún campo por agregar coincide con “{q}”.</div>}
      </div>
    </Modal>
  )
}

/** Con qué arranca una condición nueva, según el tipo del campo elegido como disparador. */
const condicionInicial = (disparador: Campo): Condicion => ({
  campoId: disparador.id,
  operador: operadoresPara(disparador.tipo)[0],
  valor: disparador.tipo === 'si-no' ? 'si' : '',
})

/* ---------------- Alta y edición de un campo ---------------- */
const CampoModal: React.FC<{
  campo: Campo | null
  secciones: Seccion[]
  seccionInicial: SeccionId
  camposDisponibles: Campo[]
  catalogos: Record<string, string[]>
  onClose: () => void
  onGuardar: (c: Campo) => void
}> = ({ campo, secciones, seccionInicial, camposDisponibles, catalogos, onClose, onGuardar }) => {
  const est: CampoEstandar | undefined = estandarDe(campo?.estandar)
  const [d, setD] = useState<Campo>(campo ?? {
    id: 'x' + Math.floor(performance.now() * 1000),
    seccion: seccionInicial, etiqueta: '', tipo: 'texto', obligatorio: false,
  })
  const [opciones, setOpciones] = useState((campo?.opciones ?? []).join('\n'))
  const [tocado, setTocado] = useState(false)

  const necesitaOpciones = d.tipo === 'lista' || d.tipo === 'multiple'
  /** De dónde salen las opciones: de un catálogo de la empresa o fijas. */
  const [origen, setOrigen] = useState<'catalogo' | 'fijas'>(campo?.catalogo ? 'catalogo' : 'fijas')
  const errEtiqueta = d.etiqueta.trim().length < 3 ? 'Escriba al menos 3 caracteres.' : null
  const errOpciones = necesitaOpciones && origen === 'fijas'
    && opciones.split('\n').filter(o => o.trim()).length < 2
    ? 'Necesita al menos dos opciones, una por línea.' : null
  const errCatalogo = necesitaOpciones && origen === 'catalogo' && !d.catalogo
    ? 'Elija de qué catálogo salen las opciones.' : null
  const ok = !errEtiqueta && !errOpciones && !errCatalogo

  // Solo campos que ya existen antes que este en el formulario: depender de
  // uno posterior no se ofrece siquiera como opción.
  const disponibles = camposAnteriores(secciones, camposDisponibles, d)
  const condicion: CondicionGrupo = d.condicion ?? { enlace: 'y', condiciones: [] }

  const setCondicion = (g: CondicionGrupo | undefined) => setD({ ...d, condicion: g })
  const agregarCondicion = () => {
    if (!disponibles.length) return
    setCondicion({ enlace: condicion.enlace, condiciones: [...condicion.condiciones, condicionInicial(disponibles[0])] })
  }
  const actualizarCondicion = (i: number, patch: Partial<Condicion>) =>
    setCondicion({ ...condicion, condiciones: condicion.condiciones.map((c, idx) => idx === i ? { ...c, ...patch } : c) })
  const quitarCondicion = (i: number) => {
    const nuevas = condicion.condiciones.filter((_, idx) => idx !== i)
    setCondicion(nuevas.length ? { ...condicion, condiciones: nuevas } : undefined)
  }

  const guardar = () => {
    if (!ok) { setTocado(true); return }
    // Defensivo: si mientras se editaba cambió la sección o el orden y una
    // condición quedó apuntando a un campo que ya no es anterior, se descarta
    // en vez de guardar una referencia que ya no tiene sentido.
    const condicionValida = condicion.condiciones.filter(c => disponibles.some(x => x.id === c.campoId))
    onGuardar({
      ...d, etiqueta: d.etiqueta.trim(),
      // Una cosa o la otra, nunca las dos: dos fuentes para la misma lista es
      // exactamente el problema que este cambio vino a resolver.
      catalogo: necesitaOpciones && origen === 'catalogo' ? d.catalogo : undefined,
      opciones: necesitaOpciones && origen === 'fijas'
        ? opciones.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
      condicion: condicionValida.length ? { enlace: condicion.enlace, condiciones: condicionValida } : undefined,
    })
  }

  return (
    <Modal title={campo ? `Editar “${campo.etiqueta}”` : 'Campo propio'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={guardar}>{campo ? 'Guardar' : 'Agregar'}</button></>}>

      {est ? (
        <p className="dlg-txt">
          <b>Campo estándar.</b> Guarda en <code>{est.columna}</code>, así que es buscable y
          filtrable{est.expuesto ? <>, y <b>lo leen los otros sistemas del grupo</b> por la interfaz
          de consulta</> : null}. La etiqueta se puede cambiar —el cliente ve la suya y la columna
          sigue siendo la misma—, el tipo no.
        </p>
      ) : campo === null ? (
        <p className="dlg-txt">
          Un campo propio se guarda sin esquema: aparece en el expediente pero <b>no se indexa</b>, y
          buscar por él obliga a recorrer todo. Si lo va a consultar seguido, fíjese primero si está
          en el catálogo estándar.
        </p>
      ) : null}

      <Field label="Etiqueta que ve el cliente" error={tocado ? errEtiqueta ?? undefined : undefined}>
        <input autoFocus value={d.etiqueta} onChange={e => setD({ ...d, etiqueta: e.target.value })}
          placeholder="Ej. Organismo donde ejerce el cargo" />
      </Field>

      <div className="grid">
        <Field label="Sección">
          <select value={d.seccion} onChange={e => setD({ ...d, seccion: e.target.value })}>
            {secciones.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
        <Field label="Tipo" hint={TIPOS.find(t => t.id === d.tipo)?.nota}>
          <select value={d.tipo} disabled={Boolean(est)} onChange={e => setD({ ...d, tipo: e.target.value as TipoCampo })}>
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Field>
      </div>

      {necesitaOpciones && (
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
            <Field label="Catálogo" error={tocado ? errCatalogo ?? undefined : undefined}
              hint={catalogoDe(d.catalogo)?.descripcion}>
              <select value={d.catalogo ?? ''} disabled={Boolean(est)}
                onChange={e => setD({ ...d, catalogo: e.target.value || undefined })}>
                <option value="">Elija un catálogo</option>
                {CATALOGOS_PLATAFORMA.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Opciones, una por línea" error={tocado ? errOpciones ?? undefined : undefined}>
              <textarea rows={4} value={opciones} onChange={e => setOpciones(e.target.value)}
                placeholder={'Nacional\nRegional\nMunicipal'} />
            </Field>
          )}
        </>
      )}

      <Field label="Texto de ayuda" hint="Opcional. Aparece bajo el campo.">
        <input value={d.ayuda ?? ''} onChange={e => setD({ ...d, ayuda: e.target.value || undefined })}
          placeholder="Aclaración para el cliente" />
      </Field>

      {disponibles.length > 0 && (
        <div className="cond">
          <div className="cond-h">
            <span>Mostrar solo si se cumple</span>
            <button type="button" className="btn sm" onClick={agregarCondicion}>+ Agregar condición</button>
          </div>
          {!condicion.condiciones.length && <p className="cond-vacio">Sin condición: el campo se muestra siempre.</p>}
          {condicion.condiciones.map((c, i) => {
            const disparador = disponibles.find(x => x.id === c.campoId)
            const ops = operadoresPara(disparador?.tipo)
            const necesitaValor = OPERADORES.find(o => o.id === c.operador)?.necesitaValor
            const esNumerico = disparador && TIPOS_NUMERICOS.includes(disparador.tipo)
            return (
              <div key={i} className="cond-fila">
                {i > 0 && (
                  <select className="cond-enlace" value={condicion.enlace}
                    onChange={e => setCondicion({ ...condicion, enlace: e.target.value as Enlace })}>
                    <option value="y">Y</option>
                    <option value="o">O</option>
                  </select>
                )}
                <select value={c.campoId} onChange={e => {
                  const nuevo = disponibles.find(x => x.id === e.target.value)
                  if (nuevo) actualizarCondicion(i, condicionInicial(nuevo))
                }}>
                  {disponibles.map(x => <option key={x.id} value={x.id}>{x.etiqueta}</option>)}
                </select>
                <select value={c.operador}
                  onChange={e => actualizarCondicion(i, { operador: e.target.value as Condicion['operador'], valor: '' })}>
                  {ops.map(o => <option key={o} value={o}>{OPERADORES.find(x => x.id === o)?.nombre}</option>)}
                </select>
                {necesitaValor && disparador?.tipo === 'si-no' ? (
                  <select value={c.valor ?? 'si'} onChange={e => actualizarCondicion(i, { valor: e.target.value })}>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                ) : necesitaValor && c.operador === 'en' ? (
                  <div className="cond-multi">
                    {opcionesDe(disparador!, catalogos).map(o => {
                      const marcadas = (c.valor ?? '').split(',').filter(Boolean)
                      return (
                        <label key={o} className="chk">
                          <input type="checkbox" checked={marcadas.includes(o)}
                            onChange={() => actualizarCondicion(i, {
                              valor: (marcadas.includes(o) ? marcadas.filter(x => x !== o) : [...marcadas, o]).join(','),
                            })} />
                          <span>{o}</span>
                        </label>
                      )
                    })}
                    {!opcionesDe(disparador!, catalogos).length && <span className="cond-sinop">Ese campo no tiene opciones cargadas.</span>}
                  </div>
                ) : necesitaValor && disparador?.tipo === 'lista' ? (
                  <select value={c.valor ?? ''} onChange={e => actualizarCondicion(i, { valor: e.target.value })}>
                    <option value="">Elija…</option>
                    {opcionesDe(disparador, catalogos).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : necesitaValor ? (
                  <input type={esNumerico ? 'number' : 'text'} value={c.valor ?? ''}
                    onChange={e => actualizarCondicion(i, { valor: e.target.value })} placeholder="Valor" />
                ) : null}
                <button type="button" className="btn sm" onClick={() => quitarCondicion(i)}>Quitar</button>
              </div>
            )
          })}
        </div>
      )}

      <Field label="Ancho" hint="Automático decide según el tipo: párrafo y archivo ocupan la fila entera, el resto comparte.">
        <select value={d.ancho ?? 'auto'} onChange={e => setD({ ...d, ancho: e.target.value as AnchoCampo })}>
          {ANCHOS.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Field>

      <label className="sw-fila" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={d.obligatorio}
          onChange={e => setD({ ...d, obligatorio: e.target.checked })} />
        <span className={'sw' + (d.obligatorio ? ' on' : '')} aria-hidden />
        <span>Obligatorio</span>
      </label>
    </Modal>
  )
}

/* ---------------- Alta y edición de un seccion ---------------- */
const SeccionModal: React.FC<{
  seccion: Seccion | null
  onClose: () => void
  onGuardar: (b: Seccion) => void
}> = ({ seccion, onClose, onGuardar }) => {
  const [d, setD] = useState<Seccion>(seccion ?? {
    id: 'b' + Math.floor(performance.now() * 1000), nombre: '', sub: '',
  })
  const [tocado, setTocado] = useState(false)
  const err = d.nombre.trim().length < 3 ? 'Escriba al menos 3 caracteres.' : null

  const guardar = () => {
    if (err) { setTocado(true); return }
    onGuardar({ ...d, nombre: d.nombre.trim(), sub: d.sub.trim() })
  }

  return (
    <Modal title={seccion ? `Renombrar “${seccion.nombre}”` : 'Agregar sección'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={guardar}>{seccion ? 'Guardar' : 'Agregar'}</button></>}>
      <Field label="Nombre de la sección" error={tocado ? err ?? undefined : undefined}>
        <input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && guardar()} placeholder="Ej. Datos de la empresa" />
      </Field>
      <Field label="Descripción" hint="Opcional. Aparece bajo el título de la sección.">
        <input value={d.sub} onChange={e => setD({ ...d, sub: e.target.value })}
          placeholder="Una línea que explique qué se pide acá" />
      </Field>
    </Modal>
  )
}

/* ---------------- Eliminar un seccion ---------------- */
const BorrarSeccion: React.FC<{
  seccion: Seccion
  campos: Campo[]
  onClose: () => void
  onBorrar: () => void
}> = ({ seccion, campos, onClose, onBorrar }) => {
  const expuestos = campos
    .map(c => estandarDe(c.estandar))
    .filter((e): e is CampoEstandar => Boolean(e?.expuesto))

  return (
    <Modal title={`Eliminar “${seccion.nombre}”`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" onClick={onBorrar}>Eliminar la sección</button></>}>
      <p className="dlg-txt">
        Se quitan del formulario los <b className="num">{campos.length}</b> campos de la sección. Esta
        empresa deja de pedírselos a sus clientes.
      </p>

      {expuestos.length > 0 && (
        <>
          <p className="dlg-txt">
            <b style={{ color: 'var(--warn)' }}>Hay campos que otros sistemas del grupo leen</b> por
            la interfaz de consulta. Si dejan de pedirse, van a llegar vacíos:
          </p>
          <ul className="dlg-lista">
            {expuestos.map(e => <li key={e.clave}><code>{e.columna}</code> — {e.nombre}</li>)}
          </ul>
          <p className="dlg-txt">
            Qué hace cada sistema con ese dato se ve allá, no acá.
          </p>
        </>
      )}

      <p className="dlg-txt">
        Los expedientes ya llenados no se tocan: siguen leyéndose con la versión que tenían.
      </p>
    </Modal>
  )
}

/* ---------------- Lista de diferencias entre dos versiones ---------------- */
const ListaCambios: React.FC<{ cambios: Cambio[] }> = ({ cambios }) => {
  if (!cambios.length) return <p className="dlg-txt">La definición no cambió.</p>
  return (
    <ul className="cbs">
      {cambios.map((c, i) => (
        <li key={i} className={'cbs-i ' + c.clase}>
          <span className="cbs-s">{c.clase === 'agregado' ? '+' : c.clase === 'quitado' ? '−' : '~'}</span>
          <span>
            <b>{c.ambito}</b> {c.texto}
            {c.detalle && <span className="cbs-d">{c.detalle}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
