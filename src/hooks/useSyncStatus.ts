import { useCallback, useEffect, useState } from 'react'
import { localRepository } from '../data/localRepository'
import { offlineSync } from '../services/offlineSync'

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'conflict'

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? 'synced' : 'offline',
  )
  const [pending, setPending] = useState(0)

  const refreshCount = useCallback(async () => {
    const count = await offlineSync.pendingCount()
    setPending(count)
    if (!navigator.onLine) setStatus('offline')
    else if (count > 0) setStatus('pending')
    else setStatus('synced')
  }, [])

  const synchronize = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }
    setStatus('syncing')
    try {
      const result = await offlineSync.synchronize(localRepository.applyRemoteChanges)
      setStatus(result.status)
      setPending(await offlineSync.pendingCount())
    } catch {
      setStatus('pending')
    }
  }, [])

  useEffect(() => {
    const online = () => void synchronize()
    const offline = () => setStatus('offline')
    const queueChanged = () => void refreshCount()

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    window.addEventListener('sync-status-change', queueChanged)
    queueMicrotask(() => void refreshCount())

    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      window.removeEventListener('sync-status-change', queueChanged)
    }
  }, [refreshCount, synchronize])

  return { status, pending, synchronize }
}
