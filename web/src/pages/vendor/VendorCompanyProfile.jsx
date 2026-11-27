import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Award, Building2, FileCheck, Mail, Phone, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/axios";
import { formatDisplayId } from "../../services/vendorApplicationService";

const tabs = [
  { id: "profile", label: "1. Hồ sơ năng lực", icon: Building2 },
  { id: "documents", label: "2. Giấy phép kinh doanh", icon: FileCheck },
  { id: "esg", label: "3. Cam kết bảo tồn ESG 10%", icon: ShieldCheck },
];

const statuses = {
  approved: ["Đã phê duyệt", "sr-badge-moss"],
  pending_approval: ["Chờ thẩm định", "sr-badge-warn"],
  need_info: ["Yêu cầu bổ sung", "sr-badge-neutral"],
  rejected: ["Đã từ chối", "sr-badge-urgent"],
  suspended: ["Tạm đình chỉ", "sr-badge-urgent"],
  draft: ["Bản nháp", "sr-badge-neutral"],
};

function Field({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--sr-text-muted)]">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--sr-text-primary)]">
        {Icon && <Icon size={14} className="shrink-0 text-[var(--sr-text-muted)]" aria-hidden="true" />}
        <span className="break-words min-w-0">{value || "Chưa cập nhật"}</span>
      </dd>
    </div>
  );
}

export function VendorCompanyProfile({ onClose }) {
  const dialog = useRef(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("profile");
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element && element.open) element.close();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    api
      .get("/vendors/profile/", { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setProfile(data.data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError([401, 403].includes(err.response?.status) ? "access" : "request");
        }
      });
    return () => controller.abort();
  }, [revision]);

  const status = statuses[profile?.status];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="vendor-company-profile-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="sr-modal-panel m-auto p-0 backdrop:bg-black/50"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="sr-avatar" aria-hidden="true">
            {profile?.brand_name?.charAt(0) || <Building2 size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="vendor-company-profile-title" className="sr-h2 truncate">
                {profile?.brand_name || "Hồ sơ doanh nghiệp"}
              </h2>
              {status && (
                <span className={`sr-badge ${status[1]}`}>
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>{status[0]}</span>
                </span>
              )}
            </div>
            {profile && (
              <p className="mt-0.5 text-xs text-[var(--sr-text-muted)]">
                Mã hồ sơ: <strong>{formatDisplayId(profile.id)}</strong> · Nộp ngày{" "}
                {new Date(profile.created_at).toLocaleDateString("vi-VN")}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết hồ sơ"
          className="sr-btn sr-btn-sm sr-btn-secondary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {profile && (
        <div role="tablist" aria-label="Các phần của hồ sơ" className="sr-tabs border-b border-[var(--sr-border)] px-5 py-3 bg-[var(--sr-bg-surface)]">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`sr-tab flex items-center gap-2 ${tab === id ? "is-selected" : ""}`}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 text-sm">
        {error === "access" ? (
          <div role="alert" className="sr-callout sr-callout-urgent">
            <div>
              <p>Vui lòng đăng nhập bằng tài khoản đối tác để xem hồ sơ.</p>
              <Link to="/partner/login" className="mt-2 inline-block font-semibold underline">
                Đăng nhập đối tác
              </Link>
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="sr-callout sr-callout-urgent justify-between">
            <span>Không tải được hồ sơ doanh nghiệp.</span>
            <button
              type="button"
              className="sr-btn sr-btn-sm sr-btn-secondary"
              onClick={() => setRevision((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        ) : !profile ? (
          <p role="status" className="py-8 text-center text-[var(--sr-text-muted)]">
            Đang tải hồ sơ doanh nghiệp...
          </p>
        ) : (
          <>
            {profile.rejection_reason && (
              <div className="sr-callout sr-callout-warn">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block">Ghi chú thẩm định từ BQL</strong>
                  <span>{profile.rejection_reason}</span>
                </div>
              </div>
            )}

            {tab === "profile" && (
              <div className="flex flex-col gap-5">
                <section className="sr-surface">
                  <h3 className="sr-h2 mb-4 flex items-center gap-2">
                    <Building2 size={16} className="text-[var(--sr-accent)]" aria-hidden="true" />
                    <span>Thông tin pháp nhân doanh nghiệp</span>
                  </h3>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Tên doanh nghiệp chính thức" value={profile.brand_name} />
                    <Field label="Mã số thuế / GPKD" value={profile.business_license_code} />
                    <Field label="Hotline đại diện" value={profile.phone} icon={Phone} />
                    <Field label="Email tài khoản đối tác" value={profile.account_email || profile.email} icon={Mail} />
                  </dl>
                </section>

                <section className="sr-surface">
                  <h3 className="sr-h2 mb-4 flex items-center gap-2">
                    <Award size={16} className="text-[var(--sr-accent)]" aria-hidden="true" />
                    <span>Năng lực tổ chức &amp; Đội ngũ thực địa</span>
                  </h3>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Đội ngũ hướng dẫn viên" value={`${profile.guides_count || 0} hướng dẫn viên`} />
                    <Field label="Địa bàn tác nghiệp" value="Bán đảo Sơn Trà, Đà Nẵng" />
                    <Field label="Trạng thái xác minh" value={status?.[0] || "Đang hoạt động"} />
                  </dl>
                </section>
              </div>
            )}

            {tab === "documents" && (
              <section className="sr-surface">
                <h3 className="sr-h2 mb-4 flex items-center gap-2">
                  <FileCheck size={16} className="text-[var(--sr-accent)]" aria-hidden="true" />
                  <span>Giấy phép kinh doanh lữ hành</span>
                </h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Tên doanh nghiệp" value={profile.brand_name} />
                  <Field label="Mã số thuế / GPKD" value={profile.business_license_code} />
                </dl>
                <p className="mt-4 text-xs text-[var(--sr-text-muted)]">
                  Bản sao giấy phép đã được lưu trữ trên hệ thống thẩm định của Ban Quản lý Bán đảo Sơn Trà.
                </p>
              </section>
            )}

            {tab === "esg" && (
              <div className="flex flex-col gap-4">
                <div className="sr-callout sr-callout-moss flex-col gap-1">
                  <strong className="flex items-center gap-2">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>Quỹ bảo tồn Sơn Trà 10%</span>
                  </strong>
                  <p className="text-xs">
                    Một phần doanh thu từ mỗi đơn đặt hợp lệ được tự động trích vào quỹ bảo tồn hệ sinh thái và cứu hộ bán đảo Sơn Trà.
                  </p>
                </div>
                <div className="sr-surface">
                  <h4 className="font-semibold text-[var(--sr-text-primary)]">
                    An toàn rừng &amp; Giảm rác thải nhựa
                  </h4>
                  <p className="mt-1 text-xs text-[var(--sr-text-secondary)]">
                    Hướng dẫn du khách tuân thủ quy định an toàn thực địa, giữ khoảng cách với động vật hoang dã và thu gom rác sau mỗi chuyến đi.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="flex shrink-0 justify-end border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
        <button type="button" onClick={onClose} className="sr-btn sr-btn-secondary">
          Đóng hồ sơ
        </button>
      </footer>
    </dialog>
  );
}
