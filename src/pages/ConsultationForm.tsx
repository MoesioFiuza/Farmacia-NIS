import { ClipboardCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { localRepository } from '../data/localRepository'
import type { Consultation, Patient } from '../domain/patient'
import { createId } from '../utils/createId'

const conditions = [
  'Diabetes',
  'Hipertensão arterial',
  'Problemas renais',
  'Problemas respiratórios',
  'Problemas cardíacos',
  'Problemas gástricos',
  'Ansiedade',
  'Depressão',
]

export function ConsultationForm({ patients }: { patients: Patient[] }) {
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const consultation: Consultation = {
      id: createId(),
      patientId: String(data.get('patientId')),
      date: String(data.get('date')),
      bloodPressure: String(data.get('bloodPressure')),
      glucose: String(data.get('glucose')),
      weight: String(data.get('weight')),
      conditions: data.getAll('conditions').map(String),
      recentDisease: String(data.get('recentDisease')),
      allergies: String(data.get('allergies')),
      habits: data.getAll('habits').map(String),
      notes: String(data.get('notes')),
      guidance: String(data.get('guidance')),
    }
    localRepository.saveConsultation(consultation)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
    event.currentTarget.reset()
  }

  if (patients.length === 0) {
    return (
      <>
        <section className="page-heading"><p className="eyebrow">ATENDIMENTO</p><h1>Nova consulta</h1></section>
        <div className="empty-state panel">
          <ClipboardCheck size={35} />
          <strong>Cadastre um paciente antes da consulta</strong>
          <p>O atendimento precisa estar associado a um prontuário.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">ATENDIMENTO</p>
        <h1>Consulta farmacêutica</h1>
        <p className="muted">Registro clínico baseado na ficha de acompanhamento.</p>
      </section>
      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Identificação e sinais</h2>
          <div className="form-grid">
            <label className="field field--wide">
              <span>Paciente *</span>
              <select name="patientId" required defaultValue="">
                <option value="" disabled>Selecione o paciente</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} — {patient.recordNumber}</option>)}
              </select>
            </label>
            <label className="field"><span>Data *</span><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label className="field"><span>Pressão arterial</span><input name="bloodPressure" placeholder="Ex.: 120/80" /></label>
            <label className="field"><span>Glicemia</span><input name="glucose" placeholder="mg/dL" inputMode="decimal" /></label>
            <label className="field"><span>Peso</span><input name="weight" placeholder="kg" inputMode="decimal" /></label>
          </div>
        </div>

        <div className="form-section">
          <h2>Condições de saúde</h2>
          <div className="check-grid">
            {conditions.map((condition) => (
              <label className="check-card" key={condition}>
                <input type="checkbox" name="conditions" value={condition} />
                <span>{condition}</span>
              </label>
            ))}
          </div>
          <div className="form-grid form-grid--top-gap">
            <label className="field field--wide"><span>Doença ou situação recente</span><textarea name="recentDisease" rows={2} /></label>
            <label className="field field--wide"><span>Alergias a medicamentos</span><textarea name="allergies" rows={2} /></label>
          </div>
        </div>

        <div className="form-section">
          <h2>Hábitos e acompanhamento</h2>
          <div className="check-grid">
            {['Tabagismo', 'Consumo de álcool', 'Atividade física', 'Uso de chás', 'Uso de suplementos'].map((habit) => (
              <label className="check-card" key={habit}>
                <input type="checkbox" name="habits" value={habit} />
                <span>{habit}</span>
              </label>
            ))}
          </div>
          <div className="form-grid form-grid--top-gap">
            <label className="field field--wide"><span>Observações</span><textarea name="notes" rows={3} /></label>
            <label className="field field--wide"><span>Orientações farmacêuticas</span><textarea name="guidance" rows={4} /></label>
          </div>
        </div>

        <div className="form-actions">
          <span className={saved ? 'save-feedback save-feedback--visible' : 'save-feedback'}>Consulta salva neste computador.</span>
          <button className="button button--primary" type="submit">Salvar consulta</button>
        </div>
      </form>
    </>
  )
}
