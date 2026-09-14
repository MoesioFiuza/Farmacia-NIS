import { ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiClient } from '../services/apiClient'

interface ManagedUser {
  id: string
  email: string
  role: 'admin' | 'pharmacist'
  active: boolean
  created_at: string
}

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadUsers() {
    const result = await apiClient.get<ManagedUser[]>('/auth/users')
    setUsers(result)
  }

  useEffect(() => {
    apiClient.get<ManagedUser[]>('/auth/users')
      .then(setUsers)
      .catch(() => setError('Não foi possível carregar os usuários.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await apiClient.post('/auth/users', {
        email: String(data.get('email')),
        password: String(data.get('password')),
        role: String(data.get('role')),
      })
      form.reset()
      setMessage('Usuário cadastrado com sucesso.')
      await loadUsers()
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? 'Este login já está cadastrado.'
        : 'Não foi possível cadastrar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1>Usuários do sistema</h1>
        <p className="muted">Cadastre quem poderá acessar a Farmácia Clínica.</p>
      </section>

      <div className="admin-users-layout">
        <form className="panel admin-user-form" onSubmit={handleSubmit}>
          <div className="admin-section-title">
            <span className="module-icon"><UserPlus size={22} /></span>
            <div><h2>Novo usuário</h2><p>Defina o login e a senha inicial.</p></div>
          </div>
          <label className="field">
            <span>Login (e-mail)</span>
            <input name="email" type="email" autoComplete="off" required placeholder="usuario@estacio.br" />
          </label>
          <label className="field">
            <span>Senha inicial</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Mínimo de 8 caracteres" />
          </label>
          <label className="field">
            <span>Permissão</span>
            <select name="role" defaultValue="pharmacist">
              <option value="pharmacist">Farmacêutico</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button button--primary" disabled={saving}>
            <UserPlus size={18} /> {saving ? 'Cadastrando...' : 'Cadastrar usuário'}
          </button>
        </form>

        <section className="panel managed-users" aria-labelledby="managed-users-title">
          <div className="admin-section-title">
            <span className="module-icon"><Users size={22} /></span>
            <div><h2 id="managed-users-title">Usuários cadastrados</h2><p>{users.length} no total</p></div>
          </div>
          {loading ? (
            <p className="muted">Carregando usuários...</p>
          ) : users.map((item) => (
            <article className="managed-user-row" key={item.id}>
              <span className="user-avatar"><ShieldCheck size={18} /></span>
              <div><strong>{item.email}</strong><small>{item.role === 'admin' ? 'Administrador' : 'Farmacêutico'}</small></div>
              <span className={item.active ? 'tag' : 'status-label'}>{item.active ? 'Ativo' : 'Inativo'}</span>
            </article>
          ))}
        </section>
      </div>
    </>
  )
}
