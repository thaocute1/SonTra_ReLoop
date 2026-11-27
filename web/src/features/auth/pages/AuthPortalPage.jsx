import { useState } from 'react'
import { Lock, Mail, Mountain, Phone, User } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { getHomePathForRole } from '../../../routes/ProtectedRoute'
import { extractErrorMessage, extractFieldErrors, hasFormLevelError } from '../../../utils/apiError'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'

export default function AuthPortalPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname === '/register'

  const [loginValues, setLoginValues] = useState({ email: '', password: '', remember: true })
  const [loginErrors, setLoginErrors] = useState({})
  const [loginSubmitting, setLoginSubmitting] = useState(false)

  const [regValues, setRegValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  })
  const [regErrors, setRegErrors] = useState({})
  const [regSubmitting, setRegSubmitting] = useState(false)

  const handleLoginChange = (event) =>
    setLoginValues((cur) => ({
      ...cur,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }))

  const handleRegChange = (event) =>
    setRegValues((cur) => ({
      ...cur,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }))

  const submitLogin = async (event) => {
    event.preventDefault()
    const next = {}
    if (!loginValues.email.trim()) next.email = 'Vui lòng nhập email.'
    if (!loginValues.password) next.password = 'Vui lòng nhập mật khẩu.'
    setLoginErrors(next)
    if (Object.keys(next).length) return

    setLoginSubmitting(true)
    try {
      const data = await authService.loginWithEmail(loginValues.email.trim(), loginValues.password)
      const role = data?.user?.role || localStorage.getItem('user_role')
      try { sessionStorage.setItem('sr_login_bubble', '1') } catch {}
      navigate(getHomePathForRole(role) || '/dashboard/home', { replace: true })
    } catch (error) {
      const fieldErrors = extractFieldErrors(error, { email: 'email', password: 'password' })
      if (!Object.keys(fieldErrors).length || hasFormLevelError(error)) {
        fieldErrors.form = extractErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
      setLoginErrors(fieldErrors)
    } finally {
      setLoginSubmitting(false)
    }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    const next = {}
    if (!regValues.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.'
    if (!/^\S+@\S+\.\S+$/.test(regValues.email)) next.email = 'Vui lòng nhập email hợp lệ.'
    if (!regValues.phone.trim()) next.phone = 'Vui lòng nhập số điện thoại.'
    if (regValues.password.length < 8) next.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
    if (regValues.confirmPassword !== regValues.password) next.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    if (!regValues.agreed) next.agreed = 'Bạn cần đồng ý với điều khoản dịch vụ.'
    setRegErrors(next)
    if (Object.keys(next).length) return

    setRegSubmitting(true)
    try {
      const data = await authService.register({
        name: regValues.fullName.trim(),
        email: regValues.email.trim(),
        phone: regValues.phone.trim(),
        password: regValues.password,
      })
      try { sessionStorage.setItem('sr_login_bubble', '1') } catch {}
      navigate(getHomePathForRole(data?.user?.role) || '/dashboard/home', { replace: true })
    } catch (error) {
      const fieldErrors = extractFieldErrors(error, {
        name: 'fullName',
        full_name: 'fullName',
        email: 'email',
        phone: 'phone',
        password: 'password',
      })
      if (!Object.keys(fieldErrors).length || hasFormLevelError(error)) {
        fieldErrors.form = extractErrorMessage(error, 'Đăng ký thất bại. Vui lòng thử lại.')
      }
      setRegErrors(fieldErrors)
    } finally {
      setRegSubmitting(false)
    }
  }

  const socialSuccess = (data) => {
    const role = data?.user?.role || localStorage.getItem('user_role')
    try { sessionStorage.setItem('sr_login_bubble', '1') } catch {}
    navigate(getHomePathForRole(role) || '/dashboard/home', { replace: true })
  }

  const switchMode = (targetPath) => {
    navigate(targetPath)
  }

  return (
    <AuthLayout>
      <main className={`auth-motion-stage ${isRegister ? 'is-register' : 'is-login'}`}>
        <aside className="auth-motion-media" aria-label="Thiên nhiên bán đảo Sơn Trà" />

        <section className="auth-motion-panel">
          <div className="auth-motion-panel__viewport">
            {/* Login View */}
            <div className={`auth-motion-view auth-motion-view--login ${!isRegister ? 'is-active' : ''}`} aria-hidden={isRegister}>
              <Link to="/" className="auth-v2-brand" aria-label="Trang chủ Sơn Trà ReLoop">
                <span className="auth-v2-brand__badge" aria-hidden="true">
                  <Mountain size={18} strokeWidth={2.2} />
                </span>
                <span className="auth-v2-brand__name">Sơn Trà ReLoop</span>
              </Link>

              <div className="auth-v2-heading">
                <h1>Tiếp tục hành trình xanh</h1>
                <p>Đăng nhập vào Sơn Trà ReLoop để quản lý vé tuyến, điểm xanh và lịch trình của bạn.</p>
              </div>

              <form className="auth-v2-form" onSubmit={submitLogin} noValidate>
                <Input
                  label="Địa chỉ Email"
                  name="email"
                  type="email"
                  value={loginValues.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  error={loginErrors.email}
                  placeholder="ten@email.com"
                  leadingIcon={<Mail size={16} />}
                />
                <Input
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  value={loginValues.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                  error={loginErrors.password}
                  placeholder="••••••••"
                  leadingIcon={<Lock size={16} />}
                />

                <div className="auth-v2-row-between">
                  <label className="terms-check">
                    <input name="remember" type="checkbox" checked={loginValues.remember} onChange={handleLoginChange} />
                    <span aria-hidden="true" />
                    Ghi nhớ đăng nhập
                  </label>
                  <Link className="auth-v2-forgot" to="/forgot-password">
                    Quên mật khẩu?
                  </Link>
                </div>

                {loginErrors.form && <p className="terms-error" role="alert">{loginErrors.form}</p>}

                <button className="auth-v2-submit" type="submit" disabled={loginSubmitting}>
                  {loginSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>

                <div className="auth-v2-divider">
                  <span />
                  <span>hoặc tiếp tục với</span>
                  <span />
                </div>

                <SocialAuthButtons
                  onAuthenticated={socialSuccess}
                  onError={(err) => setLoginErrors({ form: extractErrorMessage(err, 'Đăng nhập mạng xã hội thất bại.') })}
                  disabled={loginSubmitting}
                />
              </form>

              <p className="auth-v2-switch">
                Chưa có tài khoản?{' '}
                <button type="button" className="auth-v2-switch__btn" onClick={() => switchMode('/register')}>
                  Đăng ký ngay
                </button>
              </p>
            </div>

            {/* Register View */}
            <div className={`auth-motion-view auth-motion-view--register ${isRegister ? 'is-active' : ''}`} aria-hidden={!isRegister}>
              <Link to="/" className="auth-v2-brand" aria-label="Trang chủ Sơn Trà ReLoop">
                <span className="auth-v2-brand__badge" aria-hidden="true">
                  <Mountain size={18} strokeWidth={2.2} />
                </span>
                <span className="auth-v2-brand__name">Sơn Trà ReLoop</span>
              </Link>

              <div className="auth-v2-heading">
                <h1>Tạo tài khoản Eco-Explorer</h1>
              </div>

              <form className="auth-v2-form auth-v2-form--register" onSubmit={submitRegister} noValidate>
                <div className="auth-v2-grid-2">
                  <Input
                    label="Họ và tên"
                    name="fullName"
                    value={regValues.fullName}
                    onChange={handleRegChange}
                    autoComplete="name"
                    error={regErrors.fullName}
                    placeholder="Nguyễn Văn A"
                    leadingIcon={<User size={15} />}
                  />
                  <Input
                    label="Số điện thoại"
                    name="phone"
                    type="tel"
                    value={regValues.phone}
                    onChange={handleRegChange}
                    autoComplete="tel"
                    error={regErrors.phone}
                    placeholder="0905 123 456"
                    leadingIcon={<Phone size={15} />}
                  />
                </div>

                <Input
                  label="Địa chỉ Email"
                  name="email"
                  type="email"
                  value={regValues.email}
                  onChange={handleRegChange}
                  autoComplete="email"
                  error={regErrors.email}
                  placeholder="ten@email.com"
                  leadingIcon={<Mail size={15} />}
                />

                <div className="auth-v2-grid-2">
                  <Input
                    label="Mật khẩu"
                    name="password"
                    type="password"
                    value={regValues.password}
                    onChange={handleRegChange}
                    autoComplete="new-password"
                    error={regErrors.password}
                    placeholder="••••••••"
                    leadingIcon={<Lock size={15} />}
                  />
                  <Input
                    label="Xác nhận mật khẩu"
                    name="confirmPassword"
                    type="password"
                    value={regValues.confirmPassword}
                    onChange={handleRegChange}
                    autoComplete="new-password"
                    error={regErrors.confirmPassword}
                    placeholder="••••••••"
                    leadingIcon={<Lock size={15} />}
                  />
                </div>

                <label className={`terms-check ${regErrors.agreed ? 'terms-check--error' : ''}`}>
                  <input name="agreed" type="checkbox" checked={regValues.agreed} onChange={handleRegChange} />
                  <span aria-hidden="true" />
                  Tôi đồng ý <a href="#terms">Điều khoản &amp; Quy định bảo tồn Sơn Trà</a>
                </label>
                {regErrors.agreed && <p className="terms-error" role="alert">{regErrors.agreed}</p>}
                {regErrors.form && <p className="terms-error" role="alert">{regErrors.form}</p>}

                <button className="auth-v2-submit" type="submit" disabled={regSubmitting}>
                  {regSubmitting ? 'Đang đăng ký...' : 'Đăng ký thành viên'}
                </button>

                <div className="auth-v2-divider">
                  <span />
                  <span>hoặc đăng ký bằng</span>
                  <span />
                </div>

                <SocialAuthButtons
                  onAuthenticated={socialSuccess}
                  onError={(err) => setRegErrors({ form: extractErrorMessage(err, 'Đăng ký bằng mạng xã hội thất bại.') })}
                  disabled={regSubmitting}
                />
              </form>

              <p className="auth-v2-switch">
                Đã có tài khoản?{' '}
                <button type="button" className="auth-v2-switch__btn" onClick={() => switchMode('/login')}>
                  Đăng nhập ngay
                </button>
              </p>
            </div>
          </div>
        </section>
      </main>
    </AuthLayout>
  )
}
