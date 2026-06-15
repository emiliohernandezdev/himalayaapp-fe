import {
  Building2,
  ClipboardCheck,
  KeyRound,
  LockKeyhole,
  FileText,
  PackageCheck,
  ShieldCheck,
  Tags,
  UsersRound,
  Activity,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Building2,
  ClipboardCheck,
  KeyRound,
  LockKeyhole,
  FileText,
  PackageCheck,
  ShieldCheck,
  Tags,
  UsersRound,
  Activity,
}

export function getMaintenanceModuleIcon(icon: string) {
  return iconMap[icon] ?? ClipboardCheck
}
