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

const HOY = '2026-09-01'

const v1 = (sections: Section[], fields: FormField[], start: string): FormVersion => ({
  version: 1, start, sections, fields,
  publicadaPor: 'Axiom Core Tech', reason: 'Puesta en marcha.',
})

/**
 * Historial de ejemplo de Transvalor: arranca en v1 y publica una v2 con
 * cambios de los tres tipos —agregado, quitado y modificado— para que el
 * comparador tenga algo real que mostrar.
 */
const transvalor = (sections: Section[], fields: FormField[]): FormVersion[] => {
  const uno = v1(sections, fields, '2026-08-04')

  const dos: FormVersion = {
    version: 2, start: '2026-09-01',
    publicadaPor: 'Rosa Marcano',
    reason: 'Instrucción de la Unidad de Prevención: se exige el documento constitutivo y se deja de pedir el capital, que no se usaba.',
    sections: [
      ...uno.sections.map(x => x.id === 'b4' ? { ...x, name: 'Perfil económico y operativo' } : x),
      { id: 'b5', name: 'Declaraciones', sub: 'Lo que el cliente afirma bajo su responsabilidad.' },
    ],
    fields: [
      ...uno.fields
        .filter(c => c.id !== 'cX')
        .map(c => c.id === 'c7' ? { ...c, required: true } : c),
      { id: 'c24', section: 'b5', label: 'Declara que los fondos son de origen lícito', tipo: 'si-no', required: true },
    ],
  }
  // v1 tenía un campo que v2 ya no pide.
  uno.fields = [...uno.fields, { id: 'cX', section: 'b1', label: 'Capital social', tipo: 'moneda', required: false, standard: 'capital' }]
  return [uno, dos]
}

/** Atajo para armar campos de demostración sin repetir el tipo del catálogo. */
const est = (id: string, section: string, key: string, required = true, extra: Partial<FormField> = {}): FormField => {
  const e = STANDARD_FIELDS.find(x => x.key === key)!
  return {
    id, section, standard: key, label: e.name, tipo: e.tipo,
    required, catalog: e.catalog, placeholder: e.placeholder, help: e.help, ...extra,
  }
}

/**
 * Empresas de ejemplo. Cada una armó un formulario distinto, que es
 * exactamente el punto: la plataforma no impone ninguno.
 */
export const INITIAL_COMPANIES: Company[] = [
  {
    // Sujeto obligado completo: usa todo el catálogo.
    id: 'transvalor', slug: 'transvalor-orinoco-c-a', name: 'Transvalor', rif: 'J-30512345-9',
    dominio: 'registro.transvalor.com', status: 'ACTIVA', start: '2026-09-01',
    form: transvalor([
        { id: 'b1', name: 'Datos de la empresa', sub: 'Quién es la compañía.' },
        { id: 'b2', name: 'Contacto', sub: 'Por dónde nos comunicamos.' },
        { id: 'b3', name: 'Accionistas y representantes', sub: 'Quién está detrás.' },
        { id: 'b4', name: 'Perfil económico', sub: 'Qué espera movilizar.' },
      ], [
        est('c0', 'b1', 'tipo_persona'),
        est('c1', 'b1', 'nombre'),
        est('c2', 'b1', 'documento'),
        est('c3', 'b1', 'tipo_empresa', false),
        est('c4', 'b1', 'sector'),
        est('c5', 'b1', 'actividad'),
        est('c6', 'b1', 'registro_mercantil', false),
        { id: 'c7', section: 'b1', label: 'Documento constitutivo', tipo: 'archivo', required: true, help: 'PDF del acta vigente.' },
        est('c8', 'b2', 'correo'),
        est('c9', 'b2', 'telefono'),
        est('c10', 'b2', 'domicilio'),
        est('c11', 'b2', 'pais'),
        est('c12', 'b2', 'web', false),
        est('c13', 'b3', 'persona_nombre'),
        est('c14', 'b3', 'persona_documento'),
        est('c15', 'b3', 'persona_rol'),
        est('c16', 'b3', 'persona_participacion', false),
        est('c17', 'b3', 'persona_nacionalidad'),
        est('c18', 'b3', 'persona_pep'),
        {
          id: 'c19', section: 'b3', label: 'Organismo donde ejerce', tipo: 'texto', required: true,
          condition: { enlace: 'y', conditions: [{ fieldId: 'c18', operador: 'igual', value: 'si' }] },
        },
        est('c20', 'b4', 'origen_fondos'),
        est('c21', 'b4', 'ingresos'),
        est('c22', 'b4', 'monto_declarado'),
        est('c23', 'b4', 'frecuencia'),
      ]),
  },
  {
    // No hace screening de personas: su formulario es corto y no toca PEP.
    id: 'demo-seguros', slug: 'empresa-demo-dos-c-a', name: 'Seguros del Centro', rif: 'J-31998877-1',
    dominio: 'clientes.segurosdelcentro.com', status: 'ACTIVA', start: '2026-08-15',
    form: [v1(
      [
        { id: 'b1', name: 'Datos del tomador', sub: 'Quién contrata la póliza.' },
        { id: 'b2', name: 'Cobertura', sub: 'Qué se quiere asegurar.' },
      ],
      [
        est('c1', 'b1', 'nombre'),
        est('c2', 'b1', 'documento'),
        est('c3', 'b1', 'correo'),
        est('c4', 'b1', 'telefono'),
        { id: 'c5', section: 'b2', label: 'Tipo de póliza', tipo: 'lista', required: true, options: ['Vehículo', 'Salud', 'Patrimonial', 'Vida'] },
        { id: 'c6', section: 'b2', label: 'Suma asegurada', tipo: 'moneda', required: true },
        { id: 'c7', section: 'b2', label: 'Inicio de vigencia', tipo: 'fecha', required: true },
      ], '2026-08-15')],
  },
  {
    // Recién dada de alta: el formulario está en blanco.
    id: 'demo-casa', slug: 'casa-de-bolsa-andina', name: 'Casa de Bolsa Andina', rif: 'J-40223344-7',
    dominio: 'registro.cbandina.com', status: 'SUSPENDIDA', start: '2026-06-02',
    form: [v1([], [], '2026-06-02')],
  },
]

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

export const { createCompany, changeCompanyStatus, editCompany, publishForm, replaceFormFromApi } = slice.actions
export default slice.reducer
export type { FormField, Section }
