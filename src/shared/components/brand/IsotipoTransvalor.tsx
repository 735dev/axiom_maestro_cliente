import type { SVGProps } from 'react'

/**
 * Marca del producto. La A de Axiom, en el ladrillo de la página, con el
 * travesaño en oro. El nombre de la empresa va al lado, en el texto.
 */
export function MarcaPortal({
  title = 'Axiom',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} {...props}>
      <rect width="64" height="64" rx="14" fill="#a83731" />
      <path fill="#fff" fillRule="evenodd" d="M28 13H36L51 51H41.5L37.6 40.5H26.4L22.5 51H13Z M32 22.5L37.4 36H26.6Z" />
      <rect x="19" y="35.2" width="26" height="5.6" rx="1.4" fill="#e3ad2c" />
    </svg>
  )
}
