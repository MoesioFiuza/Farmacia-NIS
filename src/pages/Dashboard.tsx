import {
  Accessibility,
  ArrowRight,
  CalendarDays,
  Pill,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ClinicDatabase } from '../domain/patient'
import type { Screen } from '../components/AppShell'

interface DashboardProps {
  database: ClinicDatabase
  onNavigate: (screen: Screen) => void
}

export function Dashboard({ database, onNavigate }: DashboardProps) {
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <>
      <section className="page-heading heading-row">
        <div>
          <p className="eyebrow">BOM DIA</p>
          <h1>Acompanhamento farmacêutico</h1>
          <p className="muted sentence-case">{today}</p>
        </div>
        <button
          className="button button--primary desktop-only"
          onClick={() => onNavigate('consulta')}
        >
          <CalendarDays size={19} />
          Iniciar consulta
        </button>
      </section>

      <section className="stats-grid" aria-label="Resumo">
        <article className="stat-card">
          <span className="stat-icon stat-icon--red"><Users /></span>
          <div><strong>{database.patients.length}</strong><span>Pacientes cadastrados</span></div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--blue"><CalendarDays /></span>
          <div><strong>{database.consultations.length}</strong><span>Consultas realizadas</span></div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--green"><Pill /></span>
          <div><strong>{database.medications.length}</strong><span>Medicamentos ativos</span></div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">ACESSO RÁPIDO</p><h2>O que você deseja fazer?</h2></div>
        </div>
        <div className="action-grid">
          <button className="action-card" onClick={() => onNavigate('novo-paciente')}>
            <span className="action-card__icon"><UserPlus /></span>
            <strong>Cadastrar paciente</strong>
            <small>Crie um novo prontuário</small>
            <ArrowRight className="action-card__arrow" size={20} />
          </button>
          <button className="action-card" onClick={() => onNavigate('consulta')}>
            <span className="action-card__icon"><CalendarDays /></span>
            <strong>Nova consulta</strong>
            <small>Registre o atendimento</small>
            <ArrowRight className="action-card__arrow" size={20} />
          </button>
          <button className="action-card" onClick={() => onNavigate('medicamentos')}>
            <span className="action-card__icon"><Pill /></span>
            <strong>Plano de medicamentos</strong>
            <small>Organize horários e doses</small>
            <ArrowRight className="action-card__arrow" size={20} />
          </button>
          <button className="action-card action-card--featured" onClick={() => onNavigate('modo-visual')}>
            <span className="action-card__icon"><Accessibility /></span>
            <strong>Modo visual</strong>
            <small>Orientação com imagens e voz</small>
            <ArrowRight className="action-card__arrow" size={20} />
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">PACIENTES RECENTES</p><h2>Últimos prontuários</h2></div>
          <button className="text-button" onClick={() => onNavigate('pacientes')}>Ver todos <ArrowRight size={17} /></button>
        </div>
        {database.patients.length === 0 ? (
          <div className="empty-state">
            <Users size={31} />
            <strong>Nenhum paciente cadastrado</strong>
            <p>Comece criando o primeiro prontuário.</p>
          </div>
        ) : (
          <div className="patient-list">
            {database.patients.slice(0, 4).map((patient) => (
              <div className="patient-row" key={patient.id}>
                <span className="patient-avatar">{patient.name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{patient.name}</strong><small>Prontuário {patient.recordNumber}</small></div>
                <span className="tag">Ativo</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
