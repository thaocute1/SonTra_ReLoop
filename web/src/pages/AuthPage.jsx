import { Link } from 'react-router-dom'
import { Brand } from '../components/SiteHeader'
import { Card } from '../components/ui'

export function AuthPage({ title, description, children, alternateText, alternateLink, alternateLabel, variant = 'login' }) {
  return <main className={`auth-page auth-page--${variant}`}>
    <header className="auth-topbar"><Brand /><p>{alternateText} <Link to={alternateLink}>{alternateLabel}</Link></p></header>
    <div className="auth-layout">
      <aside className="auth-media" aria-label="Thiên nhiên bán đảo Sơn Trà" />
      <section className="auth-panel"><Card className="auth-card"><h1>{title}</h1><p>{description}</p>{children}</Card></section>
    </div>
  </main>
}
