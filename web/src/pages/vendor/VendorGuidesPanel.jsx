import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, KeyRound, Plus, RefreshCw, ShieldCheck, Star, UserRound, Users } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  license_number: "",
  languages: "",
  experience_years: "0",
};

const errorMessage = (error) => {
  const data = error.response?.data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  const errors = data?.errors || data;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)
      .flat()
      .find((value) => typeof value === "string");
    if (first) return first;
  }
  return "Không thể xử lý yêu cầu tạo tài khoản hướng dẫn viên. Vui lòng kiểm tra lại thông tin.";
};

export default function VendorGuidesPanel() {
  const [guides, setGuides] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState(null);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/vendors/guides/");
      setGuides(response.data?.data || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        experience_years: Number(form.experience_years || 0),
        languages: form.languages
          .split(",")
          .map((language) => language.trim())
          .filter(Boolean),
      };
      const response = await api.post("/vendors/guides/", payload);
      setGuides((current) => [response.data.data, ...current]);
      setCredential({ email: payload.email, password: payload.password });
      setForm(emptyForm);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${credential.email}\nMật khẩu: ${credential.password}`
      );
    } catch {
      setError("Trình duyệt không cho phép sao chép. Bạn có thể chép thông tin đăng nhập thủ công.");
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Đội ngũ hướng dẫn viên"
        subtitle="Cấp tài khoản ứng dụng thực địa cho hướng dẫn viên thuộc đơn vị và quản lý thẻ hành nghề."
      />

      {error && (
        <div role="alert" className="sr-callout sr-callout-urgent">
          <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {credential && (
        <div className="sr-callout sr-callout-moss flex-col gap-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Tài khoản hướng dẫn viên đã được tạo</p>
                <p className="text-xs mt-0.5">
                  Hãy gửi thông tin này cho hướng dẫn viên. Mật khẩu chỉ hiển thị trong phiên này.
                </p>
              </div>
            </div>
            <button type="button" onClick={copyCredentials} className="sr-btn sr-btn-sm sr-btn-secondary">
              Sao chép thông tin
            </button>
          </div>
          <dl className="grid w-full gap-2 sm:grid-cols-2 text-xs">
            <div>
              <dt className="inline font-semibold">Email: </dt>
              <dd className="inline">{credential.email}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Mật khẩu ban đầu: </dt>
              <dd className="inline font-mono">{credential.password}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setCredential(null)}
            className="sr-btn sr-btn-sm sr-btn-ghost self-start"
          >
            Ẩn thông tin đăng nhập
          </button>
        </div>
      )}

      <div className="sr-split-detail">
        <section className="sr-surface flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="sr-h2 flex items-center gap-2">
              <Users size={16} aria-hidden="true" />
              <span>Danh sách hướng dẫn viên ({guides.length})</span>
            </h2>
            <button
              type="button"
              onClick={loadGuides}
              disabled={loading}
              aria-label="Tải lại danh sách hướng dẫn viên"
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--sr-text-muted)]" role="status">
              Đang tải danh sách...
            </p>
          ) : guides.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--sr-text-muted)]">
              Đơn vị chưa có hướng dẫn viên nào. Hãy tạo tài khoản ở biểu mẫu bên cạnh.
            </p>
          ) : (
            <div className="sr-table-wrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th scope="col">Hướng dẫn viên</th>
                    <th scope="col">Đánh giá HDV</th>
                    <th scope="col">Số thẻ HDV</th>
                    <th scope="col" className="sr-hide-mobile">Ngoại ngữ</th>
                    <th scope="col" className="sr-hide-mobile">Thâm niên</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((guide) => {
                    const gReviews = Number(guide.total_reviews || 0);
                    const gRating = Number(guide.avg_rating || 0);
                    const qLevel = guide.quality_level || (gReviews === 0 ? "new" : "healthy");
                    return (
                    <tr key={guide.id}>
                      <td>
                        <div className="font-semibold text-[var(--sr-text-primary)]">{guide.name}</div>
                        <div className="text-xs text-[var(--sr-text-muted)]">
                          {guide.email}
                          {guide.phone ? ` · ${guide.phone}` : ""}
                        </div>
                      </td>
                      <td className="sr-tabular text-xs">
                        {gReviews > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                qLevel === "critical"
                                  ? "text-red-700"
                                  : qLevel === "warning"
                                    ? "text-amber-700"
                                    : "text-[var(--sr-text-primary)]"
                              }`}
                            >
                              <Star size={12} className="text-amber-500 fill-amber-400" aria-hidden="true" />
                              <span>{gRating.toFixed(1)}</span>
                              <span className="font-normal text-[var(--sr-text-muted)]">({gReviews})</span>
                            </span>
                            {(qLevel === "warning" || qLevel === "critical") && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                                <AlertTriangle size={11} aria-hidden="true" />
                                {qLevel === "critical" ? "Cần nhắc nhở (< 3.0★)" : "Dưới 3.5★"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--sr-text-muted)]">HDV mới</span>
                        )}
                      </td>
                      <td className="sr-tabular">{guide.license_number || "Chưa có số thẻ"}</td>
                      <td className="sr-hide-mobile">
                        {guide.languages?.length ? guide.languages.join(", ") : "Tiếng Việt"}
                      </td>
                      <td className="sr-hide-mobile sr-tabular">{guide.experience_years || 0} năm</td>
                      <td>
                        <span className="sr-badge sr-badge-moss">
                          <ShieldCheck size={12} aria-hidden="true" />
                          <span>{guide.status === "active" ? "Đang hoạt động" : guide.status}</span>
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-[var(--sr-text-muted)] pt-2">
            <KeyRound size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Mật khẩu do đơn vị đối tác cấp ban đầu. Chỉ email, họ tên và thông tin hành nghề được lưu trong danh sách quản lý.
            </span>
          </p>
        </section>

        <form onSubmit={submit} className="sr-surface flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UserRound size={17} className="text-[var(--sr-accent)]" aria-hidden="true" />
            <h2 className="sr-h2">Tạo tài khoản guide mới</h2>
          </div>

          <div className="sr-field">
            <label className="sr-field-label" htmlFor="guide-name">Họ và tên</label>
            <input
              id="guide-name"
              className="sr-input"
              name="name"
              value={form.name}
              onChange={update}
              required
              maxLength={255}
              placeholder="Ví dụ: Nguyễn Văn Hùng"
            />
          </div>

          <div className="sr-field">
            <label className="sr-field-label" htmlFor="guide-email">Email đăng nhập</label>
            <input
              id="guide-email"
              className="sr-input"
              name="email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={update}
              required
              placeholder="hung.nv@sontraecoguide.vn"
            />
          </div>

          <div className="sr-field">
            <label className="sr-field-label" htmlFor="guide-password">Mật khẩu ban đầu</label>
            <input
              id="guide-password"
              className="sr-input"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update}
              required
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sr-field">
              <label className="sr-field-label" htmlFor="guide-phone">Số điện thoại</label>
              <input
                id="guide-phone"
                className="sr-input"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={update}
                placeholder="0905 771 204"
              />
            </div>
            <div className="sr-field">
              <label className="sr-field-label" htmlFor="guide-exp">Thâm niên (năm)</label>
              <input
                id="guide-exp"
                className="sr-input"
                name="experience_years"
                type="number"
                min="0"
                max="80"
                value={form.experience_years}
                onChange={update}
              />
            </div>
          </div>

          <div className="sr-field">
            <label className="sr-field-label" htmlFor="guide-license">Số thẻ / giấy phép HDV</label>
            <input
              id="guide-license"
              className="sr-input"
              name="license_number"
              value={form.license_number}
              onChange={update}
              placeholder="48-2026-0192"
            />
          </div>

          <div className="sr-field">
            <label className="sr-field-label" htmlFor="guide-lang">Ngoại ngữ (phân cách dấu phẩy)</label>
            <input
              id="guide-lang"
              className="sr-input"
              name="languages"
              value={form.languages}
              onChange={update}
              placeholder="Tiếng Việt, English"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="sr-btn sr-btn-lg sr-btn-primary sr-btn-block mt-1"
          >
            <Plus size={15} aria-hidden="true" />
            <span>{saving ? "Đang tạo tài khoản..." : "Tạo tài khoản guide"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
