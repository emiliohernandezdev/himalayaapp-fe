import type { SVGProps } from 'react'

type HimalayaLogoProps = SVGProps<SVGSVGElement> & {
  title?: string
}

export function HimalayaLogo({ title = 'Himalaya', ...props }: HimalayaLogoProps) {
  return (
    <svg viewBox="0 0 96 64" role="img" aria-label={title} {...props}>
      <path
        d="M9 54 35.4 13.5c1.2-1.8 3.9-1.8 5.1 0L66 54H9Z"
        fill="#075985"
      />
      <path
        d="M31.5 54 58.8 9.4c1.2-2 4.1-2 5.3 0L88 54H31.5Z"
        fill="#0c4a6e"
      />
      <path d="m35.8 20.5 7.5 11.4-6.7-2.7-6.8 7.3-3.6-4.2 9.6-11.8Z" fill="#e0f2fe" />
      <path d="m59.8 16.9 8.6 14.2-7.8-3.3-8 8.3-3.5-4.6 10.7-14.6Z" fill="#bae6fd" />
    </svg>
  )
}
