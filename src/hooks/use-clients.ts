'use client'

import { useState, useEffect, useCallback } from 'react'
import { getClients, getClient, createClientRecord, updateClient, deleteClient } from '@/services/clients'
import type { Client } from '@/types'

export function useClients(search?: string) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getClients(search)
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { clients, loading, error, refetch: fetchClients }
}

export function useClient(id: string) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getClient(id)
        setClient(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar cliente')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchClient()
  }, [id])

  const update = useCallback(async (data: Partial<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const updated = await updateClient(id, data)
    setClient(updated)
    return updated
  }, [id])

  const remove = useCallback(async () => {
    await deleteClient(id)
  }, [id])

  return { client, loading, error, update, remove }
}

export function useCreateClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true)
      setError(null)
      const client = await createClientRecord(data)
      return client
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cliente'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}
