import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronRight,
  Compass,
  MapPin,
  Recycle,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../../lib/axios";
import { vendorApplicationService } from "../../services/vendorApplicationService";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const PERIOD_OPTIONS = [
  ["7d", "7 ngày"],
  ["30d", "30 ngày"],
  ["3m", "3 tháng"],
  ["12m", "12 tháng"],
];

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { globalSearch = "" } = useOutletContext() || {};
  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();
  const isSystemAdmin = userRole === "system_admin";

  const [metrics, setMetrics] = useState(null);
  const [fundData, setFundData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [queueCounts, setQueueCounts] = useState({
    pendingVendors: 0,
    pendingTours: 0,
    pendingMissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("3m");

  const fetchMetrics = useCallback(async (activePeriod = period) => {
    setLoading(true);
    try {
      const [metricsRes, fundRes, incidentsRes, vendorStatsRes, tourQueueRes, missionQueueRes] =
        await Promise.allSettled([
          api.get("/gamification/admin/esg-metrics/", { params: { period: activePeriod } }),
          api.get("/payments/conservation-funds/"),
          api.get("/cms-chatbot/incidents/admin/"),
          vendorApplicationService.getStats(),
          api.get("/tours/admin/review-queue/", { params: { page_size: 1 } }),
          api.get("/challenging/missions/review-queue/"),
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

      setQueueCounts({
        pendingVendors:
          vendorStatsRes.status === "fulfilled" ? Number(vendorStatsRes.value?.pending || 0) : 0,
        pendingTours:
          tourQueueRes.status === "fulfilled"
            ? Number(tourQueueRes.value.data?.metrics?.pending_approval || 0)
            : 0,
        pendingMissions:
          missionQueueRes.status === "fulfilled"
            ? Number(
                missionQueueRes.value.data?.count ??
                  missionQueueRes.value.data?.results?.length ??
                  0
              )
            : 0,
      });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics(period);
  }, [period, fetchMetrics]);

  const periodLabel = PERIOD_OPTIONS.find(([id]) => id === period)?.[1] || "3 tháng";
  const staffCount = Number(metrics?.total_active_staffs ?? 0);
  const certifiedVendors = Number(metrics?.certified_vendors_count ?? 0);
  const greenDistanceKm = Number(metrics?.total_green_distance_km ?? 0);
  const checkinsCount = Number(metrics?.total_checkins ?? 0);
  const incidentsResolved = Number(metrics?.total_incidents_resolved ?? 0);

  const trashKgValue = Number(metrics?.total_trash_kg || 0);
  const trashTargetKg = 1500;
  const trashPct = Math.min(100, Math.round((trashKgValue / trashTargetKg) * 100));

  const fundFormatted =
    fundData?.total_fund_accumulated_formatted ||
    metrics?.total_conservation_fund_formatted ||
    "0 đ";
  const disbursedFormatted = fundData?.total_disbursed_formatted || "0 đ";
  const remainingFormatted = fundData?.remaining_fund_formatted || "0 đ";

  const allocations = Array.isArray(fundData?.allocations) ? fundData.allocations : [];

  const pendingIncidents = incidents.filter(
    (inc) => inc.status === "pending" || inc.status === "open"
  );
  const openIncidents = pendingIncidents.length;
  const latestPendingIncident = pendingIncidents[0] || null;

  const filteredIncidents = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const list = q
      ? incidents.filter(
          (row) =>
            (row.incident_type || "").toLowerCase().includes(q) ||
            (row.title || "").toLowerCase().includes(q) ||
            (row.location_name || "").toLowerCase().includes(q) ||
            (row.description || "").toLowerCase().includes(q)
        )
      : incidents;
    return list.slice(0, 5);
  }, [incidents, globalSearch]);

  const kpiCards = [
    {
      label: "Đối tác chờ duyệt",
      value: queueCounts.pendingVendors,
      unit: "hồ sơ",
      hint: queueCounts.pendingVendors > 0 ? "Cần thẩm định" : "Đã xử lý hết",
      tone: queueCounts.pendingVendors > 0 ? "is-low" : "",
      icon: Building2,
      to: "/admin/vendors",
    },
    {
      label: "Tour chờ xuất bản",
      value: queueCounts.pendingTours,
      unit: "tuyến",
      hint: queueCounts.pendingTours > 0 ? "Chờ kiểm tra GPS" : "Không có tồn đọng",
      tone: queueCounts.pendingTours > 0 ? "is-low" : "",
      icon: Compass,
      to: "/admin/tours",
    },
    {
      label: "Nhiệm vụ xanh chờ duyệt",
      value: queueCounts.pendingMissions,
      unit: "minh chứng",
      hint: queueCounts.pendingMissions > 0 ? "Chờ cộng điểm" : "Hàng đợi trống",
      tone: queueCounts.pendingMissions > 0 ? "is-low" : "",
      icon: ShieldCheck,
      to: "/admin/missions/review",
    },
    {
      label: "Sự cố thực địa mở",
      value: openIncidents,
      unit: "báo cáo",
      hint: openIncidents > 0 ? "Cần điều phối" : "Tuyến an toàn",
      tone: openIncidents > 0 ? "is-low" : "",
      icon: AlertTriangle,
      to: "/admin/incidents",
    },
  ];

  const quickActions = [
    {
      title: "Kiểm duyệt hồ sơ đối tác",
      desc:
        queueCounts.pendingVendors > 0
          ? `${queueCounts.pendingVendors} hồ sơ đang chờ thẩm định pháp lý`
          : "Theo dõi danh sách đơn vị lữ hành được cấp phép",
      cta: "Kiểm duyệt",
      icon: Building2,
      to: "/admin/vendors",
    },
    {
      title: "Duyệt & xuất bản tour mới",
      desc:
        queueCounts.pendingTours > 0
          ? `${queueCounts.pendingTours} tuyến tour mới cần rà soát lịch trình`
          : "Kiểm tra tuyến đường GPS và sức chứa sinh thái",
      cta: "Xem tour",
      icon: Compass,
      to: "/admin/tours",
    },
    {
      title: "Duyệt minh chứng nhiệm vụ xanh",
      desc: "Xác nhận ảnh thực địa trước khi cộng điểm RE-Points",
      cta: "Duyệt ngay",
      icon: ShieldCheck,
      to: "/admin/missions/review",
    },
    isSystemAdmin
      ? {
          title: "Đối soát & Payout đối tác",
          desc: "Rà soát sổ cái doanh thu và trích 10% quỹ bảo tồn",
          cta: "Mở sổ cái",
          icon: Wallet,
          to: "/admin/payouts",
        }
      : {
          title: "Quỹ bảo tồn & giải ngân",
          desc: "Xem các đợt phân bổ dự án trồng rừng và cứu hộ",
          cta: "Xem quỹ",
          icon: Wallet,
          to: "/admin/fund-allocation",
        },
  ];

  return (
    <div className="sr-page">
      <PageHeader
        title="Tổng quan Sơn Trà"
        subtitle="Theo dõi quỹ bảo tồn 10%, tác động Eco-Trash QR và các đầu việc cần xử lý"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-segment-group" role="group" aria-label="Khoảng thời gian">
              {PERIOD_OPTIONS.map(([id, label]) => (
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
              onClick={() => fetchMetrics(period)}
              disabled={loading}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          </div>
        }
      />

      {/* Khu vực 1: Thẻ nổi bật Quỹ bảo tồn + 2 thẻ Companion gọn bên phải (giống bố cục User) */}
      <section className="sr-home-hero-grid" aria-label="Tổng quan quỹ bảo tồn và thực địa">
        <article className="sr-home-feature">
          <div className="sr-home-feature-body">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="sr-badge sr-badge-moss">
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>Quỹ bảo tồn 10% · BQL Sơn Trà</span>
                </span>
                <span className="sr-slot-pill sr-tabular">
                  <Users size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>{certifiedVendors} đối tác chứng nhận</span>
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="sr-home-feature-title">Tổng quỹ bảo tồn tích lũy</h2>
                <span className="text-2xl font-bold text-[var(--sr-accent)] sr-tabular tracking-tight">
                  {fundFormatted}
                </span>
              </div>

              <div className="sr-home-meta-row sr-tabular">
                <span className="sr-home-meta-item">
                  <Wallet size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                  <span>Đã giải ngân: {disbursedFormatted}</span>
                </span>
                <span className="sr-home-meta-item">
                  <Users size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                  <span>{staffCount} cán bộ trực</span>
                </span>
                <span className="sr-home-meta-item">
                  <Route size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                  <span>{allocations.length} đợt phân bổ</span>
                </span>
              </div>

              {allocations.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                  {allocations.slice(0, 3).map((alloc) => (
                    <div key={alloc.id} className="sr-kv-row">
                      <div className="min-w-0 pr-3">
                        <span className="block font-medium text-[var(--sr-text-primary)] truncate">
                          {alloc.project_name}
                        </span>
                        <span className="text-xs text-[var(--sr-text-muted)]">
                          {alloc.disbursed_at}
                        </span>
                      </div>
                      <span className="font-semibold text-[var(--sr-text-primary)] sr-tabular shrink-0">
                        {alloc.allocated_amount_formatted}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 py-4 text-sm text-[var(--sr-text-muted)]">
                  {loading
                    ? "Đang tải dữ liệu quỹ bảo tồn..."
                    : "Chưa có đợt giải ngân quỹ bảo tồn nào."}
                </p>
              )}
            </div>

            <div className="sr-home-feature-footer border-t border-[var(--sr-border)] pt-3">
              <div>
                <span className="sr-home-price-label">Số dư khả dụng cho bảo tồn</span>
                <div className="sr-home-price-row">
                  <span className="sr-home-price-main sr-tabular">{remainingFormatted}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  className="sr-btn sr-btn-secondary"
                  onClick={() => navigate("/admin/reports")}
                >
                  Báo cáo & Thống kê
                </button>
                <button
                  type="button"
                  className="sr-btn sr-btn-primary"
                  onClick={() => navigate("/admin/fund-allocation")}
                >
                  <span>Quỹ bảo tồn</span>
                  <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </article>

        <aside className="sr-home-companion" aria-label="Eco-Trash và trạng thái trực chiến">
          <section className="sr-home-loyalty" aria-label="Khối lượng Eco-Trash QR">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="sr-home-icon-box is-sand" aria-hidden="true">
                  <Recycle size={18} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-[var(--sr-text-secondary)]">
                  Eco-Trash cân qua QR
                </span>
              </div>
              <span className="sr-home-loyalty-badge">{periodLabel}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="sr-home-points-value sr-tabular">
                {loading && !metrics ? (
                  <span className="inline-block h-8 w-24 rounded bg-stone-200/70 animate-pulse align-middle" />
                ) : (
                  trashKgValue.toLocaleString("vi-VN")
                )}
              </span>
              <span className="text-sm text-[var(--sr-text-muted)]">kg rác thu gom</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--sr-text-secondary)]">
                  Mục tiêu quý ({trashTargetKg.toLocaleString("vi-VN")} kg)
                </span>
                <span className="font-semibold text-[var(--sr-accent)] sr-tabular">{trashPct}%</span>
              </div>
              <div
                className="sr-home-progress-track"
                role="progressbar"
                aria-valuenow={trashPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ thu gom Eco-Trash"
              >
                <div className="sr-home-progress-fill" style={{ width: `${trashPct}%` }} />
              </div>
              <p className="m-0 text-xs text-[var(--sr-text-muted)] sr-tabular">
                {greenDistanceKm.toLocaleString("vi-VN")} km tuyến xanh · {checkinsCount.toLocaleString("vi-VN")} lượt check-in GPS
              </p>
            </div>

            <button
              type="button"
              className="sr-home-loyalty-cta"
              onClick={() => navigate("/admin/missions/review")}
            >
              <span>Duyệt nhiệm vụ xanh</span>
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </section>

          <section className="sr-home-card sr-home-upcoming" aria-label="Trực chiến thực địa">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="sr-home-icon-box" aria-hidden="true">
                  <AlertTriangle size={18} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-[var(--sr-text-secondary)]">
                  Trực chiến thực địa
                </span>
              </div>
              <button
                type="button"
                className="sr-btn sr-btn-ghost sr-btn-sm"
                onClick={() => navigate("/admin/incidents")}
              >
                <span>Chi tiết</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {loading && incidents.length === 0 ? (
              <div className="flex flex-col gap-2 py-1" aria-busy="true">
                <div className="h-5 w-4/5 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-3/5 rounded bg-stone-200/70 animate-pulse" />
              </div>
            ) : latestPendingIncident ? (
              <div className="sr-home-trip-summary">
                <strong className="text-[15px] font-semibold text-[var(--sr-text-primary)] leading-snug">
                  {latestPendingIncident.incident_type ||
                    latestPendingIncident.title ||
                    "Báo cáo sự cố thực địa"}
                </strong>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--sr-text-secondary)]">
                    <MapPin size={12} aria-hidden="true" />
                    <span>{latestPendingIncident.location_name || "Bán đảo Sơn Trà"}</span>
                  </span>
                  <span className="sr-slot-pill is-low sr-tabular">
                    <span className="sr-slot-dot" aria-hidden="true" />
                    <span>{openIncidents} chờ xử lý</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="sr-home-trip-summary">
                <strong className="text-[15px] font-semibold text-[var(--sr-text-primary)]">
                  Tuyến tuần tra an toàn
                </strong>
                <p className="m-0 text-xs text-[var(--sr-text-muted)] leading-relaxed">
                  Không có sự cố tồn đọng · Đã xử lý {incidentsResolved} vụ trong kỳ.
                </p>
              </div>
            )}
          </section>
        </aside>
      </section>

      {/* Khu vực 2: Hàng 4 thẻ chỉ số nghiệp vụ gọn */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Chỉ số hàng đợi nghiệp vụ"
      >
        {kpiCards.map((card) => {
          const IconComp = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => navigate(card.to)}
              className="sr-home-card !p-4 text-left flex flex-col gap-3 cursor-pointer hover:border-[var(--sr-sage)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs font-medium text-[var(--sr-text-secondary)]">
                  {card.label}
                </span>
                <span className="sr-home-icon-box" aria-hidden="true">
                  <IconComp size={16} strokeWidth={1.75} />
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 w-full">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular leading-none">
                    {card.value}
                  </span>
                  <span className="text-xs text-[var(--sr-text-muted)]">{card.unit}</span>
                </div>
                <span className={`sr-slot-pill ${card.tone}`}>
                  <span className="sr-slot-dot" aria-hidden="true" />
                  <span>{card.hint}</span>
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Khu vực 3: Bảng nhật ký tuần tra & thẻ Tác vụ nhanh (giống bố cục User) */}
      <section className="sr-home-bottom-grid" aria-label="Nhật ký tuần tra và tác vụ nhanh">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="sr-home-section-head">
            <h2 className="sr-h2">Nhật ký tuần tra & sự cố mới nhất</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/admin/incidents")}
            >
              <span>Tất cả sự cố</span>
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-home-departures-card">
            <div className="sr-table-wrap">
              <table className="sr-home-table">
                <caption className="sr-only">
                  Nhật ký hoạt động tuần tra và sự cố thực địa Sơn Trà
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Hoạt động ghi nhận</th>
                    <th scope="col" className="sr-hide-mobile">Trạm / Tuyến</th>
                    <th scope="col" className="sr-hide-mobile">Thời gian</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && filteredIncidents.length === 0 ? (
                    [0, 1, 2].map((idx) => (
                      <tr key={`skeleton-${idx}`} aria-busy="true">
                        <td><div className="h-4 w-44 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td className="sr-hide-mobile"><div className="h-4 w-24 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td className="sr-hide-mobile"><div className="h-4 w-24 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td><div className="h-5 w-20 rounded-full bg-stone-200/70 animate-pulse" /></td>
                      </tr>
                    ))
                  ) : filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[var(--sr-text-muted)]">
                        {globalSearch.trim()
                          ? "Không tìm thấy sự cố phù hợp với từ khóa."
                          : "Chưa có hoạt động / sự cố nào được ghi nhận."}
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((row) => {
                      const isPending = row.status === "pending" || row.status === "open";
                      return (
                        <tr
                          key={row.id}
                          onClick={() => navigate("/admin/incidents")}
                          className="cursor-pointer"
                        >
                          <td>
                            <div className="font-semibold text-[var(--sr-text-primary)] leading-snug">
                              {row.incident_type || row.title || row.description || "Báo cáo thực địa"}
                            </div>
                            <div className="text-xs text-[var(--sr-text-muted)] mt-0.5 md:hidden">
                              {row.location_name || "Sơn Trà"} · {row.created_at_formatted || row.created_at || "—"}
                            </div>
                          </td>
                          <td className="sr-hide-mobile text-[var(--sr-text-secondary)]">
                            {row.location_name || "Sơn Trà"}
                          </td>
                          <td className="sr-hide-mobile text-xs text-[var(--sr-text-muted)] sr-tabular">
                            {row.created_at_formatted || row.created_at || "—"}
                          </td>
                          <td>
                            <span className={`sr-slot-pill ${isPending ? "is-low" : ""}`}>
                              <span className="sr-slot-dot" aria-hidden="true" />
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

        <div className="flex flex-col gap-3 min-w-0">
          <div className="sr-home-section-head">
            <h2 className="sr-h2">Tác vụ quản trị nhanh</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/admin/reports")}
            >
              <span>Xem thống kê</span>
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-home-quick-card">
            {quickActions.map((action) => {
              const IconComp = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  className="sr-home-quick-row"
                  onClick={() => navigate(action.to)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="sr-home-icon-box" aria-hidden="true">
                      <IconComp size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
                        {action.title}
                      </div>
                      <div className="text-xs text-[var(--sr-text-muted)] mt-0.5 leading-snug">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <span className="sr-home-quick-cta">
                    <span>{action.cta}</span>
                    <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
