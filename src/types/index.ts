export type JobStatus = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export interface Client {
  id: string
  user_id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  maintenance_months?: number | null
  last_service_date?: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  user_id: string
  client_id?: string
  client?: Client
  title: string
  description?: string
  address?: string
  category: string
  scheduled_at?: string
  completed_at?: string
  price: number
  deposit: number
  status: JobStatus
  payment_method?: string
  notes?: string
  checklist?: ChecklistItem[] | null
  signature?: string | null
  paid_at?: string | null
  warranty_until?: string | null
  followup_at?: string | null
  followup_done?: boolean | null
  line_items?: LineItem[] | null
  discount?: number | null
  tax_rate?: number | null
  equipment_id?: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  label: string
  done: boolean
}

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface Equipment {
  id: string
  user_id: string
  client_id?: string | null
  label: string
  brand?: string | null
  model?: string | null
  serial?: string | null
  btu?: string | null
  location?: string | null
  install_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  job_id?: string
  job?: Job
  description: string
  amount: number
  category: string
  date: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  user_id: string
  name: string
  unit?: string | null
  price: number
  stock: number
  min_stock: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  related_job_id?: string
  created_at: string
}

export interface DashboardStats {
  completedThisMonth: number
  pendingJobs: number
  revenueThisMonth: number
  expensesThisMonth: number
  netProfitThisMonth: number
  upcomingJobs: Job[]
}

export const JOB_CATEGORIES = [
  'A/C - Instalación',
  'A/C - Mantenimiento',
  'A/C - Reparación',
  'A/C - Limpieza',
  'Refrigeración',
  'Ventilación/Ductos',
  'Mantenimiento/Reparaciones',
  'Tecnología/Freelance',
  'Servicios en campo',
  'General/Varios',
] as const

export type JobCategory = typeof JOB_CATEGORIES[number]

export const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export const EXPENSE_CATEGORIES = [
  'materiales',
  'herramientas',
  'transporte',
  'combustible',
  'comida',
  'licencias',
  'marketing',
  'otros',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const PAYMENT_METHODS = [
  'efectivo',
  'transferencia',
  'tarjeta',
  'zelle',
  'venmo',
  'cheque',
  'otro',
] as const
