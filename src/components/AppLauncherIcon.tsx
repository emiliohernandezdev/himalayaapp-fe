type AppLauncherIconProps = {
  className?: string
}

const cells = [
  'bg-sky-500',
  'bg-cyan-400',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-amber-400',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-rose-400',
  'bg-blue-600',
]

export function AppLauncherIcon({ className }: AppLauncherIconProps) {
  return (
    <span className={`grid grid-cols-3 gap-0.5 ${className ?? ''}`} aria-hidden="true">
      {cells.map((cell, index) => (
        <span key={index} className={`h-1.5 w-1.5 rounded-[2px] ${cell}`} />
      ))}
    </span>
  )
}
