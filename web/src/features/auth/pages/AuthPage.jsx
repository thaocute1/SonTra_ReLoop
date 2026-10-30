import { Card } from '../../../components/ui'

export function AuthPage({ title, description, children, variant = 'login' }) {
  return <main className={`auth-page auth-page--${variant} motion-page-enter`}>
    <div className="auth-layout">
      <aside className="auth-media motion-fade-in" role="img" aria-label="Thiên nhiên bán đảo Sơn Trà" />
      <section className="auth-panel motion-fade-up" aria-labelledby={`${variant}-auth-title`}><Card className="auth-card"><h1 id={`${variant}-auth-title`}>{title}</h1><p>{description}</p>{children}</Card></section>
    </div>
  </main>
}
