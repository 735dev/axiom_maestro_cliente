import React from 'react'
import { Field } from '@/shared/ui'

/**
 * Formula of a calculated field. Other fields are referenced by their code
 * inside braces, for example `{ingresos} - {egresos}`.
 */
export const FormulaEditor: React.FC<{
  value: string
  onChange: (formula: string) => void
}> = ({ value, onChange }) => (
  <Field label="Fórmula" hint="Use el código de otro campo entre llaves. Puede quedar vacía.">
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Códigos de otros campos, por ejemplo {ingresos} - {egresos}"
      spellCheck={false}
      autoComplete="off"
    />
  </Field>
)
