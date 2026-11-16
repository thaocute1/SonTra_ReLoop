import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'
import { AuthPage } from './AuthPage'

function resolveSafeRedirect(candidate) {
  if (typeof candidate !== 'string') return null
  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  return trimmed
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const explicitRedirect =
    resolveSafeRedirect(location.state?.from) ||
    resolveSafeRedirect(searchParams.get('next'))
  const redirectTarget = explicitRedirect || '/dashboard/home'
  const isBookingHandoff = Boolean(explicitRedirect?.startsWith('/dashboard/trekking'))

  const [values, setValues] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const change = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    if (errors[name] || errors.form) {
      setErrors((current) => ({ ...current, [name]: undefined, form: undefined }))
    }
  }

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
      if (role === 'vendor_admin' || role === 'vendor') {
        navigate('/vendor/dashboard', { replace: true })
      } else if (role === 'system_admin') {
        navigate('/admin/dashboard', { replace: true })
      } else if (role === 'staff') {
        navigate('/staff/dashboard', { replace: true })
      } else {
        navigate(redirectTarget, { replace: true })
      }
    } catch (error) {
      const emailError = error?.email
      const message = error?.error || error?.detail || error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.'
      setErrors({
        ...(emailError ? { email: Array.isArray(emailError) ? emailError[0] : emailError } : {}),
        form: Array.isArray(message) ? message[0] : message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const socialSuccess = () => navigate(redirectTarget, { replace: true })
  const socialError = (error) => {
    const message = error?.error || error?.detail || error?.message || 'Đăng nhập mạng xã hội thất bại.'
    setErrors({ form: Array.isArray(message) ? message[0] : message })
  }

  return (
    <AuthLayout>
      <AuthPage
        title="Đăng nhập tài khoản"
        description="Đăng nhập để đặt tour trekking sinh thái, theo dõi Green Points và hành trình Sơn Trà của bạn."
        contextBanner={
          isBookingHandoff
            ? 'Sau khi đăng nhập, bạn sẽ quay lại trực tiếp bước chọn lịch khởi hành và thanh toán VietQR.'
            : undefined
        }
      >
        <form className="auth-form motion-stagger" onSubmit={submit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={change}
            autoComplete="email"
            error={errors.email}
            placeholder="ten@email.com"
            leadingIcon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Mật khẩu"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={change}
            autoComplete="current-password"
            error={errors.password}
            placeholder="Nhập mật khẩu"
            leadingIcon={<Lock className="w-4 h-4" />}
            trailingAction={
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <div className="auth-form__row">
            <Link className="auth-form__forgot motion-underline" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>
          {errors.form && (
            <p className="auth-form__error" role="alert">
              {errors.form}
            </p>
          )}
          <Button className="auth-submit-button" type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
          <div className="auth-divider">
            <span />
            hoặc tiếp tục với
            <span />
          </div>
          <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
        </form>
        <p className="auth-card__footer">
          Chưa có tài khoản?{' '}
          <Link className="motion-underline" to="/register" state={explicitRedirect ? { from: explicitRedirect } : undefined}>
            Đăng ký ngay
          </Link>
        </p>
        <p className="auth-card__partner-link">
          Đơn vị lữ hành?{' '}
          <Link className="motion-underline" to="/partner/login">
            Đăng nhập cổng đối tác
          </Link>
        </p>
      </AuthPage>
    </AuthLayout>
  )
}
