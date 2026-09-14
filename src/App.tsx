import { useState } from 'react'
import './App.css'
import { AppShell, type Screen } from './components/AppShell'
import { useAuth } from './hooks/useAuth'
import { useClinicDatabase } from './hooks/useClinicDatabase'
import { useSyncStatus } from './hooks/useSyncStatus'
import { AdherenceAssessmentPage } from './pages/AdherenceAssessmentPage'
import { AppointmentSchedule } from './pages/AppointmentSchedule'
import { AdminUsers } from './pages/AdminUsers'
import { ConsultationForm } from './pages/ConsultationForm'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { MedicationPlan } from './pages/MedicationPlan'
import { NewPatient, PatientList } from './pages/Patients'
import { VisualMode } from './pages/VisualMode'

function App() {
  const [screen, setScreen] = useState<Screen>('inicio')
  const database = useClinicDatabase()
  const auth = useAuth()
  const sync = useSyncStatus()

  function renderScreen() {
    switch (screen) {
      case 'pacientes':
        return <PatientList patients={database.patients} />
      case 'novo-paciente':
        return <NewPatient onBack={() => setScreen('inicio')} onSaved={() => setScreen('pacientes')} />
      case 'consulta':
        return <ConsultationForm patients={database.patients} />
      case 'medicamentos':
        return <MedicationPlan patients={database.patients} medications={database.medications} />
      case 'modo-visual':
        return <VisualMode patients={database.patients} medications={database.medications} />
      case 'agenda':
        return <AppointmentSchedule patients={database.patients} appointments={database.appointments} />
      case 'adesao':
        return <AdherenceAssessmentPage patients={database.patients} assessments={database.adherenceAssessments} />
      case 'usuarios':
        return auth.user?.role === 'admin' ? <AdminUsers /> : <Dashboard database={database} onNavigate={setScreen} />
      default:
        return <Dashboard database={database} onNavigate={setScreen} />
    }
  }

  if (auth.loading) {
    return <div className="app-loading" role="status">Carregando ambiente seguro...</div>
  }

  if (!auth.user) {
    return <Login loading={auth.loading} onLogin={auth.login} />
  }

  return (
    <AppShell
      screen={screen}
      onNavigate={setScreen}
      userName={auth.user.name}
      userRole={auth.user.role}
      syncStatus={sync.status}
      pendingChanges={sync.pending}
      onSynchronize={() => void sync.synchronize()}
      onLogout={() => void auth.logout()}
    >
      {renderScreen()}
    </AppShell>
  )
}

export default App
