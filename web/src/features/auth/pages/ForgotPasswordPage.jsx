import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button, Input } from '../../../components/ui'
import AuthLayout from '../../../layouts/AuthLayout'
import { AuthPage } from './AuthPage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.')
      setSubmitted(false)
      return
    }

    setError('')
    setSubmitted(true)
  }

  return (
    <AuthLayout>
      <AuthPage
        variant="login"
        title="Khôi phục mật khẩu"
        description="Nhập email đã đăng ký tài khoản Son Tra ReLoop để xem hướng dẫn hỗ trợ khôi phục quyền truy cập."
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
            leadingIcon={<Mail className="w-4 h-4" />}
          />
          {submitted && (
            <p className="auth-form__notice" role="status">
              Tính năng gửi email đặt lại mật khẩu tự động hiện chưa kích hoạt trên máy chủ này. Nếu bạn đã liên kết Google hoặc Facebook, hãy quay lại trang đăng nhập bằng mạng xã hội hoặc liên hệ quản trị viên để được cấp lại quyền truy cập cho <b>{email.trim()}</b>.
            </p>
          )}
          <Button className="auth-submit-button" type="submit" size="lg">
            Kiểm tra hướng dẫn khôi phục
          </Button>
        </form>
        <p className="auth-card__footer">
          <Link className="motion-underline" to="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </AuthPage>
    </AuthLayout>
  )
}
