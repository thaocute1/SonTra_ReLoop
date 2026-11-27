import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquareReply, RefreshCw, Star, UserCheck } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../utils/apiError";

const STAR_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả mức sao" },
  { value: "5", label: "5 sao (Tuyệt vời)" },
  { value: "4", label: "4 sao (Hài lòng)" },
  { value: "3", label: "3 sao (Bình thường)" },
  { value: "2", label: "2 sao (Chưa tốt)" },
  { value: "1", label: "1 sao (Rất tệ)" },
];

const REPLY_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ phản hồi" },
  { value: "low_rating", label: "Đánh giá thấp (1–2★)" },
  { value: "replied", label: "Đã phản hồi" },
];

export function RatingBreakdownList({ breakdown = {}, totalReviews = 0 }) {
  const total = Number(totalReviews || 0);
  return (
    <div className="flex flex-col gap-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = Number(breakdown[star] ?? breakdown[String(star)] ?? 0);
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2.5 text-xs">
            <span className="w-9 shrink-0 inline-flex items-center gap-0.5 text-[var(--sr-text-secondary)] sr-tabular">
              {star} <Star size={11} className="text-amber-500 fill-amber-400" aria-hidden="true" />
            </span>
            <div className="flex-1 h-2 rounded-full bg-stone-200/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[11px] text-[var(--sr-text-muted)] sr-tabular">
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function VendorReviewCard({
  rev,
  isReplying,
  replyDraft,
  submitting,
  onToggleReply,
  onReplyDraftChange,
  onCancelReply,
  onSubmitReply,
}) {
  const isLow = Boolean(rev.is_low_rating || Number(rev.rating) <= 2);
  return (
    <article
      className={`rounded-xl border p-4 flex flex-col gap-3 ${
        isLow
          ? "border-amber-300 bg-amber-50/40"
          : "border-[var(--sr-border)] bg-[var(--sr-bg-page)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-[var(--sr-text-primary)]">
              {rev.customer_name}
            </strong>
            <span className="text-xs text-[var(--sr-text-muted)] sr-tabular">
              · {rev.created_at}
            </span>
            {rev.order_code && (
              <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[11px] font-mono text-[var(--sr-text-secondary)]">
                #{rev.order_code}
              </span>
            )}
            {isLow && !rev.vendor_reply && (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                Đánh giá thấp · Ưu tiên phản hồi
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-[var(--sr-accent-ink)]">
            Tuyến: {rev.tour_title}
            {rev.guide_name ? ` · HDV: ${rev.guide_name}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--sr-text-primary)] sr-tabular">
            Tour {rev.tour_rating || rev.rating}★
          </span>
          {rev.guide_rating != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sr-accent-ink)] sr-tabular">
              <UserCheck size={11} aria-hidden="true" />
              HDV {rev.guide_rating}★
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleReply(rev)}
            className="sr-btn sr-btn-secondary sr-btn-sm"
          >
            <MessageSquareReply size={13} aria-hidden="true" />
            <span>{rev.vendor_reply ? "Sửa phản hồi" : "Phản hồi"}</span>
          </button>
        </div>
      </div>

      {((rev.tour_tags && rev.tour_tags.length > 0) ||
        (rev.guide_tags && rev.guide_tags.length > 0) ||
        (rev.low_rating_reasons && rev.low_rating_reasons.length > 0)) && (
        <div className="flex flex-wrap gap-1.5">
          {(rev.low_rating_reasons || []).map((reason, idx) => (
            <span
              key={`reason-${rev.id}-${idx}`}
              className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
            >
              ! {reason}
            </span>
          ))}
          {[...(rev.tour_tags || []), ...(rev.guide_tags || [])].map((tag, idx) => (
            <span
              key={`vtag-${rev.id}-${idx}`}
              className="rounded-full border border-[var(--sr-border)] bg-white px-2 py-0.5 text-[10px] text-[var(--sr-text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--sr-text-secondary)] leading-relaxed m-0">
        {rev.comment}
      </p>

      {rev.vendor_reply && !isReplying && (
        <div className="rounded-lg border border-[var(--sr-border)] bg-white px-3.5 py-2.5 text-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--sr-accent-ink)]">
            <span className="inline-flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Đã phản hồi du khách</span>
            </span>
            {rev.replied_at && (
              <span className="text-[var(--sr-text-muted)] sr-tabular">{rev.replied_at}</span>
            )}
          </div>
          <p className="text-[var(--sr-text-secondary)] m-0">{rev.vendor_reply}</p>
        </div>
      )}

      {isReplying && (
        <form
          onSubmit={(e) => onSubmitReply(e, rev.id)}
          className="flex flex-col gap-2 pt-2 border-t border-[var(--sr-border)]"
        >
          <textarea
            rows={2}
            required
            value={replyDraft}
            onChange={(e) => onReplyDraftChange(e.target.value)}
            placeholder="Nhập lời cảm ơn hoặc giải đáp cho đánh giá của du khách..."
            className="sr-textarea text-xs bg-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancelReply}
              className="sr-btn sr-btn-ghost sr-btn-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="sr-btn sr-btn-primary sr-btn-sm"
            >
              {submitting ? "Đang lưu..." : "Gửi phản hồi"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function VendorReviewsPanel() {
  const [data, setData] = useState({
    summary: {
      avg_rating: 0,
      total_reviews: 0,
      unreplied_count: 0,
      five_star_count: 0,
      five_star_rate: 0,
      rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    tours: [],
    guides: [],
    results: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tourFilter, setTourFilter] = useState("all");
  const [guideFilter, setGuideFilter] = useState("all");
  const [starFilter, setStarFilter] = useState("all");
  const [replyFilter, setReplyFilter] = useState("all");
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [feedback, setFeedback] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (tourFilter !== "all") params.tour_id = tourFilter;
      if (guideFilter !== "all") params.guide_id = guideFilter;
      if (starFilter !== "all") params.rating = starFilter;
      if (replyFilter !== "all") params.reply_status = replyFilter;
      const res = await api.get("/vendors/reviews/", { params });
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể tải danh sách đánh giá khách hàng."));
    } finally {
      setLoading(false);
    }
  }, [tourFilter, guideFilter, starFilter, replyFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleOpenReply = (rev) => {
    setFeedback("");
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
    if (!replyDraft.trim() || submittingId) return;
    setSubmittingId(reviewId);
    setFeedback("");
    try {
      const res = await api.post(`/vendors/reviews/${reviewId}/reply/`, {
        reply: replyDraft.trim(),
      });
      const updated = res.data?.data;
      if (updated) {
        setData((prev) => {
          const wasUnreplied = !prev.results.find((r) => r.id === reviewId)?.vendor_reply;
          return {
            ...prev,
            summary: {
              ...prev.summary,
              unreplied_count: Math.max(
                0,
                Number(prev.summary.unreplied_count || 0) - (wasUnreplied ? 1 : 0)
              ),
            },
            results: prev.results.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    vendor_reply: updated.vendor_reply,
                    replied_at: updated.replied_at,
                  }
                : r
            ),
          };
        });
      }
      setFeedback(res.data?.message || "Đã gửi phản hồi đánh giá cho du khách.");
      setActiveReplyId(null);
      setReplyDraft("");
    } catch (err) {
      setFeedback(extractErrorMessage(err, "Không thể gửi phản hồi lúc này."));
    } finally {
      setSubmittingId(null);
    }
  };

  const summary = data.summary || {};
  const breakdown = summary.rating_breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const tourOptions = [
    { value: "all", label: "Tất cả tuyến tour" },
    ...(data.tours || []).map((t) => ({ value: String(t.id), label: t.title })),
  ];
  const guideOptions = [
    { value: "all", label: "Tất cả HDV" },
    ...(data.guides || []).map((g) => ({ value: String(g.id), label: g.name })),
  ];

  return (
    <div className="sr-page">
      <PageHeader
        title="Đánh giá & Chấm điểm 5 sao từ du khách"
        subtitle="Theo dõi mức độ hài lòng cho cả Tuyến trekking và Hướng dẫn viên (SRS VT-06)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaasSelect
              label="Tuyến"
              value={tourFilter}
              options={tourOptions}
              onChange={setTourFilter}
            />
            {guideOptions.length > 1 && (
              <SaasSelect
                label="HDV"
                value={guideFilter}
                options={guideOptions}
                onChange={setGuideFilter}
              />
            )}
            <SaasSelect
              label="Số sao"
              value={starFilter}
              options={STAR_FILTER_OPTIONS}
              onChange={setStarFilter}
            />
            <SaasSelect
              label="Phản hồi"
              value={replyFilter}
              options={REPLY_FILTER_OPTIONS}
              onChange={setReplyFilter}
            />
            <button
              type="button"
              onClick={loadReviews}
              className="sr-btn sr-btn-secondary sr-btn-sm"
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="sr-callout sr-callout-urgent">
          {error}
        </div>
      )}

      {feedback && (
        <div role="status" className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-4 py-2.5 text-xs font-medium text-[var(--sr-accent-ink)]">
          {feedback}
        </div>
      )}

      {data.quality_alert && data.quality_alert.level !== "healthy" && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 text-xs ${
            data.quality_alert.level === "critical"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{data.quality_alert.title}</span>
          </div>
          <p className="m-0 leading-relaxed">{data.quality_alert.message}</p>
          {Array.isArray(data.quality_alert.flagged_tours) && data.quality_alert.flagged_tours.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.quality_alert.flagged_tours.map((ft) => (
                <span
                  key={ft.id}
                  className="rounded-full border border-current/25 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {ft.title}: {Number(ft.avg_rating || 0).toFixed(1)}★ ({ft.total_reviews} đánh giá)
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Summary & 5-Star Breakdown */}
      <div className="sr-split-7-5">
        <section className="sr-surface grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--sr-text-muted)]">Điểm trung bình</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
                {summary.total_reviews > 0 ? Number(summary.avg_rating || 0).toFixed(1) : "0.0"}
              </span>
              <span className="text-xs text-[var(--sr-text-muted)]">/ 5.0</span>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={13}
                  className={
                    summary.total_reviews > 0 && s <= Math.round(Number(summary.avg_rating || 0))
                      ? "text-amber-500 fill-amber-400"
                      : "text-stone-300"
                  }
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--sr-text-muted)]">Tổng lượt đánh giá</span>
            <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
              {summary.total_reviews || 0}
            </span>
            <span className="text-xs text-[var(--sr-text-secondary)]">Từ đơn đã hoàn thành</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--sr-text-muted)]">Tỷ lệ 5 sao</span>
            <span className="text-2xl font-bold text-[var(--sr-accent)] sr-tabular">
              {summary.five_star_rate || 0}%
            </span>
            <span className="text-xs text-[var(--sr-text-secondary)] sr-tabular">
              {summary.five_star_count || 0} lượt 5★
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--sr-text-muted)]">Chờ phản hồi</span>
            <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
              {summary.unreplied_count || 0}
            </span>
            <span className="text-xs text-[var(--sr-text-secondary)]">Đánh giá chưa trả lời</span>
          </div>
        </section>

        <section className="sr-surface flex flex-col gap-2 justify-center">
          <h2 className="text-xs font-semibold text-[var(--sr-text-primary)] uppercase tracking-wider m-0">
            Phân bố mức sao
          </h2>
          <RatingBreakdownList breakdown={breakdown} totalReviews={summary.total_reviews} />
        </section>
      </div>

      {/* Reviews List */}
      <section className="sr-surface flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="sr-h2">Danh sách đánh giá ({data.results?.length || 0})</h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--sr-text-muted)]" role="status">
            Đang tải danh sách đánh giá khách hàng...
          </div>
        ) : !data.results?.length ? (
          <div className="py-10 text-center flex flex-col items-center gap-2">
            <Star size={28} className="text-stone-300" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--sr-text-primary)] m-0">
              Chưa có đánh giá nào khớp với bộ lọc hiện tại
            </p>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Khi du khách hoàn thành chuyến đi và chấm điểm 1–5 sao, đánh giá sẽ xuất hiện tại đây để bạn phản hồi.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.results.map((rev) => (
              <VendorReviewCard
                key={rev.id}
                rev={rev}
                isReplying={activeReplyId === rev.id}
                replyDraft={replyDraft}
                submitting={submittingId === rev.id}
                onToggleReply={handleOpenReply}
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
    </div>
  );
}
