import { ArrowLeft, Eye, Search, UserRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { localRepository } from '../data/localRepository'
import type { BinaryAnswer, Patient } from '../domain/patient'
import { createId } from '../utils/createId'

const healthConditions = [
  'Diabetes',
  'Hipertensão arterial',
  'Problemas renais',
  'Problemas respiratórios',
  'Problemas cardíacos',
  'Problemas gástricos',
  'Chikungunya',
  'Dengue',
  'Ansiedade',
  'Depressão',
]

function YesNoQuestion({ name, children }: { name: string; children: string }) {
  return (
    <fieldset className="intake-question">
      <legend>{children}</legend>
      <label><input type="radio" name={name} value="sim" required /> Sim</label>
      <label><input type="radio" name={name} value="nao" required /> Não</label>
    </fieldset>
  )
}

function showValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Não informado'
  if (value === 'sim') return 'Sim'
  if (value === 'nao') return 'Não'
  return value || 'Não informado'
}

function formatRegistrationDate(value: string | undefined) {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR')
}

function registrationMonth(value: string | undefined) {
  if (!value) return { key: 'sem-data', label: 'Data não informada' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { key: 'sem-data', label: 'Data não informada' }
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label }
}

function RecordItem({ label, value }: { label: string; value: string | string[] | undefined }) {
  return <div className="record-item"><span>{label}</span><strong>{showValue(value)}</strong></div>
}

