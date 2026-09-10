import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/shared/store'
import { CLIENTES, BITACORA, type Cliente, type Persona, type EntradaBitacora, type Estado } from '../types/cliente.types'

type State = { lista: Cliente[]; bitacora: EntradaBitacora[]; proximoCodigo: number }

const initialState: State = {
  lista: CLIENTES,
  bitacora: BITACORA.filter(b => b.sistema === 'Maestro'),
  proximoCodigo: 6,
}

/** Sella la entrada con el actor tal como es en este momento. */
const sellar = (usuario: string, rol: string, accion: string, detalle: string, motivo?: string): EntradaBitacora => ({
  fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
  usuario, rol, sistema: 'Maestro', accion, detalle, motivo,
})

const slice = createSlice({
  name: 'clientes',
  initialState,
  reducers: {
    crearCliente(s, a: PayloadAction<{ cliente: Omit<Cliente, 'codigo'>; usuario: string; rol: string }>) {
      const codigo = String(s.proximoCodigo).padStart(3, '0')
      s.lista.unshift({ ...a.payload.cliente, codigo })
      s.proximoCodigo += 1
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Alta de cliente',
        `${a.payload.cliente.razonSocial} — código ${codigo} asignado`))
    },
    reemplazarClientesDesdeApi(s, a: PayloadAction<Cliente[]>) {
      s.lista = a.payload
    },
    /**
     * El portal guarda al cerrar cada bloque. Si ya existe el código, actualiza
     * únicamente ese borrador; si no, asigna el código único en este primer
     * guardado. Así el RIF puede retomar el mismo expediente sin duplicarlo.
     */
    guardarBorradorPortal(s, a: PayloadAction<{
      codigo?: string; cliente: Omit<Cliente, 'codigo'>; usuario: string; rol: string
    }>) {
      const existente = a.payload.codigo && s.lista.find(c => c.codigo === a.payload.codigo)
      const esEnvio = a.payload.cliente.estado === 'PENDIENTE'
      if (existente) {
        Object.assign(existente, a.payload.cliente)
        s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol,
          esEnvio ? 'Envío de expediente' : 'Guardado de avance',
          `${existente.razonSocial} — ${esEnvio ? 'expediente enviado' : `bloque ${existente.pasoAlcanzado} guardado`}`))
        return
      }
      const codigo = String(s.proximoCodigo).padStart(3, '0')
      s.lista.unshift({ ...a.payload.cliente, codigo })
      s.proximoCodigo += 1
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Guardado de avance',
        `${a.payload.cliente.razonSocial} — código ${codigo} asignado; bloque ${a.payload.cliente.pasoAlcanzado} guardado`))
    },
    editarCliente(s, a: PayloadAction<{ codigo: string; cambios: Partial<Cliente>; usuario: string; rol: string; motivo: string }>) {
      const c = s.lista.find(x => x.codigo === a.payload.codigo)
      if (!c) return
      const campos = Object.keys(a.payload.cambios).join(', ')
      Object.assign(c, a.payload.cambios)
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Edición de ficha',
        `${c.razonSocial} — campos: ${campos}`, a.payload.motivo))
    },
    agregarPersona(s, a: PayloadAction<{ codigo: string; persona: Persona; usuario: string; rol: string }>) {
      const c = s.lista.find(x => x.codigo === a.payload.codigo)
      if (!c) return
      c.personas.push(a.payload.persona)
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Alta de persona vinculada',
        `${a.payload.persona.nombre} — ${a.payload.persona.rol}${a.payload.persona.porcentaje ? ' ' + a.payload.persona.porcentaje + '%' : ''}`))
    },
    quitarPersona(s, a: PayloadAction<{ codigo: string; personaId: string; usuario: string; rol: string; motivo: string }>) {
      const c = s.lista.find(x => x.codigo === a.payload.codigo)
      if (!c) return
      const p = c.personas.find(x => x.id === a.payload.personaId)
      c.personas = c.personas.filter(x => x.id !== a.payload.personaId)
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Baja de persona vinculada',
        `${p?.nombre ?? a.payload.personaId} — ${c.razonSocial}`, a.payload.motivo))
    },
    cambiarEstadoRegistro(s, a: PayloadAction<{ codigo: string; estado: Estado; usuario: string; rol: string; motivo: string }>) {
      const c = s.lista.find(x => x.codigo === a.payload.codigo)
      if (!c) return
      c.estado = a.payload.estado
      s.bitacora.unshift(sellar(a.payload.usuario, a.payload.rol, 'Cambio de estado',
        `${c.razonSocial} — ${a.payload.estado}`, a.payload.motivo))
    },
  },
})

export const { crearCliente, guardarBorradorPortal, reemplazarClientesDesdeApi, editarCliente, agregarPersona, quitarPersona, cambiarEstadoRegistro } = slice.actions
export default slice.reducer

/**
 * Los clientes de la empresa de la sesión.
 *
 * El filtro vive acá, no en la pantalla. Es la misma regla que en el backend:
 * el scoping va en la consulta, nunca en un `if` posterior, porque el `if` que
 * alguien olvide es una fuga de datos entre empresas. Sin sesión no devuelve
 * nada: fallar cerrado.
 */
export const selectClientesDeMiEmpresa = (s: RootState) => {
  const empresaId = s.auth.usuario?.empresaId
  return empresaId ? s.clientes.lista.filter(c => c.empresaId === empresaId) : []
}
