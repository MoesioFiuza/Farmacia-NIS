import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'

interface LoginProps {
  loading: boolean
  onLogin: (email: string, password: string) => Promise<void>
}

export function Login({ loading, onLogin }: LoginProps) {
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      await onLogin(
        String(data.get('email')),
        String(data.get('password')),
      )
    } catch {
      setError('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="brand__mark" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <div><strong>Farmácia Clínica</strong><small>Estácio FMJ</small></div>
        </div>
        <span className="login-icon"><LockKeyhole size={28} /></span>
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1 id="login-title">Entrar no sistema</h1>
        <p className="muted">Informe seu login e sua senha.</p>
        <form onSubmit={handleSubmit}>
          <label className="field"><span>Login</span><input name="email" type="email" autoComplete="username" required placeholder="seuemail@estacio.br" /></label>
          <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary" disabled={loading}>{loading ? 'Verificando...' : 'Entrar'}</button>
        </form>
        <p className="login-help">Sem acesso? Procure o administrador da clínica.</p>
      </section>
    </main>
  )
}
