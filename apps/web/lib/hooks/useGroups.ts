import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'

export interface Group {
  id: string
  name: string
  groupId: string
  category?: string
  tags: string[]
  isActive: boolean
  lastSentAt?: string
  messageCount: number
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
  }
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<Group[]>('/groups')
      setGroups(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  return {
    groups,
    loading,
    error,
    refresh: fetchGroups
  }
}