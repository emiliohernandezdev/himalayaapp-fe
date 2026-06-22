import type { SVGProps } from 'react'

type HimalayaLogoProps = SVGProps<SVGSVGElement> & {
  title?: string
}

export function HimalayaLogo({ title = 'Himalaya', ...props }: HimalayaLogoProps) {
  return (
    <svg viewBox="0 0 112 76" role="img" aria-label={title} {...props}>
      <defs>
        <linearGradient id="himalaya-logo-main" x1="14" y1="66" x2="83" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="var(--himalaya-accent)" />
        </linearGradient>
      </defs>
      <path
        d="M12 60c17-31 46-49 88-46"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.22"
      />
      <circle cx="78" cy="18" r="8" fill="var(--himalaya-accent)" opacity="0.9" />
      <path
        d="M8 64 36 20c1.4-2.2 4.7-2.2 6.1 0L70 64H8Z"
        fill="url(#himalaya-logo-main)"
        opacity="0.9"
      />
      <path
        d="M34 64 64 11c1.5-2.6 5.3-2.5 6.7.1L104 64H34Z"
        fill="color-mix(in srgb, currentColor 70%, var(--himalaya-accent))"
      />
      <path d="m37 23 8 13-8-3-8 9-4-5 12-14Z" fill="var(--himalaya-surface)" opacity="0.95" />
      <path d="m66 15 10 17-9-4-10 10-4-6 13-17Z" fill="var(--himalaya-surface)" opacity="0.9" />
      <path d="M18 64h80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.18" />
    </svg>
  )
}
