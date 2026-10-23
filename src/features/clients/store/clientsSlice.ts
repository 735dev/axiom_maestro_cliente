import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'
import { CLIENTS, AUDIT_LOG, type Client, type Person, type AuditLogEntry, type Status } from '../types/client.types'

type State = { list: Client[]; auditLog: AuditLogEntry[]; nextCode: number }

const initialState: State = {
  list: CLIENTS,
  auditLog: AUDIT_LOG.filter(b => b.sistema === 'Maestro'),
  nextCode: 6,
}

/** Sella la entrada con el actor tal como es en este momento. */
const sellar = (user: string, rol: string, action: string, detalle: string, reason?: string): AuditLogEntry => ({
  fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
  user, rol, sistema: 'Maestro', action, detalle, reason,
})

const slice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    createClient(s, a: PayloadAction<{ client: Omit<Client, "code">; user: string; rol: string }>) {
      const code = String(s.nextCode).padStart(3, '0')
      s.list.unshift({ ...a.payload.client, code })
      s.nextCode += 1
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Alta de cliente',
        `${a.payload.client.legalName} — código ${code} asignado`))
    },
    replaceClientsFromApi(s, a: PayloadAction<Client[]>) {
      // The client list does not include related parties. A refresh must not
      // drop the people the file just loaded.
      const previous = new Map(s.list.map(c => [c.code, c.people]))
      s.list = a.payload.map(c => ({
        ...c,
        people: c.people.length ? c.people : previous.get(c.code) ?? [],
      }))
    },
    replaceClientPeople(s, a: PayloadAction<{ code: string; people: Person[] }>) {
      const client = s.list.find(c => c.code === a.payload.code)
      if (client) client.people = a.payload.people
    },
    /**
     * El portal guarda al cerrar cada bloque. Si ya existe el código, actualiza
     * únicamente ese borrador; si no, asigna el código único en este primer
     * guardado. Así el RIF puede retomar el mismo expediente sin duplicarlo.
     */
    savePortalDraft(s, a: PayloadAction<{
      code?: string; client: Omit<Client, "code">; user: string; rol: string
    }>) {
      const existente = a.payload.code && s.list.find(c => c.code === a.payload.code)
      const esEnvio = a.payload.client.status === 'PENDIENTE'
      if (existente) {
        Object.assign(existente, a.payload.client)
        s.auditLog.unshift(sellar(a.payload.user, a.payload.rol,
          esEnvio ? 'Envío de expediente' : 'Guardado de avance',
          `${existente.legalName} — ${esEnvio ? 'caseFile enviado' : `bloque ${existente.stepReached} guardado`}`))
        return
      }
      const code = String(s.nextCode).padStart(3, '0')
      s.list.unshift({ ...a.payload.client, code })
      s.nextCode += 1
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Guardado de avance',
        `${a.payload.client.legalName} — código ${code} asignado; bloque ${a.payload.client.stepReached} guardado`))
    },
    editClient(s, a: PayloadAction<{ code: string; cambios: Partial<Client>; user: string; rol: string; reason: string }>) {
      const c = s.list.find(x => x.code === a.payload.code)
      if (!c) return
      const fields = Object.keys(a.payload.cambios).join(', ')
      Object.assign(c, a.payload.cambios)
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Edición de ficha',
        `${c.legalName} — campos: ${fields}`, a.payload.reason))
    },
    addPerson(s, a: PayloadAction<{ code: string; person: Person; user: string; rol: string }>) {
      const c = s.list.find(x => x.code === a.payload.code)
      if (!c) return
      c.people.push(a.payload.person)
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Alta de persona vinculada',
        `${a.payload.person.name} — ${a.payload.person.rol}${a.payload.person.porcentaje ? ' ' + a.payload.person.porcentaje + '%' : ''}`))
    },
    removePerson(s, a: PayloadAction<{ code: string; personId: string; user: string; rol: string; reason: string }>) {
      const c = s.list.find(x => x.code === a.payload.code)
      if (!c) return
      const p = c.people.find(x => x.id === a.payload.personId)
      c.people = c.people.filter(x => x.id !== a.payload.personId)
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Baja de persona vinculada',
        `${p?.name ?? a.payload.personId} — ${c.legalName}`, a.payload.reason))
    },
    changeRecordStatus(s, a: PayloadAction<{ code: string; status: Status; user: string; rol: string; reason: string }>) {
      const c = s.list.find(x => x.code === a.payload.code)
      if (!c) return
      c.status = a.payload.status
      s.auditLog.unshift(sellar(a.payload.user, a.payload.rol, 'Cambio de estado',
        `${c.legalName} — ${a.payload.status}`, a.payload.reason))
    },
  },
})

export const { createClient, savePortalDraft, replaceClientsFromApi, replaceClientPeople, editClient, addPerson, removePerson, changeRecordStatus } = slice.actions
export default slice.reducer

/**
 * Los clientes de la empresa de la sesión.
 *
 * El filtro vive acá, no en la pantalla. Es la misma regla que en el backend:
 * el scoping va en la consulta, nunca en un `if` posterior, porque el `if` que
 * alguien olvide es una fuga de datos entre empresas. Sin sesión no devuelve
 * nada: fallar cerrado.
 */
const selectCompanyId = (s: RootState) => s.auth.user?.companyId
const EMPTY_CLIENTS: Client[] = []
export const selectClientsOfMyCompany = createSelector(
  [selectCompanyId, (s: RootState) => s.clients.list],
  (companyId, list) => companyId ? list.filter(c => c.companyId === companyId) : EMPTY_CLIENTS,
)