function PatientRecord({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const intake = patient.intake
  return (
    <div className="record-modal" role="dialog" aria-modal="true" aria-labelledby="patient-record-title">
      <button className="record-modal__backdrop" onClick={onClose} aria-label="Fechar ficha" />
      <section className="record-modal__content">
        <header className="record-modal__header">
          <div>
            <p className="eyebrow">FICHA DO PACIENTE</p>
            <h2 id="patient-record-title">{patient.name}</h2>
            <span>Prontuário {patient.recordNumber}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar ficha"><X /></button>
        </header>

        <div className="record-modal__body">
          <section className="record-section">
            <h3>Dados pessoais</h3>
            <div className="record-grid">
              <RecordItem label="Data de nascimento" value={patient.birthDate} />
              <RecordItem label="Sexo" value={patient.sex} />
              <RecordItem label="Telefone" value={patient.phone} />
              <RecordItem label="Data do cadastro" value={new Date(patient.createdAt).toLocaleDateString('pt-BR')} />
            </div>
          </section>

          <section className="record-section">
            <h3>Dados de saúde</h3>
            <div className="record-grid">
              <RecordItem label="Altura" value={intake?.height} />
              <RecordItem label="Peso" value={intake?.weight} />
              <RecordItem label="Pressão arterial" value={intake?.bloodPressure} />
              <RecordItem label="Glicemia" value={intake?.glucose} />
              <RecordItem label="Tipo sanguíneo" value={intake?.bloodType} />
              <RecordItem label="Condições de saúde" value={intake?.conditions} />
            </div>
          </section>

          <section className="record-section">
            <h3>Histórico e tratamento</h3>
            <div className="record-grid">
              <RecordItem label="Doença ou situação recente" value={intake?.recentDisease} />
              <RecordItem label="Qual situação recente" value={intake?.recentDiseaseDetails} />
              <RecordItem label="Em tratamento médico" value={intake?.medicalTreatment} />
              <RecordItem label="Medicamentos em uso" value={intake?.currentMedications} />
              <RecordItem label="Toma no horário correto" value={intake?.takesOnTime} />
              <RecordItem label="Esquece medicamentos" value={intake?.forgetsMedication} />
              <RecordItem label="Conduta após esquecimento" value={intake?.reminderStrategy} />
              <RecordItem label="Alergia a medicamentos" value={intake?.medicationAllergy} />
              <RecordItem label="Quais alergias" value={intake?.allergyDetails} />
              <RecordItem label="Usa substâncias não prescritas" value={intake?.nonPrescribedSubstances} />
              <RecordItem label="Quais substâncias" value={intake?.nonPrescribedDetails} />
            </div>
          </section>

          <section className="record-section">
            <h3>Hábitos e rotina</h3>
            <div className="record-grid">
              <RecordItem label="Hábitos" value={intake?.habits} />
              <RecordItem label="Pratica atividade física" value={intake?.physicalActivity} />
              <RecordItem label="Atividade praticada" value={intake?.physicalActivityDetails} />
              <RecordItem label="Alimentação e hidratação" value={intake?.foodAndHydration} />
              <RecordItem label="Toma chá" value={intake?.usesTea} />
              <RecordItem label="Quais chás" value={intake?.teaDetails} />
              <RecordItem label="Usa suplementos" value={intake?.usesSupplements} />
              <RecordItem label="Quais suplementos" value={intake?.supplementDetails} />
              <RecordItem label="Última consulta médica" value={intake?.lastDoctorVisit} />
            </div>
          </section>

          <section className="record-section">
            <h3>Orientações farmacêuticas</h3>
            <RecordItem label="Orientações fornecidas" value={intake?.pharmaceuticalGuidance} />
          </section>
        </div>
      </section>
    </div>
  )
}

export function PatientList({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const normalizedQuery = query.toLocaleLowerCase('pt-BR')
  const visiblePatients = patients.filter(
    (patient) =>
      patient.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      patient.recordNumber.includes(query),
  )
  const patientGroups = Object.entries(
    [...visiblePatients]
      .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''))
      .reduce<Record<string, { label: string; patients: Patient[] }>>((groups, patient) => {
        const month = registrationMonth(patient.createdAt)
        groups[month.key] ??= { label: month.label, patients: [] }
        groups[month.key].patients.push(patient)
        return groups
      }, {}),
  )

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">PRONTUÁRIOS</p>
        <h1>Pacientes</h1>
        <p className="muted">Consulte os pacientes acompanhados pela clínica.</p>
      </section>
      <section className="panel">
        <label className="search-box search-box--wide">
          <Search size={19} />
          <span className="sr-only">Filtrar pacientes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite o nome ou número do prontuário"
          />
        </label>
        {visiblePatients.length === 0 ? (
          <div className="empty-state">
            <UserRound size={32} />
            <strong>Nenhum paciente encontrado</strong>
          </div>
        ) : (
          <div className="patient-groups">
            {patientGroups.map(([key, group]) => (
              <section className="patient-month-group" key={key}>
                <header className="patient-month-heading">
                  <strong>{group.label}</strong>
                  <span>{group.patients.length} {group.patients.length === 1 ? 'cadastro' : 'cadastros'}</span>
                </header>
                <div className="patient-list patient-list--spaced">
                  {group.patients.map((patient) => (
                    <article className="patient-row" key={patient.id}>
                      <span className="patient-avatar">{patient.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{patient.name}</strong>
                        <small>Prontuário {patient.recordNumber} · Nascimento: {patient.birthDate || 'não informado'} · Cadastro: {formatRegistrationDate(patient.createdAt)}</small>
                      </div>
                      <span className="tag">Ativo</span>
                      <button className="button button--record" onClick={() => setSelectedPatient(patient)}>
                        <Eye size={17} /> Ver ficha
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
      {selectedPatient && <PatientRecord patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </>
  )
}

export function NewPatient({
  onSaved,
  onBack,
}: {
  onSaved: () => void
  onBack: () => void
}) {
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')
    const data = new FormData(event.currentTarget)
    const patient: Patient = {
      id: createId(),
      recordNumber: String(data.get('recordNumber')),
      name: String(data.get('name')),
      birthDate: String(data.get('birthDate')),
      sex: String(data.get('sex')) as Patient['sex'],
      phone: String(data.get('phone')),
      intake: {
        height: String(data.get('height')),
        weight: String(data.get('weight')),
        bloodPressure: String(data.get('bloodPressure')),
        glucose: String(data.get('glucose')),
        bloodType: String(data.get('bloodType')),
        conditions: data.getAll('conditions').map(String),
        recentDisease: String(data.get('recentDisease')) as BinaryAnswer,
        recentDiseaseDetails: String(data.get('recentDiseaseDetails')),
        medicalTreatment: String(data.get('medicalTreatment')) as BinaryAnswer,
        currentMedications: String(data.get('currentMedications')),
        takesOnTime: String(data.get('takesOnTime')) as BinaryAnswer,
        forgetsMedication: String(data.get('forgetsMedication')) as BinaryAnswer,
        reminderStrategy: String(data.get('reminderStrategy')),
        medicationAllergy: String(data.get('medicationAllergy')) as BinaryAnswer,
        allergyDetails: String(data.get('allergyDetails')),
        nonPrescribedSubstances: String(data.get('nonPrescribedSubstances')) as BinaryAnswer,
        nonPrescribedDetails: String(data.get('nonPrescribedDetails')),
        habits: data.getAll('habits').map(String),
        physicalActivity: String(data.get('physicalActivity')) as BinaryAnswer,
        physicalActivityDetails: String(data.get('physicalActivityDetails')),
        foodAndHydration: String(data.get('foodAndHydration')),
        usesTea: String(data.get('usesTea')) as BinaryAnswer,
        teaDetails: String(data.get('teaDetails')),
        usesSupplements: String(data.get('usesSupplements')) as BinaryAnswer,
        supplementDetails: String(data.get('supplementDetails')),
        lastDoctorVisit: String(data.get('lastDoctorVisit')),
        pharmaceuticalGuidance: String(data.get('pharmaceuticalGuidance')),
      },
      createdAt: new Date().toISOString(),
    }
    localRepository.savePatient(patient)
    setSaved(true)
    window.setTimeout(onSaved, 700)
  }

  return (
    <>
      <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Voltar</button>
      <section className="page-heading">
        <p className="eyebrow">NOVO PRONTUÁRIO</p>
        <h1>Cadastrar paciente</h1>
        <p className="muted">Preencha apenas os dados necessários para o acompanhamento.</p>
      </section>
      <form
        className={validationError ? 'panel form-panel form-panel--invalid' : 'panel form-panel'}
        onSubmit={handleSubmit}
        onInvalid={() => setValidationError('Existem campos obrigatórios sem preencher. Verifique os itens destacados antes de salvar.')}
      >
        <div className="form-section">
          <h2>Dados pessoais</h2>
          <div className="form-grid">
            <label className="field field--wide">
              <span>Nome completo *</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="field">
              <span>Nº do prontuário *</span>
              <input name="recordNumber" required inputMode="numeric" />
            </label>
            <label className="field">
              <span>Data de nascimento</span>
              <input name="birthDate" type="date" />
            </label>
            <label className="field">
              <span>Sexo</span>
              <select name="sex" defaultValue="">
                <option value="">Selecione</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro / não informar</option>
              </select>
            </label>
            <label className="field">
              <span>Telefone</span>
              <input name="phone" type="tel" autoComplete="tel" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Dados de saúde</h2>
          <div className="form-grid">
            <label className="field"><span>Altura</span><input name="height" inputMode="decimal" placeholder="Ex.: 1,70 m" /></label>
            <label className="field"><span>Peso</span><input name="weight" inputMode="decimal" placeholder="Ex.: 70 kg" /></label>
            <label className="field"><span>Pressão arterial</span><input name="bloodPressure" placeholder="Ex.: 120/80 mmHg" /></label>
            <label className="field"><span>Glicemia</span><input name="glucose" inputMode="decimal" placeholder="Ex.: 90 mg/dL" /></label>
            <label className="field">
              <span>Tipo sanguíneo</span>
              <select name="bloodType" defaultValue="">
                <option value="">Não informado</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Condições e histórico de saúde</h2>
          <p className="section-help">Marque todas as condições que o paciente já teve.</p>
          <div className="check-grid">
            {healthConditions.map((condition) => (
              <label className="check-card" key={condition}>
                <input type="checkbox" name="conditions" value={condition} />
                <span>{condition}</span>
              </label>
            ))}
          </div>
          <div className="intake-grid">
            <YesNoQuestion name="recentDisease">Possui alguma doença ou situação recente?</YesNoQuestion>
            <label className="field"><span>Qual?</span><input name="recentDiseaseDetails" /></label>
            <YesNoQuestion name="medicalTreatment">Está em tratamento médico ou farmacológico?</YesNoQuestion>
            <label className="field field--wide"><span>Quais medicamentos está usando?</span><textarea name="currentMedications" rows={2} /></label>
          </div>
        </div>

        <div className="form-section">
          <h2>Uso dos medicamentos</h2>
          <div className="intake-grid">
            <YesNoQuestion name="takesOnTime">Toma os medicamentos no horário correto?</YesNoQuestion>
            <YesNoQuestion name="forgetsMedication">Às vezes esquece de tomar os medicamentos?</YesNoQuestion>
            <label className="field field--wide"><span>Quando lembra, como toma após o esquecimento?</span><textarea name="reminderStrategy" rows={2} /></label>
            <YesNoQuestion name="medicationAllergy">Possui alergia a medicamentos?</YesNoQuestion>
            <label className="field"><span>Se sim, quais?</span><input name="allergyDetails" /></label>
            <YesNoQuestion name="nonPrescribedSubstances">Usa medicamento ou substância não prescrita?</YesNoQuestion>
            <label className="field"><span>Se sim, quais?</span><input name="nonPrescribedDetails" /></label>
          </div>
        </div>

        <div className="form-section">
          <h2>Hábitos e rotina</h2>
          <div className="check-grid check-grid--compact">
            {['Tabagismo', 'Alcoolismo', 'Bebe socialmente'].map((habit) => (
              <label className="check-card" key={habit}>
                <input type="checkbox" name="habits" value={habit} />
                <span>{habit}</span>
              </label>
            ))}
          </div>
          <div className="intake-grid">
            <YesNoQuestion name="physicalActivity">Pratica atividade física?</YesNoQuestion>
            <label className="field"><span>Qual atividade?</span><input name="physicalActivityDetails" /></label>
            <label className="field field--wide"><span>Como está a alimentação e a ingestão de água?</span><textarea name="foodAndHydration" rows={2} /></label>
            <YesNoQuestion name="usesTea">Toma chá?</YesNoQuestion>
            <label className="field"><span>Quais chás?</span><input name="teaDetails" /></label>
            <YesNoQuestion name="usesSupplements">Usa suplementos?</YesNoQuestion>
            <label className="field"><span>Quais suplementos?</span><input name="supplementDetails" /></label>
            <label className="field"><span>Data da última consulta médica</span><input name="lastDoctorVisit" type="date" /></label>
          </div>
        </div>

        <div className="form-section">
          <h2>Orientações farmacêuticas</h2>
          <label className="field">
            <span>Orientações fornecidas durante o cadastro</span>
            <textarea name="pharmaceuticalGuidance" rows={4} />
          </label>
        </div>

        <div className="form-actions">
          {validationError && <p className="form-validation-alert" role="alert">{validationError}</p>}
          {saved && <p className="form-save-success" role="status">Paciente salvo com sucesso!</p>}
          <button type="button" className="button button--secondary" onClick={onBack}>Cancelar</button>
          <button type="submit" className="button button--primary">{saved ? 'Paciente salvo!' : 'Salvar paciente'}</button>
        </div>
      </form>
    </>
  )
}
