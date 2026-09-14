import { useEffect, useState } from 'react'
import { localRepository } from '../data/localRepository'

export function useClinicDatabase() {
  const [database, setDatabase] = useState(localRepository.read)

  useEffect(() => {
    const refresh = () => setDatabase(localRepository.read())
    window.addEventListener('clinic-database-change', refresh)
    return () => window.removeEventListener('clinic-database-change', refresh)
  }, [])

  return database
}
