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
      <section className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-hero__eyebrow">VISÃO GERAL</p>
          <h1>Acompanhamento<br />farmacêutico</h1>
          <p>Resumo dos pacientes, consultas e medicamentos cadastrados.</p>
          <div className="dashboard-hero__footer">
            <span className="dashboard-date"><CalendarDays size={17} /><span className="sentence-case">{today}</span></span>
            <button
              className="button dashboard-hero__button"
              onClick={() => onNavigate('consulta')}
            >
              Iniciar consulta <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="dashboard-hero__visual" aria-hidden="true">
          <span className="hero-orbit hero-orbit--one" />
          <span className="hero-orbit hero-orbit--two" />
          <span className="hero-cross"><span /><span /></span>
          <div className="hero-care-badge">
            <strong>{database.patients.length}</strong>
            <span>pacientes cadastrados</span>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Resumo">
        <article className="stat-card stat-card--patients">
          <span className="stat-icon stat-icon--red"><Users /></span>
          <div><strong>{database.patients.length}</strong><span>Pacientes cadastrados</span></div>
        </article>
        <article className="stat-card stat-card--consultations">
          <span className="stat-icon stat-icon--blue"><CalendarDays /></span>
          <div><strong>{database.consultations.length}</strong><span>Consultas realizadas</span></div>
        </article>
        <article className="stat-card stat-card--medications">
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
