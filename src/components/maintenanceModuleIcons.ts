import {
  Building2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Tags,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Building2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Tags,
  UsersRound,
}

export function getMaintenanceModuleIcon(icon: string) {
  return iconMap[icon] ?? ClipboardCheck
}
