import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { getHomePathForRole } from '../../../routes/ProtectedRoute'
import { extractErrorMessage, extractFieldErrors, hasFormLevelError } from '../../../utils/apiError'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'
import { AuthPage } from './AuthPage'

const icon = (name) => <img src={`/assets/figma/icon-${name}.svg`} alt="" />

export default function LoginPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
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

  return <AuthLayout>
    <AuthPage title="Tham gia cộng đồng xanh" description="Đăng nhập để bắt đầu hành trình trekking có trách nhiệm.">
      <form className="auth-form motion-stagger" onSubmit={submit} noValidate>
        <Input label="Email" name="email" type="email" value={values.email} onChange={change} autoComplete="email" error={errors.email} placeholder="ten@email.com" leadingIcon={icon('mail')} />
        <Input label="Mật khẩu" name="password" type="password" value={values.password} onChange={change} autoComplete="current-password" error={errors.password} placeholder="••••••••" leadingIcon={icon('lock')} />
        <Link className="auth-form__forgot motion-underline" to="/forgot-password">Quên mật khẩu?</Link>
        {errors.form && <p className="terms-error" role="alert">{errors.form}</p>}
        <Button className="auth-submit-button" type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</Button>
        <div className="auth-divider"><span />hoặc tiếp tục với<span /></div>
        <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
      </form>
      <p className="auth-card__footer">Chưa có tài khoản? <Link className="motion-underline" to="/register">Đăng ký ngay</Link></p>
    </AuthPage>
  </AuthLayout>
}
