import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarPlus, Plus } from "lucide-react";
import { api } from "../../lib/axios";
import { VendorReconciliation, VendorRevenueChart, vendorMoney } from "./VendorFinance";
import VendorGuidesPanel from "./VendorGuidesPanel";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const emptyDashboard = {
  vendor_info: { brand_name: "Đối tác Sơn Trà", status_label: "Đối tác xác minh", avatar_text: "ST" },
  metrics: {
    monthly_revenue_formatted: "0 đ",
    monthly_revenue_growth: null,
    total_bookings: 0,
    monthly_bookings_diff: 0,
    avg_rating: 0,
    total_reviews: 0,
  },
  booking_overview: { confirmed: 0, completed: 0, cancelled: 0 },
  reconciliation: { summary: { gross_amount: 0, vendor_net_amount: 0 } },
  experience_performance: [],
  recent_bookings: [],
};

export const VendorDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRevenue = searchParams.get("tab") === "revenue";
  const isGuides = searchParams.get("tab") === "guides";

  const [activePeriod, setActivePeriod] = useState("3m");
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (searchParams.get("tab") !== "rewards") return;
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let controller;
    const fetchDashboard = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setError(null);
      try {
        const response = await api.get("/vendors/dashboard/", {
          params: { period: activePeriod },
          signal: request.signal,
          timeout: 15000,
        });
        if (!request.signal.aborted) setDashboardData(response.data.data);
      } catch (err) {
        if (request.signal.aborted) return;
        setDashboardData(null);
        setError([401, 403].includes(err.response?.status) ? "access" : "request");
      }
    };

    fetchDashboard();
    const onFocus = () => fetchDashboard();
    window.addEventListener("focus", onFocus);
    window.addEventListener("vendor-bookings-updated", onFocus);

    return () => {
      controller?.abort();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("vendor-bookings-updated", onFocus);
    };
  }, [activePeriod, revision]);

  if (isGuides) {
    return <VendorGuidesPanel />;
  }

  if (error) {
    return (
      <div className="sr-page">
        <div role="alert" className="sr-callout sr-callout-urgent justify-between">
          {error === "access" ? (
            <div>
              <p>Vui lòng đăng nhập bằng tài khoản đối tác để xem dữ liệu.</p>
              <Link className="mt-2 inline-block font-semibold underline" to="/partner/login">
                Đăng nhập đối tác
              </Link>
            </div>
          ) : (
            <>
              <span>Không tải được dữ liệu đối tác.</span>
              <button
                type="button"
                className="sr-btn sr-btn-sm sr-btn-secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Thử lại
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="sr-page">
        <p role="status" className="py-12 text-center text-sm text-[var(--sr-text-muted)]">
          Đang tải dữ liệu đối tác...
        </p>
      </div>
    );
  }

  const data = { ...emptyDashboard, ...dashboardData };
  const overview = data.booking_overview || { confirmed: 0, completed: 0, cancelled: 0 };
  const totalOverview = Math.max(1, overview.confirmed + overview.completed + overview.cancelled);
  const netAmount = data.reconciliation?.summary?.vendor_net_amount ?? 0;
  const grossAmount = data.reconciliation?.summary?.gross_amount ?? 0;

  if (isRevenue) {
    return (
      <div className="sr-page">
        <PageHeader
          title="Doanh thu & Đối soát quỹ ESG"
          subtitle="Tổng hợp doanh thu ghi sổ, khoản trích 10% quỹ bảo tồn Sơn Trà và lịch sử giải ngân từ cổng thanh toán."
        />
        <VendorRevenueChart
          chart={data.revenue_chart}
          period={activePeriod}
          onPeriodChange={setActivePeriod}
        />
        <VendorReconciliation reconciliation={data.reconciliation} />
      </div>
    );
  }

  const pulseItems = [
    {
      label: "Hoàn thành",
      count: overview.completed,
      pct: Math.round((overview.completed / totalOverview) * 100),
      fillClass: "bg-[var(--sr-accent)]",
    },
    {
      label: "Đã xác nhận",
      count: overview.confirmed,
      pct: Math.round((overview.confirmed / totalOverview) * 100),
      fillClass: "bg-[var(--sr-text-secondary)]",
    },
    {
      label: "Đã hủy",
      count: overview.cancelled,
      pct: Math.round((overview.cancelled / totalOverview) * 100),
      fillClass: "is-urgent",
    },
  ];

  return (
    <div className="sr-page">
      <PageHeader
        title={`Xin chào, ${data.vendor_info.brand_name}`}
        subtitle="Theo dõi doanh thu ghi sổ, nhịp khởi hành và hiệu suất trải nghiệm trekking hôm nay."
        actions={
          <button
            type="button"
            onClick={() => navigate("/vendor/experiences")}
            className="sr-btn sr-btn-primary"
          >
            <Plus size={15} aria-hidden="true" />
            <span>Tạo trải nghiệm mới</span>
          </button>
        }
      />

      {/* Band 1: Asymmetric 7/5 Command Split */}
      <div className="sr-split-7-5">
        <section className="sr-surface flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="sr-eyebrow">Doanh thu tháng này</span>
              <div className="flex flex-wrap items-center gap-3">
                <p className="sr-metric-big sr-tabular">{data.metrics.monthly_revenue_formatted}</p>
                {data.metrics.monthly_revenue_growth != null ? (
                  <span className="sr-badge sr-badge-moss">
                    <span className="sr-badge-dot" aria-hidden="true" />
                    <span>
                      {data.metrics.monthly_revenue_growth > 0 ? "+" : ""}
                      {data.metrics.monthly_revenue_growth}% kỳ trước
                    </span>
                  </span>
                ) : (
                  <span className="sr-badge sr-badge-neutral">Kỳ đầu ghi nhận</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-xs">
              <span className="text-[var(--sr-text-secondary)] sr-tabular">
                Tổng ghi sổ: <strong>{vendorMoney(grossAmount)}</strong>
              </span>
              <span className="text-[var(--sr-accent-ink)] font-semibold sr-tabular">
                Thực nhận sau ESG 10%: {vendorMoney(netAmount)}
              </span>
            </div>
          </div>

          <VendorRevenueChart
            chart={data.revenue_chart}
            period={activePeriod}
            onPeriodChange={setActivePeriod}
            compact
          />
        </section>

        <section className="sr-surface flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="sr-h2">Nhịp vận hành đơn đặt</h2>
              <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                Tổng {data.metrics.total_bookings} đơn ({data.metrics.monthly_bookings_diff} đơn tháng này)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/vendor/bookings")}
              className="sr-btn sr-btn-sm sr-btn-ghost"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {pulseItems.map((item) => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--sr-text-secondary)] font-medium">{item.label}</span>
                  <span className="sr-tabular font-semibold text-[var(--sr-text-primary)]">
                    {item.count} đơn ({item.pct}%)
                  </span>
                </div>
                <div className="sr-progress-track">
                  <div
                    className={`sr-progress-fill ${item.fillClass}`}
                    style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sr-border)] pt-4">
            <div>
              <p className="text-sm font-semibold text-[var(--sr-text-primary)] sr-tabular">
                {data.metrics.total_reviews ? `${data.metrics.avg_rating} / 5 điểm hài lòng` : "Chưa có đánh giá"}
              </p>
              <p className="text-xs text-[var(--sr-text-muted)]">
                Trên {data.metrics.total_reviews} đánh giá xác thực
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/vendor/experiences")}
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <CalendarPlus size={14} aria-hidden="true" />
              <span>Mở chuyến mới</span>
            </button>
          </div>
        </section>
      </div>

      {/* Band 2: Experience Performance Table & Recent Bookings */}
      <div className="sr-split-7-5">
        <section className="sr-surface flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="sr-h2">Hiệu suất trải nghiệm</h2>
              <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                Đơn đã thanh toán, doanh thu theo đơn giá và đánh giá từng tuyến
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/vendor/experiences")}
              className="sr-btn sr-btn-sm sr-btn-ghost"
            >
              <span>Quản lý tuyến</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-table-wrap">
            <table className="sr-table">
              <thead>
                <tr>
                  <th scope="col">Trải nghiệm</th>
                  <th scope="col">Đơn đặt</th>
                  <th scope="col">Doanh thu</th>
                  <th scope="col" className="sr-hide-mobile">Đánh giá</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {!data.experience_performance?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[var(--sr-text-muted)]">
                      Chưa có dữ liệu hiệu suất trải nghiệm.
                    </td>
                  </tr>
                ) : (
                  data.experience_performance.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold text-[var(--sr-text-primary)]">{item.name}</td>
                      <td className="sr-tabular">{item.bookings_count} đơn</td>
                      <td className="sr-tabular font-semibold text-[var(--sr-text-primary)]">
                        {item.revenue_formatted || vendorMoney(item.revenue)}
                      </td>
                      <td className="sr-hide-mobile sr-tabular">{item.rating || "Chưa có"}</td>
                      <td>
                        <span className="sr-badge sr-badge-moss">
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{item.status_label}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sr-surface flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="sr-h2">Đơn đặt gần đây</h2>
              <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                Giao dịch đặt chỗ mới nhất của khách
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/vendor/bookings")}
              className="sr-btn sr-btn-sm sr-btn-ghost"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-activity-list">
            {!data.recent_bookings?.length ? (
              <p className="py-8 text-center text-sm text-[var(--sr-text-muted)]">
                Chưa có đơn đặt tour gần đây.
              </p>
            ) : (
              data.recent_bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => navigate("/vendor/bookings")}
                  className="sr-activity-row"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--sr-text-primary)] truncate">
                      {b.tour_id} · {b.customer_name}
                    </p>
                    <p className="text-xs text-[var(--sr-text-muted)] truncate">
                      {b.experience_name} · {b.guests_label} · {b.booking_date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[var(--sr-text-primary)] sr-tabular">
                      {b.total_price_formatted || vendorMoney(b.total_price)}
                    </p>
                    <p className="text-xs font-medium text-[var(--sr-accent-ink)]">
                      {b.status_label}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
