import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  FileCheck,
  Leaf,
  Lock,
  LogIn,
  Mail,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const response = await api.post("/accounts/login/", {
        email: email.trim(),
        password,
      });
      const { access, refresh, user } = response.data || {};
      if (!access || !user || !["system_admin", "staff"].includes(user.role)) {
        throw new Error("ADMIN_ROLE_REQUIRED");
      }
      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_info", JSON.stringify(user));
      localStorage.setItem("user_role", user.role);
      localStorage.setItem("user_name", user.name || user.email || "Admin");
      if (rememberLogin) {
        localStorage.setItem("admin_last_email", email.trim());
      }
      navigate(user.role === "staff" ? "/staff/dashboard" : "/admin/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.message === "ADMIN_ROLE_REQUIRED" ? "" : extractErrorMessage(err, "");
      setErrorMessage(detail || "Đăng nhập thất bại hoặc tài khoản không có quyền admin/staff.");
    } finally {
      setLoading(false);
    }
  };

  const pillars = [
    {
      icon: Leaf,
      text: "Đối chiếu quỹ bảo tồn 10% trích tự động từ mọi vé tour đã thanh toán.",
    },
    {
      icon: MapPin,
      text: "Tiếp nhận sự cố thực địa kèm tọa độ GPS và điều phối đội tuần tra.",
    },
    {
      icon: FileCheck,
      text: "Thẩm định hồ sơ đối tác lữ hành trước khi xuất bản tuyến lên hệ thống.",
    },
  ];

  return (
    <div className="sr-admin-login-shell">
      <aside className="sr-admin-login-aside" aria-label="Giới thiệu Cổng quản trị BQL">
        <div className="flex items-center gap-3">
          <span className="sr-brand-mark" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold">Sơn Trà REloop</span>
            <span className="text-xs opacity-80">Cổng quản trị Ban Quản lý Bán đảo Sơn Trà</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 my-auto py-6">
          <h1 className="sr-admin-login-display">
            Điều hành bảo tồn và du lịch sinh thái trên một sổ cái minh bạch.
          </h1>
          <ul className="flex flex-col gap-4 m-0 p-0 list-none">
            {pillars.map((item) => {
              const IconComp = item.icon;
              return (
                <li key={item.text} className="flex items-start gap-3 text-sm opacity-90">
                  <IconComp size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="m-0 text-xs opacity-75">
          Hệ thống vận hành nội bộ · Ban Quản lý Bán đảo Sơn Trà, Đà Nẵng
        </p>
      </aside>

      <main className="sr-admin-login-main">
        <form className="sr-admin-login-card" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <span className="sr-badge sr-badge-moss self-start">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>Cổng công vụ BQL & Tuần tra</span>
            </span>
            <h2 className="sr-h1 m-0">Đăng nhập hệ thống quản trị</h2>
            <p className="sr-subtitle m-0">
              Sử dụng tài khoản cán bộ được cấp phép để truy cập bảng điều hành.
            </p>
          </div>

          {errorMessage && (
            <div role="alert" className="sr-callout sr-callout-urgent">
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="sr-field">
              <label htmlFor="email" className="sr-field-label">
                Email công vụ hoặc mã cán bộ
              </label>
              <div className="sr-search-box w-full">
                <Mail size={15} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@sontra.gov.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="sr-field">
              <label htmlFor="password" className="sr-field-label">
                Mật khẩu
              </label>
              <div className="sr-search-box w-full">
                <Lock size={15} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="sr-btn-ghost p-1 rounded cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--sr-text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
              />
              <span>Ghi nhớ email đăng nhập trên thiết bị này</span>
            </label>
          </div>

          <div className="sr-callout sr-callout-moss">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Phân luồng tự động theo quyền hạn</span>
              <span>
                Tài khoản Nhân viên tuần tra sẽ mở trực tiếp Bảng trực trạm (/staff/dashboard).
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sr-btn sr-btn-md sr-btn-primary w-full"
          >
            <LogIn size={16} aria-hidden="true" />
            <span>{loading ? "Đang xác thực..." : "Đăng nhập cổng BQL"}</span>
          </button>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--sr-border)] text-xs">
            <Link to="/" className="text-[var(--sr-text-secondary)] hover:underline">
              Trang du khách
            </Link>
            <Link to="/partner/login" className="text-[var(--sr-accent-ink)] font-semibold hover:underline">
              Cổng đối tác lữ hành
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AdminLoginPage;
