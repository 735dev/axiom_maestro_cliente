import React, { useState, useMemo, useEffect } from 'react'
import { Listing, Pill, Modal, Field } from '@/shared/ui'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { addValue, removeValue as removeLocalValue, selectCatalogsOfMyCompany } from '../store/catalogsSlice'
import { selectClientsOfMyCompany } from '@/features/clients/store/clientsSlice'
import { useCan } from '@/shared/hooks/useCan'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { currentVersion } from '@/features/platform/store/companiesSlice'
import { PERMISSIONS } from '@/shared/auth/permissions'
import { catalogOf, standardOf } from '@/features/platform/form/types'
import { maestroApi, type ApiCatalogValue } from '@/shared/api/maestro'
import { showNotice } from '@/shared/store/slices/uiSlice'

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
export const MasterCatalogs = () => {
  const catalogs = useAppSelector(selectCatalogsOfMyCompany)
  const clients = useAppSelector(selectClientsOfMyCompany)
  const companyId = useAppSelector(s => s.auth.user?.companyId)
  const company = useCurrentCompany()
  const dispatch = useAppDispatch()
  const can = useCan()
  const puede = can(PERMISSIONS.catalogsManage)
  const [serverCatalogs, setServerCatalogs] = useState<Record<string, string[]>>({})
  const [registrosServidor, setRegistrosServidor] = useState<Record<string, ApiCatalogValue[]>>({})
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let active = true
    let pendingItems = 2
    const end = () => {
      pendingItems -= 1
      if (active && pendingItems === 0) setListo(true)
    }
    maestroApi.catalogDefinitions().then(defs =>
      Promise.all(defs.map(d => maestroApi.catalogValues(d.clave).then(valores => [d.clave, valores.filter(v => v.activo).map(v => v.valor)] as const)))
    ).then(valores => { if (active) setServerCatalogs(Object.fromEntries(valores)) }).catch(() => undefined).finally(end)
    maestroApi.catalogDefinitions().then(defs =>
      Promise.all(defs.map(d => maestroApi.catalogValues(d.clave).then(valores => [d.clave, valores] as const)))
    ).then(registros => { if (active) setRegistrosServidor(Object.fromEntries(registros)) }).catch(() => undefined).finally(end)
    return () => { active = false }
  }, [])

  /** Qué catálogos usa el formulario vigente, y con qué campo cada uno. */
  const enUso = useMemo(() => {
    const v = company ? currentVersion(company) : undefined
    const m = new Map<string, string[]>()
    v?.fields.forEach(c => {
      if (!c.catalog) return
      m.set(c.catalog, [...(m.get(c.catalog) ?? []), c.label])
    })
    return m
  }, [company])

  const valoresDisponibles = Object.keys(serverCatalogs).length ? serverCatalogs : catalogs
  const ids = Array.from(enUso.keys()).length ? Array.from(enUso.keys()) : Object.keys(valoresDisponibles)
  const [active, setActive] = useState(ids[0] ?? '')
  const selected = ids.includes(active) ? active : ids[0]

  const [q, setQ] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [removing, setQuitando] = useState<string | null>(null)

  const def = catalogOf(selected)
  const valores = valoresDisponibles[selected] ?? []
  const registros = registrosServidor[selected] ?? []

  /**
   * Cuántos clientes tienen cada valor. Sale de la columna del campo estándar
   * que consume el catálogo, no de adivinar por el nombre.
   */
  const uso = useMemo(() => {
    const v = company ? currentVersion(company) : undefined
    const field = v?.fields.find(c => c.catalog === selected && c.standard)
    const est = standardOf(field?.standard)
    // En el prototipo la columna se mapea al campo del cliente por su último tramo.
    const prop = est?.column.split('.').pop() as keyof typeof clients[number] | undefined
    const m: Record<string, number> = {}
    valores.forEach(val => {
      m[val] = prop ? clients.filter(c => (c[prop] as unknown as string) === val).length : 0
    })
    return m
  }, [valores, clients, selected, company])

  const filtrados = valores.filter(v => v.toLowerCase().includes(q.toLowerCase()))
  const valueOriginal = editando ? registros.find(r => r.id === editando)?.valor : undefined
  const duplicado = valores.some(v =>
    v.toLowerCase() === value.trim().toLowerCase() && v !== valueOriginal,
  )
  const valido = value.trim().length >= 2 && !duplicado

  const saveValue = async () => {
    if (!companyId || !valido) return
    try {
      const created = await maestroApi.addCatalogValue(selected, value.trim())
      setRegistrosServidor(r => ({ ...r, [selected]: [...(r[selected] ?? []), created] }))
      setServerCatalogs(c => ({ ...c, [selected]: [...(c[selected] ?? []), created.valor] }))
      dispatch(addValue({ companyId, catalog: selected, value: created.valor }))
      setAgregando(false)
    } catch { dispatch(showNotice({ tipo: 'error', text: 'No fue posible agregar el valor al catálogo.' })) }
  }

  const removeValue = async () => {
    if (!companyId || !removing) return
    try {
      const registro = registros.find(r => r.valor === removing && r.activo)
      if (!registro) throw new Error('Valor no encontrado')
      await maestroApi.deactivateCatalogValue(registro.id)
      setRegistrosServidor(r => ({ ...r, [selected]: (r[selected] ?? []).filter(x => x.id !== registro.id) }))
      setServerCatalogs(c => ({ ...c, [selected]: (c[selected] ?? []).filter(x => x !== removing) }))
      dispatch(removeLocalValue({ companyId, catalog: selected, value: removing }))
      setQuitando(null)
    } catch { dispatch(showNotice({ tipo: 'error', text: 'No fue posible quitar el valor del catálogo.' })) }
  }

  const editValue = async () => {
    if (!companyId || !editando || !valido) return
    try {
      const actualizado = await maestroApi.editCatalogValue(editando, value.trim())
      setRegistrosServidor(r => ({
        ...r,
        [selected]: (r[selected] ?? []).map(x => x.id === editando ? actualizado : x),
      }))
      setServerCatalogs(c => ({
        ...c,
        [selected]: (c[selected] ?? []).map(x => x === valueOriginal ? actualizado.valor : x),
      }))
      setEditando(null)
      setValue('')
    } catch { dispatch(showNotice({ tipo: 'error', text: 'No fue posible editar el valor del catálogo.' })) }
  }

  if (!listo) return null

  if (!ids.length) {
    return (
      <div className="empty" style={{ padding: '48px 16px' }}>
        El formulario de su empresa no usa ningún catálogo todavía. Cuando tenga campos de tipo
        list, sus valores se administran acá.
      </div>
    )
  }

  return (
    <>
      <div className="tags" style={{ marginBottom: 16 }}>
        {ids.map(id => (
          <button key={id} className={'tag' + (id === selected ? ' on' : '')}
            onClick={() => { setActive(id); setQ('') }}>
            {catalogOf(id)?.name ?? id}
            <span style={{ opacity: .6 }} className="num">{(valoresDisponibles[id] ?? []).length}</span>
          </button>
        ))}
      </div>

      <Listing
        title={def?.name ?? selected}
        sub={`${def?.description ?? ''} Alimenta: ${(enUso.get(selected) ?? []).join(', ')}.`}
        rows={filtrados}
        rowKey={v => v}
        label="valores"
        empty={q ? `Sin resultados para “${q}”.` : 'Este catálogo está vacío.'}
        search={{ value: q, onChange: setQ, placeholder: 'Buscar valor', width: 200 }}
        actions={puede
          ? <button className="btn pri sm" onClick={() => { setValue(''); setAgregando(true) }}>Agregar valor</button>
          : undefined}
        columns={[
          { th: 'Valor', width: '55%' }, { th: 'Clientes que lo usan' }, { th: 'Estado' }, { th: '', end: true },
        ]}
        row={v => (
          <>
            <td>{v}</td>
            <td className="num">{uso[v]}</td>
            <td>{uso[v] > 0 ? <Pill k="ok">En uso</Pill> : <Pill k="mut">Sin usar</Pill>}</td>
            <td style={{ textAlign: 'right' }}>
              {puede && <span style={{ display: 'inline-flex', gap: 6 }}>
                <button className="btn sm" onClick={() => {
                  const registro = registros.find(r => r.valor === v && r.activo)
                  if (!registro) return
                  setValue(v)
                  setEditando(registro.id)
                }}>Edit</button>
                <button className="btn sm" onClick={() => setQuitando(v)}>Remove</button>
              </span>}
            </td>
          </>
        )}
      />

      {agregando && companyId && (
        <Modal title={`Agregar valor a “${def?.name}”`} onClose={() => setAgregando(false)}
          footer={<><button className="btn" onClick={() => setAgregando(false)}>Cancelar</button>
            <button className="btn pri" disabled={!valido} onClick={saveValue}>Add</button></>}>
          <Field label="Nuevo valor"
            error={duplicado ? 'Ese valor ya está en el catálogo.' : undefined}
            hint={!duplicado ? 'Aparece de inmediato en el formulario de sus clientes.' : undefined}>
            <input autoFocus value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && valido) void saveValue()
              }}
              placeholder="Escriba el valor" />
          </Field>
          <p className="dlg-txt">
            Es solo para su empresa. Otras empresas de la plataforma tienen su propia lista.
          </p>
        </Modal>
      )}

      {editando && companyId && (
        <Modal title={`Editar valor de “${def?.name}”`} onClose={() => { setEditando(null); setValue('') }}
          footer={<><button className="btn" onClick={() => { setEditando(null); setValue('') }}>Cancelar</button>
            <button className="btn pri" disabled={!valido} onClick={editValue}>Guardar cambios</button></>}>
          <Field label="Valor" error={duplicado ? 'Ese valor ya está en el catálogo.' : undefined}>
            <input autoFocus value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && valido) void editValue() }} />
          </Field>
          <p className="dlg-txt">El cambio se aplicará a los nuevos forms. Los rows ya guardados no se modifican.</p>
        </Modal>
      )}

      {removing && companyId && (
        <Modal title="Quitar del catálogo" onClose={() => setQuitando(null)}
          footer={<><button className="btn" onClick={() => setQuitando(null)}>Cancelar</button>
            <button className="btn pri" onClick={removeValue}>Remove</button></>}>
          <p className="dlg-txt">Se removeá <b>{removing}</b> de <b>{def?.name}</b>.</p>
          {uso[removing] > 0 ? (
            <p className="dlg-txt">
              <b style={{ color: 'var(--warn)' }}>{uso[removing]} client(s) lo tienen asignado.</b> Lo
              conservan: el value deja de ofrecerse en el form, pero no se borra de los
              caseFiles existentes.
            </p>
          ) : (
            <p className="dlg-txt">Ningún client lo tiene asignado. RemoveIt no afecta ningún caseFile.</p>
          )}
        </Modal>
      )}
    </>
  )
}
