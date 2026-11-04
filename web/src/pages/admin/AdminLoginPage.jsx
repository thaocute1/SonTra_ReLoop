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
        const detectedName = isStaffUser ? "Lê Văn An (Đội Tuần tra BQL)" : "Nguyễn Tuấn Phong (BQL Admin)";
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
    <main className="flex min-h-screen flex-col items-start relative bg-[#f7f5f0]">
      {/* Top Header */}
      <header className="flex h-[72px] items-center justify-between px-6 sm:px-12 py-0 relative self-stretch w-full">
        <div className="inline-flex items-center gap-[7px] relative flex-[0_0_auto]">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#5d6861]" />
          </div>
          <p className="mt-[-0.50px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#5d6861] text-xs relative w-fit tracking-[0] leading-[normal]">
            Cổng truy cập bảo mật
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] no-underline hover:opacity-80 transition-opacity"
          href="#support"
          onClick={(e) => { e.preventDefault(); alert("Liên hệ Hỗ trợ Kỹ thuật BQL: support@nentangxanh.vn"); }}
        >
          <div className="relative w-[15px] h-[15px] flex items-center justify-center">
            <HelpCircle className="w-[15px] h-[15px] text-[#5d6861]" />
          </div>
          <span className="mt-[-1.00px] [font-family:'Inter-Medium',Helvetica] font-medium text-[#5d6861] text-xs relative w-fit tracking-[0] leading-[normal]">
            Hỗ trợ
          </span>
        </a>
      </header>

      {/* Main Section */}
      <section className="items-center justify-between pt-[66px] pb-12 px-4 sm:px-0 flex-1 self-stretch w-full grow flex flex-col relative">
        <form
          className="w-full max-w-[480px] items-start gap-7 pt-10 pb-9 px-6 sm:px-10 flex-[0_0_auto] bg-white rounded-2xl overflow-hidden border border-solid border-[#e2e8e4] shadow-[0px_16px_48px_-12px_#1022181a] flex flex-col relative"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col items-start gap-3 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex w-[42px] h-[42px] items-center justify-center relative bg-[#eaf1ed] rounded-[10px] overflow-hidden">
              <div className="relative w-[21px] h-[21px] flex items-center justify-center">
                <KeyRound className="w-[21px] h-[21px] text-[#24563d]" />
              </div>
            </div>
            <h1 className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#18211c] text-3xl tracking-[0] leading-[36.0px]">
              Đăng nhập quản trị
            </h1>
            <p className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#5d6861] text-[15px] tracking-[0] leading-[22.5px]">
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
                className="relative self-stretch mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#18211c] text-sm tracking-[0] leading-[19.6px]"
                htmlFor="email"
              >
                Email hoặc tên đăng nhập
              </label>
              <div className="flex h-[52px] items-center gap-3 px-4 py-0 relative self-stretch w-full bg-[#fcfdfc] rounded-[10px] overflow-hidden border border-solid border-[#c2cdc5] focus-within:border-[#24563d]">
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <Mail className="w-[18px] h-[18px] text-[#5d6861]" />
                </div>
                <input
                  className="relative flex-1 min-w-0 [font-family:'Inter-Regular',Helvetica] font-normal text-[#18211c] text-[15px] tracking-[0] leading-[21.0px] [background:transparent] border-[none] p-0 focus:outline-none placeholder-[#849087]"
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
                className="relative self-stretch mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#18211c] text-sm tracking-[0] leading-[19.6px]"
                htmlFor="password"
              >
                Mật khẩu
              </label>
              <div className="flex h-[52px] items-center gap-3 px-4 py-0 relative self-stretch w-full bg-[#fcfdfc] rounded-[10px] overflow-hidden border border-solid border-[#c2cdc5] focus-within:border-[#24563d]">
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <Lock className="w-[18px] h-[18px] text-[#5d6861]" />
                </div>
                <input
                  className="relative flex-1 min-w-0 [font-family:'Inter-Regular',Helvetica] font-normal text-[#18211c] text-[15px] tracking-[0] leading-[21.0px] [background:transparent] border-[none] p-0 focus:outline-none placeholder-[#849087]"
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
                  className="relative w-[18px] h-[18px] shrink-0 cursor-pointer text-[#5d6861] hover:text-[#18211c] transition-colors"
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
                      ? "bg-[#24563d]"
                      : "bg-white border border-[#c2cdc5]"
                  }`}
                  aria-hidden="true"
                >
                  {rememberLogin && (
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  )}
                </span>
                <span className="[font-family:'Inter-Medium',Helvetica] font-medium text-[#5d6861] text-[13px] relative w-fit tracking-[0] leading-[normal]">
                  Ghi nhớ đăng nhập
                </span>
              </label>

              <button
                type="button"
                className="relative w-fit [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#24563d] text-[13px] tracking-[0] leading-[normal] hover:underline cursor-pointer border-none bg-transparent p-0"
                onClick={() => alert("Vui lòng liên hệ Trưởng bộ phận Quản trị hệ thống để khôi phục mật khẩu.")}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              className="flex h-[52px] items-center justify-center gap-2.5 px-5 py-0 relative self-stretch w-full bg-[#24563d] hover:bg-[#1d4833] rounded-[10px] overflow-hidden cursor-pointer transition-colors border-none text-white disabled:opacity-75"
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
          <aside className="flex items-center gap-2.5 p-3.5 relative self-stretch w-full flex-[0_0_auto] bg-[#f2f6f3] rounded-lg overflow-hidden">
            <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-[#24563d]" />
            </div>
            <p className="relative flex-1 mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#5d6861] text-xs tracking-[0] leading-[17.4px]">
              Không chia sẻ thông tin đăng nhập. Phiên làm việc sẽ tự động kết thúc sau 30 phút không hoạt động.
            </p>
          </aside>
        </form>

        {/* Footer */}
        <footer
          className="w-full max-w-[480px] items-center gap-2 flex-[0_0_auto] flex flex-col relative mt-6 sm:mt-0"
          id="support"
        >
          <p className="relative self-stretch mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#849087] text-xs text-center tracking-[0] leading-[normal]">
            Gặp khó khăn khi đăng nhập? Liên hệ quản trị viên hệ thống
          </p>
          <p className="relative self-stretch [font-family:'Inter-Regular',Helvetica] font-normal text-[#849087] text-[11px] text-center tracking-[0] leading-[normal]">
            © 2026 Nền Tảng Xanh · Phiên bản 2.4.1
          </p>
        </footer>
      </section>
    </main>
  );
};

export default AdminLoginPage;
