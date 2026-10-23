import React from 'react'
import { useAppSelector } from '@/shared/store/hooks'
import { useCurrentCompany } from '@/shared/hooks/useCurrentCompany'
import { Card, Field, Pill } from '@/shared/ui'

export const MyProfilePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const user = useAppSelector(s => s.auth.user)
  const company = useCurrentCompany()

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <button className="btn sm" onClick={onBack}>← Volver al panel</button>
      <Card title="Mi perfil" sub="Información de su cuenta y permisos efectivos.">
        <div className="form-grid cols-2">
          <Field label="Nombre completo" value={user?.name} />
          <Field label="Correo electrónico" value={user?.email} />
          <Field label="Rol" value={user?.rol} />
          <Field label="Empresa" value={company?.name ?? (user?.companyId ? 'Empresa de la sesión' : 'Axiom Core Tech')} />
          <Field label="Ámbito" value={user?.scope === 'plataforma' ? 'Plataforma' : 'Empresa'} />
          <Field label="Estado" >
            <Pill k="ok">Sesión activa</Pill>
          </Field>
        </div>
      </Card>
      <Card title="Permisos efectivos" sub="Accesos que el servidor reconoce para esta sesión.">
        <div className="tags">
          {(user?.permissions ?? []).map(permission => <span className="tag" key={permission}>{permission}</span>)}
        </div>
      </Card>
    </div>
  )
}
