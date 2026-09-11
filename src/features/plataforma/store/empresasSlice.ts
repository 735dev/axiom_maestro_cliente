import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { CAMPOS_ESTANDAR, type Campo, type Seccion } from '../formulario/tipos'

/**
 * Versión del formulario de una empresa.
 *
 * Guarda el formulario **completo** —comunes, de núcleo y propios— y no solo
 * los agregados. Si guardara solo los extras, el día que la plataforma cambie
 * un campo común los expedientes viejos se releerían distinto, y el auditor
 * dejaría de poder saber qué se le pidió al cliente ese día.
 */
export type VersionFormulario = {
  version: number
  desde: string
  /** Las secciones y su orden. Cada empresa tiene las suyas. */
  secciones: Seccion[]
  campos: Campo[]
  publicadaPor: string
  motivo: string
}

export type EstadoEmpresa = 'ACTIVA' | 'SUSPENDIDA'

export type Empresa = {
  id: string
  slug: string
  nombre: string
  rif: string
  /** Subdominio del portal público de esa empresa. */
  dominio: string
  estado: EstadoEmpresa
  desde: string
  /** Historial completo. La última es la vigente. */
  formulario: VersionFormulario[]
}

/** La versión vigente de una empresa. */
export const versionVigente = (e: Empresa) => e.formulario[e.formulario.length - 1]

/** Cuántos campos del formulario no salen del catálogo estándar. */
export const camposPropios = (e: Empresa) => versionVigente(e).campos.filter(c => !c.estandar).length

const HOY = '2026-09-01'

const v1 = (secciones: Seccion[], campos: Campo[], desde: string): VersionFormulario => ({
  version: 1, desde, secciones, campos,
  publicadaPor: 'Axiom Core Tech', motivo: 'Puesta en marcha.',
})

/**
 * Historial de ejemplo de Transvalor: arranca en v1 y publica una v2 con
 * cambios de los tres tipos —agregado, quitado y modificado— para que el
 * comparador tenga algo real que mostrar.
 */
const transvalor = (secciones: Seccion[], campos: Campo[]): VersionFormulario[] => {
  const uno = v1(secciones, campos, '2026-08-04')

  const dos: VersionFormulario = {
    version: 2, desde: '2026-09-01',
    publicadaPor: 'Rosa Marcano',
    motivo: 'Instrucción de la Unidad de Prevención: se exige el documento constitutivo y se deja de pedir el capital, que no se usaba.',
    secciones: [
      ...uno.secciones.map(x => x.id === 'b4' ? { ...x, nombre: 'Perfil económico y operativo' } : x),
      { id: 'b5', nombre: 'Declaraciones', sub: 'Lo que el cliente afirma bajo su responsabilidad.' },
    ],
    campos: [
      ...uno.campos
        .filter(c => c.id !== 'cX')
        .map(c => c.id === 'c7' ? { ...c, obligatorio: true } : c),
      { id: 'c24', seccion: 'b5', etiqueta: 'Declara que los fondos son de origen lícito', tipo: 'si-no', obligatorio: true },
    ],
  }
  // v1 tenía un campo que v2 ya no pide.
  uno.campos = [...uno.campos, { id: 'cX', seccion: 'b1', etiqueta: 'Capital social', tipo: 'moneda', obligatorio: false, estandar: 'capital' }]
  return [uno, dos]
}

/** Atajo para armar campos de demostración sin repetir el tipo del catálogo. */
const est = (id: string, seccion: string, clave: string, obligatorio = true, extra: Partial<Campo> = {}): Campo => {
  const e = CAMPOS_ESTANDAR.find(x => x.clave === clave)!
  return {
    id, seccion, estandar: clave, etiqueta: e.nombre, tipo: e.tipo,
    obligatorio, catalogo: e.catalogo, marcador: e.marcador, ayuda: e.ayuda, ...extra,
  }
}

/**
 * Empresas de ejemplo. Cada una armó un formulario distinto, que es
 * exactamente el punto: la plataforma no impone ninguno.
 */
