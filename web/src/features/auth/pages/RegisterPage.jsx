import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, TreePine, ShieldCheck } from 'lucide-react'
import { authService } from '../api/authService'

export default function RegisterPage() {
  const navigate = useNavigate()

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'trekker' // 'trekker' | 'guide' | 'vendor'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!formData.email || !formData.password || !formData.username) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
      return
    }

    setLoading(true)
    try {
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        user_type: formData.userType
      })
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển đến trang đăng nhập...')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      setErrorMsg(err.message || err.detail || 'Không thể tạo tài khoản. Email hoặc Tên đăng nhập có thể đã tồn tại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center py-6 px-4 font-['Roboto']">
      <div className="w-full max-w-[1440px] min-h-[920px] bg-color-white-solid rounded-[24px] shadow-[0px_10px_35px_0px_rgba(0,0,0,0.06)] flex flex-col justify-start items-start overflow-hidden border border-slate-100">
        
        {/* Header Bar */}
        <header className="self-stretch h-20 px-8 md:px-16 border-b border-color-spring-green-90 flex justify-between items-center bg-white">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-200 group-hover:scale-105 transition-all">
              <TreePine className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-color-grey-20 text-lg font-bold leading-5 tracking-tight font-['Outfit']">
                Sơn Trà <span className="text-color-spring-green-35">REloop</span>
              </span>
              <span className="text-xs text-color-grey-45 font-normal">Trekking & Eco Marketplace</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-color-grey-45 text-xs font-normal">
              Đã có tài khoản?
            </span>
            <Link 
              to="/login" 
              className="px-5 py-2 rounded-full border border-color-spring-green-35 text-color-spring-green-35 text-xs font-semibold hover:bg-color-spring-green-90 transition-all-200"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="self-stretch flex-1 flex flex-col lg:flex-row justify-center items-stretch overflow-hidden">
          
          {/* Left Hero Graphic Banner */}
          <div className="lg:w-[580px] xl:w-[624px] bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white p-10 xl:p-14 flex flex-col justify-between relative overflow-hidden hidden lg:flex">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" /> Tham gia cộng đồng Sinh thái Sơn Trà
              </span>
            </div>

            <div className="relative z-10 my-auto py-8">
              <h2 className="text-3xl font-bold font-['Outfit'] mb-4 text-white">
                Trở thành một Eco-Trekker Có Trách Nhiệm
              </h2>
              <ul className="space-y-4 text-emerald-100/90 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                  <span>Tích điểm <strong>Eco-Points</strong> khi hoàn thành các chặng leo núi & nhặt rác bảo vệ môi trường.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                  <span>Đổi điểm nhận Voucher quà tặng độc quyền tại các <strong>Eco-Shop</strong> đối tác Đà Nẵng.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                  <span>Kết nối cộng đồng Hướng dẫn viên địa phương Sơn Trà & các Trekkers cùng đam mê.</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 text-xs text-emerald-200/70 border-t border-emerald-700/50 pt-4">
              <span>Đồ án PBL6 - Trường ĐH Bách Khoa Đà Nẵng</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="flex-1 lg:max-w-[805px] px-6 sm:px-12 md:px-20 lg:px-24 py-10 flex flex-col justify-center items-start gap-6 bg-white overflow-y-auto">
            
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <h1 className="text-color-grey-20 text-3xl font-bold font-['Outfit'] leading-tight">
                Tạo tài khoản mới
              </h1>
              <p className="text-color-grey-45 text-sm font-normal leading-relaxed">
                Đăng ký chỉ mất 1 phút để tham gia cùng 5,000+ Trekkers tại Bán đảo Sơn Trà.
              </p>
            </div>

            {errorMsg && (
              <div className="self-stretch p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="self-stretch p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="self-stretch flex flex-col justify-start items-start gap-4">
              {/* Full Name */}
              <div className="self-stretch flex flex-col gap-1.5">
                <label className="text-color-grey-20 text-xs font-semibold">Họ và tên</label>
                <div className="self-stretch px-4 py-2.5 bg-color-white-solid rounded-2xl border border-color-spring-green-90 focus-within:border-color-spring-green-35 flex items-center gap-3">
                  <User className="w-4 h-4 text-color-grey-45 shrink-0" />
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nguyen Van A"
                    className="flex-1 bg-transparent border-none outline-none text-color-grey-20 text-sm"
                  />
                </div>
              </div>

              {/* Username & Email Grid */}
              <div className="self-stretch grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-color-grey-20 text-xs font-semibold">Tên đăng nhập *</label>
                  <div className="px-4 py-2.5 bg-color-white-solid rounded-2xl border border-color-spring-green-90 focus-within:border-color-spring-green-35 flex items-center gap-3">
                    <User className="w-4 h-4 text-color-grey-45 shrink-0" />
                    <input 
                      type="text" 
                      name="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="trekkera"
                      className="flex-1 bg-transparent border-none outline-none text-color-grey-20 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-color-grey-20 text-xs font-semibold">Email *</label>
                  <div className="px-4 py-2.5 bg-color-white-solid rounded-2xl border border-color-spring-green-90 focus-within:border-color-spring-green-35 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-color-grey-45 shrink-0" />
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="ten@email.com"
                      className="flex-1 bg-transparent border-none outline-none text-color-grey-20 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="self-stretch grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-color-grey-20 text-xs font-semibold">Mật khẩu *</label>
                  <div className="px-4 py-2.5 bg-color-white-solid rounded-2xl border border-color-spring-green-90 focus-within:border-color-spring-green-35 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-color-grey-45 shrink-0" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent border-none outline-none text-color-grey-20 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-color-grey-20 text-xs font-semibold">Xác nhận mật khẩu *</label>
                  <div className="px-4 py-2.5 bg-color-white-solid rounded-2xl border border-color-spring-green-90 focus-within:border-color-spring-green-35 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-color-grey-45 shrink-0" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent border-none outline-none text-color-grey-20 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="self-stretch mt-2 py-3.5 bg-color-spring-green-35 hover:bg-color-spring-green-35-hover text-white rounded-full text-base font-semibold transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="self-stretch pt-3 border-t border-slate-100 flex justify-center items-center">
              <span className="text-color-grey-45 text-xs font-normal">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-color-spring-green-35 font-bold hover:underline">
                  Đăng nhập
                </Link>
              </span>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
