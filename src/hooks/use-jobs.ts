'use client'

import { useState, useEffect, useCallback } from 'react'
import { getJobs, getJob, createJob, updateJob, deleteJob } from '@/services/jobs'
import type { Job } from '@/types'
import type { JobFilters } from '@/services/jobs'

export function useJobs(filters?: JobFilters) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getJobs(filters)
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar trabajos')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, loading, error, refetch: fetchJobs }
}

export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getJob(id)
        setJob(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar trabajo')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchJob()
  }, [id])

  const update = useCallback(async (data: Partial<Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const updated = await updateJob(id, data)
    setJob(updated)
    return updated
  }, [id])

  const remove = useCallback(async () => {
    await deleteJob(id)
  }, [id])

  return { job, loading, error, update, remove }
}

export function useCreateJob() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true)
      setError(null)
      const job = await createJob(data)
      return job
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear trabajo'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}
