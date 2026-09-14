import { ClipboardCheck, TrendingUp } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { localRepository } from '../data/localRepository'
import type { AdherenceAssessment, AdherenceAnswers, Patient } from '../domain/patient'
import { createId } from '../utils/createId'

interface AdherenceAssessmentPageProps {
  patients: Patient[]
  assessments: AdherenceAssessment[]
}

const questions: Array<{ name: keyof AdherenceAnswers; label: string }> = [
  { name: 'missedDoses', label: 'Esqueceu alguma dose nos últimos 7 dias?' },
  { name: 'takesAtCorrectTime', label: 'Costuma tomar os medicamentos no horário correto?' },
  { name: 'stoppedWhenFeelingBetter', label: 'Parou algum medicamento ao se sentir melhor?' },
  { name: 'difficultyUnderstanding', label: 'Tem dificuldade para entender o plano de medicamentos?' },
]

function adherenceLabel(score: number) {
  if (score >= 4) return 'Adesão alta'
  if (score >= 2) return 'Adesão moderada'
  return 'Adesão baixa'
}

export function AdherenceAssessmentPage({
  patients,
  assessments,
}: AdherenceAssessmentPageProps) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const patientAssessments = useMemo(
    () => assessments
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt)),
    [assessments, patientId],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const answers: AdherenceAnswers = {
      missedDoses: data.get('missedDoses') === 'sim',
      takesAtCorrectTime: data.get('takesAtCorrectTime') === 'sim',
      stoppedWhenFeelingBetter: data.get('stoppedWhenFeelingBetter') === 'sim',
      difficultyUnderstanding: data.get('difficultyUnderstanding') === 'sim',
    }
    const score = [
      !answers.missedDoses,
      answers.takesAtCorrectTime,
      !answers.stoppedWhenFeelingBetter,
      !answers.difficultyUnderstanding,
    ].filter(Boolean).length

    localRepository.saveAdherence({
      id: createId(),
      patientId,
      assessedAt: new Date().toISOString(),
      answers,
      score,
      notes: String(data.get('notes')),
    })
    event.currentTarget.reset()
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">CUIDADO CONTÍNUO</p>
        <h1>Avaliação de adesão</h1>
        <p className="muted">Registre barreiras ao tratamento e acompanhe a evolução.</p>
      </section>

      {patients.length === 0 ? (
        <div className="empty-state panel"><ClipboardCheck size={34} /><strong>Cadastre um paciente primeiro</strong></div>
      ) : (
        <div className="two-column-layout">
          <form className="panel module-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Paciente</span>
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)}>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
              </select>
            </label>
            <div className="questionnaire">
              {questions.map((question, index) => (
                <fieldset className="question-card" key={question.name}>
                  <legend><span>{index + 1}</span>{question.label}</legend>
                  <label><input type="radio" name={question.name} value="sim" required /> Sim</label>
                  <label><input type="radio" name={question.name} value="nao" required /> Não</label>
                </fieldset>
              ))}
            </div>
            <label className="field">
              <span>Observações e barreiras identificadas</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="inline-actions">
              <button className="button button--primary">Salvar avaliação</button>
            </div>
          </form>

          <section className="panel evolution-panel">
            <div className="section-heading">
              <div><p className="eyebrow">HISTÓRICO</p><h2>Evolução</h2></div>
              <TrendingUp size={24} aria-hidden="true" />
            </div>
            {patientAssessments.length === 0 ? (
              <div className="empty-state"><strong>Sem avaliações</strong><p>O histórico aparecerá aqui.</p></div>
            ) : (
              <ol className="evolution-list">
                {patientAssessments.map((assessment) => (
                  <li key={assessment.id}>
                    <div>
                      <strong>{adherenceLabel(assessment.score)}</strong>
                      <small>{new Date(assessment.assessedAt).toLocaleDateString('pt-BR')}</small>
                    </div>
                    <span aria-label={`${assessment.score} de 4 pontos`}>{assessment.score}/4</span>
                    <progress max={4} value={assessment.score}>{assessment.score} de 4</progress>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </>
  )
}
