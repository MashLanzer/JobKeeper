'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/services/notifications'
import type { Notification } from '@/types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const [notifs, count] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    await markAsRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  const remove = useCallback(async (id: string) => {
    const notif = notifications.find((n) => n.id === id)
    await deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (notif && !notif.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }, [notifications])

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    remove,
    refetch: fetchNotifications,
  }
}
