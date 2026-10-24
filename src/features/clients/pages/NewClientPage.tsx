import React, { useEffect, useMemo, useState } from 'react'
import { SERVICES, INCOME_RANGES, type Client, type Person } from '../types/client.types'
import { Card, Field, Pill, Paginator } from '@/shared/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import * as V from '../schemas/client.schema'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectCatalogsOf } from '@/features/catalogs/store/catalogsSlice'
import { createClient, savePortalDraft } from '../store/clientsSlice'
import { sectionColumns } from '@/shared/utils/gridWidth'
import { httpClient } from '@/shared/api/client'
import { maestroApi } from '@/shared/api/maestro'
import { PLATFORM_CATALOGS } from '@/features/platform/form/types'

/**
 * Cuántas columnas le tocan a un bloque de `n` campos cortos. Este asistente
 * no tiene una definición de `Campo` con `ancho` propio —eso es del
 * formulario configurable de plataforma—, pero comparte el mismo criterio:
 * más campos por acomodar, más columnas, hasta 4.
 */
const grilla = (n: number) => `form-grid cols-${sectionColumns(Array(n).fill('medio'))}`

const PASOS = [
  { n: 1, label: 'Identificación', sub: 'Quién es la empresa' },
  { n: 2, label: 'Contacto', sub: 'Dónde localizarla' },
  { n: 3, label: 'Estructura accionaria', sub: 'Quién está detrás' },
  { n: 4, label: 'Perfil financiero', sub: 'Qué declara mover' },
]

const EMPTY = {
  legalName: '', rif: '', tipo: 'Compañía Anónima',
  registroNumero: '', registroTomo: '', registroFolio: '',
  subscribedCapital: '', currentCapital: '',
  sector: 'Banca y servicios financieros',
  address: '', phone: '', email: '', web: '', redes: '',
  activity: '', activityDetail: '',
  fundOrigin: 'Operaciones comerciales propias', ingresos: '$1M – $5M',
  declaredAmount: '', frequency: 'Mensual',
}

type Props = {
  onListo: () => void
  onCancelar?: () => void
  /** El portal entrega el borrador encontrado por RIF para continuar sin perder datos. */
  draft?: Client | null
  onDraftSaved?: (client: Client) => void
}

const dataIniciales = (draft?: Client | null) => draft ? {
  ...EMPTY,
  legalName: draft.legalName, rif: draft.rif, tipo: draft.tipo,
  registroNumero: draft.registroNumero ?? '', registroTomo: draft.registroTomo ?? '',
  registroFolio: draft.registroFolio ?? '', subscribedCapital: draft.subscribedCapital ?? '',
  currentCapital: draft.currentCapital ?? '', sector: draft.sector, address: draft.address,
  phone: draft.phone, email: draft.email, web: draft.web, redes: draft.redes ?? '',
  activity: draft.activity, activityDetail: draft.activityDetail ?? '',
  fundOrigin: draft.fundOrigin, ingresos: draft.ingresos, declaredAmount: draft.declaredAmount,
  frequency: draft.frequency,
} : { ...EMPTY }

