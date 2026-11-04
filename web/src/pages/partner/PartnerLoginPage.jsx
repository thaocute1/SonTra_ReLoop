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
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu đối tác.');
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
            localStorage.setItem('user_name', user.name || 'Đối Tác Lữ Hành');
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
          service_type: 'Trekking & Khám phá Rừng',
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
    <div className="min-h-screen flex flex-col justify-between bg-[#f7f5f0] font-be-vietnam">
      {/* Top Header */}
      <header className="h-[72px] flex items-center justify-between px-6 sm:px-12 border-b border-[#e2e8e4] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/partner" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-[#24563d] !text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#18211c] font-fraunces block leading-none">
                Sơn Trà ReLoop
              </span>
              <span className="text-[10px] text-[#24563d] font-bold tracking-wider uppercase block mt-0.5">
                Cổng Đối Tác Lữ Hành B2B
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link 
            to="/partner/onboarding" 
            className="hidden sm:inline-flex items-center gap-1.5 font-bold text-[#24563d] hover:underline"
          >
            <span>Nộp hồ sơ đối tác mới</span>
          </Link>
          <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />
          <Link
            to="/bql-portal/login"
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cổng BQL Nội Bộ
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-[#e2e8e4] shadow-[0px_16px_48px_-12px_#1022181a] p-6 sm:p-10 space-y-6">
          
          {/* Card Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf2eb] text-[#24563d] flex items-center justify-center mb-3 mx-auto sm:mx-0 shadow-2xs">
              <KeyRound className="w-6 h-6 text-[#24563d]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
              Đăng nhập Đối tác B2B
            </h1>
            <p className="text-xs sm:text-sm text-[#5d6861] leading-relaxed">
              Truy cập Cổng Quản trị Đối tác Lữ hành & Kinh tế tuần hoàn Bán đảo Sơn Trà.
            </p>
          </div>

          {/* Quick Demo Pill Banner (Phục vụ trực tiếp thuyết trình PBL6) */}
          <div className="p-3.5 rounded-2xl bg-[#eaf2eb] border border-[#d2ded5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-[#24563d] shrink-0" />
              <div className="text-[11px] min-w-0">
                <p className="font-bold text-[#18211c] truncate">
                  {recentApprovedVendor 
                    ? `Đối tác vừa duyệt: ${recentApprovedVendor.brand_name}` 
                    : 'Tài khoản mẫu: Sơn Trà Trekking'}
                </p>
                <p className="text-[#5d6861] font-mono text-[10px]">MK khởi tạo: Vendor@2026</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-[#d2ded5] !text-[#18211c] text-xs font-bold transition-all shrink-0 shadow-2xs cursor-pointer"
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
              <label className="block text-xs font-bold text-[#18211c]">
                Email Doanh nghiệp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@sontratrekking.vn"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#d2ded5] bg-white text-xs sm:text-sm text-[#18211c] focus:outline-hidden focus:border-[#24563d] focus:ring-1 focus:ring-[#24563d] transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#18211c]">
                  Mật khẩu khởi tạo / Mật khẩu đối tác
                </label>
                <span className="text-[11px] font-mono font-semibold text-[#24563d]">
                  Vendor@2026
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu (Vendor@2026)"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#d2ded5] bg-white text-xs sm:text-sm text-[#18211c] focus:outline-hidden focus:border-[#24563d] focus:ring-1 focus:ring-[#24563d] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#5d6861]">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-gray-300 text-[#24563d] focus:ring-[#24563d] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <span className="text-gray-400 text-[11px]">
                Cấp phép bởi BQL Sơn Trà
              </span>
            </div>

            {/* Submit Button (Ô MÀU XANH -> CHỮ TRẮNG) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#24563d] hover:bg-[#1b3d2b] disabled:opacity-50 !text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <span>Đang xác thực thông tin...</span>
                ) : (
                  <>
                    <span className="!text-white">Đăng nhập Cổng Đối Tác</span>
                    <ArrowRight className="w-4 h-4 !text-white transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Card Footer Links */}
          <div className="pt-4 border-t border-[#e8ece9] text-center space-y-2 text-xs">
            <p className="text-[#5d6861]">
              Doanh nghiệp chưa có tài khoản?{' '}
              <Link to="/partner/onboarding" className="font-bold text-[#24563d] hover:underline">
                Nộp hồ sơ thẩm định ngay
              </Link>
            </p>
            <p className="text-[11px] text-gray-400">
              Trợ giúp nghiệp vụ đối tác: <a href="mailto:doitac@sontrareloop.vn" className="underline hover:text-gray-600">doitac@sontrareloop.vn</a>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-gray-500 border-t border-[#e2e8e4] bg-white">
        © 2026 Ban Quản Lý Bán Đảo Sơn Trà & Các Bãi Biển Du Lịch Đà Nẵng · Đồ Án PBL6 Son Tra ReLoop
      </footer>
    </div>
  );
};

export default PartnerLoginPage;

