import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  HelpCircle, 
  KeyRound, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight, 
  ShieldAlert,
  AlertCircle
} from "lucide-react";

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      if (email && password) {
        // Role detection (Admin vs BQL Staff)
        const isStaffUser = email.toLowerCase().includes("staff") || email.toLowerCase().includes("canbo");
        const detectedRole = isStaffUser ? "staff" : "system_admin";
        const detectedName = isStaffUser ? "Lê Văn An (đội tuần tra BQL)" : "Nguyễn Tuấn Phong (quản trị viên BQL)";
        const redirectUrl = isStaffUser ? "/staff/dashboard" : "/admin/dashboard";

        localStorage.setItem("access_token", "bql-portal-demo-token");
        localStorage.setItem("user_role", detectedRole);
        localStorage.setItem("user_name", detectedName);

        setTimeout(() => {
          setLoading(false);
          navigate(redirectUrl);
        }, 600);
      } else {
        setErrorMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage("Đăng nhập thất bại. Kiểm tra lại thông tin tài khoản.");
      setLoading(false);
    }
  };

  return (
    <main className="m3-app-page flex min-h-[100dvh] min-w-0 flex-col items-start relative bg-[#F2F5F1] overflow-x-clip">
      {/* Top Header */}
      <header className="flex h-[72px] items-center justify-between px-6 sm:px-12 py-0 relative self-stretch w-full">
        <div className="inline-flex items-center gap-[7px] relative flex-[0_0_auto]">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#4A514C]" />
          </div>
          <p className="mt-[-0.50px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#4A514C] text-xs relative w-fit tracking-[0] leading-[normal]">
            Cổng truy cập bảo mật
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] no-underline hover:opacity-80 transition-opacity"
          href="#support"
          onClick={(e) => { e.preventDefault(); alert("Liên hệ hỗ trợ kỹ thuật BQL: support@nentangxanh.vn"); }}
        >
          <div className="relative w-[15px] h-[15px] flex items-center justify-center">
            <HelpCircle className="w-[15px] h-[15px] text-[#4A514C]" />
          </div>
          <span className="mt-[-1.00px] [font-family:'Inter-Medium',Helvetica] font-medium text-[#4A514C] text-xs relative w-fit tracking-[0] leading-[normal]">
            Hỗ trợ
          </span>
        </a>
      </header>

      {/* Main Section */}
      <section className="items-center justify-between pt-[66px] pb-12 px-4 sm:px-0 flex-1 self-stretch w-full grow flex flex-col relative">
        <form
          className="w-full max-w-[480px] items-start gap-7 pt-10 pb-9 px-6 sm:px-10 flex-[0_0_auto] bg-white rounded-2xl overflow-hidden border border-solid border-[#C5CCC7] shadow-[0px_16px_48px_-12px_#1022181a] flex flex-col relative"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col items-start gap-3 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex w-[42px] h-[42px] items-center justify-center relative bg-[#DCEBE3] rounded-[10px] overflow-hidden">
              <div className="relative w-[21px] h-[21px] flex items-center justify-center">
                <KeyRound className="w-[21px] h-[21px] text-[#2F5D4A]" />
              </div>
            </div>
            <h1 className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#191C1A] text-3xl tracking-[0] leading-[36.0px]">
              Đăng nhập quản trị
            </h1>
            <p className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#4A514C] text-[15px] tracking-[0] leading-[22.5px]">
              Sử dụng tài khoản nội bộ được cấp để tiếp tục vào hệ thống.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="items-start gap-5 self-stretch w-full flex-[0_0_auto] flex flex-col relative">
            {/* Field Email */}
            <div className="flex-col items-start gap-2 flex relative self-stretch w-full flex-[0_0_auto]">
              <label
                className="relative self-stretch mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#191C1A] text-sm tracking-[0] leading-[19.6px]"
                htmlFor="email"
              >
                Email hoặc tên đăng nhập
              </label>
              <div className="flex h-[52px] items-center gap-3 px-4 py-0 relative self-stretch w-full bg-[#F8FAF7] rounded-[10px] overflow-hidden border border-solid border-[#C5CCC7] focus-within:border-[#2F5D4A]">
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <Mail className="w-[18px] h-[18px] text-[#4A514C]" />
                </div>
                <input
                  className="relative flex-1 min-w-0 [font-family:'Inter-Regular',Helvetica] font-normal text-[#191C1A] text-[15px] tracking-[0] leading-[21.0px] [background:transparent] border-[none] p-0 focus:outline-none placeholder-[#4A514C]"
                  id="email"
                  name="email"
                  placeholder="admin@nentangxanh.vn"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            {/* Field Password */}
            <div className="flex-col items-start gap-2 flex relative self-stretch w-full flex-[0_0_auto]">
              <label
                className="relative self-stretch mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#191C1A] text-sm tracking-[0] leading-[19.6px]"
                htmlFor="password"
              >
                Mật khẩu
              </label>
              <div className="flex h-[52px] items-center gap-3 px-4 py-0 relative self-stretch w-full bg-[#F8FAF7] rounded-[10px] overflow-hidden border border-solid border-[#C5CCC7] focus-within:border-[#2F5D4A]">
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <Lock className="w-[18px] h-[18px] text-[#4A514C]" />
                </div>
                <input
                  className="relative flex-1 min-w-0 [font-family:'Inter-Regular',Helvetica] font-normal text-[#191C1A] text-[15px] tracking-[0] leading-[21.0px] [background:transparent] border-[none] p-0 focus:outline-none placeholder-[#4A514C]"
                  id="password"
                  name="password"
                  placeholder="••••••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="relative w-12 h-12 -mr-3 shrink-0 inline-flex items-center justify-center rounded-full cursor-pointer text-[#4A514C] hover:text-[#191C1A] hover:bg-[#DCEBE3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Password */}
            <div className="items-center justify-between flex relative self-stretch w-full flex-[0_0_auto]">
              <label className="inline-flex items-center gap-[9px] relative flex-[0_0_auto] cursor-pointer select-none">
                <input
                  className="sr-only"
                  type="checkbox"
                  name="rememberLogin"
                  checked={rememberLogin}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                />
                <span
                  className={`flex w-[18px] h-[18px] items-center justify-center relative rounded overflow-hidden transition-colors ${
                    rememberLogin
                      ? "bg-[#2F5D4A]"
                      : "bg-white border border-[#C5CCC7]"
                  }`}
                  aria-hidden="true"
                >
                  {rememberLogin && (
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  )}
                </span>
                <span className="[font-family:'Inter-Medium',Helvetica] font-medium text-[#4A514C] text-[13px] relative w-fit tracking-[0] leading-[normal]">
                  Ghi nhớ đăng nhập
                </span>
              </label>

              <button
                type="button"
                className="relative min-h-12 px-3 -mr-3 inline-flex items-center rounded-full [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#2F5D4A] text-sm tracking-[0] leading-[normal] hover:bg-[#DCEBE3] cursor-pointer border-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                onClick={() => alert("Vui lòng liên hệ trưởng bộ phận quản trị hệ thống để khôi phục mật khẩu.")}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              className="flex h-[52px] items-center justify-center gap-2.5 px-5 py-0 relative self-stretch w-full bg-[#2F5D4A] hover:bg-[#254B3C] rounded-[10px] overflow-hidden cursor-pointer transition-colors border-none text-white disabled:opacity-75"
              type="submit"
              disabled={loading}
            >
              <span className="[font-family:'Inter-Regular',Helvetica] font-normal text-white text-[15px] whitespace-nowrap relative w-fit tracking-[0] leading-[normal]">
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </span>
              {!loading && (
                <div className="relative w-[17px] h-[17px] flex items-center justify-center">
                  <ArrowRight className="w-[17px] h-[17px] text-white" />
                </div>
              )}
            </button>
          </div>

          {/* Security Banner */}
          <aside className="flex items-center gap-2.5 p-3.5 relative self-stretch w-full flex-[0_0_auto] bg-[#F2F5F1] rounded-lg overflow-hidden">
            <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-[#2F5D4A]" />
            </div>
            <p className="relative flex-1 mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#4A514C] text-xs tracking-[0] leading-[17.4px]">
              Không chia sẻ thông tin đăng nhập. Phiên làm việc sẽ tự động kết thúc sau 30 phút không hoạt động.
            </p>
          </aside>
        </form>

        {/* Footer */}
        <footer
          className="w-full max-w-[480px] items-center gap-2 flex-[0_0_auto] flex flex-col relative mt-6 sm:mt-0"
          id="support"
        >
          <p className="relative self-stretch mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#4A514C] text-xs text-center tracking-[0] leading-[normal]">
            Gặp khó khăn khi đăng nhập? Liên hệ quản trị viên hệ thống
          </p>
          <p className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#4A514C] text-[11px] text-center tracking-[0] leading-[normal]">
            © 2026 Nền tảng xanh · phiên bản 2.4.1
          </p>
        </footer>
      </section>
    </main>
  );
};

export default AdminLoginPage;
