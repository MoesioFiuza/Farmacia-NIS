import type {
  AdherenceAssessment,
  Appointment,
  ClinicDatabase,
  Consultation,
  Medication,
  Patient,
} from '../domain/patient'
import { offlineSync, type RemoteChange, type SyncEntity } from '../services/offlineSync.ts'

const STORAGE_KEY = 'estacio-farmacia-clinica:v1'

const emptyDatabase: ClinicDatabase = {
  patients: [],
  consultations: [],
  medications: [],
  appointments: [],
  adherenceAssessments: [],
}

function readDatabase(): ClinicDatabase {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...emptyDatabase }

    const parsed = JSON.parse(saved) as Partial<ClinicDatabase>
    return {
      patients: parsed.patients ?? [],
      consultations: parsed.consultations ?? [],
      medications: parsed.medications ?? [],
      appointments: parsed.appointments ?? [],
      adherenceAssessments: parsed.adherenceAssessments ?? [],
    }
  } catch {
    return { ...emptyDatabase }
  }
}

function writeDatabase(database: ClinicDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database))
  window.dispatchEvent(new CustomEvent('clinic-database-change'))
}

function queueForSync(entity: SyncEntity, id: string, value: { version?: number }) {
  void offlineSync.enqueue(entity, id, value, value.version ?? 0).catch(() => {
    window.dispatchEvent(new CustomEvent('sync-queue-error'))
  })
}

export const localRepository = {
  read: readDatabase,

  applyRemoteChanges(changes: RemoteChange[]) {
    const database = readDatabase()
    const collections: Record<SyncEntity, keyof ClinicDatabase> = {
      patient: 'patients',
      consultation: 'consultations',
      medication: 'medications',
      appointment: 'appointments',
      adherence: 'adherenceAssessments',
    }

    for (const change of changes) {
      const collection = database[collections[change.entity]] as Array<{ id: string }>
      const index = collection.findIndex((item) => item.id === change.record.id)
      if (change.deleted) {
        if (index >= 0) collection.splice(index, 1)
      } else if (index >= 0) collection[index] = change.record as { id: string }
      else collection.unshift(change.record as { id: string })
    }
    writeDatabase(database)
  },

  savePatient(patient: Patient) {
    const database = readDatabase()
    const index = database.patients.findIndex((item) => item.id === patient.id)

    if (index >= 0) database.patients[index] = patient
    else database.patients.unshift(patient)

    writeDatabase(database)
    queueForSync('patient', patient.id, patient)
  },

  saveConsultation(consultation: Consultation) {
    const database = readDatabase()
    database.consultations.unshift(consultation)
    writeDatabase(database)
    queueForSync('consultation', consultation.id, consultation)
  },

  saveMedication(medication: Medication) {
    const database = readDatabase()
    database.medications.unshift(medication)
    writeDatabase(database)
    queueForSync('medication', medication.id, medication)
  },

  saveAppointment(appointment: Appointment) {
    const database = readDatabase()
    const index = database.appointments.findIndex((item) => item.id === appointment.id)
    if (index >= 0) database.appointments[index] = appointment
    else database.appointments.unshift(appointment)
    writeDatabase(database)
    queueForSync('appointment', appointment.id, appointment)
  },

  saveAdherence(assessment: AdherenceAssessment) {
    const database = readDatabase()
    const index = database.adherenceAssessments.findIndex((item) => item.id === assessment.id)
    if (index >= 0) database.adherenceAssessments[index] = assessment
    else database.adherenceAssessments.unshift(assessment)
    writeDatabase(database)
    queueForSync('adherence', assessment.id, assessment)
  },
}
