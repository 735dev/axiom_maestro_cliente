import React from 'react'
import { useAppSelector } from '@/shared/store/hooks'
import { useEmpresaActual } from '@/shared/hooks/useEmpresaActual'
import { Card, Field, Pill } from '@/shared/ui'

export const MiPerfilPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const usuario = useAppSelector(s => s.auth.usuario)
  const empresa = useEmpresaActual()

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <button className="btn sm" onClick={onBack}>← Volver al panel</button>
      <Card title="Mi perfil" sub="Información de su cuenta y permisos efectivos.">
        <div className="form-grid cols-2">
          <Field label="Nombre completo" value={usuario?.nombre} />
          <Field label="Correo electrónico" value={usuario?.email} />
          <Field label="Rol" value={usuario?.rol} />
          <Field label="Empresa" value={empresa?.nombre ?? (usuario?.empresaId ? 'Empresa de la sesión' : 'Axiom Core Tech')} />
          <Field label="Ámbito" value={usuario?.ambito === 'plataforma' ? 'Plataforma' : 'Empresa'} />
          <Field label="Estado" >
            <Pill k="ok">Sesión activa</Pill>
          </Field>
        </div>
      </Card>
      <Card title="Permisos efectivos" sub="Accesos que el servidor reconoce para esta sesión.">
        <div className="tags">
          {(usuario?.permisos ?? []).map(permiso => <span className="tag" key={permiso}>{permiso}</span>)}
        </div>
      </Card>
    </div>
  )
}
