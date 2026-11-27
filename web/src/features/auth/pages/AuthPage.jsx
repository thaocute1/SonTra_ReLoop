import { Mountain } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AuthPage({ title, description, children, variant = 'login' }) {
  const isRegister = variant === 'register'

  return (
    <main className="auth-v2-fullscreen">
      <div className="auth-v2-card auth-v2-card--fullscreen">
        <aside className="auth-v2-media" aria-label="Thiên nhiên bán đảo Sơn Trà" />

        <section className="auth-v2-panel" aria-labelledby={`${variant}-auth-title`}>
          <div className="auth-v2-panel__inner">
            <Link to="/" className="auth-v2-brand" aria-label="Trang chủ Sơn Trà ReLoop">
              <span className="auth-v2-brand__badge" aria-hidden="true">
                <Mountain size={18} strokeWidth={2.2} />
              </span>
              <span className="auth-v2-brand__name">Sơn Trà ReLoop</span>
            </Link>

            <div className="auth-v2-heading">
              <h1 id={`${variant}-auth-title`}>{title}</h1>
              {description && <p>{description}</p>}
            </div>

            {children}

            <p className="auth-v2-switch">
              {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <Link to={isRegister ? '/login' : '/register'}>
                {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
