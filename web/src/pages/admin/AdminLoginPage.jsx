import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/axios';
import { extractErrorMessage } from '../../utils/apiError';

function LogoIcon({ className = 'w-7 h-7' }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z" />
    </svg>
  );
}

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu quản trị.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/accounts/login/', {
        email: email.trim(),
        password,
      });
      const { access, refresh, user } = response.data || {};
      if (!access || !user || !['system_admin', 'staff'].includes(user.role)) {
        throw new Error('ADMIN_ROLE_REQUIRED');
      }
      localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_info', JSON.stringify(user));
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('user_name', user.name || user.email || 'Admin');
      if (rememberLogin) {
        localStorage.setItem('admin_last_email', email.trim());
      }
      navigate(user.role === 'staff' ? '/staff/dashboard' : '/admin/dashboard', { replace: true });
    } catch (err) {
      const detail = err?.message === 'ADMIN_ROLE_REQUIRED' ? '' : extractErrorMessage(err, '');
      setErrorMessage(detail || 'Đăng nhập thất bại hoặc tài khoản không có quyền admin/staff.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F5F5] text-black font-be-vietnam antialiased selection:bg-[#19392D] selection:text-white motion-page-enter">
      {/* Top Header */}
      <header className="h-[72px] flex items-center justify-between px-6 sm:px-12 border-b border-black/10 bg-[#F5F5F5]/85 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity">
            <LogoIcon className="w-7 h-7 text-black" />
            <span className="text-lg sm:text-xl font-semibold tracking-tight text-black">
              Sơn Trà REloop
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/5 text-black/75 border border-black/10">
              Ban Quản lý
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center font-medium text-black hover:text-[#19392D] transition-colors"
          >
            Trang du khách
          </Link>
          <div className="h-4 w-[1px] bg-black/15 hidden sm:block" />
          <Link
            to="/partner/login"
            className="text-black/60 hover:text-black transition-colors"
          >
            Cổng đối tác lữ hành
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-black/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-7 sm:p-10 space-y-6 motion-fade-up">
          {/* Card Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#19392D]/10 text-[#19392D] flex items-center justify-center mb-4 mx-auto sm:mx-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-semibold text-black leading-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              Đăng nhập quản trị BQL
            </h1>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="block text-sm font-semibold text-black">
                Email công vụ hoặc mã cán bộ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/45">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sontra.gov.vn"
                  className="w-full min-h-[52px] pl-10 pr-4 py-3 rounded-xl border border-black/15 bg-[#F5F5F5]/60 text-base text-black placeholder:text-black/40 focus:outline-hidden focus:border-black focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="admin-password" className="block text-sm font-semibold text-black">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black/45">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full min-h-[52px] pl-10 pr-12 py-3 rounded-xl border border-black/15 bg-[#F5F5F5]/60 text-base text-black placeholder:text-black/40 focus:outline-hidden focus:border-black focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-black/50 hover:text-black cursor-pointer rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-xs pt-1">
              <label className="flex min-h-10 items-center gap-2 cursor-pointer text-black/65">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="w-4 h-4 rounded border-black/25 accent-[#19392D] cursor-pointer"
                />
                <span>Ghi nhớ email đăng nhập</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full min-h-[52px] px-6 py-2 rounded-full bg-black hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 !text-white text-sm sm:text-base font-medium transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
              >
                {loading ? (
                  <span>Đang xác thực thông tin...</span>
                ) : (
                  <>
                    <span className="!text-white">Đăng nhập cổng BQL</span>
                    <span className="absolute right-2 bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="w-4 h-4 text-black" />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Card Footer Links */}
          <div className="pt-4 border-t border-black/10 text-center text-xs">
            <p className="text-black/65">
              Bạn là đối tác lữ hành?{' '}
              <Link to="/partner/login" className="font-semibold text-[#19392D] hover:underline">
                Chuyển sang Cổng Đối tác
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
