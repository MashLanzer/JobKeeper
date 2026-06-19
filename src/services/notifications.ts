import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as Notification[]
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

export async function markAsRead(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) throw error
}

export async function markAllAsRead(): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createNotification(
  notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'is_read'>
): Promise<Notification> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...notification, user_id: user.id, is_read: false })
    .select()
    .single()

  if (error) throw error
  return data as Notification
}
