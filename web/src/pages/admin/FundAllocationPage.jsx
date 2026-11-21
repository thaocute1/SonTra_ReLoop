import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";

const CATEGORY_OPTIONS = [
  { value: "wildlife_protection", label: "Cứu hộ & bảo vệ voọc chà vá chân nâu" },
  { value: "reforestation", label: "Trồng rừng và phục hồi sinh thái" },
  { value: "rescue_equipment", label: "Trang thiết bị cứu hộ & tuần tra" },
  { value: "eco_trash_program", label: "Thu gom & tái chế rác thải Eco-Trash" },
  { value: "community_support", label: "Hỗ trợ cộng đồng địa phương và tình nguyện" },
];

const DONUT_COLORS = ["var(--sr-accent)", "var(--coastal-slate)", "var(--sr-warn)"];

export default function FundAllocationPage() {
  const [loading, setLoading] = useState(false);
  const [fundData, setFundData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    category: "wildlife_protection",
    allocated_amount: "",
    description: "",
  });

  const fetchFundData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments/conservation-funds/");
      setFundData(res.data);
    } catch {
      /* Keep fallback display when API is unavailable */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundData();
  }, []);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!form.project_name || !form.allocated_amount) {
      alert("Vui lòng nhập tên hạng mục và số tiền giải ngân!");
      return;
    }

    const amountNum = parseFloat(form.allocated_amount.replace(/\D/g, ""));
    if (!amountNum || amountNum <= 0) {
      alert("Số tiền giải ngân không hợp lệ!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/payments/conservation-funds/allocate/", {
        project_name: form.project_name,
        category: form.category,
        amount: amountNum,
        allocated_amount: amountNum,
        notes: form.description,
        description: form.description,
      });

      const resData = res.data;
      if (resData?.status === "success" || resData?.success) {
        alert(`Đã duyệt giải ngân quỹ ESG thành công!\n\n${resData.message}`);
        setShowModal(false);
        setForm({
          project_name: "",
          category: "wildlife_protection",
          allocated_amount: "",
          description: "",
        });
        fetchFundData();
      } else {
        alert(`Lỗi giải ngân: ${resData?.message || resData?.error || "Không thể thực hiện"}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error;
      alert(errMsg ? `Lỗi giải ngân: ${errMsg}` : "Không thể kết nối tới API backend!");
    } finally {
      setSubmitting(false);
    }
  };

  const remainingFormatted = fundData?.remaining_fund_formatted || "0 đ";
  const accumulatedFormatted = fundData?.total_fund_accumulated_formatted || "0 đ";
  const disbursedFormatted = fundData?.total_disbursed_formatted || "0 đ";

  const categoryTotals = (fundData?.allocations || []).reduce((acc, alloc) => {
    const key = alloc.category || "other";
    acc[key] = (acc[key] || 0) + Number(alloc.allocated_amount || 0);
    return acc;
  }, {});
  const totalAllocatedSum = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const categoryLabelMap = Object.fromEntries(CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label]));
  const shares = Object.entries(categoryTotals).map(([category, amount], index) => ({
    label: categoryLabelMap[category] || category,
    pct: totalAllocatedSum > 0 ? Number(((amount / totalAllocatedSum) * 100).toFixed(1)) : 0,
    amount: `${Number(amount).toLocaleString("vi-VN")} đ`,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));

  const circumference = 2 * Math.PI * 52;
  let cumulativePct = 0;

  return (
    <div className="sr-page">
      <PageHeader
        title="Quỹ bảo tồn & Phân bổ ESG"
        subtitle="Đối chiếu nguồn thu 10% từ mọi vé tour và quyết toán các hạng mục bảo tồn Sơn Trà"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchFundData}
              disabled={loading}
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới số liệu</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Lập lệnh giải ngân</span>
            </button>
          </div>
        }
      />

      {/* Band 1: 8/4 Available Balance Lead + Donut Breakdown */}
      <section className="sr-grid-8-4" aria-label="Tổng quan số dư và phân bổ quỹ bảo tồn">
        <article className="sr-hero-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Số dư khả dụng chờ phân bổ
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <strong className="sr-metric-hero sr-tabular">{remainingFormatted}</strong>
                <span className="sr-badge sr-badge-moss">
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>10% trích từ split payment</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
              <span className="text-[var(--sr-text-secondary)]">
                Tổng thu tích lũy: {accumulatedFormatted}
              </span>
              <span className="font-semibold text-[var(--sr-accent-ink)]">
                Đã giải ngân dự án: {disbursedFormatted}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {shares.length === 0 ? (
              <p className="text-sm text-[var(--sr-text-muted)] py-4">
                {loading ? "Đang tải cơ cấu phân bổ quỹ..." : "Chưa có dữ liệu phân bổ theo hạng mục."}
              </p>
            ) : (
              shares.map((item) => (
                <div key={item.label} className="sr-progress-item">
                  <div className="sr-progress-meta">
                    <span className="text-[var(--sr-text-secondary)]">{item.label}</span>
                    <span className="font-semibold sr-tabular">
                      {item.amount} ({item.pct}%)
                    </span>
                  </div>
                  <div className="sr-progress-track">
                    <div
                      className="sr-progress-fill"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="sr-card justify-between">
          <h2 className="sr-h2 m-0">Tỷ trọng giải ngân đã duyệt</h2>

          {shares.length === 0 ? (
            <p className="text-sm text-[var(--sr-text-muted)] py-8 text-center">
              Chưa có dữ liệu tỷ trọng giải ngân.
            </p>
          ) : (
          <div className="sr-donut-wrap">
            <svg
              viewBox="0 0 140 140"
              className="sr-donut-svg"
              role="img"
              aria-label="Biểu đồ tỷ trọng giải ngân"
            >
              {shares.map((slice) => {
                const dashLen = (slice.pct / 100) * circumference;
                const dashOffset = -((cumulativePct / 100) * circumference);
                cumulativePct += slice.pct;
                return (
                  <circle
                    key={slice.label}
                    cx="70"
                    cy="70"
                    r="52"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="20"
                    strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 70 70)"
                  />
                );
              })}
            </svg>

            <div className="sr-legend-list">
              {shares.map((slice) => (
                <div key={slice.label} className="sr-legend-row">
                  <span className="sr-legend-label">
                    <span
                      className="sr-legend-swatch"
                      style={{ backgroundColor: slice.color }}
                      aria-hidden="true"
                    />
                    <span>{slice.label}</span>
                  </span>
                  <strong className="sr-tabular">{slice.pct}%</strong>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="sr-callout sr-callout-moss">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>100% lệnh giải ngân kèm chứng từ nghiệm thu BQL Sơn Trà.</span>
          </div>
        </article>
      </section>

      {/* Band 2: Allocation Ledger Table */}
      <section className="flex flex-col gap-3" aria-label="Sổ cái giải ngân quỹ bảo tồn">
        <div className="flex items-center justify-between gap-2">
          <h2 className="sr-h2 m-0">
            Sổ cái phân bổ & giải ngân ({fundData?.allocations?.length || 0})
          </h2>
          <span className="text-xs text-[var(--sr-text-muted)]">
            Đồng bộ thời gian thực từ cơ sở dữ liệu
          </span>
        </div>

        <div className="sr-table-card">
          <div className="sr-table-scroll">
            <table className="sr-table">
              <caption className="sr-only">Danh sách các hạng mục giải ngân quỹ ESG</caption>
              <thead>
                <tr>
                  <th scope="col">Hạng mục dự án bảo tồn</th>
                  <th scope="col">Chuyên đề</th>
                  <th scope="col">Số tiền duyệt</th>
                  <th scope="col">Ngày giải ngân</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {fundData?.allocations?.length ? (
                  fundData.allocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{alloc.project_name}</span>
                          {alloc.description && (
                            <span className="text-xs text-[var(--sr-text-muted)]">
                              {alloc.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-[var(--sr-text-secondary)]">
                        {alloc.category_label}
                      </td>
                      <td className="font-semibold sr-tabular">
                        {alloc.allocated_amount_formatted}
                      </td>
                      <td className="text-xs text-[var(--sr-text-muted)]">{alloc.disbursed_at}</td>
                      <td>
                        <span className="sr-badge sr-badge-moss">
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>Đã giải ngân</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-[var(--sr-text-muted)] py-8">
                      {loading ? "Đang tải sổ cái quỹ bảo tồn..." : "Chưa có lệnh giải ngân nào."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phân bổ quỹ bảo tồn"
          className="sr-modal-backdrop motion-backdrop-enter"
        >
          <div className="sr-modal-panel p-6 gap-4 motion-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <h2 className="sr-h2 m-0">Tạo đề xuất giải ngân quỹ ESG</h2>
              <button
                type="button"
                aria-label="Đóng biểu mẫu giải ngân"
                onClick={() => setShowModal(false)}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="flex flex-col gap-4">
              <div className="sr-field">
                <label htmlFor="fund-proj" className="sr-field-label">
                  Tên dự án / hạng mục giải ngân *
                </label>
                <input
                  id="fund-proj"
                  type="text"
                  required
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  placeholder="VD: Mua sắm máy định vị tuần tra kiểm lâm..."
                  className="sr-input"
                />
              </div>

              <div className="sr-field">
                <span className="sr-field-label">Danh mục bảo tồn *</span>
                <SaasSelect
                  value={form.category}
                  options={CATEGORY_OPTIONS}
                  onChange={(val) => setForm({ ...form, category: val })}
                  className="w-full"
                />
              </div>

              <div className="sr-field">
                <label htmlFor="fund-amt" className="sr-field-label">
                  Số tiền giải ngân (VNĐ) *
                </label>
                <input
                  id="fund-amt"
                  type="text"
                  required
                  value={form.allocated_amount}
                  onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                  placeholder="VD: 35000000"
                  className="sr-input"
                />
                <span className="text-xs text-[var(--sr-text-muted)]">
                  Số dư khả dụng hiện tại: {remainingFormatted}
                </span>
              </div>

              <div className="sr-field">
                <label htmlFor="fund-desc" className="sr-field-label">
                  Thuyết minh / mô tả mục đích chi tiết
                </label>
                <textarea
                  id="fund-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Thuyết minh giải trình mục đích và kế hoạch nghiệm thu thực địa..."
                  className="sr-textarea"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sr-btn sr-btn-sm sr-btn-secondary"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="sr-btn sr-btn-sm sr-btn-primary"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
                  <span>{submitting ? "Đang duyệt..." : "Phê duyệt và giải ngân"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
