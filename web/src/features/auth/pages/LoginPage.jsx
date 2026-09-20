import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, TreePine, ArrowRight } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { authService } from '../api/authService'

export default function LoginPage() {
  const navigate = useNavigate()

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null) // 'google' | 'facebook' | null
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Pre-load Facebook SDK on mount
  useEffect(() => {
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID || '1792164345143174'
    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: fbAppId,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        })
      }
    }
    if (!document.getElementById('facebook-jssdk') && !window.FB) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/vi_VN/sdk.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  // Handle Email/Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập email và mật khẩu để đăng nhập.')
      return
    }

    setLoading(true)
    try {
      const result = await authService.loginWithEmail(email, password)
      setStatusMessage('Đăng nhập thành công! Đang chuyển hướng...')
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    } catch (err) {
      setErrorMessage(err.message || err.detail || 'Email hoặc mật khẩu không chính xác.')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth Popup Trigger via @react-oauth/google
  const googleLoginTrigger = useGoogleLogin({
    scope: 'email profile openid',
    onSuccess: async (tokenResponse) => {
      setSocialLoading('google')
      setErrorMessage('')
      setStatusMessage('Đã nhận xác thực Google! Đang đồng bộ với Backend...')

      try {
        await authService.loginWithGoogleToken(tokenResponse.access_token)
        setStatusMessage('Đăng nhập Google thành công! Đang chuyển hướng...')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1200)
      } catch (err) {
        setErrorMessage(err.message || err.detail || 'Xác thực Google thất bại ở Server Backend.')
      } finally {
        setSocialLoading(null)
      }
    },
    onError: () => {
      setErrorMessage('Đăng nhập Google bị hủy hoặc thất bại.')
      setSocialLoading(null)
    }
  })

  // Facebook OAuth Login Handler with Fallback & Timeout
  const handleFacebookLogin = async () => {
    setErrorMessage('')
    setStatusMessage('')
    setSocialLoading('facebook')

    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID || '1792164345143174'

    // Safety timeout to reset loading if FB SDK hangs or is blocked by AdBlocker
    const timeoutTimer = setTimeout(() => {
      setSocialLoading((current) => {
        if (current === 'facebook') {
          setErrorMessage('Không thể tải Facebook SDK. Trình duyệt của bạn có thể đang chặn quảng cáo/tracking script (AdBlocker).')
          return null
        }
        return current
      })
    }, 4000)

    try {
      if (window.FB) {
        try {
          window.FB.init({
            appId: fbAppId,
            cookie: true,
            xfbml: true,
            version: 'v19.0'
          })
        } catch (e) {}

        window.FB.login((response) => {
          clearTimeout(timeoutTimer)
          if (response.authResponse?.accessToken) {
            setStatusMessage('Đã nhận xác thực Facebook! Đang đồng bộ với Backend...')
            authService.loginWithFacebookToken(response.authResponse.accessToken)
              .then(() => {
                setStatusMessage('Đăng nhập Facebook thành công! Đang chuyển hướng...')
                setTimeout(() => {
                  navigate('/dashboard')
                }, 1200)
              })
              .catch((err) => {
                setErrorMessage(err.message || err.detail || 'Xác thực Facebook thất bại ở Server Backend.')
              })
              .finally(() => {
                setSocialLoading(null)
              })
          } else {
            setErrorMessage('Đăng nhập Facebook bị hủy hoặc không được cấp quyền.')
            setSocialLoading(null)
          }
        }, { scope: 'public_profile' })
      } else {
        // Fallback to Supabase OAuth if SDK script is not available
        clearTimeout(timeoutTimer)
        await authService.loginWithFacebook()
      }
    } catch (err) {
      clearTimeout(timeoutTimer)
      setErrorMessage(`Không thể đăng nhập Facebook: ${err.message || 'Lỗi hệ thống'}`)
      setSocialLoading(null)
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-start items-center bg-white font-['Roboto'] overflow-x-hidden">
      
      {/* Full-width Header Bar */}
      <header className="flex h-20 items-center justify-between px-8 md:px-16 py-0 relative w-full border-b border-[#e2e8e4] bg-white z-20 shrink-0">
        <Link to="/" className="inline-flex items-center gap-2.5 relative group">
          <div className="w-10 h-10 rounded-xl bg-[#4a6b5d] flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:scale-105 transition-all">
            <TreePine className="w-6 h-6" />
          </div>
          <div className="inline-flex flex-col items-start relative">
            <span className="relative flex items-center w-fit font-semibold text-[#2d3732] text-base whitespace-nowrap">
              Sơn Trà REloop
            </span>
          </div>
        </Link>

        <div className="inline-flex items-center gap-4 relative">
          <span className="relative hidden sm:flex items-center w-fit font-normal text-[#6b7a72] text-xs whitespace-nowrap">
            Chưa có tài khoản?
          </span>
          <Link
            to="/register"
            className="box-border inline-flex px-[18px] py-[9px] rounded-[999px] border border-solid border-[#4a6b5d] items-center justify-center relative cursor-pointer hover:bg-emerald-50/50 transition-all"
          >
            <span className="relative flex items-center justify-center w-fit font-semibold text-[#4a6b5d] text-xs text-center whitespace-nowrap">
              Đăng ký ngay
            </span>
          </Link>
        </div>
      </header>

      {/* Full-screen Body Container (50/50 Split View) */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-80px)] items-stretch justify-center relative flex-col lg:flex-row">
        
        {/* Left Hero Graphic Section */}
        <aside
          className="flex lg:w-1/2 relative self-stretch z-[1] hidden lg:flex overflow-hidden bg-cover bg-center min-h-[calc(100vh-80px)]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80')`
          }}
          aria-label="Khung cảnh cung đường Sơn Trà"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </aside>

        {/* Right Form Section */}
        <div className="flex flex-col flex-1 lg:w-1/2 items-center justify-center px-6 sm:px-12 md:px-20 lg:px-24 py-12 relative self-stretch z-0 bg-white overflow-y-auto">
          
          <div className="w-full max-w-[480px] flex flex-col justify-center items-start gap-6">
            
            {/* Title Header */}
            <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full">
              <div className="flex self-stretch w-full flex-col items-start relative">
                <h1
                  id="login-title"
                  className="relative flex items-center self-stretch font-bold text-[#2d3732] text-[32px] leading-[40px]"
                >
                  Tham gia cộng đồng Xanh
                </h1>
              </div>
              <div className="flex flex-col items-start relative self-stretch w-full">
                <p className="relative flex items-center self-stretch font-normal text-[#6b7a72] text-sm leading-[22.4px]">
                  Đăng nhập để bắt đầu hành trình trekking có trách nhiệm.
                </p>
              </div>
            </div>

            {/* Notification Alert Status */}
            {errorMessage && (
              <div className="self-stretch p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="self-stretch p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form
              className="contents"
              onSubmit={handleSubmit}
              noValidate={false}
            >
              <div className="flex flex-col items-start gap-4 relative self-stretch w-full">
                
                {/* Email Field */}
                <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full">
                  <label
                    className="relative flex items-center self-stretch font-semibold text-[#2d3732] text-xs"
                    htmlFor="input-1"
                  >
                    Email
                  </label>
                  <div className="flex items-center gap-2.5 px-4 py-3.5 relative self-stretch w-full bg-white rounded-2xl border border-solid border-[#e2e8e4] focus-within:border-[#4a6b5d] transition-all">
                    <Mail className="w-4 h-4 text-[#6b7a72] shrink-0" />
                    <div className="flex flex-col items-start px-0.5 py-px relative flex-1 grow">
                      <input
                        className="relative self-stretch w-full border-none bg-transparent outline-none font-normal text-[#2d3732] text-sm p-0 placeholder:text-[#6b7a72]"
                        id="input-1"
                        name="email"
                        placeholder="ten@email.com"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full">
                  <label
                    className="relative flex items-center self-stretch font-semibold text-[#2d3732] text-xs"
                    htmlFor="password"
                  >
                    Mật khẩu
                  </label>
                  <div className="flex items-center gap-2.5 px-4 py-3.5 relative self-stretch w-full bg-white rounded-2xl border border-solid border-[#e2e8e4] focus-within:border-[#4a6b5d] transition-all">
                    <Lock className="w-4 h-4 text-[#6b7a72] shrink-0" />
                    <div className="flex flex-col items-start px-0.5 py-px relative flex-1 grow">
                      <input
                        className="relative self-stretch w-full border-none bg-transparent outline-none text-[#2d3732] text-sm p-0 placeholder:text-[#6b7a72]"
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#6b7a72] hover:text-[#2d3732] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex flex-col items-end relative self-stretch w-full">
                  <Link
                    to="/forgot-password"
                    className="text-[#4a6b5d] hover:underline text-xs font-semibold"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              {/* Submit & Social Actions */}
              <div className="flex flex-col items-start gap-4 relative self-stretch w-full">
                <button
                  className="box-border flex px-[26px] py-3.5 self-stretch w-full bg-[#4a6b5d] hover:bg-[#3a554a] text-white rounded-[999px] items-center justify-center relative cursor-pointer shadow-sm transition-all disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  <span className="relative flex items-center justify-center w-fit text-white text-[15px] font-semibold text-center whitespace-nowrap gap-2">
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </span>
                </button>

                {/* Divider */}
                <div
                  className="flex items-center gap-2.5 relative self-stretch w-full my-1"
                  aria-hidden="true"
                >
                  <div className="flex-1 h-px bg-[#e2e8e4]" />
                  <span className="relative flex items-center w-fit font-normal text-[#6b7a72] text-xs whitespace-nowrap">
                    hoặc tiếp tục với
                  </span>
                  <div className="flex-1 h-px bg-[#e2e8e4]" />
                </div>

                {/* Social Buttons */}
                <div className="flex items-start justify-center gap-2.5 relative self-stretch w-full">
                  
                  {/* Google OAuth Button */}
                  <button
                    className="box-border flex gap-1.5 p-[13px] flex-1 rounded-2xl border border-solid border-[#e2e8e4] hover:bg-slate-50 items-center justify-center relative cursor-pointer transition-all disabled:opacity-60"
                    type="button"
                    disabled={socialLoading === 'google'}
                    onClick={() => {
                      setSocialLoading('google')
                      googleLoginTrigger()
                    }}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="relative flex items-center justify-center w-fit font-semibold text-[#2d3732] text-xs text-center whitespace-nowrap">
                      {socialLoading === 'google' ? 'Đang kết nối...' : 'Google'}
                    </span>
                  </button>

                  {/* Facebook OAuth Button */}
                  <button
                    className="box-border flex gap-1.5 p-[13px] flex-1 rounded-2xl border border-solid border-[#e2e8e4] hover:bg-slate-50 items-center justify-center relative cursor-pointer transition-all disabled:opacity-60"
                    type="button"
                    disabled={socialLoading === 'facebook'}
                    onClick={handleFacebookLogin}
                  >
                    <svg className="w-4 h-4 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="relative flex items-center justify-center w-fit font-semibold text-[#2d3732] text-xs text-center whitespace-nowrap">
                      {socialLoading === 'facebook' ? 'Đang kết nối...' : 'Facebook'}
                    </span>
                  </button>

                </div>
              </div>
            </form>

            {/* Bottom Register Prompt */}
            <div className="flex flex-col items-center justify-center relative self-stretch w-full pt-3 border-t border-slate-100">
              <p className="relative self-stretch text-center font-normal text-[13px]">
                <span className="text-[#6b7a72]">Chưa có tài khoản? </span>
                <Link
                  to="/register"
                  className="font-bold text-[#4a6b5d] hover:underline ml-1"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}
