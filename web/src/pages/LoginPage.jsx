import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import { AuthPage } from './AuthPage'

const icon = (name) => <img src={`/assets/figma/icon-${name}.svg`} alt="" />

export function LoginPage() {
  const [values, setValues] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [payload, setPayload] = useState(null)
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => { event.preventDefault(); const next = {}; if (!values.username.trim()) next.username = 'Vui lòng nhập email hoặc tên đăng nhập.'; if (!values.password) next.password = 'Vui lòng nhập mật khẩu.'; setErrors(next); if (Object.keys(next).length) return; const body = { username: values.username.trim(), password: values.password }; setPayload(body); console.info('DRF login payload', body) }
  return <AuthPage title="Tham gia cộng đồng Xanh" description="Đăng nhập để bắt đầu hành trình trekking có trách nhiệm." alternateText="Chưa có tài khoản?" alternateLink="/register" alternateLabel="Đăng ký ngay"><form className="auth-form" onSubmit={submit} noValidate><Input label="Email" name="username" value={values.username} onChange={change} autoComplete="username" error={errors.username} placeholder="ten@email.com" leadingIcon={icon('mail')} /><Input label="Mật khẩu" name="password" type="password" value={values.password} onChange={change} autoComplete="current-password" error={errors.password} placeholder="••••••••" leadingIcon={icon('lock')} /><Link className="auth-form__forgot" to="/login">Quên mật khẩu?</Link><Button type="submit" size="lg">Đăng nhập</Button><div className="auth-divider"><span />hoặc tiếp tục với<span /></div><div className="auth-social"><Button variant="secondary" type="button" className="auth-social__button"><span aria-hidden="true">○</span> Google</Button><Button variant="secondary" type="button" className="auth-social__button"><span aria-hidden="true">□</span> Facebook</Button></div>{payload && <output className="auth-payload">DRF payload: {JSON.stringify(payload)}</output>}</form><p className="auth-card__footer">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p></AuthPage>
}
