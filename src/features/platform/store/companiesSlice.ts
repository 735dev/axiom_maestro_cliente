import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { STANDARD_FIELDS, type FormField, type Section } from '../form/types'

/**
 * Versión del formulario de una empresa.
 *
 * Guarda el formulario **completo** —comunes, de núcleo y propios— y no solo
 * los agregados. Si guardara solo los extras, el día que la plataforma cambie
 * un campo común los expedientes viejos se releerían distinto, y el auditor
 * dejaría de poder saber qué se le pidió al cliente ese día.
 */
export type FormVersion = {
  version: number
  start: string
  /** Las secciones y su orden. Cada empresa tiene las suyas. */
  sections: Section[]
  fields: FormField[]
  publicadaPor: string
  reason: string
}

export type CompanyStatus = 'ACTIVA' | 'SUSPENDIDA'

export type Company = {
  id: string
  slug: string
  name: string
  rif: string
  /** Igual al slug. Quedó de cuando el portal se pensó como un dominio aparte. */
  dominio: string
  status: CompanyStatus
  start: string
  /** Historial completo. La última es la vigente. */
  form: FormVersion[]
}

/** La versión vigente de una empresa. */
export const currentVersion = (e: Company) => e.form[e.form.length - 1]

/** Cuántos campos del formulario no salen del catálogo estándar. */
export const customFields = (e: Company) => currentVersion(e).fields.filter(c => !c.standard).length

export const FONDO_GANADERO_ID = 'fondo-ganadero'
export const FONDO_GANADERO_SLUG = 'fondo-ganadero'

const HOY = '2026-10-24'
const NATURAL = 'Persona natural'
const JURIDICA = 'Persona jurídica'
const whenNatural: FormField['condition'] = {
  enlace: 'y', conditions: [{ fieldId: 'tipo_persona', operador: 'igual', value: NATURAL }],
}
const whenLegal: FormField['condition'] = {
  enlace: 'y', conditions: [{ fieldId: 'tipo_persona', operador: 'igual', value: JURIDICA }],
}

const DECLARACION =
  'Declaro que los fondos aportados al Fondo Ganadero provienen de actividades lícitas, que esta ficha es cierta y que autorizo su uso para la debida diligencia del inversionista.'

/** Atajo para armar campos del catálogo estándar. */
const est = (id: string, section: string, key: string, required = true, extra: Partial<FormField> = {}): FormField => {
  const e = STANDARD_FIELDS.find(x => x.key === key)!
  return {
    id, section, standard: key, label: e.name, tipo: e.tipo,
    required, catalog: e.catalog, placeholder: e.placeholder, help: e.help, ...extra,
  }
}

/**
 * Una sola empresa: el Fondo Ganadero. La ficha regula a los inversionistas
 * que entran al ganado — persona natural o jurídica — con origen de fondos,
 * PEP y soportes.
 */
