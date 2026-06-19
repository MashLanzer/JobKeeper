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
