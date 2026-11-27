import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  EyeOff,
  Flag,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  UserCheck,
} from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../utils/apiError";

const TABS = [
  ["all", "Tất cả", "all_count"],
  ["pending_approval", "Chờ kiểm duyệt", "pending_approval_count"],
  ["reported", "Bị báo cáo", "reported_count"],
  ["low_rating", "Đánh giá thấp (1–2★)", "low_rating_count"],
  ["rejected", "Đã ẩn / Từ chối", "rejected_count"],
];

const STAR_OPTIONS = [
  { value: "all", label: "Tất cả mức sao" },
  { value: "5", label: "5 sao" },
  { value: "4", label: "4 sao" },
  { value: "3", label: "3 sao" },
  { value: "2", label: "2 sao" },
  { value: "1", label: "1 sao" },
];

function ReviewStatusBadge({ status, label }) {
  const tone =
    status === "approved" ? "moss" : status === "rejected" ? "urgent" : "warn";
  return (
    <span className={`sr-badge sr-badge-${tone}`}>
      <span className="sr-badge-dot" aria-hidden="true" />
      <span>{label || status}</span>
    </span>
  );
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [tourFilter, setTourFilter] = useState("all");
  const [starFilter, setStarFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const [data, setData] = useState({
    summary: {
      avg_rating: 0,
      total_approved: 0,
      pending_approval_count: 0,
      reported_count: 0,
      low_rating_count: 0,
      rejected_count: 0,
      all_count: 0,
      attention_count: 0,
      flagged_tours_count: 0,
    },
    flagged_tours: [],
    flagged_vendors: [],
    vendors: [],
    tours: [],
    results: [],
  });

  const loadReviews = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const params = { tab };
        if (vendorFilter !== "all") params.vendor_id = vendorFilter;
        if (tourFilter !== "all") params.tour_id = tourFilter;
        if (starFilter !== "all") params.rating = starFilter;
        if (search.trim()) params.search = search.trim();

        const res = await api.get("/tours/admin/customer-reviews/", {
          params,
          signal,
        });
        if (!signal?.aborted && res.data?.data) {
          setData(res.data.data);
        }
      } catch (err) {
        if (signal?.aborted) return;
        setError(
          extractErrorMessage(err, "Không tải được danh sách đánh giá khách hàng.")
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [tab, vendorFilter, tourFilter, starFilter, search]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadReviews(controller.signal);
    return () => controller.abort();
  }, [loadReviews]);

  const handleModerate = async (reviewId, action, note = "") => {
    if (submittingId) return;
    if (action === "reject" && !note.trim()) {
      setError("Vui lòng nhập lý do ẩn hoặc từ chối đánh giá.");
      return;
    }

    setSubmittingId(reviewId);
    setError("");
    setNotice("");
    try {
      const res = await api.post(
        `/tours/admin/customer-reviews/${reviewId}/moderate/`,
        { action, note: note.trim() }
      );
      setNotice(res.data?.message || "Đã cập nhật trạng thái đánh giá.");
      setRejectTargetId(null);
      setRejectReason("");
      window.dispatchEvent(new Event("customer-reviews-updated"));
      await loadReviews();
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể xử lý kiểm duyệt đánh giá."));
    } finally {
      setSubmittingId(null);
    }
  };

  const summary = data.summary || {};
  const vendorOptions = [
    { value: "all", label: "Tất cả đối tác" },
    ...(data.vendors || []).map((v) => ({
      value: String(v.id),
      label: v.brand_name,
    })),
  ];
  const filteredTourList =
    vendorFilter === "all"
      ? data.tours || []
      : (data.tours || []).filter((t) => String(t.vendor_id) === vendorFilter);
  const tourOptions = [
    { value: "all", label: "Tất cả tuyến tour" },
    ...filteredTourList.map((t) => ({ value: String(t.id), label: t.title })),
  ];

  const hasWatchlist =
    (data.flagged_tours?.length || 0) > 0 ||
    (data.flagged_vendors?.length || 0) > 0;

  return (
    <div className="sr-page">
      <PageHeader
        title="Kiểm duyệt & Giám sát đánh giá"
        subtitle="Rà soát đánh giá nhạy cảm, xử lý báo cáo vi phạm và theo dõi các tuyến dưới ngưỡng 3.5★"
        actions={
          <button
            type="button"
            onClick={() => loadReviews()}
            className="sr-btn sr-btn-secondary sr-btn-sm"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Làm mới</span>
          </button>
        }
      />

      {error && (
        <div role="alert" className="sr-callout sr-callout-urgent">
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-4 py-2.5 text-xs font-medium text-[var(--sr-accent-ink)]"
        >
          {notice}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Điểm hài lòng toàn sàn
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
              {summary.total_approved > 0
                ? Number(summary.avg_rating || 0).toFixed(1)
                : "0.0"}
            </span>
            <span className="text-xs text-[var(--sr-text-muted)]">/ 5.0</span>
          </div>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Trên {summary.total_approved || 0} đánh giá đang hiển thị
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Chờ BQL kiểm duyệt
          </span>
          <span className="text-2xl font-bold text-amber-700 sr-tabular">
            {summary.pending_approval_count || 0}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Bị giữ tự động do từ khóa / link / SĐT
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Đang bị báo cáo
          </span>
          <span className="text-2xl font-bold text-red-700 sr-tabular">
            {summary.reported_count || 0}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Cần BQL xác minh &amp; phân xử
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Tuyến dưới ngưỡng 3.5★
          </span>
          <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
            {summary.flagged_tours_count || 0}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Bị giảm ưu tiên AI &amp; khóa Flash Sale
          </span>
        </section>
      </div>

      {/* Quality Watchlist */}
      {hasWatchlist && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <ShieldAlert size={15} aria-hidden="true" />
            <span>
              Cảnh báo chất lượng vận hành (từ 3 đánh giá trở lên, điểm &lt; 3.5★)
            </span>
          </div>

          {data.flagged_tours?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.flagged_tours.map((t) => (
                <button
                  key={`flagged-tour-${t.id}`}
                  type="button"
                  onClick={() => {
                    setVendorFilter(String(t.vendor_id));
                    setTourFilter(String(t.id));
                    setTab("low_rating");
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    t.quality_level === "critical"
                      ? "border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
                      : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  {t.title} ({t.vendor_name}):{" "}
                  <strong>{Number(t.avg_rating || 0).toFixed(1)}★</strong> ·{" "}
                  {t.total_reviews} đánh giá
                </button>
              ))}
            </div>
          )}

          {data.flagged_vendors?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-900">
              <span className="font-medium">Đối tác cần theo dõi:</span>
              {data.flagged_vendors.map((v) => (
                <span
                  key={`flagged-vendor-${v.id}`}
                  className="rounded-full border border-amber-300 bg-white/80 px-2.5 py-0.5 text-[11px]"
                >
                  {v.brand_name}: {Number(v.avg_rating || 0).toFixed(1)}★ (
                  {v.total_reviews})
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Queue Surface */}
      <section className="sr-surface flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="sr-tabs" role="tablist" aria-label="Nhóm đánh giá">
            {TABS.map(([id, label, countKey]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`sr-tab ${tab === id ? "is-selected" : ""}`}
              >
                {label} ({summary[countKey] ?? 0})
              </button>
            ))}
          </div>

          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <div className="sr-toolbar-search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                aria-label="Tìm mã đơn, khách hàng, tuyến tour"
                placeholder="Mã đơn, khách, tuyến tour..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (!e.target.value.trim()) setSearch("");
                }}
                maxLength={120}
              />
            </div>
            <button type="submit" className="sr-btn sr-btn-sm sr-btn-secondary">
              Tìm
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaasSelect
            label="Đối tác"
            value={vendorFilter}
            options={vendorOptions}
            onChange={(val) => {
              setVendorFilter(val);
              setTourFilter("all");
            }}
          />
          <SaasSelect
            label="Tuyến"
            value={tourFilter}
            options={tourOptions}
            onChange={setTourFilter}
          />
          <SaasSelect
            label="Số sao"
            value={starFilter}
            options={STAR_OPTIONS}
            onChange={setStarFilter}
          />
        </div>

        {loading ? (
          <p
            role="status"
            className="py-10 text-center text-sm text-[var(--sr-text-muted)]"
          >
            Đang tải dữ liệu kiểm duyệt đánh giá...
          </p>
        ) : !data.results?.length ? (
          <div className="py-10 text-center flex flex-col items-center gap-2">
            <Star size={28} className="text-stone-300" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--sr-text-primary)] m-0">
              Không có đánh giá nào phù hợp bộ lọc
            </p>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Hàng đợi kiểm duyệt hiện đang trống hoặc chưa có đánh giá khớp tiêu chí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.results.map((rev) => {
              const isRejecting = rejectTargetId === rev.id;
              const hasReports = (rev.reports_count || 0) > 0;
              return (
                <article
                  key={rev.id}
                  className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    rev.status === "pending_approval" || hasReports
                      ? "border-amber-300 bg-amber-50/40"
                      : rev.status === "rejected"
                        ? "border-red-200 bg-red-50/30"
                        : "border-[var(--sr-border)] bg-[var(--sr-bg-page)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--sr-border)]">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        title="Lọc đánh giá theo đối tác này"
                        onClick={() => {
                          if (rev.vendor_id) {
                            setVendorFilter(String(rev.vendor_id));
                            setTourFilter("all");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-3 py-1 text-sm font-bold text-[var(--sr-accent-ink)] hover:brightness-95 transition cursor-pointer"
                      >
                        <Building2 size={15} aria-hidden="true" />
                        <span>Đối tác: {rev.vendor_name}</span>
                      </button>

                      <span className="text-xs font-semibold text-[var(--sr-text-primary)]">
                        Tuyến: {rev.tour_title}
                        {rev.guide_name ? ` · HDV: ${rev.guide_name}` : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border)] bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--sr-text-primary)] sr-tabular">
                        Tour {rev.tour_rating || rev.rating}★
                      </span>
                      {rev.guide_rating != null && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sr-accent-ink)] sr-tabular">
                          <UserCheck size={12} aria-hidden="true" />
                          HDV {rev.guide_rating}★
                        </span>
                      )}
                      <ReviewStatusBadge
                        status={rev.status}
                        label={rev.status_label}
                      />
                      {hasReports && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-900">
                          <Flag size={11} aria-hidden="true" />
                          {rev.reports_count} báo cáo vi phạm
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-[var(--sr-text-primary)]">
                      {rev.customer_name}
                    </strong>
                    {rev.customer_email && (
                      <span className="text-xs text-[var(--sr-text-muted)]">
                        ({rev.customer_email})
                      </span>
                    )}
                    <span className="text-xs text-[var(--sr-text-muted)] sr-tabular">
                      · {rev.created_at}
                    </span>
                    {rev.order_code && (
                      <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[11px] font-mono text-[var(--sr-text-secondary)]">
                        #{rev.order_code}
                      </span>
                    )}
                  </div>

                  {((rev.tour_tags && rev.tour_tags.length > 0) ||
                    (rev.guide_tags && rev.guide_tags.length > 0) ||
                    (rev.low_rating_reasons &&
                      rev.low_rating_reasons.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(rev.low_rating_reasons || []).map((reason, idx) => (
                        <span
                          key={`reason-${rev.id}-${idx}`}
                          className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                        >
                          ! {reason}
                        </span>
                      ))}
                      {[
                        ...(rev.tour_tags || []),
                        ...(rev.guide_tags || []),
                      ].map((tag, idx) => (
                        <span
                          key={`tag-${rev.id}-${idx}`}
                          className="rounded-full border border-[var(--sr-border)] bg-white px-2 py-0.5 text-[10px] text-[var(--sr-text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-[var(--sr-text-secondary)] leading-relaxed m-0">
                    {rev.comment || "(Không có nội dung nhận xét)"}
                  </p>

                  {rev.vendor_reply && (
                    <div className="rounded-lg border border-[var(--sr-border)] bg-white px-3.5 py-2.5 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] text-[var(--sr-accent-ink)] font-semibold">
                        <span>Phản hồi của đối tác</span>
                        {rev.replied_at && (
                          <span className="text-[var(--sr-text-muted)] font-normal sr-tabular">
                            {rev.replied_at}
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--sr-text-secondary)] m-0">
                        {rev.vendor_reply}
                      </p>
                    </div>
                  )}

                  {hasReports && (
                    <div className="rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-red-900">
                        <AlertTriangle size={13} aria-hidden="true" />
                        Chi tiết báo cáo vi phạm:
                      </span>
                      {(rev.reports || []).map((rep, idx) => (
                        <div
                          key={`rep-${rev.id}-${idx}`}
                          className="text-red-900/90 flex flex-wrap gap-1.5"
                        >
                          <span className="font-semibold">
                            [{rep.role === "vendor_admin" || rep.role === "vendor" ? "Đối tác" : "Người dùng"} #{rep.user_id}]
                          </span>
                          <span>{rep.reason}</span>
                          {rep.created_at && (
                            <span className="text-red-700/80 sr-tabular">
                              ({rep.created_at})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {rev.moderation_note && (
                    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-[var(--sr-text-secondary)]">
                      <strong>Ghi chú BQL:</strong> {rev.moderation_note}
                      {rev.moderated_at ? ` (${rev.moderated_at})` : ""}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--sr-border)]">
                    {rev.status === "pending_approval" && (
                      <button
                        type="button"
                        disabled={submittingId === rev.id}
                        onClick={() => handleModerate(rev.id, "approve")}
                        className="sr-btn sr-btn-primary sr-btn-sm"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>Phê duyệt hiển thị</span>
                      </button>
                    )}

                    {rev.status === "rejected" && (
                      <button
                        type="button"
                        disabled={submittingId === rev.id}
                        onClick={() => handleModerate(rev.id, "approve")}
                        className="sr-btn sr-btn-secondary sr-btn-sm"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>Khôi phục hiển thị</span>
                      </button>
                    )}

                    {rev.status === "approved" && hasReports && (
                      <button
                        type="button"
                        disabled={submittingId === rev.id}
                        onClick={() =>
                          handleModerate(rev.id, "dismiss_reports")
                        }
                        className="sr-btn sr-btn-secondary sr-btn-sm"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>Bỏ qua báo cáo (Giữ đánh giá)</span>
                      </button>
                    )}

                    {rev.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={submittingId === rev.id}
                        onClick={() => {
                          if (isRejecting) {
                            setRejectTargetId(null);
                            setRejectReason("");
                          } else {
                            setRejectTargetId(rev.id);
                            setRejectReason("");
                          }
                        }}
                        className="sr-btn sr-btn-destructive-ghost sr-btn-sm"
                      >
                        <EyeOff size={14} aria-hidden="true" />
                        <span>
                          {rev.status === "pending_approval"
                            ? "Từ chối"
                            : "Ẩn đánh giá"}
                        </span>
                      </button>
                    )}
                  </div>

                  {isRejecting && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleModerate(rev.id, "reject", rejectReason);
                      }}
                      className="flex flex-col gap-2 pt-2 border-t border-[var(--sr-border)]"
                    >
                      <textarea
                        rows={2}
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Nhập lý do ẩn hoặc từ chối đánh giá (bắt buộc)..."
                        className="sr-textarea text-xs bg-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTargetId(null);
                            setRejectReason("");
                          }}
                          className="sr-btn sr-btn-ghost sr-btn-sm"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submittingId === rev.id}
                          className="sr-btn sr-btn-primary sr-btn-sm"
                        >
                          {submittingId === rev.id
                            ? "Đang xử lý..."
                            : "Xác nhận ẩn đánh giá"}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
