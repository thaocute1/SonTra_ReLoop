import { Card } from '../../../components/ui'

export function AuthPage({ title, description, children, variant = 'login' }) {
  return <main className={`auth-page auth-page--${variant}`}>
    <div className="auth-layout">
      <aside className="auth-media" aria-label="Thiên nhiên bán đảo Sơn Trà" />
      <section className="auth-panel"><Card className="auth-card"><h1>{title}</h1><p>{description}</p>{children}</Card></section>
    </div>
  </main>
}