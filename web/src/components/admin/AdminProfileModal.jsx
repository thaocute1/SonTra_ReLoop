import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, Mail, Phone, ShieldCheck, User, X } from "lucide-react";
import { api } from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";

const ROLE_LABELS = {
  system_admin: "Quản trị viên BQL",
  staff: "Nhân viên BQL",
};

const STATUS_LABELS = {
  active: ["Đang hoạt động", "sr-badge-moss"],
  inactive: ["Tạm khóa", "sr-badge-neutral"],
  banned: ["Bị đình chỉ", "sr-badge-urgent"],
};

export default function AdminProfileModal({ onClose, onUpdated }) {
  const dialogRef = useRef(null);
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [revision, setRevision] = useState(0);

  const [form, setForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const element = dialogRef.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element && element.open) element.close();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");

    api
      .get("/accounts/me/", { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setProfile(data);
        setForm({
          name: data?.name || "",
          phone: data?.phone || "",
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoadError(extractErrorMessage(err, "Không thể tải hồ sơ cá nhân."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  const roleLabel = ROLE_LABELS[(profile?.role || "").toLowerCase()] || "Thành viên BQL";
  const statusInfo = STATUS_LABELS[(profile?.status || "").toLowerCase()];
  const initials =
    (form.name || profile?.name || "AD")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "AD";

  const persistUser = (updatedUser) => {
    if (!updatedUser) return;
    localStorage.setItem("user_info", JSON.stringify(updatedUser));
    if (updatedUser.name || updatedUser.email) {
      localStorage.setItem("user_name", updatedUser.name || updatedUser.email);
    }
    if (updatedUser.role) {
      localStorage.setItem("user_role", updatedUser.role);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setErrorMsg("Họ và tên không được để trống.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.patch("/accounts/me/", {
        name: trimmedName,
        phone: form.phone.trim() || null,
      });
      const updatedUser = data?.user || { ...profile, name: trimmedName, phone: form.phone.trim() || null };
      setProfile(updatedUser);
      setForm({ name: updatedUser.name || "", phone: updatedUser.phone || "" });
      persistUser(updatedUser);
      onUpdated?.(updatedUser);
      setSuccessMsg(data?.message || "Cập nhật hồ sơ thành công.");
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, "Không thể cập nhật hồ sơ cá nhân."));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!passwordForm.old_password) {
      setErrorMsg("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setErrorMsg("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.patch("/accounts/me/", {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      setSuccessMsg(data?.message || "Đổi mật khẩu thành công.");
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, "Không thể đổi mật khẩu."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-profile-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="sr-modal-panel m-auto p-0 backdrop:bg-black/50"
      style={{ maxWidth: "36rem" }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="sr-avatar" aria-hidden="true">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="admin-profile-modal-title" className="sr-h2 m-0 truncate">
                {profile?.name || "Hồ sơ cá nhân BQL"}
              </h2>
              {statusInfo && (
                <span className={`sr-badge ${statusInfo[1]}`}>
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>{statusInfo[0]}</span>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--sr-text-muted)] m-0">
              {roleLabel}
              {profile?.created_at
                ? ` · Tham gia ${new Date(profile.created_at).toLocaleDateString("vi-VN")}`
                : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hồ sơ cá nhân"
          className="sr-btn sr-btn-sm sr-btn-secondary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {profile && (
        <div
          role="tablist"
          aria-label="Tùy chọn hồ sơ BQL"
          className="sr-tabs border-b border-[var(--sr-border)] bg-[var(--sr-bg-surface)] px-5 py-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "profile"}
            onClick={() => {
              setTab("profile");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`sr-tab flex items-center gap-2 ${tab === "profile" ? "is-selected" : ""}`}
          >
            <User size={14} aria-hidden="true" />
            <span>Thông tin cá nhân</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "security"}
            onClick={() => {
              setTab("security");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`sr-tab flex items-center gap-2 ${tab === "security" ? "is-selected" : ""}`}
          >
            <Lock size={14} aria-hidden="true" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm">
        {loadError ? (
          <div role="alert" className="sr-callout sr-callout-urgent justify-between items-center">
            <span>{loadError}</span>
            <button
              type="button"
              className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
              onClick={() => setRevision((v) => v + 1)}
            >
              Thử lại
            </button>
          </div>
        ) : loading && !profile ? (
          <p role="status" className="py-8 text-center text-[var(--sr-text-muted)] m-0">
            Đang tải hồ sơ cá nhân...
          </p>
        ) : (
          <>
            {errorMsg && (
              <div role="alert" className="sr-callout sr-callout-urgent">
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div role="status" className="sr-callout sr-callout-moss items-center">
                <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            )}

            {tab === "profile" ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-3.5">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--sr-text-muted)] flex items-center gap-1">
                      <Mail size={12} aria-hidden="true" />
                      <span>Email đăng nhập</span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--sr-text-primary)] break-all m-0">
                      {profile?.email || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--sr-text-muted)] flex items-center gap-1">
                      <ShieldCheck size={12} aria-hidden="true" />
                      <span>Phân quyền</span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--sr-text-primary)] m-0">
                      {roleLabel}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bql-profile-name" className="sr-field-label block">
                    Họ và tên
                  </label>
                  <input
                    id="bql-profile-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="sr-input"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bql-profile-phone" className="sr-field-label flex items-center gap-1.5">
                    <Phone size={13} aria-hidden="true" />
                    <span>Số điện thoại</span>
                  </label>
                  <input
                    id="bql-profile-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="sr-input"
                    placeholder="VD: 0905123456"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--sr-border)]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sr-btn sr-btn-sm sr-btn-secondary"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="sr-btn sr-btn-sm sr-btn-primary"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="bql-old-password" className="sr-field-label block">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="bql-old-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.old_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))
                    }
                    className="sr-input"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bql-new-password" className="sr-field-label block">
                    Mật khẩu mới
                  </label>
                  <input
                    id="bql-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                    }
                    className="sr-input"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bql-confirm-password" className="sr-field-label block">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="bql-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                    }
                    className="sr-input"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--sr-border)]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sr-btn sr-btn-sm sr-btn-secondary"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="sr-btn sr-btn-sm sr-btn-primary"
                  >
                    {saving ? "Đang cập nhật..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
