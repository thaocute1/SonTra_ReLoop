import { useState } from 'react'
import { Lock, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { getHomePathForRole } from '../../../routes/ProtectedRoute'
import { extractErrorMessage, extractFieldErrors, hasFormLevelError } from '../../../utils/apiError'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'
import { AuthPage } from './AuthPage'

export default function LoginPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const change = (event) =>
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }))

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!values.email.trim()) next.email = 'Vui lòng nhập email.'
    if (!values.password) next.password = 'Vui lòng nhập mật khẩu.'
    setErrors(next)
    if (Object.keys(next).length) return

    setIsSubmitting(true)
    try {
      const data = await authService.loginWithEmail(values.email.trim(), values.password)
      const role = data?.user?.role || localStorage.getItem('user_role')
      navigate(getHomePathForRole(role) || '/dashboard/home', { replace: true })
    } catch (error) {
      const fieldErrors = extractFieldErrors(error, { email: 'email', password: 'password' })
      if (!Object.keys(fieldErrors).length || hasFormLevelError(error)) {
        fieldErrors.form = extractErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
      setErrors(fieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const socialSuccess = (data) => {
    const role = data?.user?.role || localStorage.getItem('user_role')
    navigate(getHomePathForRole(role) || '/dashboard/home', { replace: true })
  }

  const socialError = (error) => {
    setErrors({ form: extractErrorMessage(error, 'Đăng nhập mạng xã hội thất bại.') })
  }

  return (
    <AuthLayout>
      <AuthPage
        variant="login"
        title="Tiếp tục hành trình xanh"
        description="Đăng nhập vào Sơn Trà ReLoop để quản lý vé tuyến, điểm xanh và lịch trình của bạn."
      >
        <form className="auth-v2-form" onSubmit={submit} noValidate>
          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            value={values.email}
            onChange={change}
            autoComplete="email"
            error={errors.email}
            placeholder="ten@email.com"
            leadingIcon={<Mail size={16} />}
          />
          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            value={values.password}
            onChange={change}
            autoComplete="current-password"
            error={errors.password}
            placeholder="••••••••"
            leadingIcon={<Lock size={16} />}
          />

          <div className="auth-v2-row-between">
            <label className="terms-check">
              <input name="remember" type="checkbox" checked={values.remember} onChange={change} />
              <span aria-hidden="true" />
              Ghi nhớ đăng nhập
            </label>
            <Link className="auth-v2-forgot" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>

          {errors.form && <p className="terms-error" role="alert">{errors.form}</p>}

          <button className="auth-v2-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="auth-v2-divider">
            <span />
            <span>hoặc tiếp tục với</span>
            <span />
          </div>

          <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
        </form>
      </AuthPage>
    </AuthLayout>
  )
}
