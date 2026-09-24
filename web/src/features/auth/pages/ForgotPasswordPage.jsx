import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  return <main className="simple-page"><h1>Quên mật khẩu</h1><p>Tính năng đặt lại mật khẩu sẽ được kết nối với backend trong phiên bản tiếp theo.</p><Link to="/login">Quay lại đăng nhập</Link></main>
}
