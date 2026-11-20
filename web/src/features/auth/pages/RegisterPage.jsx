import { useState } from 'react'
import { Lock, Mail, Phone, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { getHomePathForRole } from '../../../routes/ProtectedRoute'
import { extractErrorMessage, extractFieldErrors, hasFormLevelError } from '../../../utils/apiError'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'
import { AuthPage } from './AuthPage'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  })
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
    if (!values.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.'
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Vui lòng nhập email hợp lệ.'
    if (!values.phone.trim()) next.phone = 'Vui lòng nhập số điện thoại.'
    if (values.password.length < 8) next.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
    if (values.confirmPassword !== values.password) next.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
    if (!values.agreed) next.agreed = 'Bạn cần đồng ý với điều khoản dịch vụ.'
    setErrors(next)
    if (Object.keys(next).length) return

    setIsSubmitting(true)
    try {
      const data = await authService.register({
        name: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      })
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
      setErrors(fieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const socialSuccess = (data) => navigate(getHomePathForRole(data?.user?.role) || '/dashboard/home', { replace: true })

  const socialError = (error) => {
    setErrors({ form: extractErrorMessage(error, 'Đăng ký bằng mạng xã hội thất bại.') })
  }

  return (
    <AuthLayout>
      <AuthPage
        variant="register"
        title="Tạo tài khoản Eco-Explorer"
      >
        <form className="auth-v2-form auth-v2-form--register" onSubmit={submit} noValidate>
          <div className="auth-v2-grid-2">
            <Input
              label="Họ và tên"
              name="fullName"
              value={values.fullName}
              onChange={change}
              autoComplete="name"
              error={errors.fullName}
              placeholder="Nguyễn Văn A"
              leadingIcon={<User size={15} />}
            />
            <Input
              label="Số điện thoại"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={change}
              autoComplete="tel"
              error={errors.phone}
              placeholder="0905 123 456"
              leadingIcon={<Phone size={15} />}
            />
          </div>

          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            value={values.email}
            onChange={change}
            autoComplete="email"
            error={errors.email}
            placeholder="ten@email.com"
            leadingIcon={<Mail size={15} />}
          />

          <div className="auth-v2-grid-2">
            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              value={values.password}
              onChange={change}
              autoComplete="new-password"
              error={errors.password}
              placeholder="••••••••"
              leadingIcon={<Lock size={15} />}
            />
            <Input
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={change}
              autoComplete="new-password"
              error={errors.confirmPassword}
              placeholder="••••••••"
              leadingIcon={<Lock size={15} />}
            />
          </div>

          <label className={`terms-check ${errors.agreed ? 'terms-check--error' : ''}`}>
            <input name="agreed" type="checkbox" checked={values.agreed} onChange={change} />
            <span aria-hidden="true" />
            Tôi đồng ý <a href="#terms">Điều khoản &amp; Quy định bảo tồn Sơn Trà</a>
          </label>
          {errors.agreed && <p className="terms-error" role="alert">{errors.agreed}</p>}
          {errors.form && <p className="terms-error" role="alert">{errors.form}</p>}

          <button className="auth-v2-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký thành viên'}
          </button>

          <div className="auth-v2-divider">
            <span />
            <span>hoặc đăng ký bằng</span>
            <span />
          </div>

          <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
        </form>
      </AuthPage>
    </AuthLayout>
  )
}
