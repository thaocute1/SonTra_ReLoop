import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { authService } from '../api/authService'
import { SocialAuthButtons } from '../components/SocialAuthButtons'
import { AuthPage } from './AuthPage'

const icon = (name) => <img src={`/assets/figma/icon-${name}.svg`} alt="" />

export default function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', agreed: false })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
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
      await authService.register({ name: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim(), password: values.password })
      navigate('/dashboard', { replace: true })
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
  const socialSuccess = () => navigate('/dashboard', { replace: true })
  const socialError = (error) => {
    const message = error?.error || error?.detail || error?.message || 'Đăng ký bằng mạng xã hội thất bại.'
    setErrors({ form: Array.isArray(message) ? message[0] : message })
  }

  return <AuthLayout>
    <AuthPage variant="register" title="Trải nghiệm Thiên Nhiên Đích Thực" description="Đăng ký tài khoản thành viên Sơn Trà RESort để nhận ưu đãi 15% cho kỳ nghỉ đầu tiên.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Input label="Họ và tên" name="fullName" value={values.fullName} onChange={change} autoComplete="name" error={errors.fullName} placeholder="Nguyễn Văn A" leadingIcon={icon('user')} />
        <Input label="Email" name="email" type="email" value={values.email} onChange={change} autoComplete="email" error={errors.email} placeholder="nguyenvana@email.com" leadingIcon={icon('mail')} />
        <Input label="Số điện thoại" name="phone" type="tel" value={values.phone} onChange={change} autoComplete="tel" error={errors.phone} placeholder="090 1234 567" leadingIcon={icon('phone')} />
        <Input label="Mật khẩu" name="password" type="password" value={values.password} onChange={change} autoComplete="new-password" error={errors.password} placeholder="••••••••" leadingIcon={icon('lock')} trailingIcon={icon('eye')} />
        <Input label="Xác nhận mật khẩu" name="confirmPassword" type="password" value={values.confirmPassword} onChange={change} autoComplete="new-password" error={errors.confirmPassword} placeholder="••••••••" leadingIcon={icon('lock')} trailingIcon={icon('eye')} />
        <label className={`terms-check ${errors.agreed ? 'terms-check--error' : ''}`}><input name="agreed" type="checkbox" checked={values.agreed} onChange={change} /><span aria-hidden="true" />Tôi đồng ý với <a href="#terms">Điều khoản dịch vụ</a> &amp; <a href="#privacy">Chính sách bảo mật</a></label>
        {errors.agreed && <p className="terms-error">{errors.agreed}</p>}
        {errors.form && <p className="terms-error" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng ký...' : 'Đăng ký thành viên'}</Button>
        <div className="auth-divider"><span />hoặc đăng ký bằng<span /></div>
        <SocialAuthButtons onAuthenticated={socialSuccess} onError={socialError} disabled={isSubmitting} />
      </form>
      <p className="auth-card__footer">Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link></p>
    </AuthPage>
  </AuthLayout>
}
