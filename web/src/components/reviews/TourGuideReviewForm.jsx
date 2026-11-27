import React, { useState } from "react";
import { AlertCircle, Clock, Star, UserCheck } from "lucide-react";
import { api } from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";

export const STAR_RATING_LABELS = {
  1: "Rất tệ",
  2: "Chưa tốt",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời",
};

export const TOUR_TAG_OPTIONS = [
  "Cảnh đẹp",
  "An toàn",
  "Đúng giờ",
  "Đáng tiền",
  "Bảo tồn tốt",
];

export const GUIDE_TAG_OPTIONS = [
  "Nhiệt tình",
  "Am hiểu sinh thái",
  "Hỗ trợ tốt",
  "Đúng giờ",
];

export const LOW_RATING_REASON_OPTIONS = [
  "Không an toàn",
  "HDV đến muộn",
  "Không đúng mô tả",
  "Thiếu hỗ trợ",
  "Chất lượng chưa tương xứng",
];

function InteractiveStarRow({ label, value, onChange, ariaLabel }) {
  const [hover, setHover] = useState(0);
  const litValue = hover || value;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-semibold text-[var(--sr-text-primary)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label={ariaLabel || label}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} sao - ${STAR_RATING_LABELS[star]}`}
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)}
              className="p-1 rounded hover:bg-amber-50 border-0 bg-transparent cursor-pointer transition-transform active:scale-95"
            >
              <Star
                size={20}
                className={star <= litValue ? "text-amber-500 fill-amber-400" : "text-stone-300"}
              />
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-[var(--sr-accent-ink)] min-w-[82px] text-right">
          {litValue}★ · {STAR_RATING_LABELS[litValue]}
        </span>
      </div>
    </div>
  );
}

export default function TourGuideReviewForm({
  tourId,
  orderVendorId,
  hasGuide = false,
  guideName = "",
  guideAvatarUrl = null,
  pointsReward = 10,
  deadline = null,
  daysRemaining = null,
  editReview = null,
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editReview?.id);
  const effectiveHasGuide = isEdit ? Boolean(editReview?.has_guide) : Boolean(hasGuide);
  const effectiveGuideName = editReview?.guide_name || guideName || "Hướng dẫn viên";

  const [tourRating, setTourRating] = useState(
    Number(editReview?.tour_rating || editReview?.rating || 5)
  );
  const [guideRating, setGuideRating] = useState(Number(editReview?.guide_rating || 5));
  const [tourTags, setTourTags] = useState(
    Array.isArray(editReview?.tour_tags) ? editReview.tour_tags : []
  );
  const [guideTags, setGuideTags] = useState(
    Array.isArray(editReview?.guide_tags) ? editReview.guide_tags : []
  );
  const [lowReasons, setLowReasons] = useState(
    Array.isArray(editReview?.low_rating_reasons) ? editReview.low_rating_reasons : []
  );
  const [comment, setComment] = useState(editReview?.comment || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsLowReason =
    tourRating <= 2 || (effectiveHasGuide && Number(guideRating) <= 2);

  const toggleChip = (setter, item) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tourId || submitting) return;

    const cleanComment = comment.trim();
    if (cleanComment.length < 10) {
      setError("Vui lòng nhập nhận xét tối thiểu 10 ký tự.");
      return;
    }
    if (needsLowReason && lowReasons.length === 0) {
      setError("Khi chấm 1–2★, vui lòng chọn ít nhất 1 lý do để đơn vị tổ chức khắc phục.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        rating: tourRating,
        tour_rating: tourRating,
        ...(effectiveHasGuide ? { guide_rating: guideRating } : {}),
        tour_tags: tourTags,
        guide_tags: effectiveHasGuide ? guideTags : [],
        low_rating_reasons: needsLowReason ? lowReasons : [],
        comment: cleanComment,
      };
      let res;
      if (isEdit) {
        res = await api.patch(`/tours/${tourId}/reviews/${editReview.id}/`, payload);
      } else {
        res = await api.post(`/tours/${tourId}/reviews/`, {
          ...payload,
          order_vendor_id: orderVendorId,
        });
      }
      onSuccess?.(res.data, isEdit ? "edit" : "create");
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể gửi đánh giá lúc này."));
    } finally {
      setSubmitting(false);
    }
  };

  const guideInitials = effectiveGuideName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "HD";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-bg-page)] p-4 flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--sr-text-muted)]">
        <span className="font-semibold text-[var(--sr-text-primary)]">
          {isEdit ? "Chỉnh sửa đánh giá (1 lần trong 48h)" : "Gửi đánh giá chuyến đi"}
        </span>
        {!isEdit && daysRemaining !== null && daysRemaining !== undefined && (
          <span className="inline-flex items-center gap-1 text-[var(--sr-accent-ink)]">
            <Clock size={12} aria-hidden="true" />
            <span>
              Còn {daysRemaining} ngày để đánh giá{deadline ? ` (hạn ${deadline})` : ""}
            </span>
          </span>
        )}
      </div>

      {/* Khối 1: Đánh giá trải nghiệm Tour */}
      <div className="rounded-lg border border-[var(--sr-border)] bg-white p-3 flex flex-col gap-2.5">
        <InteractiveStarRow
          label="1. Trải nghiệm tour"
          value={tourRating}
          onChange={setTourRating}
          ariaLabel="Chấm điểm trải nghiệm tour từ 1 đến 5 sao"
        />
        <div className="flex flex-wrap gap-1.5">
          {TOUR_TAG_OPTIONS.map((tag) => {
            const active = tourTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChip(setTourTags, tag)}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] cursor-pointer transition-colors ${
                  active
                    ? "border-[var(--sr-accent)] bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] font-semibold"
                    : "border-[var(--sr-border)] bg-[var(--sr-bg-page)] text-[var(--sr-text-secondary)]"
                }`}
              >
                {active ? "✓ " : "+ "}
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khối 2: Đánh giá Hướng dẫn viên (chỉ hiện khi chuyến có HDV) */}
      {effectiveHasGuide && (
        <div className="rounded-lg border border-[var(--sr-border)] bg-white p-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs text-[var(--sr-text-secondary)]">
            {guideAvatarUrl ? (
              <img
                src={guideAvatarUrl}
                alt={effectiveGuideName}
                className="w-6 h-6 rounded-full object-cover border border-[var(--sr-border)]"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] text-[10px] font-bold flex items-center justify-center">
                {guideInitials}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-medium text-[var(--sr-text-primary)]">
              <UserCheck size={13} className="text-[var(--sr-accent)]" aria-hidden="true" />
              <span>HDV phụ trách: {effectiveGuideName}</span>
            </span>
          </div>
          <InteractiveStarRow
            label="2. Hướng dẫn viên"
            value={guideRating}
            onChange={setGuideRating}
            ariaLabel="Chấm điểm hướng dẫn viên từ 1 đến 5 sao"
          />
          <div className="flex flex-wrap gap-1.5">
            {GUIDE_TAG_OPTIONS.map((tag) => {
              const active = guideTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChip(setGuideTags, tag)}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] cursor-pointer transition-colors ${
                    active
                      ? "border-[var(--sr-accent)] bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] font-semibold"
                      : "border-[var(--sr-border)] bg-[var(--sr-bg-page)] text-[var(--sr-text-secondary)]"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bắt buộc chọn lý do khi chấm 1-2 sao */}
      {needsLowReason && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold text-amber-900">
            Lý do chưa hài lòng (chọn ít nhất 1 mục):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {LOW_RATING_REASON_OPTIONS.map((reason) => {
              const active = lowReasons.includes(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChip(setLowReasons, reason)}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] cursor-pointer ${
                    active
                      ? "border-amber-700 bg-amber-200 text-amber-950 font-semibold"
                      : "border-amber-300 bg-white text-amber-900"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {reason}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nhận xét chung */}
      <div className="flex flex-col gap-1">
        <textarea
          rows={3}
          required
          minLength={10}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ chi tiết trải nghiệm cung đường trekking, sự hỗ trợ của HDV và công tác bảo tồn (tối thiểu 10 ký tự)..."
          className="sr-textarea text-xs bg-white"
        />
        <div className="flex justify-between text-[11px] text-[var(--sr-text-muted)] sr-tabular">
          <span>Tối thiểu 10 ký tự</span>
          <span>{comment.trim().length}/2000</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-1.5 text-xs text-red-700 font-medium">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            className="sr-btn sr-btn-ghost sr-btn-sm"
            onClick={onCancel}
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="sr-btn sr-btn-primary sr-btn-sm"
        >
          {submitting
            ? "Đang lưu..."
            : isEdit
              ? "Lưu chỉnh sửa"
              : `Gửi đánh giá (+${pointsReward} RE-Points)`}
        </button>
      </div>
    </form>
  );
}
