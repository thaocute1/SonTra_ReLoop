import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { authService } from '../api/authService'
import { AuthPage } from './AuthPage'

const mailIcon = <img src="/assets/figma/icon-mail.svg" alt="" />

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.')
      setSubmitted(false)
      return
    }

    setError('')
    setSubmitted(false)
    setIsSubmitting(true)
    try {
      const data = await authService.forgotPassword(normalizedEmail)
      setSuccessMessage(
        data?.message || 'Đã ghi nhận yêu cầu. Hãy kiểm tra hộp thư của bạn để tiếp tục.'
      )
      setSubmitted(true)
    } catch (err) {
      const apiError =
        err?.email?.[0] || err?.message || err?.detail || 'Không thể gửi yêu cầu khôi phục mật khẩu.'
      setError(apiError)
      setSubmitted(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthPage
        variant="login"
        title="Khôi phục mật khẩu"
        description="Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn."
      >
        <form className="auth-form motion-stagger" onSubmit={submit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (error) setError('')
              if (submitted) setSubmitted(false)
            }}
            autoComplete="email"
            error={error}
            placeholder="ten@email.com"
            leadingIcon={mailIcon}
          />
          {submitted && (
            <p className="auth-form__success" role="status">
              {successMessage}
            </p>
          )}
          <Button className="auth-submit-button" type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi hướng dẫn'}
          </Button>
        </form>
        <p className="auth-card__footer">
          <Link className="motion-underline" to="/login">Quay lại đăng nhập</Link>
        </p>
      </AuthPage>
    </AuthLayout>
  )
}
