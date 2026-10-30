import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Compass,
  FileCheck
} from 'lucide-react';
import { api } from '../../lib/axios';
import { vendorApplicationService, formatDisplayId } from '../../services/vendorApplicationService';

export const PartnerLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentApprovedVendor, setRecentApprovedVendor] = useState(null);

  // Tìm hồ sơ đối tác được duyệt gần nhất để phục vụ Quick Demo
  useEffect(() => {
    const fetchRecentVendor = async () => {
      try {
        const list = await vendorApplicationService.getAll({ status: 'approved' });
        if (list && list.length > 0) {
          setRecentApprovedVendor(list[0]);
        }
      } catch (err) {
        console.warn('Không thể tải đối tác demo:', err);
      }
    };
    fetchRecentVendor();
  }, []);

  // Quick Demo: Tự động điền tài khoản đối tác vừa duyệt
  const handleQuickDemoFill = () => {
    if (recentApprovedVendor) {
      setEmail(recentApprovedVendor.email || '123@example.com');
      setPassword(recentApprovedVendor.initial_password || 'Vendor@2026');
      setErrorMessage('');
    } else {
      setEmail('123@example.com');
      setPassword('Vendor@2026');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu đối tác.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ưu tiên gọi API Backend Django
      try {
        const res = await api.post('/accounts/login/', {
          email: email.trim(),
          password: password
        }, { timeout: 3000 });

        if (res.data) {
          const { access, refresh, user } = res.data;
          if (access) localStorage.setItem('access_token', access);
          if (refresh) localStorage.setItem('refresh_token', refresh);
          if (user) {
            localStorage.setItem('user_info', JSON.stringify(user));
            localStorage.setItem('user_role', user.role || 'vendor_admin');
            localStorage.setItem('user_name', user.name || 'Đối tác lữ hành');
          }

          // Lấy thông tin đối tác tương ứng để lưu vào session
          const vendors = await vendorApplicationService.getAll();
          const matched = vendors.find(v => v.email?.toLowerCase() === email.trim().toLowerCase());
          if (matched) {
            localStorage.setItem('current_vendor_profile', JSON.stringify(matched));
          }

          setTimeout(() => {
            setLoading(false);
            navigate('/vendor/dashboard', { replace: true });
          }, 500);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend login fallback to local demo check:', backendErr);
      }

      // 2. Chế độ Fallback / Offline Demo (Dành cho buổi bảo vệ PBL6)
      const vendors = await vendorApplicationService.getAll();
      const matched = vendors.find(v => v.email?.toLowerCase() === email.trim().toLowerCase());

      const validDefaultPassword = 'Vendor@2026';
      const isPasswordMatch = password === validDefaultPassword || 
        (matched && matched.initial_password && password === matched.initial_password);

      if (matched || (email.toLowerCase().includes('trekking') || email.toLowerCase().includes('partner') || email.toLowerCase().includes('vendor'))) {
        if (!isPasswordMatch && password !== '123456' && password !== 'admin123') {
          setErrorMessage('Mật khẩu không chính xác. Mật khẩu khởi tạo BQL cấp là: Vendor@2026');
          setLoading(false);
          return;
        }

        const vendorProfile = matched || {
          id: 1,
          display_id: 'VAPP-2026-001',
          brand_name: 'Sơn Trà Trekking Adventure',
          email: email.trim(),
          service_type: 'Trekking và khám phá rừng',
          operating_area: 'Bán đảo Sơn Trà',
          legal_representative: 'Nguyễn Văn Hùng',
          business_license_code: 'GPKD-DN-0408892101',
          experience_years: 5,
          guides_count: 6,
          commission_rate: 0.10,
          status: 'approved'
        };

        const sessionUser = {
          id: vendorProfile.id,
          name: vendorProfile.brand_name,
          email: vendorProfile.email,
          role: 'vendor_admin',
          status: 'active'
        };

        localStorage.setItem('access_token', 'partner-demo-jwt-token');
        localStorage.setItem('user_info', JSON.stringify(sessionUser));
        localStorage.setItem('user_role', 'vendor_admin');
        localStorage.setItem('user_name', vendorProfile.brand_name);
        localStorage.setItem('current_vendor_profile', JSON.stringify(vendorProfile));

        setTimeout(() => {
          setLoading(false);
          navigate('/vendor/dashboard', { replace: true });
        }, 500);
      } else {
        setErrorMessage('Tài khoản đối tác không tồn tại hoặc chưa được BQL Sơn Trà duyệt.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Lỗi đăng nhập đối tác:', err);
      setErrorMessage('Đã xảy ra lỗi khi xác thực. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="m3-partner-page min-h-screen flex flex-col justify-between bg-[#F8FAF7] font-be-vietnam motion-page-enter">
      {/* Top Header */}
      <header className="h-[72px] flex items-center justify-between px-6 sm:px-12 border-b border-[#C5CCC7] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/partner" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-[#2F5D4A] !text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#191C1A] font-fraunces block leading-none">
                Sơn Trà REloop
              </span>
              <span className="text-[10px] text-[#2F5D4A] font-bold tracking-wider block mt-0.5">
                Cổng đối tác lữ hành B2B
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link 
            to="/partner/onboarding" 
            className="hidden sm:inline-flex items-center gap-1.5 font-bold text-[#2F5D4A] hover:underline"
          >
            <span>Nộp hồ sơ đối tác mới</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#C5CCC7] hidden sm:block" />
          <Link
            to="/bql-portal/login"
            className="text-[#4A514C] hover:text-[#191C1A] transition-colors"
          >
            Cổng BQL nội bộ
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-[#C5CCC7] shadow-[0px_16px_48px_-12px_#1022181a] p-6 sm:p-10 space-y-6 motion-fade-up">
          
          {/* Card Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center mb-3 mx-auto sm:mx-0 shadow-2xs">
              <KeyRound className="w-6 h-6 text-[#2F5D4A]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
              Đăng nhập đối tác B2B
            </h1>
            <p className="text-xs sm:text-sm text-[#4A514C] leading-relaxed">
              Truy cập cổng quản trị đối tác lữ hành và kinh tế tuần hoàn bán đảo Sơn Trà.
            </p>
          </div>

          {/* Quick Demo Pill Banner (Phục vụ trực tiếp thuyết trình PBL6) */}
          <div className="p-3.5 rounded-2xl bg-[#DCEBE3] border border-[#C5CCC7] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-[#2F5D4A] shrink-0" />
              <div className="text-[11px] min-w-0">
                <p className="font-bold text-[#191C1A] truncate">
                  {recentApprovedVendor 
                    ? `Đối tác vừa duyệt: ${recentApprovedVendor.brand_name}` 
                    : 'Tài khoản mẫu: Sơn Trà Trekking'}
                </p>
                <p className="text-[#4A514C] font-mono text-[10px]">Mật khẩu khởi tạo: Vendor@2026</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="min-h-11 px-3 py-1.5 rounded-full bg-white hover:bg-[#F2F5F1] border border-[#C5CCC7] !text-[#191C1A] text-sm font-bold transition-all shrink-0 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
            >
              <span>Điền nhanh</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="partner-email" className="block text-sm font-bold text-[#191C1A]">
                Email doanh nghiệp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4A514C]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="partner-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@sontratrekking.vn"
                  className="w-full min-h-14 pl-10 pr-4 py-3 rounded-xl border border-[#C5CCC7] bg-white text-base text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/25 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="partner-password" className="block text-sm font-bold text-[#191C1A]">
                  Mật khẩu khởi tạo / mật khẩu đối tác
                </label>
                <span className="text-[11px] font-mono font-semibold text-[#2F5D4A]">
                  Vendor@2026
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4A514C]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="partner-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu (Vendor@2026)"
                  className="w-full min-h-14 pl-10 pr-12 py-3 rounded-xl border border-[#C5CCC7] bg-white text-base text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/25 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-[#4A514C] hover:text-[#191C1A] cursor-pointer rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F5D4A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex min-h-12 items-center gap-2 cursor-pointer text-[#4A514C]">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="w-5 h-5 rounded border-[#C5CCC7] text-[#2F5D4A] focus:ring-[#2F5D4A] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <span className="text-[#4A514C] text-[11px]">
                Cấp phép bởi BQL Sơn Trà
              </span>
            </div>

            {/* Submit Button (Ô MÀU XANH -> CHỮ TRẮNG) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-12 py-3.5 px-4 rounded-full bg-[#2F5D4A] hover:bg-[#254B3C] disabled:opacity-50 !text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 focus-visible:ring-offset-2 motion-press"
              >
                {loading ? (
                  <span>Đang xác thực thông tin...</span>
                ) : (
                  <>
                    <span className="!text-white">Đăng nhập cổng đối tác</span>
                    <ArrowRight className="w-4 h-4 !text-white transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Card Footer Links */}
          <div className="pt-4 border-t border-[#C5CCC7] text-center space-y-2 text-xs">
            <p className="text-[#4A514C]">
              Doanh nghiệp chưa có tài khoản?{' '}
              <Link to="/partner/onboarding" className="font-bold text-[#2F5D4A] hover:underline">
                Nộp hồ sơ thẩm định ngay
              </Link>
            </p>
            <p className="text-[11px] text-[#4A514C]">
              Trợ giúp nghiệp vụ đối tác: <a href="mailto:doitac@sontrareloop.vn" className="underline hover:text-[#191C1A]">doitac@sontrareloop.vn</a>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-[#4A514C] border-t border-[#C5CCC7] bg-white">
        © 2026 Ban quản lý bán đảo Sơn Trà và các bãi biển du lịch Đà Nẵng · Đồ án PBL6 Son Tra REloop
      </footer>
    </div>
  );
};

export default PartnerLoginPage;

