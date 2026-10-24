import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import auth from './slices/authSlice'
import ui from './slices/uiSlice'
import lang from './slices/langSlice'
import clients from '@/features/clients/store/clientsSlice'
import users from '@/features/users/store/usersSlice'
import catalogs from '@/features/catalogs/store/catalogsSlice'
import companies from '@/features/platform/store/companiesSlice'
import audit from '@/shared/audit/auditSlice'
import { describe } from '@/shared/audit/describe'
import notifications from '@/shared/notifications/notificationsSlice'
import { generateNotifications } from '@/shared/notifications/generate'

const root = combineReducers({ auth, ui, lang, clients, users, catalogs, companies, audit, notifications })

/**
 * Envoltorio de auditoría sobre el reducer raíz.
 *
 * Va acá y no en cada slice por una razón concreta: **ninguna mutación puede
 * escaparse**. Si el registro dependiera de que cada reducer se acuerde de
 * escribir su entrada, la primera acción que alguien agregue sin acordarse no
 * queda registrada, y nadie se entera hasta que un auditor pregunta.
 *
 * Además ve el estado antes y después, que es lo que permite guardar el valor
 * anterior y el nuevo sin pedírselo al que dispara la acción.
 *
 * Las notificaciones nacen acá mismo y por la misma razón: `generarNotificaciones`
 * ve las mismas dos fotos del estado, así que un evento que merece avisarle a
 * alguien no puede escaparse por falta de un `dispatch` extra en la pantalla
 * que lo originó.
 */
const withAudit: typeof root = (status, action) => {
  let siguiente = root(status, action)
  if (!status) return siguiente

  const entry = describe(action, status, siguiente)
  // Solo se antepone. No hay camino en el código que edite o quite una entrada.
  if (entry) siguiente = { ...siguiente, audit: { registro: [entry, ...siguiente.audit.registro] } }

  const notices = generateNotifications(action, status, siguiente)
  if (notices.length) siguiente = { ...siguiente, notifications: { list: [...notices, ...siguiente.notifications.list] } }

  return siguiente
}
/**
 * Versión de la forma del estado guardado.
 *
 * Subirla cuando cambie la **estructura** de alguna porción persistida, no
 * cuando cambien los datos. Sin esto, el navegador rehidrata la forma vieja
 * encima de la nueva y el resultado es una pantalla vacía sin ningún error:
 * el caso más difícil de diagnosticar, porque nada falla, solo falta.
 *
 * v2 — `empresas` pasó a guardar el formulario completo, y `clientes` y
 *      `usuarios` ganaron `empresaId`.
 * v3 — cada versión del formulario guarda también sus bloques.
 * v4 — el formulario nace vacío; los campos apuntan al catálogo estándar.
 * v5 — 'bloque' pasó a llamarse 'seccion' en la definición del formulario.
 * v6 — el catálogo distingue persona natural de jurídica; cambiaron claves.
 * v7 — el catálogo dejó de referirse a los procesos de Prevención.
 * v8 — historial de ejemplo con dos versiones por empresa.
 * v9 — registro de auditoría único para todo el sistema.
 * v10 — toda empresa tiene su usuario administrador.
 * v11 — padrón único: el personal de Axiom vive en la misma lista, sin empresa.
 * v12 — catálogo de permisos ampliado y autodescriptivo.
 * v13 — catálogos por empresa; los campos de lista apuntan a un catálogo.
 * v14 — la v13 salió con la migración incompleta: no invalidaba `catalogos`.
 *       Una versión ya consumida no se arregla editándola —el navegador la dio
 *       por aplicada—, así que se emite la siguiente.
 * v15 — se descarta la sesión guardada: las de antes de v11 no tienen `ambito`,
 *       y una sesión sin ámbito no se puede enrutar a ningún lado.
 * v16 — el cliente perdió `nivel` (el riesgo vive en Prevención, no acá); el
 *       `Estado` ganó `REVISADO` e `INHABILITADO`; nace la porción `notificaciones`.
 * v17 — el campo del formulario cambió `dependeDe` (un disparador sí/no) por
 *       `condicion` (grupo de condiciones con operador y enlace Y/O), y sumó
 *       `ancho`. Vive dentro de `empresas`, ya invalidada.
 * v18 — se corrige la separación de funciones: el Oficial de Cumplimiento no
 *       aprueba ni inhabilita clientes; esas facultades son del Administrador
 *       del Maestro. Se renueva también la sesión para no conservar permisos
 *       efectivos calculados con el rol anterior.
 * v22 — una sola empresa: Fondo Ganadero y su ficha de inversionista.
 */
const STATE_VERSION = 22

/**
 * Porciones cuya forma cambió. Se descartan; el resto se conserva.
 *
 * Subir la versión sin agregar acá la porción que cambió no sirve de nada: la
 * vieja se rehidrata igual y revienta el primer selector que la lea.
 */
const INVALIDATED = ['companies', 'clients', 'users', 'audit', 'catalogs', 'auth', 'notifications']

const persisted = persistReducer({
  key: 'app',
  storage,
  version: STATE_VERSION,
  whitelist: ['auth', 'ui', 'lang', 'clients', 'users', 'catalogs', 'companies', 'audit', 'notifications'],
  // Devolver una porción en `undefined` hace que combineReducers use su estado
  // inicial: es la forma limpia de descartar lo incompatible sin tocar el resto.
  migrate: (status: any) => {
    if (!status) return Promise.resolve(status)
    if ((status._persist?.version ?? -1) < STATE_VERSION) return Promise.resolve(undefined)
    if ((status._persist?.version ?? -1) >= STATE_VERSION) return Promise.resolve(status)
    const limpio = { ...status }
    INVALIDATED.forEach(k => { limpio[k] = undefined })
    return Promise.resolve(limpio)
  },
}, withAudit)

export const store = configureStore({
  reducer: persisted,
  middleware: (g) => g({ serializableCheck: false }),
})
export const persistor = persistStore(store)
export type RootState = ReturnType<typeof root>
export type AppDispatch = typeof store.dispatch

let ref: typeof store | null = store
export const getStoreRef = () => ref
