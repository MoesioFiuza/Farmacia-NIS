import { CalendarDays, CheckCircle2, Clock3, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { localRepository } from '../data/localRepository'
import type { Appointment, Patient } from '../domain/patient'
import { createId } from '../utils/createId'

interface AppointmentScheduleProps {
  patients: Patient[]
  appointments: Appointment[]
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AppointmentSchedule({
  patients,
  appointments,
}: AppointmentScheduleProps) {
  const [showForm, setShowForm] = useState(false)
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const orderedAppointments = useMemo(
    () => [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [appointments],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    localRepository.saveAppointment({
      id: createId(),
      patientId,
      scheduledAt: String(data.get('scheduledAt')),
      reason: String(data.get('reason')),
      notes: String(data.get('notes')),
      status: 'agendado',
      createdAt: new Date().toISOString(),
    })
    event.currentTarget.reset()
    setShowForm(false)
  }

  function markAsDone(appointment: Appointment) {
    localRepository.saveAppointment({ ...appointment, status: 'realizado' })
  }

  return (
    <>
      <section className="page-heading heading-row">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO</p>
          <h1>Agenda de retornos</h1>
          <p className="muted">Organize os próximos atendimentos e acompanhe sua realização.</p>
        </div>
        <button className="button button--primary" onClick={() => setShowForm((value) => !value)}>
          <Plus size={19} /> Novo retorno
        </button>
      </section>

      {showForm && (
        <form className="panel module-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Paciente *</span>
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)} required>
                <option value="">Selecione</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Data e hora *</span>
              <input name="scheduledAt" type="datetime-local" required />
            </label>
            <label className="field field--wide">
              <span>Motivo *</span>
              <input name="reason" required placeholder="Ex.: revisão do plano medicamentoso" />
            </label>
            <label className="field field--wide">
              <span>Observações</span>
              <textarea name="notes" rows={3} />
            </label>
          </div>
          <div className="inline-actions">
            <button type="submit" className="button button--primary">Agendar retorno</button>
          </div>
        </form>
      )}

      <section className="module-list" aria-label="Retornos agendados">
        {orderedAppointments.length === 0 ? (
          <div className="empty-state panel">
            <CalendarDays size={34} />
            <strong>Nenhum retorno agendado</strong>
          </div>
        ) : orderedAppointments.map((appointment) => {
          const patient = patients.find((item) => item.id === appointment.patientId)
          return (
            <article className="panel appointment-card" key={appointment.id}>
              <span className="module-icon" aria-hidden="true"><CalendarDays size={25} /></span>
              <div className="module-card__content">
                <strong>{patient?.name ?? 'Paciente não encontrado'}</strong>
                <span><Clock3 size={15} /> {formatDateTime(appointment.scheduledAt)}</span>
                <small>{appointment.reason}</small>
              </div>
              <span className={`status-label status-label--${appointment.status}`}>
                {appointment.status === 'realizado' && <CheckCircle2 size={15} />}
                {appointment.status}
              </span>
              {appointment.status === 'agendado' && (
                <button className="button button--secondary" onClick={() => markAsDone(appointment)}>
                  Concluir
                </button>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}