export const INITIAL_COMPANIES: Company[] = [
  {
    id: FONDO_GANADERO_ID,
    slug: FONDO_GANADERO_SLUG,
    name: 'Fondo Ganadero, C.A.',
    rif: 'J-00000003-3',
    dominio: FONDO_GANADERO_SLUG,
    status: 'ACTIVA',
    start: HOY,
    form: [{
      version: 1,
      start: HOY,
      publicadaPor: 'Axiom Core Tech',
      reason: 'Ficha de inversionista del Fondo Ganadero.',
      sections: [
        { id: 'b1', name: 'Tipo de inversionista', sub: 'Persona natural o jurídica.' },
        { id: 'b2', name: 'Persona natural', sub: 'Datos de quien aporta a título personal.' },
        { id: 'b3', name: 'Persona jurídica', sub: 'Datos de la empresa inversionista.' },
        { id: 'b4', name: 'Contacto', sub: 'Por dónde se comunica el fondo con el inversionista.' },
        { id: 'b5', name: 'Aporte al fondo', sub: 'Monto, moneda, plazo y frecuencia.' },
        { id: 'b6', name: 'Origen de los fondos', sub: 'De dónde salen los recursos y si es PEP.' },
        { id: 'b7', name: 'Declaración', sub: 'El inversionista afirma y acepta.' },
        { id: 'b8', name: 'Soportes', sub: 'Documentos que respaldan la ficha.' },
      ],
      fields: [
        est('tipo_persona', 'b1', 'tipo_persona', true, {
          label: 'Tipo de inversionista',
          options: [NATURAL, JURIDICA],
          width: 'completo',
        }),

        { id: 'pn_documento', section: 'b2', label: 'Documento de identidad', tipo: 'documento', required: true, condition: whenNatural },
        est('nombre', 'b2', 'nombre', true, { label: 'Nombres', condition: whenNatural }),
        { id: 'fg_apellidos', section: 'b2', label: 'Apellidos', tipo: 'texto', required: true, condition: whenNatural },
        est('fg_nacimiento', 'b2', 'fecha_nacimiento', false, { condition: whenNatural }),
        est('fg_nacionalidad', 'b2', 'nacionalidad', false, { condition: whenNatural }),

        { id: 'pj_rif', section: 'b3', label: 'RIF de la empresa', tipo: 'documento', required: true, condition: whenLegal },
        est('razon_social', 'b3', 'nombre', true, { label: 'Razón social', condition: whenLegal }),
        { id: 'actividad', section: 'b3', label: 'Actividad económica', tipo: 'texto', required: false, standard: 'actividad', condition: whenLegal },
        { id: 'fg_rep_nombre', section: 'b3', label: 'Representante legal', tipo: 'texto', required: false, condition: whenLegal },
        { id: 'fg_rep_documento', section: 'b3', label: 'Documento del representante', tipo: 'documento', required: false, condition: whenLegal },

        est('correo', 'b4', 'correo', true, { width: 'medio' }),
        est('telefono', 'b4', 'telefono', true, { width: 'medio' }),
        est('domicilio', 'b4', 'domicilio', true, { width: 'completo' }),

        { id: 'ingresos', section: 'b5', label: 'Monto del aporte', tipo: 'moneda', required: true, standard: 'monto_declarado' },
        { id: 'fg_moneda', section: 'b5', label: 'Moneda', tipo: 'lista', required: true, options: ['Bolívar', 'Dólar estadounidense', 'Euro'] },
        { id: 'fg_plazo', section: 'b5', label: 'Plazo', tipo: 'lista', required: true, options: ['12 meses', '24 meses', '36 meses', '60 meses'] },
        { id: 'frecuencia', section: 'b5', label: 'Frecuencia del aporte', tipo: 'lista', required: true, standard: 'frecuencia', options: ['Aporte único', 'Mensual', 'Trimestral', 'Semestral', 'Anual'] },

        { id: 'origen_fondos', section: 'b6', label: 'Origen de los fondos', tipo: 'lista', required: true, standard: 'origen_fondos', width: 'completo', options: ['Actividad comercial', 'Salario', 'Venta de bienes', 'Dividendos', 'Ahorros', 'Herencia o donación', 'Otro'] },
        est('es_pep', 'b6', 'cliente_pep', true, { label: '¿Es persona expuesta políticamente?' }),

        { id: 'fg_declaracion', section: 'b7', label: DECLARACION, tipo: 'parrafo', required: false, width: 'completo' },
        { id: 'fg_acepta', section: 'b7', label: 'Acepto la declaración', tipo: 'si-no', required: true },

        { id: 'fg_doc_identidad', section: 'b8', label: 'Cédula o RIF', tipo: 'archivo', required: true },
        { id: 'fg_doc_origen', section: 'b8', label: 'Soporte del origen de los fondos', tipo: 'archivo', required: false },
      ],
    }],
  },
]

/** Sin clientes y sin formulario publicado. El administrador inicial no cuenta. */
export const companyIsEmpty = (e: Company, clientCount: number) =>
  clientCount === 0 && e.form.every(v => v.fields.length === 0 && v.sections.length === 0)

