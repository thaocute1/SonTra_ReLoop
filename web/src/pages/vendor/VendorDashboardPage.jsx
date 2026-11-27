import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarPlus, Plus, Star } from "lucide-react";
import { api } from "../../lib/axios";
import { VendorReconciliation, VendorRevenueChart, vendorMoney } from "./VendorFinance";
import VendorGuidesPanel from "./VendorGuidesPanel";
import VendorReviewsPanel, { RatingBreakdownList, VendorReviewCard } from "./VendorReviewsPanel";
import { PageHeader } from "../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../utils/apiError";

const emptyReviewOverview = {
  summary: {
    avg_rating: 0,
    total_reviews: 0,
    unreplied_count: 0,
    low_rating_count: 0,
    low_unreplied_count: 0,
    five_star_count: 0,
    five_star_rate: 0,
    rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  },
  recent_reviews: [],
};

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
  review_overview: emptyReviewOverview,
};

export const VendorDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRevenue = searchParams.get("tab") === "revenue";
  const isGuides = searchParams.get("tab") === "guides";
  const isReviews = searchParams.get("tab") === "reviews";

  const [activePeriod, setActivePeriod] = useState("3m");
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState("");

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

  if (isReviews) {
    return <VendorReviewsPanel />;
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
  const reviewOverview = data.review_overview || emptyReviewOverview;
  const reviewSummary = {
    ...emptyReviewOverview.summary,
    ...(reviewOverview.summary || {}),
    avg_rating:
      reviewOverview.summary?.total_reviews > 0
        ? reviewOverview.summary.avg_rating
        : data.metrics.avg_rating,
    total_reviews:
      reviewOverview.summary?.total_reviews ?? data.metrics.total_reviews ?? 0,
  };
  const recentReviews = reviewOverview.recent_reviews || [];

  const handleToggleReply = (rev) => {
    setReviewFeedback("");
    if (activeReplyId === rev.id) {
      setActiveReplyId(null);
      setReplyDraft("");
    } else {
      setActiveReplyId(rev.id);
      setReplyDraft(rev.vendor_reply || "");
    }
  };

  const handleSubmitReply = async (e, reviewId) => {
    e.preventDefault();
    if (!replyDraft.trim() || submittingReviewId) return;
    setSubmittingReviewId(reviewId);
    setReviewFeedback("");
    try {
      const res = await api.post(`/vendors/reviews/${reviewId}/reply/`, {
        reply: replyDraft.trim(),
      });
      const updated = res.data?.data;
      if (updated) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          const prevOverview = prev.review_overview || emptyReviewOverview;
          const existingList = prevOverview.recent_reviews || [];
          const target = existingList.find((r) => r.id === reviewId);
          const wasUnreplied = target ? !target.vendor_reply : false;
          const wasLowUnreplied = Boolean(target && target.is_low_rating && !target.vendor_reply);
          return {
            ...prev,
            review_overview: {
              ...prevOverview,
              summary: {
                ...emptyReviewOverview.summary,
                ...(prevOverview.summary || {}),
                unreplied_count: Math.max(
                  0,
                  Number(prevOverview.summary?.unreplied_count || 0) - (wasUnreplied ? 1 : 0)
                ),
                low_unreplied_count: Math.max(
                  0,
                  Number(prevOverview.summary?.low_unreplied_count || 0) - (wasLowUnreplied ? 1 : 0)
                ),
              },
              recent_reviews: existingList.map((r) =>
                r.id === reviewId
                  ? {
                      ...r,
                      vendor_reply: updated.vendor_reply,
                      replied_at: updated.replied_at,
                    }
                  : r
              ),
            },
          };
        });
      }
      setReviewFeedback(res.data?.message || "Đã gửi phản hồi đánh giá cho du khách.");
      setActiveReplyId(null);
      setReplyDraft("");
    } catch (err) {
      setReviewFeedback(extractErrorMessage(err, "Không thể gửi phản hồi lúc này."));
    } finally {
      setSubmittingReviewId(null);
    }
  };

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
      {data.quality_alert && data.quality_alert.level !== "healthy" && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
            data.quality_alert.level === "critical"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{data.quality_alert.title}</span>
            </div>
            <p className="m-0 leading-relaxed">{data.quality_alert.message}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/vendor/dashboard?tab=reviews")}
            className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
          >
            <span>Xem &amp; phản hồi ngay</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      )}

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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/vendor/dashboard?tab=reviews")}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <span>Quản lý đánh giá</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/vendor/experiences")}
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <CalendarPlus size={14} aria-hidden="true" />
                <span>Mở chuyến mới</span>
              </button>
            </div>
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
                      <td className="sr-hide-mobile sr-tabular">
                        {item.total_reviews > 0 || item.rating > 0 ? (
                          <span
                            className={
                              item.quality_level === "critical"
                                ? "font-semibold text-red-700"
                                : item.quality_level === "warning"
                                  ? "font-semibold text-amber-700"
                                  : ""
                            }
                          >
                            ★ {Number(item.rating || 0).toFixed(1)}
                            {item.total_reviews ? ` (${item.total_reviews})` : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--sr-text-muted)]">Tuyến mới</span>
                        )}
                      </td>
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

      {/* Band 3: Customer Reviews & Rating Breakdown */}
      <div className="sr-split-7-5">
        <section className="sr-surface flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="sr-h2">Đánh giá gần đây</h2>
              <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                Phản hồi mới nhất từ du khách sau khi hoàn thành chuyến trải nghiệm
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/vendor/dashboard?tab=reviews")}
              className="sr-btn sr-btn-sm sr-btn-ghost"
            >
              <span>Quản lý đánh giá</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          {reviewFeedback && (
            <div
              role="status"
              className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-4 py-2.5 text-xs font-medium text-[var(--sr-accent-ink)]"
            >
              {reviewFeedback}
            </div>
          )}

          {!recentReviews.length ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <Star size={24} className="text-stone-300" aria-hidden="true" />
              <p className="text-sm font-medium text-[var(--sr-text-primary)] m-0">
                Chưa có đánh giá nào từ du khách
              </p>
              <p className="text-xs text-[var(--sr-text-muted)] m-0 max-w-md">
                Khi khách hoàn thành tour và chấm điểm 1–5 sao, đánh giá sẽ hiển thị tại đây để bạn theo dõi và phản hồi nhanh.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentReviews.map((rev) => (
                <VendorReviewCard
                  key={rev.id}
                  rev={rev}
                  isReplying={activeReplyId === rev.id}
                  replyDraft={replyDraft}
                  submitting={submittingReviewId === rev.id}
                  onToggleReply={handleToggleReply}
                  onReplyDraftChange={setReplyDraft}
                  onCancelReply={() => {
                    setActiveReplyId(null);
                    setReplyDraft("");
                  }}
                  onSubmitReply={handleSubmitReply}
                />
              ))}
            </div>
          )}
        </section>

        <section className="sr-surface flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="sr-h2">Tổng quan đánh giá</h2>
              <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                Mức độ hài lòng và phân bố điểm sao
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/vendor/dashboard?tab=reviews")}
              className="sr-btn sr-btn-sm sr-btn-ghost"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[var(--sr-text-primary)] sr-tabular">
                  {reviewSummary.total_reviews > 0
                    ? Number(reviewSummary.avg_rating || 0).toFixed(1)
                    : "0.0"}
                </span>
                <span className="text-xs text-[var(--sr-text-muted)]">/ 5.0</span>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={
                      reviewSummary.total_reviews > 0 &&
                      star <= Math.round(Number(reviewSummary.avg_rating || 0))
                        ? "text-amber-500 fill-amber-400"
                        : "text-stone-300"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--sr-text-muted)]">
                Trên {reviewSummary.total_reviews} đánh giá xác thực
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-xs text-[var(--sr-text-muted)]">Tỷ lệ 5 sao</span>
                <span className="text-lg font-bold text-[var(--sr-accent)] sr-tabular">
                  {reviewSummary.five_star_rate || 0}%
                </span>
                <span className="text-[11px] text-[var(--sr-text-secondary)] sr-tabular">
                  {reviewSummary.five_star_count || 0} lượt 5★
                </span>
              </div>
              <div className="h-10 w-px bg-[var(--sr-border)]" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-xs text-[var(--sr-text-muted)]">Chờ phản hồi</span>
                <span className="text-lg font-bold text-[var(--sr-text-primary)] sr-tabular">
                  {reviewSummary.unreplied_count || 0}
                </span>
                <span className="text-[11px] text-[var(--sr-text-secondary)]">
                  Chưa trả lời
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-[var(--sr-text-primary)] uppercase tracking-wider m-0">
              Phân bố mức sao
            </h3>
            <RatingBreakdownList
              breakdown={reviewSummary.rating_breakdown}
              totalReviews={reviewSummary.total_reviews}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
