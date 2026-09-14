import React, { useState, useMemo, useEffect } from 'react'
import { Listado, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { agregarValor, quitarValor as quitarValorLocal, selectCatalogosDeMiEmpresa } from '../store/catalogosSlice'
import { selectClientesDeMiEmpresa } from '@/features/clientes/store/clientesSlice'
import { useCan } from '@/shared/hooks/useCan'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { versionVigente } from '@/features/plataforma/store/empresasSlice'
import { PERMISSIONS } from '@/shared/auth/permissions'
import { catalogoDe, estandarDe } from '@/features/plataforma/formulario/tipos'
import { maestroApi, type ApiCatalogoValor } from '@/shared/api/maestro'
import { mostrarAviso } from '@/shared/store/slices/uiSlice'

/**
 * Catálogos de la empresa.
 *
 * Qué catálogos existen lo define Axiom al armar el formulario: un campo de
 * tipo lista apunta a uno. Acá la empresa administra **sus valores**, que es
 * lo que sabe: en qué ramos opera, qué orígenes de fondos ve.
 *
 * Solo se muestran los que su formulario efectivamente usa. Ofrecer catálogos
 * que ningún campo consume es pedirle a alguien que mantenga una lista que no
 * se ve en ningún lado.
 */
export const MaestroCatalogos = () => {
  const catalogos = useAppSelector(selectCatalogosDeMiEmpresa)
  const clientes = useAppSelector(selectClientesDeMiEmpresa)
  const empresaId = useAppSelector(s => s.auth.usuario?.empresaId)
  const empresa = useEmpresaActual()
  const dispatch = useAppDispatch()
  const can = useCan()
  const puede = can(PERMISSIONS.catalogosGestionar)
  const [catalogosServidor, setCatalogosServidor] = useState<Record<string, string[]>>({})
  const [registrosServidor, setRegistrosServidor] = useState<Record<string, ApiCatalogoValor[]>>({})

  useEffect(() => {
    let activo = true
    maestroApi.catalogosDefiniciones().then(defs =>
      Promise.all(defs.map(d => maestroApi.catalogoValores(d.clave).then(valores => [d.clave, valores.filter(v => v.activo).map(v => v.valor)] as const)))
    ).then(valores => { if (activo) setCatalogosServidor(Object.fromEntries(valores)) }).catch(() => undefined)
    maestroApi.catalogosDefiniciones().then(defs =>
      Promise.all(defs.map(d => maestroApi.catalogoValores(d.clave).then(valores => [d.clave, valores] as const)))
    ).then(registros => { if (activo) setRegistrosServidor(Object.fromEntries(registros)) }).catch(() => undefined)
    return () => { activo = false }
  }, [])

  /** Qué catálogos usa el formulario vigente, y con qué campo cada uno. */
  const enUso = useMemo(() => {
    const v = empresa ? versionVigente(empresa) : undefined
    const m = new Map<string, string[]>()
    v?.campos.forEach(c => {
      if (!c.catalogo) return
      m.set(c.catalogo, [...(m.get(c.catalogo) ?? []), c.etiqueta])
    })
    return m
  }, [empresa])

  const valoresDisponibles = Object.keys(catalogosServidor).length ? catalogosServidor : catalogos
  const ids = Array.from(enUso.keys()).length ? Array.from(enUso.keys()) : Object.keys(valoresDisponibles)
  const [activo, setActivo] = useState(ids[0] ?? '')
  const seleccionado = ids.includes(activo) ? activo : ids[0]

  const [q, setQ] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [quitando, setQuitando] = useState<string | null>(null)

  const def = catalogoDe(seleccionado)
  const valores = valoresDisponibles[seleccionado] ?? []
  const registros = registrosServidor[seleccionado] ?? []

  /**
   * Cuántos clientes tienen cada valor. Sale de la columna del campo estándar
   * que consume el catálogo, no de adivinar por el nombre.
   */
  const uso = useMemo(() => {
    const v = empresa ? versionVigente(empresa) : undefined
    const campo = v?.campos.find(c => c.catalogo === seleccionado && c.estandar)
    const est = estandarDe(campo?.estandar)
    // En el prototipo la columna se mapea al campo del cliente por su último tramo.
    const prop = est?.columna.split('.').pop() as keyof typeof clientes[number] | undefined
    const m: Record<string, number> = {}
    valores.forEach(val => {
      m[val] = prop ? clientes.filter(c => (c[prop] as unknown as string) === val).length : 0
    })
    return m
  }, [valores, clientes, seleccionado, empresa])

  const filtrados = valores.filter(v => v.toLowerCase().includes(q.toLowerCase()))
  const valorOriginal = editando ? registros.find(r => r.id === editando)?.valor : undefined
  const duplicado = valores.some(v =>
    v.toLowerCase() === valor.trim().toLowerCase() && v !== valorOriginal,
  )
  const valido = valor.trim().length >= 2 && !duplicado

  const guardarValor = async () => {
    if (!empresaId || !valido) return
    try {
      const nuevo = await maestroApi.agregarValorCatalogo(seleccionado, valor.trim())
      setRegistrosServidor(r => ({ ...r, [seleccionado]: [...(r[seleccionado] ?? []), nuevo] }))
      setCatalogosServidor(c => ({ ...c, [seleccionado]: [...(c[seleccionado] ?? []), nuevo.valor] }))
      dispatch(agregarValor({ empresaId, catalogo: seleccionado, valor: nuevo.valor }))
      setAgregando(false)
    } catch { dispatch(mostrarAviso({ tipo: 'error', texto: 'No fue posible agregar el valor al catálogo.' })) }
  }

  const quitarValor = async () => {
    if (!empresaId || !quitando) return
    try {
      const registro = registros.find(r => r.valor === quitando && r.activo)
      if (!registro) throw new Error('Valor no encontrado')
      await maestroApi.inactivarValorCatalogo(registro.id)
      setRegistrosServidor(r => ({ ...r, [seleccionado]: (r[seleccionado] ?? []).filter(x => x.id !== registro.id) }))
      setCatalogosServidor(c => ({ ...c, [seleccionado]: (c[seleccionado] ?? []).filter(x => x !== quitando) }))
      dispatch(quitarValorLocal({ empresaId, catalogo: seleccionado, valor: quitando }))
      setQuitando(null)
    } catch { dispatch(mostrarAviso({ tipo: 'error', texto: 'No fue posible quitar el valor del catálogo.' })) }
  }

  const editarValor = async () => {
    if (!empresaId || !editando || !valido) return
    try {
      const actualizado = await maestroApi.editarValorCatalogo(editando, valor.trim())
      setRegistrosServidor(r => ({
        ...r,
        [seleccionado]: (r[seleccionado] ?? []).map(x => x.id === editando ? actualizado : x),
      }))
      setCatalogosServidor(c => ({
        ...c,
        [seleccionado]: (c[seleccionado] ?? []).map(x => x === valorOriginal ? actualizado.valor : x),
      }))
      setEditando(null)
      setValor('')
    } catch { dispatch(mostrarAviso({ tipo: 'error', texto: 'No fue posible editar el valor del catálogo.' })) }
  }

  if (!ids.length) {
    return (
      <div className="empty" style={{ padding: '48px 16px' }}>
        El formulario de su empresa no usa ningún catálogo todavía. Cuando tenga campos de tipo
        lista, sus valores se administran acá.
      </div>
    )
  }

  return (
    <>
      <div className="tags" style={{ marginBottom: 16 }}>
        {ids.map(id => (
          <button key={id} className={'tag' + (id === seleccionado ? ' on' : '')}
            onClick={() => { setActivo(id); setQ('') }}>
            {catalogoDe(id)?.nombre ?? id}
            <span style={{ opacity: .6 }} className="num">{(catalogos[id] ?? []).length}</span>
          </button>
        ))}
      </div>

      <Listado
        titulo={def?.nombre ?? seleccionado}
        sub={`${def?.descripcion ?? ''} Alimenta: ${(enUso.get(seleccionado) ?? []).join(', ')}.`}
        datos={filtrados}
        clave={v => v}
        etiqueta="valores"
        vacio={q ? `Sin resultados para “${q}”.` : 'Este catálogo está vacío.'}
        buscar={{ valor: q, onChange: setQ, marcador: 'Buscar valor', ancho: 200 }}
        acciones={puede
          ? <button className="btn pri sm" onClick={() => { setValor(''); setAgregando(true) }}>Agregar valor</button>
          : undefined}
        columnas={[
          { th: 'Valor', ancho: '55%' }, { th: 'Clientes que lo usan' }, { th: 'Estado' }, { th: '', fin: true },
        ]}
        fila={v => (
          <>
            <td>{v}</td>
            <td className="num">{uso[v]}</td>
            <td>{uso[v] > 0 ? <Pill k="ok">En uso</Pill> : <Pill k="mut">Sin usar</Pill>}</td>
            <td style={{ textAlign: 'right' }}>
              {puede && <span style={{ display: 'inline-flex', gap: 6 }}>
                <button className="btn sm" onClick={() => {
                  const registro = registros.find(r => r.valor === v && r.activo)
                  if (!registro) return
                  setValor(v)
                  setEditando(registro.id)
                }}>Editar</button>
                <button className="btn sm" onClick={() => setQuitando(v)}>Quitar</button>
              </span>}
            </td>
          </>
        )}
      />

      {agregando && empresaId && (
        <Modal title={`Agregar valor a “${def?.nombre}”`} onClose={() => setAgregando(false)}
          footer={<><button className="btn" onClick={() => setAgregando(false)}>Cancelar</button>
            <button className="btn pri" disabled={!valido} onClick={guardarValor}>Agregar</button></>}>
          <Field label="Nuevo valor"
            error={duplicado ? 'Ese valor ya está en el catálogo.' : undefined}
            hint={!duplicado ? 'Aparece de inmediato en el formulario de sus clientes.' : undefined}>
            <input autoFocus value={valor} onChange={e => setValor(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && valido) void guardarValor()
              }}
              placeholder="Escriba el valor" />
          </Field>
          <p className="dlg-txt">
            Es solo para su empresa. Otras empresas de la plataforma tienen su propia lista.
          </p>
        </Modal>
      )}

      {editando && empresaId && (
        <Modal title={`Editar valor de “${def?.nombre}”`} onClose={() => { setEditando(null); setValor('') }}
          footer={<><button className="btn" onClick={() => { setEditando(null); setValor('') }}>Cancelar</button>
            <button className="btn pri" disabled={!valido} onClick={editarValor}>Guardar cambios</button></>}>
          <Field label="Valor" error={duplicado ? 'Ese valor ya está en el catálogo.' : undefined}>
            <input autoFocus value={valor} onChange={e => setValor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && valido) void editarValor() }} />
          </Field>
          <p className="dlg-txt">El cambio se aplicará a los nuevos formularios. Los datos ya guardados no se modifican.</p>
        </Modal>
      )}

      {quitando && empresaId && (
        <Modal title="Quitar del catálogo" onClose={() => setQuitando(null)}
          footer={<><button className="btn" onClick={() => setQuitando(null)}>Cancelar</button>
            <button className="btn pri" onClick={quitarValor}>Quitar</button></>}>
          <p className="dlg-txt">Se quitará <b>{quitando}</b> de <b>{def?.nombre}</b>.</p>
          {uso[quitando] > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{uso[quitando]} cliente(s) lo tienen asignado.</b> Lo
              conservan: el valor deja de ofrecerse en el formulario, pero no se borra de los
              expedientes existentes.
            </p>
          ) : (
            <p className="dlg-txt">Ningún cliente lo tiene asignado. Quitarlo no afecta ningún expediente.</p>
          )}
        </Modal>
      )}
    </>
  )
}
