import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const INFLOW_MONTHS = [
  { month: "T6", label: "32,4tr", heightPct: 56, active: false },
  { month: "T7", label: "38,1tr", heightPct: 68, active: false },
  { month: "T8", label: "44,8tr", heightPct: 82, active: false },
  { month: "T9", label: "41,2tr", heightPct: 74, active: false },
  { month: "T10", label: "46,9tr", heightPct: 88, active: false },
  { month: "T11", label: "51,4tr", heightPct: 98, active: true },
];

const PATROL_ACTIVITIES = [
  {
    title: "Đội tuần tra 1 cân nhận 4,5 kg chai nhựa qua QR",
    station: "Chùa Linh Ứng",
    time: "10 phút trước",
    tag: "Eco-Trash",
    tone: "moss",
  },
  {
    title: "Cấp tài khoản nhân viên BQL mới (BQL-2026-004)",
    station: "Văn phòng BQL",
    time: "1 giờ trước",
    tag: "Nhân sự",
    tone: "neutral",
  },
  {
    title: "Cộng +150 Green Points dọn rác bãi Suối Đổ",
    station: "Tuyến Suối Đổ",
    time: "2 giờ trước",
    tag: "Thưởng điểm",
    tone: "warn",
  },
  {
    title: "Báo cáo sạt lở đá nhẹ tại km 4+200 dốc Hoàng Sa",
    station: "Đỉnh Bàn Cờ",
    time: "3 giờ trước",
    tag: "Sự cố",
    tone: "urgent",
  },
  {
    title: "Đối soát hoàn tất 10% quỹ bảo tồn đợt T11-02",
    station: "Sổ cái ESG",
    time: "Hôm qua",
    tag: "Quỹ ESG",
    tone: "moss",
  },
];

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("3m");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/gamification/admin/esg-metrics/");
      if (res.data?.status === "success") {
        setMetrics(res.data.data);
      }
    } catch {
      /* Preserve fallback metrics if endpoint is temporarily unavailable */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const staffCount = metrics?.total_active_staffs || 5;
  const trashKg = metrics?.total_trash_kg
    ? `${metrics.total_trash_kg.toLocaleString("vi-VN")} kg`
    : "1.395 kg";
  const fundFormatted = metrics?.total_conservation_fund_formatted || "254.850.000 đ";
  const openIncidents = metrics?.total_incidents_resolved ?? 3;

  const triageQueues = [
    {
      title: "Kiểm duyệt hồ sơ đối tác",
      sub: "AD-01 · Thẩm định pháp lý",
      badge: "Hàng đợi",
      tone: "warn",
      to: "/admin/vendors",
    },
    {
      title: "Duyệt & xuất bản tour mới",
      sub: "Kiểm tra GPS & lịch khởi hành",
      badge: "Kiểm tra",
      tone: "warn",
      to: "/admin/tours",
    },
    {
      title: "Sự cố thực địa chưa đóng",
      sub: "AD-08 · Cần phân đội tuần tra",
      badge: `${openIncidents} sự cố`,
      tone: "urgent",
      to: "/admin/incidents",
    },
    {
      title: "Đối soát sổ cái payout",
      sub: "AD-05 · Chờ ghép đợt chi trả",
      badge: "Sổ cái",
      tone: "moss",
      to: "/admin/payouts",
    },
  ];

  return (
    <div className="sr-page">
      <PageHeader
        title="Điều hành sinh thái Bán đảo Sơn Trà"
        subtitle="Theo dõi quỹ bảo tồn 10%, khối lượng Eco-Trash QR và trạng thái trực chiến thực địa"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-segment-group" role="group" aria-label="Khoảng thời gian">
              {[
                ["7d", "7 ngày"],
                ["30d", "30 ngày"],
                ["3m", "3 tháng"],
                ["12m", "12 tháng"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={period === id}
                  onClick={() => setPeriod(id)}
                  className={`sr-segment-btn ${period === id ? "is-selected" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchMetrics}
              disabled={loading}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới chỉ số</span>
            </button>
          </div>
        }
      />

      {/* Band 1: Asymmetric 8/4 Lead ESG Hero + Field Status Pulse */}
      <section className="sr-grid-8-4" aria-label="Tổng quan quỹ bảo tồn và thực địa">
        <article className="sr-hero-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Tổng quỹ bảo tồn & ESG tích lũy
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <strong className="sr-metric-hero sr-tabular">{fundFormatted}</strong>
                <span className="sr-badge sr-badge-moss">
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>10% trích mọi vé tour</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
              <span className="text-[var(--sr-text-secondary)]">
                Đã giải ngân bảo tồn: 140.000.000 đ
              </span>
              <span className="font-semibold text-[var(--sr-accent-ink)]">
                Số dư khả dụng: 114.850.000 đ
              </span>
            </div>
          </div>

          <div
            role="img"
            aria-label="Biểu đồ dòng thu quỹ bảo tồn 6 tháng từ T6 đến T11, tháng T11 đạt 51,4 triệu đồng"
          >
            <div className="sr-chart-grid">
              {INFLOW_MONTHS.map((col) => (
                <div
                  key={col.month}
                  className={`sr-chart-col ${col.active ? "is-active" : ""}`}
                >
                  <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                    {col.label}
                  </span>
                  <div
                    className="sr-chart-bar"
                    style={{ height: `${col.heightPct}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="sr-chart-axis">
              {INFLOW_MONTHS.map((col) => (
                <span key={col.month} className="sr-chart-axis-item">
                  {col.month}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="sr-card justify-between">
          <div className="flex items-center justify-between gap-2">
            <h2 className="sr-h2 m-0">Trạng thái thực địa</h2>
            <span className="text-xs text-[var(--sr-text-muted)]">Thời gian thực</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Cán bộ BQL trực checkpoint</span>
                <span className="font-semibold sr-tabular">{staffCount} / 5 trạm</span>
              </div>
              <div className="sr-progress-track">
                <div className="sr-progress-fill" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Eco-Trash cân qua QR</span>
                <span className="font-semibold sr-tabular">{trashKg} / 1.500 kg</span>
              </div>
              <div className="sr-progress-track">
                <div className="sr-progress-fill" style={{ width: "93%" }} />
              </div>
            </div>

            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Giải ngân cứu hộ Voọc</span>
                <span className="font-semibold sr-tabular">140tr / 250tr</span>
              </div>
              <div className="sr-progress-track">
                <div className="sr-progress-fill is-warn" style={{ width: "56%" }} />
              </div>
            </div>
          </div>

          <div className="sr-callout sr-callout-urgent items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>1 sự cố khẩn cấp: Đỉnh Bàn Cờ</span>
            </div>
            <Link to="/admin/incidents" className="font-semibold underline shrink-0">
              Xử lý
            </Link>
          </div>
        </article>
      </section>

      {/* Band 2: Patrol Activity Table + Governance Priority Queue */}
      <section className="sr-grid-8-4" aria-label="Nhật ký tuần tra và hàng đợi nghiệp vụ">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="sr-h2 m-0">Nhật ký tuần tra & sinh thái Sơn Trà mới nhất</h2>
            <Link
              to="/admin/incidents"
              className="text-xs font-semibold text-[var(--sr-accent-ink)] hover:underline"
            >
              Xem sổ cái đầy đủ
            </Link>
          </div>

          <div className="sr-table-card">
            <div className="sr-table-scroll">
              <table className="sr-table">
                <caption className="sr-only">
                  Nhật ký hoạt động tuần tra và sinh thái mới nhất
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Hoạt động ghi nhận</th>
                    <th scope="col">Trạm / Tuyến</th>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Phân loại</th>
                  </tr>
                </thead>
                <tbody>
                  {PATROL_ACTIVITIES.map((row) => (
                    <tr key={row.title}>
                      <td className="font-medium">{row.title}</td>
                      <td className="text-[var(--sr-text-secondary)]">{row.station}</td>
                      <td className="text-[var(--sr-text-muted)] text-xs">{row.time}</td>
                      <td>
                        <span className={`sr-badge sr-badge-${row.tone}`}>
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{row.tag}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="sr-h2 m-0">Hàng đợi nghiệp vụ BQL</h2>
            <span className="text-xs text-[var(--sr-text-muted)]">AD-01 đến AD-08</span>
          </div>

          <div className="sr-card justify-between">
            <div className="flex flex-col">
              {triageQueues.map((q) => (
                <Link
                  key={q.title}
                  to={q.to}
                  className="sr-kv-row no-underline hover:bg-[var(--sr-bg-hover)] px-2 rounded-lg transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--sr-text-primary)]">{q.title}</span>
                    <span className="text-xs text-[var(--sr-text-muted)]">{q.sub}</span>
                  </div>
                  <span className={`sr-badge sr-badge-${q.tone}`}>
                    <span className="sr-badge-dot" aria-hidden="true" />
                    <span>{q.badge}</span>
                  </span>
                </Link>
              ))}
            </div>

            <Link to="/admin/reports" className="sr-btn sr-btn-md sr-btn-secondary w-full">
              Mở báo cáo tổng hợp ESG
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