/** `onCancelar` opcional: en el portal público no hay a dónde volver. */
export const NewClientPage: React.FC<Props> = ({ onListo, onCancelar, draft, onDraftSaved }) => {
  const [paso, setPaso] = useState(draft?.stepReached ?? 1)
  // El asistente es secuencial: no se abre un bloque sin cerrar el anterior.
  const [desbloqueado, setDesbloqueado] = useState(draft?.stepReached ?? 1)
  const [d, setD] = useState(() => dataIniciales(draft))
  // Un campo solo muestra su error después de que el usuario lo tocó.
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const marcar = (k: string) => () => setTocado(t => ({ ...t, [k]: true }))
  const [people, setPeople] = useState<Person[]>(() => draft?.people ?? [])
  const [servicios, setServicios] = useState<string[]>(() => draft?.servicios ?? [])
  const dispatch = useAppDispatch()
  const company = useCurrentCompany()
  const user = useAppSelector(s => s.auth.user)
  const nextCode = useAppSelector(s => s.clients.nextCode)
  const clients = useAppSelector(s => s.clients?.list ?? [])
  const rifsExistentes = useMemo(() => clients.filter(c => c.code !== draft?.code).map(c => c.rif), [clients, draft?.code])
  const CATALOGS = useAppSelector(selectCatalogsOf(company?.id))
  const catalogOptions = (id: string) => CATALOGS[id]?.length
    ? CATALOGS[id]
    : (PLATFORM_CATALOGS.find(c => c.id === id)?.initial ?? [])

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value })

  // El RIF se normaliza a mayúscula: escribir "j-123..." es correcto.
  const setRif = (e: React.ChangeEvent<HTMLInputElement>) =>
    setD({ ...d, rif: e.target.value.toUpperCase() })

  // El RIF es suficiente para abrir el expediente: se crea al salir del
  // campo, antes de que el usuario termine el primer bloque.
  useEffect(() => {
    if (!onDraftSaved || !V.RIF_RE.test(d.rif.trim())) return
    const slug = window.location.pathname.split('/').filter(Boolean)[0]
    const rif = d.rif.trim().toUpperCase()
    const key = `portal-token:${slug}:${rif}`
    if (localStorage.getItem(key)) return
    httpClient.post(`/portal/${encodeURIComponent(slug)}/borradores`, { rif })
      .then(r => { const token = r.data?.data?.token; if (token) localStorage.setItem(key, token) })
      .catch(() => undefined)
  }, [d.rif, onDraftSaved])

  const shareholders = people.filter(p => p.rol === 'Accionista')
  const suma = shareholders.reduce((a, p) => a + (p.porcentaje || 0), 0)
  const hayRepresentante = people.some(p => p.rol === 'Representante legal')

  // Errores por campo. null = válido.
  const err = {
    legalName: V.legalName(d.legalName),
    rif: V.rif(d.rif, rifsExistentes),
    registroNumero: d.registroNumero.trim() && !/^\d+$/.test(d.registroNumero.trim()) ? 'Solo números.' : null,
    registroTomo: d.registroTomo.trim() && !/^[\dA-Za-z-]+$/.test(d.registroTomo.trim()) ? 'Ejemplo: 42-A' : null,
    registroFolio: d.registroFolio.trim() && !/^\d+$/.test(d.registroFolio.trim()) ? 'Solo números.' : null,
    subscribedCapital: V.optionalAmount(d.subscribedCapital),
    currentCapital: V.optionalAmount(d.currentCapital),
    address: V.address(d.address),
    phone: V.phone(d.phone),
    email: V.email(d.email),
    web: V.web(d.web),
    activity: V.selection(d.activity, 'Seleccione la actividad económica'),
    activityDetail: d.activityDetail.trim().length > 0 && d.activityDetail.trim().length < 15
      ? 'Describa la actividad con más detalle.' : null,
    declaredAmount: V.monto(d.declaredAmount, 'El monto a movilizar'),
  } as Record<string, string | null>

  // Solo se muestra el error si el campo fue tocado o si ya se intentó avanzar.
  const e = (k: string) => (tocado[k] ? err[k] ?? undefined : undefined)

  const sinErrores = (ks: string[]) => ks.every(k => !err[k])

  const valido: Record<number, boolean> = {
    1: sinErrores(['legalName', 'rif', 'registroNumero', 'registroTomo', 'registroFolio', 'subscribedCapital', 'currentCapital']),
    2: sinErrores(['address', 'phone', 'email', 'web']),
    3: shareholders.length > 0 && hayRepresentante && suma <= 100,
    4: sinErrores(['activity', 'activityDetail', 'declaredAmount']),
  }
  const completo = Object.values(valido).every(Boolean)

  /** Al pasar de bloque, se marcan sus campos como tocados para que los errores salgan. */
  const STEP_FIELDS: Record<number, string[]> = {
    1: ['legalName', 'rif', 'registroNumero', 'registroTomo', 'registroFolio', 'subscribedCapital', 'currentCapital'],
    2: ['address', 'phone', 'email', 'web'],
    3: [],
    4: ['activity', 'activityDetail', 'declaredAmount'],
  }
  /** Solo se puede volver a un bloque ya desbloqueado. Hacia adelante, ver avanzar(). */
  const goTo = (n: number) => { if (n <= desbloqueado) setPaso(n) }

  const buildClient = (status: Client['status'], stepReached: number): Omit<Client, 'code'> => ({
    ...d,
    companyId: user?.companyId ?? company?.id ?? '',
    declaredAmount: d.declaredAmount ? V.formatearMonto(d.declaredAmount) : '',
    subscribedCapital: d.subscribedCapital ? V.formatearMonto(d.subscribedCapital) : '',
    currentCapital: d.currentCapital ? V.formatearMonto(d.currentCapital) : '',
    registro: [d.registroNumero && `N.º ${d.registroNumero}`, d.registroTomo && `Tomo ${d.registroTomo}`, d.registroFolio && `Folio ${d.registroFolio}`].filter(Boolean).join(', '),
    servicios, status, stepReached, people,
    registeredBy: user?.name ?? 'El propio cliente',
    registeredAt: draft?.registeredAt ?? new Date().toISOString().slice(0, 10),
  })

  const savePortalProgress = async (status: Client['status'], stepReached: number): Promise<boolean> => {
    const client = buildClient(status, stepReached)
    const code = draft?.code ?? String(nextCode).padStart(3, '0')
    dispatch(savePortalDraft({ code: draft?.code, client, user: user?.name ?? 'Portal público', rol: user?.rol ?? 'Cliente' }))
    onDraftSaved?.({ ...client, code })
    const slug = window.location.pathname.split('/').filter(Boolean)[0]
    const key = `portal-token:${slug}:${client.rif}`
    const token = localStorage.getItem(key)
    const create = async () => {
      const r = await httpClient.post(`/portal/${encodeURIComponent(slug)}/borradores`, { rif: client.rif })
      const data = r.data?.data
      // El RIF ya fue enviado: el servidor no devuelve token y no se debe
      // seguir mostrando un formulario con un token muerto.
      if (!data?.token) {
        localStorage.removeItem(key)
        onDraftSaved?.({ ...client, code, status: 'PENDIENTE' })
        return false
      }
      localStorage.setItem(key, data.token)
      await httpClient.patch(`/portal/${encodeURIComponent(slug)}/borradores/${encodeURIComponent(data.token)}/pasos/${stepReached}`, { answers: client })
      return true
    }
    try {
      if (token) {
        await httpClient.patch(`/portal/${encodeURIComponent(slug)}/borradores/${encodeURIComponent(token)}/pasos/${stepReached}`, { answers: client })
        return true
      }
      return await create()
    } catch (error: any) {
      if (error?.response?.status === 404) {
        localStorage.removeItem(key)
        try { return await create() } catch { return false }
      }
      return false
    }
  }

  /** Avanza si el bloque actual está completo; si no, marca sus campos y se queda. */
  const avanzar = () => {
    setTocado(t => ({ ...t, ...Object.fromEntries(STEP_FIELDS[paso].map(k => [k, true])) }))
    if (!valido[paso]) return
    const siguiente = Math.min(paso + 1, PASOS.length)
    if (onDraftSaved) savePortalProgress('BORRADOR', siguiente)
    setDesbloqueado(d => Math.max(d, siguiente))
    setPaso(siguiente)
  }

  const save = async () => {
    if (!completo) return
    if (onDraftSaved) {
      const guardado = await savePortalProgress('PENDIENTE', PASOS.length)
      if (!guardado) return
    }
    else {
      const client = buildClient('PENDIENTE', PASOS.length)
      await maestroApi.createClient({
        tipo_persona: 'juridica', document: client.rif, razon_social: client.legalName,
        sector_economico: client.sector, actividad_economica: client.activityDetail || client.activity,
        origen_fondos: client.fundOrigin, ingresos_estimados: client.ingresos,
        frecuencia_operacion: client.frequency, direccion: client.address,
        email: client.email || undefined, phone: client.phone,
      })
      dispatch(createClient({ client, user: user?.name ?? '—', rol: user?.rol ?? '—' }))
    }
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
              const status = listo ? 'ok' : p.n === paso ? 'actual' : bloqueado ? 'bloq' : 'pend'
              return (
                <button key={p.n} className="nc-paso" onClick={() => goTo(p.n)} disabled={bloqueado}
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
                      background: status === 'ok' ? 'var(--ok)' : status === 'actual' ? 'var(--pri)' : 'var(--border)',
                      color: status === 'ok' || status === 'actual' ? '#fff' : 'var(--muted)',
                    }}>{status === 'ok' ? '✓' : status === 'bloq' ? '·' : p.n}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.label}</div>
                      <div className="nc-paso-sub" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {status === 'ok' ? 'Completo' : status === 'bloq' ? 'Bloqueado' : p.sub}
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
                <Field label="Razón social" error={e('legalName')}>
                  <input value={d.legalName} onChange={set('legalName')} onBlur={marcar('legalName')} placeholder="Nombre legal completo" />
                </Field>
                <Field label="RIF" error={e('rif')} hint="Se admite en minúscula; el sistema lo normaliza.">
                  <input value={d.rif} onChange={setRif} onBlur={marcar('rif')} placeholder="J-00000000-0" />
                </Field>
                <Field label="Tipo de empresa jurídica">
                  <select value={d.tipo} onChange={set('tipo')}>
                    {(CATALOGS.tipo_empresa ?? []).map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Sector económico">
                  <select value={d.sector} onChange={set('sector')}>
                    {(CATALOGS.sector ?? []).map(v => <option key={v}>{v}</option>)}
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
                <Field label="Capital social suscrito" error={e('subscribedCapital')} hint="Solo números. Opcional.">
                  <input value={d.subscribedCapital} onChange={set('subscribedCapital')} onBlur={marcar('subscribedCapital')} placeholder="Según documento constitutivo" /></Field>
                <Field label="Capital actual" error={e('currentCapital')} hint="Solo números. Opcional.">
                  <input value={d.currentCapital} onChange={set('currentCapital')} onBlur={marcar('currentCapital')} placeholder="Según última acta de asamblea" /></Field>
              </div>
            </Card>
          )}

          {paso === 2 && (
            <Card title="Contacto y domicilio" sub="Por dónde el fondo se comunica con el inversionista.">
              <div className={grilla(5)}>
                <Field label="Domicilio fiscal" error={e('address')}>
                  <input value={d.address} onChange={set('address')} onBlur={marcar('address')} placeholder="Dirección completa" /></Field>
                <Field label="Teléfono" error={e('phone')}>
                  <input value={d.phone} onChange={set('phone')} onBlur={marcar('phone')} placeholder="+58 212 000-0000" /></Field>
                <Field label="Correo corporativo" error={e('email')}>
                  <input value={d.email} onChange={set('email')} onBlur={marcar('email')} placeholder="contacto@empresa.com" /></Field>
                <Field label="Página web" error={e('web')} hint="Opcional.">
                  <input value={d.web} onChange={set('web')} onBlur={marcar('web')} placeholder="www.empresa.com" /></Field>
                <Field label="Redes sociales"><input value={d.redes} onChange={set('redes')} placeholder="Perfil oficial, si tiene" /></Field>
              </div>
            </Card>
          )}

          {paso === 3 && (
            <Shareholding people={people} setPeople={setPeople} suma={suma}
              hayRepresentante={hayRepresentante} />
          )}

          {paso === 4 && (
            <Card title="Perfil financiero y transaccional" sub="Lo que el cliente declara. Es la base contra la que después se compara.">
              <div className={grilla(2)}>
                <Field label="Actividad económica" error={e('activity')}>
                  <select value={d.activity} onChange={set('activity')} onBlur={marcar('activity')}>
                    <option value="">Select…</option>
                    {catalogOptions('activity').map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Origen de fondos">
                  <select value={d.fundOrigin} onChange={set('fundOrigin')}>
                    {catalogOptions('origen_fondos').map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Descripción detallada de la actividad" error={e('activityDetail')} hint="Opcional, pero si la escribe debe ser descriptiva.">
                <textarea rows={3} value={d.activityDetail} onChange={set('activityDetail')} onBlur={marcar('activityDetail')}
                  placeholder="Qué hace la empresa en concreto" />
              </Field>

              <div className="sec">Profile transactional</div>
              <div className={grilla(3)}>
                <Field label="Rango de ingresos anuales">
                  <select value={d.ingresos} onChange={set('ingresos')}>
                    {INCOME_RANGES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Monto que espera movilizar" error={e('declaredAmount')} hint="Solo números. Ejemplo: 250000">
                  <input value={d.declaredAmount} onChange={set('declaredAmount')} onBlur={marcar('declaredAmount')} placeholder="250000" /></Field>
                <Field label="Frecuencia">
                  <select value={d.frequency} onChange={set('frequency')}>
                    {['Semanal', 'Quincenal', 'Mensual', 'Trimestral'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>

              <div className="sec">Servicios que contrata</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SERVICES.map(s => (
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
                {paso > 1 && <button className="btn" onClick={() => goTo(paso - 1)}>Atrás</button>}
                {paso < PASOS.length
                  ? <button className="btn pri" onClick={avanzar}>
                      Guardar y continuar
                    </button>
                  : <button className="btn pri" onClick={save} disabled={!completo}>Create client</button>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/* ---------------- Paso 3: estructura accionaria ---------------- */
const New: Omit<Person, 'id'> = {
  name: '', document: '', rol: 'Accionista', nationality: 'Venezolana', pep: false,
}

const Shareholding: React.FC<{
  people: Person[]; setPeople: (p: Person[]) => void; suma: number; hayRepresentante: boolean
}> = ({ people, setPeople, suma, hayRepresentante }) => {
  const [f, setF] = useState<Omit<Person, 'id'> & { porcentajeTxt: string }>({ ...New, porcentajeTxt: '' })
  const peoplePage = usePagination(people)
  const listo = f.name.trim().length > 3 && f.document.trim().length > 4

  const add = () => {
    setPeople([...people, {
      ...f, id: 'p' + Date.now(),
      porcentaje: f.rol === 'Accionista' && f.porcentajeTxt ? Number(f.porcentajeTxt) : undefined,
      cargo: f.rol === 'Representante legal' ? f.cargo : undefined,
      pepRole: f.pep ? f.pepRole : undefined,
    }])
    setF({ ...New, porcentajeTxt: '' })
  }

  return (
    <>
      <Card title="Estructura legal y accionaria"
        sub="Quién está detrás de la empresa. Es lo que el screening necesita para no quedarse en la fachada.">
        {people.length > 0 ? (
          <>
            <table>
              <thead><tr><th>Name</th><th>Document</th><th>Rol</th><th>%</th><th>Nationality</th><th>PEP</th><th /></tr></thead>
              <tbody>
                {peoplePage.visibleItems.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}{p.cargo && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.cargo}</div>}</td>
                    <td className="num">{p.document}</td><td>{p.rol}</td>
                    <td className="num">{p.porcentaje ? p.porcentaje + '%' : '—'}</td>
                    <td>{p.nationality}</td>
                    <td>{p.pep ? <Pill k="warn">Sí</Pill> : <span style={{ color: 'var(--muted)' }}>No</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn sm" onClick={() => setPeople(people.filter(x => x.id !== p.id))}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginator p={peoplePage.paginator} label="personas" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Suma de participación shareholding</span>
              <div className="bar" style={{ flex: 1, maxWidth: 240 }}>
                <i style={{ width: Math.min(suma, 100) + '%', background: suma > 100 ? 'var(--bad)' : 'var(--pri)' }} />
              </div>
              <b className="num" style={{ color: suma > 100 ? 'var(--bad)' : 'var(--fg)' }}>{suma}%</b>
              {suma > 100 && <Pill k="bad">Excede 100%</Pill>}
              {!hayRepresentante && <Pill k="warn">Missing un representante legal</Pill>}
            </div>
          </>
        ) : (
          <div className="empty">
            Sin people vinculadas. Se necesita al menos <b>un shareholder</b> y <b>un representante legal</b>.
          </div>
        )}
      </Card>

      <Card title="Agregar persona vinculada">
        <div className={grilla(f.rol === 'Accionista' || f.rol === 'Representante legal' ? 5 : 4)}>
          <Field label="Nombre completo"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nombres y apellidos" /></Field>
          <Field label="Documento"><input value={f.document} onChange={e => setF({ ...f, document: e.target.value })} placeholder="V-00.000.000" /></Field>
          <Field label="Rol">
            <select value={f.rol} onChange={e => setF({ ...f, rol: e.target.value as Person['rol'] })}>
              <option>Accionista</option><option>Beneficiario final</option><option>Representante legal</option>
            </select>
          </Field>
          <Field label="Nacionalidad">
            <select value={f.nationality} onChange={e => setF({ ...f, nationality: e.target.value })}>
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
            <b>¿Es person expuesta políticamente (PEP)?</b>
          </label>
          {f.pep ? (
            <div className={grilla(2)} style={{ marginTop: 13 }}>
              <Field label="Cargo público"><input value={f.pepRole ?? ''} onChange={e => setF({ ...f, pepRole: e.target.value })} placeholder="Cargo que ocupa u ocupó" /></Field>
              <Field label="Desde"><input value={f.pepSince ?? ''} onChange={e => setF({ ...f, pepSince: e.target.value })} placeholder="Año" /></Field>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 9 }}>
              Los fields de cargo y período aparecen solo si la answer es sí.
            </p>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn pri" disabled={!listo} onClick={add}>Agregar a la lista</button>
        </div>
      </Card>
    </>
  )
}
