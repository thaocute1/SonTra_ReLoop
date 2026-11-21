import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader } from "../../components/ui/SaasPrimitives";

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [fundData, setFundData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("3m");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, fundRes, incidentsRes] = await Promise.allSettled([
        api.get("/gamification/admin/esg-metrics/"),
        api.get("/payments/conservation-funds/"),
        api.get("/cms-chatbot/incidents/admin/"),
      ]);
      if (metricsRes.status === "fulfilled" && metricsRes.value.data?.status === "success") {
        setMetrics(metricsRes.value.data.data);
      }
      if (fundRes.status === "fulfilled" && fundRes.value.data) {
        setFundData(fundRes.value.data);
      }
      if (incidentsRes.status === "fulfilled" && Array.isArray(incidentsRes.value.data?.results)) {
        setIncidents(incidentsRes.value.data.results);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const staffCount = metrics?.total_active_staffs ?? 0;
  const trashKgValue = Number(metrics?.total_trash_kg || 0);
  const trashKg = `${trashKgValue.toLocaleString("vi-VN")} kg`;
  const fundFormatted =
    fundData?.total_fund_accumulated_formatted ||
    metrics?.total_conservation_fund_formatted ||
    "0 đ";
  const disbursedFormatted = fundData?.total_disbursed_formatted || "0 đ";
  const remainingFormatted = fundData?.remaining_fund_formatted || "0 đ";
  const pendingIncidents = incidents.filter((inc) => inc.status === "pending" || inc.status === "open");
  const openIncidents = pendingIncidents.length;
  const latestPendingIncident = pendingIncidents[0] || null;
  const allocations = Array.isArray(fundData?.allocations) ? fundData.allocations : [];
  const activityRows = incidents.slice(0, 5);

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
                Đã giải ngân bảo tồn: {disbursedFormatted}
              </span>
              <span className="font-semibold text-[var(--sr-accent-ink)]">
                Số dư khả dụng: {remainingFormatted}
              </span>
            </div>
          </div>

          {allocations.length > 0 ? (
            <div className="flex flex-col gap-2">
              {allocations.slice(0, 4).map((alloc) => (
                <div key={alloc.id} className="sr-kv-row">
                  <span className="font-medium text-[var(--sr-text-primary)]">{alloc.project_name}</span>
                  <span className="font-semibold sr-tabular">{alloc.allocated_amount_formatted}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--sr-text-muted)] py-6 text-center">
              {loading ? "Đang tải dữ liệu quỹ bảo tồn..." : "Chưa có lệnh giải ngân quỹ bảo tồn nào."}
            </p>
          )}
        </article>

        <article className="sr-card justify-between">
          <div className="flex items-center justify-between gap-2">
            <h2 className="sr-h2 m-0">Trạng thái thực địa</h2>
            <span className="text-xs text-[var(--sr-text-muted)]">Thời gian thực</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Cán bộ BQL hoạt động</span>
                <span className="font-semibold sr-tabular">{staffCount} nhân sự</span>
              </div>
              <div className="sr-progress-track">
                <div className="sr-progress-fill" style={{ width: staffCount > 0 ? "100%" : "0%" }} />
              </div>
            </div>

            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Eco-Trash cân qua QR</span>
                <span className="font-semibold sr-tabular">{trashKg}</span>
              </div>
              <div className="sr-progress-track">
                <div
                  className="sr-progress-fill"
                  style={{ width: `${Math.min(100, Math.round((trashKgValue / 1500) * 100))}%` }}
                />
              </div>
            </div>

            <div className="sr-progress-item">
              <div className="sr-progress-meta">
                <span className="text-[var(--sr-text-secondary)]">Đơn vị lữ hành chứng nhận</span>
                <span className="font-semibold sr-tabular">{metrics?.certified_vendors_count ?? 0} đối tác</span>
              </div>
              <div className="sr-progress-track">
                <div
                  className="sr-progress-fill is-warn"
                  style={{ width: (metrics?.certified_vendors_count ?? 0) > 0 ? "100%" : "0%" }}
                />
              </div>
            </div>
          </div>

          {latestPendingIncident ? (
            <div className="sr-callout sr-callout-urgent items-center justify-between">
              <div className="flex items-center gap-2 font-semibold min-w-0">
                <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {openIncidents} sự cố chờ xử lý: {latestPendingIncident.title || latestPendingIncident.location_name || "Thực địa"}
                </span>
              </div>
              <Link to="/admin/incidents" className="font-semibold underline shrink-0">
                Xử lý
              </Link>
            </div>
          ) : (
            <div className="sr-callout sr-callout-moss items-center justify-between">
              <span className="font-medium">Không có sự cố thực địa đang chờ xử lý</span>
              <Link to="/admin/incidents" className="font-semibold underline shrink-0">
                Chi tiết
              </Link>
            </div>
          )}
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
                  {activityRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[var(--sr-text-muted)]">
                        {loading ? "Đang tải nhật ký sự cố thực địa..." : "Chưa có hoạt động / sự cố nào được ghi nhận."}
                      </td>
                    </tr>
                  ) : (
                    activityRows.map((row) => {
                      const isPending = row.status === "pending" || row.status === "open";
                      const tone = isPending ? "urgent" : "moss";
                      return (
                        <tr key={row.id}>
                          <td className="font-medium">{row.title || row.description || "Báo cáo thực địa"}</td>
                          <td className="text-[var(--sr-text-secondary)]">{row.location_name || "Sơn Trà"}</td>
                          <td className="text-[var(--sr-text-muted)] text-xs">{row.created_at_formatted || row.created_at || "—"}</td>
                          <td>
                            <span className={`sr-badge sr-badge-${tone}`}>
                              <span className="sr-badge-dot" aria-hidden="true" />
                              <span>{row.status_label || (isPending ? "Chờ xử lý" : "Đã xử lý")}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
