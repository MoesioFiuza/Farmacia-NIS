export type Sex = 'feminino' | 'masculino' | 'outro' | ''
export type BinaryAnswer = 'sim' | 'nao' | ''

export interface PatientIntake {
  height: string
  weight: string
  bloodPressure: string
  glucose: string
  bloodType: string
  conditions: string[]
  recentDisease: BinaryAnswer
  recentDiseaseDetails: string
  medicalTreatment: BinaryAnswer
  currentMedications: string
  takesOnTime: BinaryAnswer
  forgetsMedication: BinaryAnswer
  reminderStrategy: string
  medicationAllergy: BinaryAnswer
  allergyDetails: string
  nonPrescribedSubstances: BinaryAnswer
  nonPrescribedDetails: string
  habits: string[]
  physicalActivity: BinaryAnswer
  physicalActivityDetails: string
  foodAndHydration: string
  usesTea: BinaryAnswer
  teaDetails: string
  usesSupplements: BinaryAnswer
  supplementDetails: string
  lastDoctorVisit: string
  pharmaceuticalGuidance: string
}

export interface Patient {
  id: string
  version?: number
  recordNumber: string
  name: string
  birthDate: string
  sex: Sex
  phone: string
  intake?: PatientIntake
  createdAt: string
}

export interface Consultation {
  id: string
  version?: number
  patientId: string
  date: string
  bloodPressure: string
  glucose: string
  weight: string
  conditions: string[]
  recentDisease: string
  allergies: string
  habits: string[]
  notes: string
  guidance: string
}

export type MealMoment =
  | 'jejum'
  | 'cafe'
  | 'almoco'
  | 'lanche'
  | 'jantar'
  | 'deitar'

export interface Medication {
  id: string
  version?: number
  patientId: string
  name: string
  dosage: string
  scheduledTime?: string
  mealMoment: MealMoment
  relationToMeal: 'antes' | 'depois' | 'junto'
  interval: string
  duration: string
}

export type AppointmentStatus = 'agendado' | 'realizado' | 'cancelado'

export interface Appointment {
  id: string
  version?: number
  patientId: string
  scheduledAt: string
  reason: string
  notes: string
  status: AppointmentStatus
  createdAt: string
}

export interface AdherenceAnswers {
  missedDoses: boolean
  takesAtCorrectTime: boolean
  stoppedWhenFeelingBetter: boolean
  difficultyUnderstanding: boolean
}

export interface AdherenceAssessment {
  id: string
  version?: number
  patientId: string
  assessedAt: string
  answers: AdherenceAnswers
  score: number
  notes: string
}

export interface ClinicDatabase {
  patients: Patient[]
  consultations: Consultation[]
  medications: Medication[]
  appointments: Appointment[]
  adherenceAssessments: AdherenceAssessment[]
}
