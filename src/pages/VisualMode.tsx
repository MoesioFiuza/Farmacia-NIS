import { Clock3, Hand, Pill, Printer, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Medication, Patient } from '../domain/patient'
import { momentInfo } from '../ui/medicationMoments'

const momentOrder = ['jejum', 'cafe', 'almoco', 'lanche', 'jantar', 'deitar']

export function VisualMode({
  patients,
  medications,
}: {
  patients: Patient[]
  medications: Medication[]
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const patient = patients.find((item) => item.id === patientId)
  const plan = useMemo(
    () => medications
      .filter((medication) => medication.patientId === patientId)
      .sort((left, right) => {
        if (left.scheduledTime && right.scheduledTime) return left.scheduledTime.localeCompare(right.scheduledTime)
        if (left.scheduledTime) return -1
        if (right.scheduledTime) return 1
        return momentOrder.indexOf(left.mealMoment) - momentOrder.indexOf(right.mealMoment)
      }),
    [medications, patientId],
  )

  function speak(text: string) {
    speechSynthesis.cancel()
    const message = new SpeechSynthesisUtterance(text)
    message.lang = 'pt-BR'
    message.rate = 0.82
    speechSynthesis.speak(message)
  }

  function instructionFor(medication: Medication) {
    const moment = momentInfo[medication.mealMoment]
    const mealRelation = {
      antes: 'antes da refeição',
      junto: 'junto da refeição',
      depois: 'depois da refeição',
    }[medication.relationToMeal]
    return `${medication.name}. Tome ${medication.dosage}${medication.scheduledTime ? ` às ${medication.scheduledTime}` : ''}, ${moment.label}, ${mealRelation}.${medication.interval ? ` Intervalo: ${medication.interval}.` : ''}${medication.duration ? ` Duração: ${medication.duration}.` : ''}`
  }

  return (
    <div className="visual-mode">
      <section className="visual-hero">
        <div>
          <p className="eyebrow">MODO ACESSÍVEL</p>
          <h1>Meu plano de remédios</h1>
          <p>Todos os horários e medicamentos em uma única página.</p>
        </div>
        <div className="visual-hero__symbol" aria-hidden="true"><Hand size={38} /></div>
      </section>

      {patients.length > 0 && (
        <div className="visual-toolbar no-print">
          <label className="field visual-patient-selector">
            <span>Escolha o paciente</span>
            <select value={patientId} onChange={(event) => setPatientId(event.target.value)}>
              {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {plan.length > 0 && (
            <button className="button button--primary" onClick={() => window.print()}>
              <Printer size={19} /> Imprimir plano
            </button>
          )}
        </div>
      )}

      {plan.length === 0 ? (
        <div className="empty-state visual-empty">
          <Pill size={43} />
          <strong>Nenhum remédio no plano</strong>
          <p>Adicione os medicamentos antes de abrir esta tela para o paciente.</p>
        </div>
      ) : (
        <div className="visual-plan">
          <header className="print-plan-header">
            <div>
              <p className="eyebrow">PLANO DE MEDICAÇÃO</p>
              <h2>{patient?.name}</h2>
              <p>Siga os horários abaixo. Em caso de dúvida, procure a equipe de saúde.</p>
            </div>
            <div className="print-plan-meta">
              <strong>{plan.length}</strong>
              <span>{plan.length === 1 ? 'medicamento' : 'medicamentos'}</span>
            </div>
          </header>
          <div className="visual-schedule">
            {plan.map((medication, index) => {
              const moment = momentInfo[medication.mealMoment]
              const MomentIcon = moment.icon
              const phrase = instructionFor(medication)
              return (
                <article
                  className={`schedule-card schedule-card--${moment.color}`}
                  key={medication.id}
                >
                  <div className="schedule-time">
                    <Clock3 size={24} />
                    <strong>{medication.scheduledTime || '—:—'}</strong>
                    <span>{moment.label}</span>
                  </div>
                  <span className="schedule-card__number">{index + 1}</span>
                  <span className="schedule-card__icon" aria-hidden="true"><MomentIcon size={34} /></span>
                  <div className="schedule-card__medicine">
                    <strong>{medication.name}</strong>
                    <span><Pill size={18} /> {medication.dosage}</span>
                  </div>
                  <div className="schedule-card__details">
                    <span><b>Refeição:</b> {medication.relationToMeal}</span>
                    {medication.interval && <span><b>Intervalo:</b> {medication.interval}</span>}
                    {medication.duration && <span><b>Duração:</b> {medication.duration}</span>}
                  </div>
                  <button className="icon-button schedule-listen no-print" onClick={() => speak(phrase)} aria-label={`Ouvir orientação de ${medication.name}`}>
                    <Volume2 size={24} />
                  </button>
                </article>
              )
            })}
          </div>
          <button className="button button--listen no-print" onClick={() => speak(plan.map(instructionFor).join(' Próximo remédio. '))}>
            <Volume2 size={29} /> Ouvir o plano inteiro
          </button>
        </div>
      )}
    </div>
  )
}
