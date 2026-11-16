import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
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

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const explicitRedirect =
    resolveSafeRedirect(location.state?.from) ||
    resolveSafeRedirect(searchParams.get('next'))
  const redirectTarget = explicitRedirect || '/dashboard/home'
  const isBookingHandoff = Boolean(explicitRedirect?.startsWith('/dashboard/trekking'))

  const [values, setValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPolicyNote, setShowPolicyNote] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const change = (event) => {
    const { name, type, checked, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name] || errors.form) {
      setErrors((current) => ({ ...current, [name]: undefined, form: undefined }))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!values.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.'
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = 'Vui lòng nhập email hợp lệ.'
    if (!values.phone.trim()) next.phone = 'Vui lòng nhập số điện thoại.'
    if (values.password.length < 8) next.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
    if (values.confirmPassword !== values.password) next.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    if (!values.agreed) next.agreed = 'Bạn cần đồng ý với quy định an toàn và điều khoản sử dụng.'
    setErrors(next)
    if (Object.keys(next).length) return

    setIsSubmitting(true)
    try {
      await authService.register({
        name: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      })
      navigate(redirectTarget, { replace: true })
    } catch (error) {
      const fieldErrors = {}
      for (const field of ['name', 'full_name', 'email', 'phone', 'password']) {
        if (error?.[field]) {
          const pageField = field === 'name' || field === 'full_name' ? 'fullName' : field
          fieldErrors[pageField] = Array.isArray(error[field]) ? error[field][0] : error[field]
        }
      }
      const message = error?.error || error?.detail || error?.message
      if (message) fieldErrors.form = Array.isArray(message) ? message[0] : message
      if (!Object.keys(fieldErrors).length) fieldErrors.form = 'Đăng ký thất bại. Vui lòng thử lại.'
      setErrors(fieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const socialSuccess = () => navigate(redirectTarget, { replace: true })
  const socialError = (error) => {
    const message = error?.error || error?.detail || error?.message || 'Đăng ký bằng mạng xã hội thất bại.'
    setErrors({ form: Array.isArray(message) ? message[0] : message })
  }

  return (
    <AuthLayout>
      <AuthPage
        variant="register"
        title="Tạo tài khoản du khách"
        description="Đăng ký tài khoản Son Tra ReLoop để đặt tour trekking sinh thái, quét checkpoint GPS/QR tích Green Points và đồng hành bảo vệ bán đảo Sơn Trà."
        contextBanner={
          isBookingHandoff
            ? 'Hoàn tất đăng ký để tiếp tục đặt chỗ và thanh toán VietQR cho tuyến trekking bạn đã chọn.'
            : undefined
        }
      >
        <form className="auth-form motion-stagger" onSubmit={submit} noValidate>
          <Input
            label="Họ và tên"
            name="fullName"
            value={values.fullName}
            onChange={change}
            autoComplete="name"
            error={errors.fullName}
            placeholder="Nguyễn Văn An"
            leadingIcon={<User className="w-4 h-4" />}
          />
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
            label="Số điện thoại"
            name="phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={change}
            autoComplete="tel"
            error={errors.phone}
            placeholder="0901 234 567"
            leadingIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Mật khẩu"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={change}
            autoComplete="new-password"
            error={errors.password}
            hint={!errors.password ? 'Ít nhất 8 ký tự.' : undefined}
            placeholder="Tối thiểu 8 ký tự"
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
          <Input
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={values.confirmPassword}
            onChange={change}
            autoComplete="new-password"
            error={errors.confirmPassword}
            placeholder="Nhập lại mật khẩu"
            leadingIcon={<Lock className="w-4 h-4" />}
            trailingAction={
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="auth-terms-block">
            <label className={`terms-check ${errors.agreed ? 'terms-check--error' : ''}`}>
              <input name="agreed" type="checkbox" checked={values.agreed} onChange={change} />
              <span aria-hidden="true" />
              <span>
                Tôi đồng ý tuân thủ quy định an toàn tuyến trekking Sơn Trà và{' '}
                <button
                  type="button"
                  className="terms-inline-trigger"
                  aria-expanded={showPolicyNote}
                  onClick={(event) => {
                    event.preventDefault()
                    setShowPolicyNote((open) => !open)
                  }}
                >
                  điều khoản sử dụng &amp; bảo mật
                </button>
                .
              </span>
            </label>
            {showPolicyNote && (
              <div className="auth-policy-summary">
                Thông tin tài khoản, lịch sử đặt tour và vị trí checkpoint GPS chỉ được sử dụng cho mục đích điều phối an toàn tuyến, xác thực Green Points và đối soát quỹ bảo tồn 10% cùng Ban Quản lý Sơn Trà.
              </div>
            )}
          </div>

          {errors.agreed && (
            <p className="terms-error" role="alert">
              {errors.agreed}
            </p>
          )}
          {errors.form && (
            <p className="auth-form__error" role="alert">
              {errors.form}
            </p>
          )}
          <Button className="auth-submit-button" type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng ký...' : 'Tạo tài khoản'}
          </Button>
          <div className="auth-divider">
            <span />
            hoặc đăng ký bằng
            <span />
          </div>
          <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
        </form>
        <p className="auth-card__footer">
          Đã có tài khoản?{' '}
          <Link className="motion-underline" to="/login" state={explicitRedirect ? { from: explicitRedirect } : undefined}>
            Đăng nhập ngay
          </Link>
        </p>
      </AuthPage>
    </AuthLayout>
  )
}