export const EMPRESAS_INICIALES: Empresa[] = [
  {
    // Sujeto obligado completo: usa todo el catálogo.
    id: 'transvalor', slug: 'transvalor-orinoco-c-a', nombre: 'Transvalor', rif: 'J-30512345-9',
    dominio: 'registro.transvalor.com', estado: 'ACTIVA', desde: '2026-09-01',
    formulario: transvalor([
        { id: 'b1', nombre: 'Datos de la empresa', sub: 'Quién es la compañía.' },
        { id: 'b2', nombre: 'Contacto', sub: 'Por dónde nos comunicamos.' },
        { id: 'b3', nombre: 'Accionistas y representantes', sub: 'Quién está detrás.' },
        { id: 'b4', nombre: 'Perfil económico', sub: 'Qué espera movilizar.' },
      ], [
        est('c0', 'b1', 'tipo_persona'),
        est('c1', 'b1', 'nombre'),
        est('c2', 'b1', 'documento'),
        est('c3', 'b1', 'tipo_empresa', false),
        est('c4', 'b1', 'sector'),
        est('c5', 'b1', 'actividad'),
        est('c6', 'b1', 'registro_mercantil', false),
        { id: 'c7', seccion: 'b1', etiqueta: 'Documento constitutivo', tipo: 'archivo', obligatorio: true, ayuda: 'PDF del acta vigente.' },
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
          id: 'c19', seccion: 'b3', etiqueta: 'Organismo donde ejerce', tipo: 'texto', obligatorio: true,
          condicion: { enlace: 'y', condiciones: [{ campoId: 'c18', operador: 'igual', valor: 'si' }] },
        },
        est('c20', 'b4', 'origen_fondos'),
        est('c21', 'b4', 'ingresos'),
        est('c22', 'b4', 'monto_declarado'),
        est('c23', 'b4', 'frecuencia'),
      ]),
  },
  {
    // No hace screening de personas: su formulario es corto y no toca PEP.
    id: 'demo-seguros', slug: 'empresa-demo-dos-c-a', nombre: 'Seguros del Centro', rif: 'J-31998877-1',
    dominio: 'clientes.segurosdelcentro.com', estado: 'ACTIVA', desde: '2026-08-15',
    formulario: [v1(
      [
        { id: 'b1', nombre: 'Datos del tomador', sub: 'Quién contrata la póliza.' },
        { id: 'b2', nombre: 'Cobertura', sub: 'Qué se quiere asegurar.' },
      ],
      [
        est('c1', 'b1', 'nombre'),
        est('c2', 'b1', 'documento'),
        est('c3', 'b1', 'correo'),
        est('c4', 'b1', 'telefono'),
        { id: 'c5', seccion: 'b2', etiqueta: 'Tipo de póliza', tipo: 'lista', obligatorio: true, opciones: ['Vehículo', 'Salud', 'Patrimonial', 'Vida'] },
        { id: 'c6', seccion: 'b2', etiqueta: 'Suma asegurada', tipo: 'moneda', obligatorio: true },
        { id: 'c7', seccion: 'b2', etiqueta: 'Inicio de vigencia', tipo: 'fecha', obligatorio: true },
      ], '2026-08-15')],
  },
  {
    // Recién dada de alta: el formulario está en blanco.
    id: 'demo-casa', slug: 'casa-de-bolsa-andina', nombre: 'Casa de Bolsa Andina', rif: 'J-40223344-7',
    dominio: 'registro.cbandina.com', estado: 'SUSPENDIDA', desde: '2026-06-02',
    formulario: [v1([], [], '2026-06-02')],
  },
]

/** Lo que hace falta para dar de alta una empresa. Sin administrador no hay alta. */
export type DatosAlta = {
  nombre: string
  rif: string
  dominio: string
  admin: { nombre: string; correo: string }
}

type State = { lista: Empresa[] }
const initialState: State = { lista: EMPRESAS_INICIALES }

const slice = createSlice({
  name: 'empresas',
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
    crearEmpresa: {
      prepare: (d: DatosAlta) => ({ payload: { ...d, id: 'e' + nanoid(8) } }),
      reducer: (s: State, a: PayloadAction<DatosAlta & { id: string }>) => {
        s.lista.push({
          id: a.payload.id, slug: a.payload.nombre.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), nombre: a.payload.nombre, rif: a.payload.rif,
          dominio: a.payload.dominio, estado: 'ACTIVA', desde: HOY,
          formulario: [{
            version: 1, desde: HOY, publicadaPor: 'Axiom Core Tech',
            // Nace en blanco: la plataforma no impone secciones ni campos.
            motivo: 'Alta de la empresa.', secciones: [], campos: [],
          }],
        })
      },
    },
    cambiarEstadoEmpresa(s, a: PayloadAction<{ id: string; estado: EstadoEmpresa }>) {
      const e = s.lista.find(x => x.id === a.payload.id)
      if (e) e.estado = a.payload.estado
    },
    /**
     * Publica una versión nueva. No edita la vigente: la deja como está y
     * agrega otra encima, para que los expedientes ya llenados sigan siendo
     * legibles con la definición que tenían.
     */
    publicarFormulario(s, a: PayloadAction<{ id: string; secciones: Seccion[]; campos: Campo[]; motivo: string; usuario: string }>) {
      const e = s.lista.find(x => x.id === a.payload.id)
      if (!e) return
      e.formulario.push({
        version: versionVigente(e).version + 1, desde: HOY,
        secciones: a.payload.secciones, campos: a.payload.campos,
        publicadaPor: a.payload.usuario, motivo: a.payload.motivo,
      })
    },
  },
})

export const { crearEmpresa, cambiarEstadoEmpresa, publicarFormulario } = slice.actions
export default slice.reducer
export type { Campo, Seccion }
