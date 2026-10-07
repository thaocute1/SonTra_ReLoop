import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
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
      await authService.loginWithEmail(values.email.trim(), values.password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const emailError = error?.email
      const message = error?.error || error?.detail || error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
      setErrors({ ...(emailError ? { email: Array.isArray(emailError) ? emailError[0] : emailError } : {}), form: Array.isArray(message) ? message[0] : message })
    } finally {
      setIsSubmitting(false)
    }
  }
  const socialSuccess = () => navigate('/dashboard', { replace: true })
  const socialError = (error) => {
    const message = error?.error || error?.detail || error?.message || 'Đăng nhập mạng xã hội thất bại.'
    setErrors({ form: Array.isArray(message) ? message[0] : message })
  }

  return <AuthLayout>
    <AuthPage title="Tham gia cộng đồng Xanh" description="Đăng nhập để bắt đầu hành trình trekking có trách nhiệm.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Input label="Email" name="email" type="email" value={values.email} onChange={change} autoComplete="email" error={errors.email} placeholder="ten@email.com" leadingIcon={icon('mail')} />
        <Input label="Mật khẩu" name="password" type="password" value={values.password} onChange={change} autoComplete="current-password" error={errors.password} placeholder="••••••••" leadingIcon={icon('lock')} />
        <Link className="auth-form__forgot" to="/forgot-password">Quên mật khẩu?</Link>
        {errors.form && <p className="terms-error" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</Button>
        <div className="auth-divider"><span />hoặc tiếp tục với<span /></div>
        <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
      </form>
      <p className="auth-card__footer">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </AuthPage>
  </AuthLayout>
}
