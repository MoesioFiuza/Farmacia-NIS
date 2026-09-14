import { Pill, Plus, Volume2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { localRepository } from '../data/localRepository'
import type { MealMoment, Medication, Patient } from '../domain/patient'
import { momentInfo } from '../ui/medicationMoments'
import { createId } from '../utils/createId'

export function MedicationPlan({
  patients,
  medications,
}: {
  patients: Patient[]
  medications: Medication[]
}) {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]?.id ?? '')
  const [showForm, setShowForm] = useState(true)
  const patientMedications = useMemo(
    () => medications.filter((medication) => medication.patientId === selectedPatient),
    [medications, selectedPatient],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    localRepository.saveMedication({
      id: createId(),
      patientId: String(data.get('patientId')),
      name: String(data.get('name')),
      dosage: String(data.get('dosage')),
      scheduledTime: String(data.get('scheduledTime')),
      mealMoment: String(data.get('mealMoment')) as MealMoment,
      relationToMeal: String(data.get('relationToMeal')) as Medication['relationToMeal'],
      interval: String(data.get('interval')),
      duration: String(data.get('duration')),
    })
    event.currentTarget.reset()
    setShowForm(false)
  }

  return (
    <>
      <section className="page-heading heading-row">
        <div>
          <p className="eyebrow">PLANO DE CUIDADO</p>
          <h1>Medicamentos</h1>
          <p className="muted">Organize doses e momentos de uso com apoio visual.</p>
        </div>
        <button className="button button--primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={19} /> Adicionar
        </button>
      </section>

      {patients.length === 0 ? (
        <div className="empty-state panel"><Pill size={34} /><strong>Cadastre um paciente primeiro</strong></div>
      ) : (
        <>
          <label className="field patient-selector">
            <span>Paciente</span>
            <select value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
            </select>
          </label>

          {showForm && (
            <form className="panel form-panel compact-form medication-form" onSubmit={handleSubmit}>
              <input type="hidden" name="patientId" value={selectedPatient} />
              <div className="form-grid medication-form__fields">
                <label className="field field--wide"><span>Nome do medicamento *</span><input name="name" required /></label>
                <label className="field"><span>Dose *</span><input name="dosage" required placeholder="Ex.: 1 comprimido" /></label>
                <label className="field"><span>Horário *</span><input name="scheduledTime" type="time" required /></label>
                <label className="field"><span>Momento do dia *</span>
                  <select name="mealMoment" required>{Object.entries(momentInfo).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
                </label>
                <label className="field"><span>Em relação à refeição</span>
                  <select name="relationToMeal"><option value="antes">Antes</option><option value="junto">Junto</option><option value="depois">Depois</option></select>
                </label>
                <label className="field"><span>Intervalo</span><input name="interval" placeholder="Ex.: a cada 8 horas" /></label>
                <label className="field"><span>Duração</span><input name="duration" placeholder="Ex.: 7 dias" /></label>
              </div>
              <div className="form-actions"><button className="button button--primary">Salvar medicamento</button></div>
            </form>
          )}

          <div className="medication-list">
            {patientMedications.length === 0 ? (
              <div className="empty-state panel"><Pill size={32} /><strong>Nenhum medicamento neste plano</strong></div>
            ) : patientMedications.map((medication) => {
              const moment = momentInfo[medication.mealMoment]
              const Icon = moment.icon
              return (
                <article className="medication-card" key={medication.id}>
                  <span className={`moment-icon moment-icon--${moment.color}`}><Icon size={28} /></span>
                  <div className="medication-card__name"><strong>{medication.name}</strong><small>{medication.dosage}</small></div>
                  <div><span className="meta-label">QUANDO</span><strong>{medication.scheduledTime ? `${medication.scheduledTime} · ` : ''}{moment.label}</strong></div>
                  <div><span className="meta-label">REFEIÇÃO</span><strong>{medication.relationToMeal}</strong></div>
                  <button className="icon-button" onClick={() => speechSynthesis.speak(new SpeechSynthesisUtterance(`${medication.name}. ${medication.dosage}. ${medication.scheduledTime ? `Às ${medication.scheduledTime}.` : ''} ${moment.label}. ${medication.relationToMeal} da refeição.`))} aria-label={`Ouvir orientação de ${medication.name}`}><Volume2 /></button>
                </article>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
