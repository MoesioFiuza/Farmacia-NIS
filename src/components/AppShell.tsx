import {
  Accessibility,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Pill,
  Search,
  RefreshCw,
  LogOut,
  ShieldCheck,
  UserPlus,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { SyncStatus } from '../hooks/useSyncStatus'

export type Screen =
  | 'inicio'
  | 'pacientes'
  | 'novo-paciente'
  | 'consulta'
  | 'medicamentos'
  | 'modo-visual'
  | 'agenda'
  | 'adesao'
  | 'usuarios'

interface AppShellProps {
  screen: Screen
  onNavigate: (screen: Screen) => void
  userName: string
  userRole: 'admin' | 'pharmacist'
  syncStatus: SyncStatus
  pendingChanges: number
  onSynchronize: () => void
  onLogout: () => void
  children: ReactNode
}

const navItems = [
  { id: 'inicio', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'consulta', label: 'Nova consulta', icon: CalendarDays },
  { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
  { id: 'agenda', label: 'Agenda de retornos', icon: CalendarDays },
  { id: 'adesao', label: 'Adesão ao tratamento', icon: ClipboardCheck },
  { id: 'modo-visual', label: 'Modo visual', icon: Accessibility },
  { id: 'usuarios', label: 'Gerenciar usuários', icon: ShieldCheck, adminOnly: true },
] as const

export function AppShell({
  screen,
  onNavigate,
  userName,
  userRole,
  syncStatus,
  pendingChanges,
  onSynchronize,
  onLogout,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (target: Screen) => {
    onNavigate(target)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Farmácia Clínica</strong>
            <small>Estácio FMJ</small>
          </div>
          <button
            className="icon-button sidebar__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav aria-label="Navegação principal">
          <p className="nav-label">ATENDIMENTO</p>
          {navItems.filter((item) => !('adminOnly' in item) || userRole === 'admin').map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={screen === id ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => navigate(id)}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <button className="sidebar__status" onClick={onSynchronize}>
          {syncStatus === 'offline' ? <WifiOff size={17} /> : <RefreshCw size={17} className={syncStatus === 'syncing' ? 'spin' : ''} />}
          <div>
            <strong>{syncStatus === 'offline' ? 'Trabalhando offline' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'conflict' ? 'Revisão necessária' : pendingChanges ? `${pendingChanges} alterações pendentes` : 'Dados sincronizados'}</strong>
            <small>{syncStatus === 'offline' ? 'Será enviado quando conectar' : 'Clique para sincronizar'}</small>
          </div>
        </button>
      </aside>

      {menuOpen && (
        <button
          className="backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          <label className="search-box">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Buscar paciente</span>
            <input placeholder="Buscar paciente ou prontuário..." />
          </label>
          <button
            className="button button--primary topbar__action"
            onClick={() => navigate('novo-paciente')}
          >
            <UserPlus size={19} aria-hidden="true" />
            Novo paciente
          </button>
          <div className="user-avatar" aria-label={`Usuário ${userName}`}>
            {userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </div>
          <button className="icon-button" onClick={onLogout} aria-label="Sair do sistema"><LogOut size={19} /></button>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}