/** Lo que hace falta para dar de alta una empresa. Sin administrador no hay alta. */
export type IntakeData = {
  name: string
  rif: string
  /** Identificador público usado en la ruta /:companySlug. */
  slug: string
  /** Se conserva para compatibilidad con instalaciones que tenían dominio. */
  dominio?: string
  admin: { name: string; email: string }
}

type State = { list: Company[] }
const initialState: State = { list: INITIAL_COMPANIES }

const slice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    /**
     * Alta de empresa. Exige los datos de su administrador.
     *
     * Van en la misma acción a propósito: una empresa sin administrador no
     * tiene por dónde entrar, y si fueran dos pasos separados el que falle
     * deja una cuenta inutilizable que nadie sabe que existe. El usuario lo
     * crea `usuariosSlice`, escuchando esta misma acción.
     *
     * El id se genera en el `prepare` y no en el reducer, para que los dos
     * reducers que atienden la acción vean exactamente el mismo.
     */
    createCompany: {
      prepare: (d: IntakeData) => ({ payload: { ...d, id: 'e' + nanoid(8) } }),
      reducer: (s: State, a: PayloadAction<IntakeData & { id: string }>) => {
        s.list.push({
          id: a.payload.id, slug: a.payload.slug, name: a.payload.name, rif: a.payload.rif,
          dominio: a.payload.dominio ?? a.payload.slug, status: 'ACTIVA', start: HOY,
          form: [{
            version: 1, start: HOY, publicadaPor: 'Axiom Core Tech',
            // Nace en blanco: la plataforma no impone secciones ni campos.
            reason: 'Alta de la empresa.', sections: [], fields: [],
          }],
        })
      },
    },
    changeCompanyStatus(s, a: PayloadAction<{ id: string; status: CompanyStatus }>) {
      const e = s.list.find(x => x.id === a.payload.id)
      if (e) e.status = a.payload.status
    },
    deleteCompany(s, a: PayloadAction<string>) {
      s.list = s.list.filter(x => x.id !== a.payload)
    },
    editCompany(s, a: PayloadAction<{ id: string; name: string; rif: string; slug: string }>) {
      const e = s.list.find(x => x.id === a.payload.id)
      if (!e) return
      e.name = a.payload.name
      e.rif = a.payload.rif
      e.slug = a.payload.slug
      e.dominio = a.payload.slug
    },
    /**
     * Publica una versión nueva. No edita la vigente: la deja como está y
     * agrega otra encima, para que los expedientes ya llenados sigan siendo
     * legibles con la definición que tenían.
     */
    publishForm(s, a: PayloadAction<{ id: string; sections: Section[]; fields: FormField[]; reason: string; user: string }>) {
      const e = s.list.find(x => x.id === a.payload.id)
      if (!e) return
      e.form.push({
        version: currentVersion(e).version + 1, start: HOY,
        sections: a.payload.sections, fields: a.payload.fields,
        publicadaPor: a.payload.user, reason: a.payload.reason,
      })
    },
    replaceFormFromApi(s, a: PayloadAction<{ id: string; versions: FormVersion[] }>) {
      const company = s.list.find(x => x.id === a.payload.id)
      // La API entrega el historial más reciente primero; el editor y
      // versionVigente trabajan con la vigente al final del arreglo.
      if (company) company.form = [...a.payload.versions].sort((x, y) => x.version - y.version)
    },
  },
})

export const {
  createCompany, changeCompanyStatus, deleteCompany: companyRemoved,
  editCompany, publishForm, replaceFormFromApi,
} = slice.actions
export default slice.reducer
export type { FormField, Section }

type StoreSnap = {
  companies: State
  clients: { list: Array<{ companyId: string }> }
}

/** Solo despacha si no hay clientes ni formulario. El administrador inicial no cuenta. */
export const deleteCompany = (id: string) =>
  (dispatch: (action: ReturnType<typeof companyRemoved>) => void, getState: () => StoreSnap) => {
    const s = getState()
    const e = s.companies.list.find(x => x.id === id)
    const clientes = s.clients.list.filter(c => c.companyId === id).length
    if (!e || !companyIsEmpty(e, clientes)) return
    dispatch(companyRemoved(id))
  }
