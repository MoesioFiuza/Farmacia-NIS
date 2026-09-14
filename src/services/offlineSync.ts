import { apiClient } from './apiClient'

export type SyncEntity =
  | 'patient'
  | 'consultation'
  | 'medication'
  | 'appointment'
  | 'adherence'

type Resource =
  | 'patients'
  | 'consultations'
  | 'medications'
  | 'appointments'
  | 'adherence'

interface SyncOperation {
  id: string
  entity: SyncEntity
  action: 'create' | 'update' | 'delete'
  entityId: string
  version: number
  payload: Record<string, unknown>
  createdAt: string
}

interface ServerRecord extends Record<string, unknown> {
  id: string
  version: number
}

export interface RemoteChange {
  entity: SyncEntity
  record: ServerRecord
  deleted: boolean
}

const resources: Record<SyncEntity, Resource> = {
  patient: 'patients',
  consultation: 'consultations',
  medication: 'medications',
  appointment: 'appointments',
  adherence: 'adherence',
}

const DB_NAME = 'estacio-clinic-sync'
const STORE_NAME = 'operations'
const CURSOR_KEY = 'estacio-clinic:sync-cursor'

function toIsoDateTime(value: unknown) {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function toServerData(entity: SyncEntity, value: Record<string, unknown>) {
  switch (entity) {
    case 'patient':
      return {
        name: value.name,
        birth_date: value.birthDate || null,
        medical_record: value.recordNumber || null,
        phone: value.phone || null,
        notes: JSON.stringify({ sex: value.sex ?? '', intake: value.intake ?? null }),
      }
    case 'consultation':
      return {
        patient_id: value.patientId,
        occurred_at: toIsoDateTime(`${value.date}T12:00:00`),
        summary: value.guidance || null,
        clinical_notes: JSON.stringify(value),
      }
    case 'medication':
      return {
        patient_id: value.patientId,
        name: value.name,
        dosage: value.dosage || null,
        schedule: JSON.stringify({
          scheduledTime: value.scheduledTime,
          mealMoment: value.mealMoment,
          relationToMeal: value.relationToMeal,
          interval: value.interval,
          duration: value.duration,
        }),
        active: true,
      }
    case 'appointment':
      return {
        patient_id: value.patientId,
        scheduled_at: toIsoDateTime(value.scheduledAt),
        status: value.status === 'realizado' ? 'completed' : value.status === 'cancelado' ? 'cancelled' : 'scheduled',
        notes: JSON.stringify({ reason: value.reason, notes: value.notes }),
      }
    case 'adherence':
      return {
        patient_id: value.patientId,
        recorded_at: toIsoDateTime(value.assessedAt),
        status: Number(value.score) >= 4 ? 'taken' : Number(value.score) >= 2 ? 'late' : 'missed',
        notes: JSON.stringify({ answers: value.answers, score: value.score, notes: value.notes }),
      }
  }
}

function parseObject(value: unknown) {
  try {
    return value ? JSON.parse(String(value)) as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function fromServerRecord(resource: Resource, record: ServerRecord): RemoteChange {
  const common = { id: record.id, version: record.version }
  const deleted = Boolean(record.deleted_at)
  switch (resource) {
    case 'patients': {
      const notes = parseObject(record.notes)
      return { entity: 'patient', deleted, record: { ...common, name: record.name, birthDate: record.birth_date ?? '', recordNumber: record.medical_record ?? '', phone: record.phone ?? '', sex: notes.sex ?? '', intake: notes.intake, createdAt: record.created_at } }
    }
    case 'consultations':
      return { entity: 'consultation', deleted, record: { ...parseObject(record.clinical_notes), ...common, patientId: record.patient_id, date: String(record.occurred_at).slice(0, 10), guidance: record.summary ?? '' } }
    case 'medications':
      return { entity: 'medication', deleted, record: { ...parseObject(record.schedule), ...common, patientId: record.patient_id, name: record.name, dosage: record.dosage ?? '' } }
    case 'appointments': {
      const details = parseObject(record.notes)
      return { entity: 'appointment', deleted, record: { ...common, patientId: record.patient_id, scheduledAt: record.scheduled_at, reason: details.reason ?? '', notes: details.notes ?? '', status: record.status === 'completed' ? 'realizado' : record.status === 'cancelled' ? 'cancelado' : 'agendado', createdAt: record.created_at } }
    }
    case 'adherence': {
      const details = parseObject(record.notes)
      return { entity: 'adherence', deleted, record: { ...common, patientId: record.patient_id, assessedAt: record.recorded_at, answers: details.answers ?? {}, score: details.score ?? 0, notes: details.notes ?? '' } }
    }
  }
}

function openQueue() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getPendingOperations() {
  const database = await openQueue()
  return new Promise<SyncOperation[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as SyncOperation[])
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

async function removeOperations(ids: string[]) {
  if (!ids.length) return
  const database = await openQueue()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    ids.forEach((id) => transaction.objectStore(STORE_NAME).delete(id))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export const offlineSync = {
  async enqueue(entity: SyncEntity, entityId: string, payload: unknown, version = 0) {
    const existing = (await getPendingOperations()).find(
      (operation) => operation.entity === entity && operation.entityId === entityId,
    )
    const operation: SyncOperation = {
      id: existing?.id ?? crypto.randomUUID(),
      entity,
      action: existing?.action ?? (version > 0 ? 'update' : 'create'),
      entityId,
      version: existing?.version ?? version,
      payload: payload as Record<string, unknown>,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    const database = await openQueue()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(operation)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    window.dispatchEvent(new CustomEvent('sync-status-change'))
  },

  async pendingCount() {
    return (await getPendingOperations()).length
  },

  async synchronize(onRemoteChanges?: (changes: RemoteChange[]) => void) {
    if (!navigator.onLine) return { status: 'offline' as const, conflicts: [] }
    const entityOrder: Record<SyncEntity, number> = {
      patient: 0,
      medication: 1,
      consultation: 2,
      appointment: 2,
      adherence: 3,
    }
    const operations = (await getPendingOperations()).sort(
      (left, right) =>
        entityOrder[left.entity] - entityOrder[right.entity] ||
        left.createdAt.localeCompare(right.createdAt),
    )
    const push = await apiClient.post<{ results: Array<{ operationId: string; status: string; record?: ServerRecord }> }>('/sync/push', {
      operations: operations.map((operation) => ({
        operationId: operation.id,
        entityType: resources[operation.entity],
        entityId: operation.entityId,
        action: operation.action,
        ...(operation.action === 'update' ? { baseVersion: operation.version } : {}),
        data: toServerData(operation.entity, operation.payload),
      })),
    })

    const acknowledged = push.results.filter((result) => result.status === 'applied').map((result) => result.operationId)
    const conflicts = push.results.filter((result) => result.status !== 'applied')
    await removeOperations(acknowledged)

    const pushedChanges = push.results.flatMap((result) => {
      if (!result.record) return []
      const operation = operations.find((item) => item.id === result.operationId)
      return operation ? [fromServerRecord(resources[operation.entity], result.record)] : []
    })
    const cursor = localStorage.getItem(CURSOR_KEY)
    const pull = await apiClient.get<{ changes: Array<{ entityType: Resource; record: ServerRecord }>; cursor: string }>(
      `/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    )
    localStorage.setItem(CURSOR_KEY, pull.cursor)
    onRemoteChanges?.([
      ...pushedChanges,
      ...pull.changes.map((change) => fromServerRecord(change.entityType, change.record)),
    ])
    window.dispatchEvent(new CustomEvent('sync-status-change'))
    return { status: conflicts.length ? ('conflict' as const) : ('synced' as const), conflicts }
  },
}
