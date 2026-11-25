import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import { PageHeader } from "../../../components/ui/SaasPrimitives";
import {
  computeRemainingSeconds,
  useFlashSaleRealtime,
  useNowTick,
} from "../../../hooks/useFlashSaleRealtime";

const DEFAULT_TRAIL_IMAGE = "/images/trails/dinh-ban-co.jpg";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const getDifficultyLabel = (level, fallback = "Trung bình") => {
  if (level === "easy") return "Mức Dễ";
  if (level === "moderate") return "Mức Khá";
  if (level === "challenging") return "Thử thách";
  if (level === "expert") return "Chuyên gia";
  return fallback;
};

export default function DashboardFigmaPage() {
  const navigate = useNavigate();
  const { points = 0, isLoadingEco } = useUserEco();

  const [rows, setRows] = useState([]);
  const [flashData, setFlashData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const nowMs = useNowTick(1000);
  const expiredSessionRef = React.useRef("");

  const refreshFlashData = useCallback(async () => {
    try {
      const nextFlash = await flashSaleService.getActiveSession();
      setFlashData(nextFlash);
    } catch {
      // keep existing state on silent refresh error
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const [toursResult, flashResult, bookingsResult] = await Promise.allSettled([
      api.get("/tours/"),
      flashSaleService.getActiveSession(),
      api.get("/tours/my-bookings/"),
    ]);

    if (toursResult.status === "fulfilled") {
      const payload =
        toursResult.value.data?.status === "success"
          ? toursResult.value.data?.data
          : toursResult.value.data;
      setRows(Array.isArray(payload) ? payload.slice(0, 4) : []);
    } else {
      setRows([]);
    }

    if (flashResult.status === "fulfilled") {
      setFlashData(flashResult.value);
    } else {
      setFlashData(null);
    }

    if (bookingsResult.status === "fulfilled" && bookingsResult.value.data?.status === "success") {
      setBookings(Array.isArray(bookingsResult.value.data.data) ? bookingsResult.value.data.data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useFlashSaleRealtime(refreshFlashData);

  const flashSeconds = computeRemainingSeconds(flashData?.session, nowMs);

  useEffect(() => {
    const sess = flashData?.session;
    if (!sess || sess.is_ended) return;
    const key = `${sess.id}:${sess.end_time || sess.start_time}`;
    if (flashSeconds === 0 && expiredSessionRef.current !== key) {
      expiredSessionRef.current = key;
      refreshFlashData();
    }
  }, [flashSeconds, flashData?.session, refreshFlashData]);

  const tours = useMemo(() => {
    return rows.map((live) => {
      const basePrice = Number(live.price || 0);
      const flashItem =
        flashData?.session_type === "live"
          ? flashData.session?.items?.find((item) => Number(item.tour_id) === Number(live.id))
          : null;
      const discount = flashItem ? Number(flashItem.discount_percent || 0) : Number(live.discount || 0);
      const promoPrice = flashItem
        ? Number(flashItem.promo_price)
        : live.promo_price || (discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice);
      const maxCap = Number(live.max_capacity || 0);
      const rawRemaining = live.available_slots ?? live._available_slots ?? live.remaining_slots ?? maxCap;

      return {
        ...live,
        id: live.id,
        title: live.title || "",
        vendor_name: live.vendor_name || "Đơn vị tổ chức",
        rating: Number(live.avg_rating || 0),
        total_reviews: Number(live.total_reviews || 0),
        distance: Number(live.distance || live.route?.total_distance_km || 0),
        duration_hours: Number(live.duration_hours || 0),
        difficulty_label: getDifficultyLabel(live.difficulty_level, live.difficulty_label || "Trung bình"),
        price: basePrice,
        promo_price: promoPrice,
        discount,
        remaining_slots: Math.max(0, Number(rawRemaining || 0)),
        max_capacity: Math.max(1, maxCap || 1),
        next_departure: live.next_departure || live._next_departure || "Liên hệ",
        cover_image_url: live.cover_image_url || DEFAULT_TRAIL_IMAGE,
        fallback_image: DEFAULT_TRAIL_IMAGE,
      };
    });
  }, [rows, flashData]);

  const leadTour = tours[0] || null;
  const flashDeals = tours.slice(1, 3);
  const upcomingBooking = bookings.find((b) => b.status === "confirmed") || bookings[0] || null;
  const countdownText = flashSeconds > 0 ? formatCountdown(flashSeconds) : null;

  const nextMilestone = 1500;
  const milestoneRemaining = Math.max(0, nextMilestone - Number(points || 0));
  const milestonePct = Math.min(100, Math.max(8, Math.round((Number(points || 0) / nextMilestone) * 100)));

  const handleImageError = (fallbackSrc) => (event) => {
    if (event.currentTarget.dataset.fallbackApplied === "1") return;
    event.currentTarget.dataset.fallbackApplied = "1";
    event.currentTarget.src = fallbackSrc;
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Hành trình Sơn Trà"
        subtitle="Theo dõi chuyến đi sắp tới, suất khởi hành ưu đãi và điểm thưởng của bạn"
        actions={
          <button
            type="button"
            className="sr-btn sr-btn-secondary"
            onClick={() => navigate("/dashboard/bookings")}
          >
            {loading ? "Đơn đặt của tôi" : `Đơn đặt của tôi (${bookings.length})`}
          </button>
        }
      />

      {/* Band 1: Borderless Editorial Feature & Key Metrics */}
      <section className="sr-hero-split" aria-label="Tuyến tiêu điểm và chỉ số cá nhân">
        {loading ? (
          <article className="sr-hero-feature" aria-busy="true" aria-label="Đang tải tuyến tiêu điểm">
            <div className="sr-hero-photo animate-pulse bg-stone-200/70" />
            <div className="sr-hero-copy">
              <div className="flex flex-col gap-2">
                <div className="h-3.5 w-40 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-7 w-3/4 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-stone-200/70 animate-pulse" />
              </div>
              <div className="sr-feature-footer">
                <div className="h-6 w-32 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-9 w-36 rounded bg-stone-200/70 animate-pulse" />
              </div>
            </div>
          </article>
        ) : !leadTour ? (
          <article className="sr-hero-feature flex items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <h2 className="sr-feature-title">Chưa có tuyến trekking nào</h2>
              <p className="sr-feature-meta">Hiện chưa có tour nào được mở bán trên hệ thống.</p>
            </div>
          </article>
        ) : (
        <article className="sr-hero-feature">
          <img
            src={leadTour.cover_image_url}
            alt={leadTour.title}
            className="sr-hero-photo"
            onError={handleImageError(leadTour.fallback_image)}
          />

          <div className="sr-hero-copy">
            <div className="flex flex-col gap-2">
              <p className="sr-eyebrow">
                Tuyến tiêu điểm tuần này · {leadTour.difficulty_label}
              </p>
              <h2 className="sr-feature-title">{leadTour.title}</h2>
              <p className="sr-feature-meta">
                {leadTour.vendor_name} · {leadTour.distance} km · {leadTour.duration_hours} giờ · Còn {leadTour.remaining_slots} chỗ · {leadTour.rating} ({leadTour.total_reviews})
              </p>
            </div>

            <div className="sr-feature-footer">
              <div>
                {leadTour.price > leadTour.promo_price && (
                  <span className="sr-price-old sr-tabular">{formatMoney(leadTour.price)}</span>
                )}
                <span className="sr-price-now sr-tabular">
                  {formatMoney(leadTour.promo_price)} / người
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="sr-btn sr-btn-ghost"
                  onClick={() => navigate(`/dashboard/trekking/${leadTour.id}`, { state: { tour: leadTour } })}
                >
                  Xem lịch trình
                </button>
                <button
                  type="button"
                  className="sr-btn sr-btn-primary"
                  disabled={leadTour.remaining_slots === 0}
                  onClick={() => navigate(`/dashboard/trekking/${leadTour.id}`, { state: { tour: leadTour } })}
                >
                  <span>{leadTour.remaining_slots === 0 ? "Hết chỗ" : "Đặt chuyến này"}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </article>
        )}

        <aside className="sr-metrics-rail" aria-label="Tóm tắt điểm và chuyến sắp đi">
          <div className="sr-metric-block">
            <div className="sr-metric-head">
              <span>Điểm RE-Points khả dụng</span>
              <button
                type="button"
                className="sr-btn sr-btn-ghost sr-btn-sm"
                onClick={() => navigate("/dashboard/marketplace")}
              >
                Đổi voucher
              </button>
            </div>
            <div className="sr-metric-big sr-tabular">
              {isLoadingEco && !points ? (
                <span className="inline-block h-8 w-24 rounded bg-stone-200/70 animate-pulse align-middle" />
              ) : (
                Number(points || 0).toLocaleString("vi-VN")
              )}
            </div>
            <div
              className="sr-progress-track"
              role="progressbar"
              aria-valuenow={milestonePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ mở voucher giảm 20%"
            >
              <div className="sr-progress-fill" style={{ width: `${milestonePct}%` }} />
            </div>
            <span className="sr-feature-meta">
              {milestoneRemaining > 0
                ? `Còn ${milestoneRemaining} điểm để mở voucher giảm 20%`
                : "Đã đủ điểm mở voucher giảm 20%"}
            </span>
          </div>

          <div className="sr-divider" aria-hidden="true" />

          <div className="sr-metric-block">
            <div className="sr-metric-head">
              <span>Chuyến đi sắp tới</span>
              <button
                type="button"
                className="sr-btn sr-btn-ghost sr-btn-sm"
                onClick={() => navigate("/dashboard/bookings")}
              >
                Chi tiết
              </button>
            </div>
            {loading ? (
              <div className="flex flex-col gap-2 py-1" aria-busy="true">
                <div className="h-5 w-4/5 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-3/5 rounded bg-stone-200/70 animate-pulse" />
              </div>
            ) : upcomingBooking ? (
              <>
                <strong className="sr-h2">{upcomingBooking.tour_title}</strong>
                <span className="sr-feature-meta">
                  {upcomingBooking.scheduled_date || "22/11"} · {upcomingBooking.total_guests || upcomingBooking.adults_count || 1} khách · Đã xác nhận
                </span>
              </>
            ) : (
              <>
                <strong className="sr-h2">Chưa có lịch khởi hành</strong>
                <span className="sr-feature-meta">
                  Chọn tuyến phù hợp để bắt đầu hành trình Sơn Trà
                </span>
              </>
            )}
          </div>
        </aside>
      </section>

      {/* Band 2: Single Surface Flash Sale Strip */}
      <section className="sr-surface" aria-label="Flash sale giờ chót">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="sr-h2">Flash sale giờ chót</h2>
            {countdownText && (
              <span className="sr-urgent-text sr-tabular" role="timer" aria-live="off">
                Kết thúc sau {countdownText}
              </span>
            )}
          </div>
          <button
            type="button"
            className="sr-btn sr-btn-ghost sr-btn-sm"
            onClick={() => navigate("/dashboard/flash-sale")}
          >
            Xem tất cả ưu đãi
          </button>
        </div>

        <div className="sr-flash-cols">
          {loading ? (
            [0, 1].map((idx) => (
              <article key={`flash-skeleton-${idx}`} className="sr-flash-item" aria-busy="true">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="sr-flash-thumb bg-stone-200/70 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="h-4 w-3/4 rounded bg-stone-200/70 animate-pulse" />
                    <div className="h-3.5 w-1/2 rounded bg-stone-200/70 animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-20 rounded bg-stone-200/70 animate-pulse shrink-0" />
              </article>
            ))
          ) : flashDeals.length === 0 ? (
            <p className="sr-feature-meta py-2">Hiện chưa có suất Flash sale nào.</p>
          ) : (
          flashDeals.map((deal) => (
            <article key={deal.id} className="sr-flash-item">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={deal.cover_image_url}
                  alt={deal.title}
                  className="sr-flash-thumb"
                  onError={handleImageError(deal.fallback_image)}
                />
                <div className="min-w-0">
                  <h3 className="sr-h2 truncate">{deal.title}</h3>
                  <p className="sr-feature-meta truncate">
                    {deal.distance} km · {deal.duration_hours} giờ · Còn {deal.remaining_slots}/{deal.max_capacity} chỗ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="sr-price-now sr-tabular">{formatMoney(deal.promo_price)}</div>
                  {deal.discount > 0 && (
                    <span className="sr-urgent-text text-xs sr-tabular">-{deal.discount}%</span>
                  )}
                </div>
                <button
                  type="button"
                  className="sr-btn sr-btn-secondary sr-btn-sm"
                  onClick={() => navigate("/dashboard/flash-sale")}
                >
                  Giữ suất
                </button>
              </div>
            </article>
          ))
          )}
        </div>
      </section>

      {/* Band 3: Borderless Departures Table & Lightweight Activity List */}
      <section className="sr-split-7-5" aria-label="Lịch khởi hành và hoạt động gần đây">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="sr-h2">Lịch khởi hành 7 ngày tới</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/dashboard/trekking")}
            >
              Tất cả tuyến
            </button>
          </div>

          <div className="sr-table-wrap">
            <table className="sr-table">
              <caption className="sr-only">Lịch khởi hành các tuyến trekking Sơn Trà</caption>
              <thead>
                <tr>
                  <th scope="col">Tuyến trekking</th>
                  <th scope="col" className="sr-hide-mobile">Khởi hành</th>
                  <th scope="col" className="sr-hide-mobile">Chỗ trống</th>
                  <th scope="col">Giá vé</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2].map((idx) => (
                    <tr key={`row-skeleton-${idx}`} aria-busy="true">
                      <td><div className="h-4 w-44 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td className="sr-hide-mobile"><div className="h-4 w-24 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td className="sr-hide-mobile"><div className="h-4 w-16 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td><div className="h-4 w-20 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td><div className="h-7 w-16 rounded bg-stone-200/70 animate-pulse" /></td>
                    </tr>
                  ))
                ) : tours.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-[var(--sr-text-muted)]">
                      Chưa có lịch khởi hành nào.
                    </td>
                  </tr>
                ) : (
                tours.slice(0, 4).map((tour) => (
                  <tr key={`row-${tour.id}`}>
                    <td className="font-medium text-[var(--sr-text-primary)]">{tour.title}</td>
                    <td className="sr-hide-mobile sr-tabular">{tour.next_departure || "Cuối tuần"}</td>
                    <td className="sr-hide-mobile sr-tabular">
                      {tour.remaining_slots}/{tour.max_capacity} chỗ
                    </td>
                    <td className="sr-tabular font-medium text-[var(--sr-text-primary)]">
                      {formatMoney(tour.promo_price)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sr-btn sr-btn-ghost sr-btn-sm"
                        onClick={() => navigate(`/dashboard/trekking/${tour.id}`, { state: { tour } })}
                      >
                        Đặt vé
                      </button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="sr-h2">Hoạt động và gợi ý nhanh</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/dashboard/assistant")}
            >
              Hỏi Trợ lý AI
            </button>
          </div>

          <div className="sr-activity-list">
            <button
              type="button"
              className="sr-activity-row"
              onClick={() => navigate("/dashboard/inbox")}
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--sr-text-primary)]">
                  Phòng chat chuyến đi
                </div>
                <div className="text-xs text-[var(--sr-text-muted)]">
                  Trao đổi trực tiếp với hướng dẫn viên và đoàn trekking
                </div>
              </div>
              <span className="text-xs font-medium text-[var(--sr-accent)] shrink-0">Mở chat</span>
            </button>

            <button
              type="button"
              className="sr-activity-row"
              onClick={() => navigate("/dashboard/marketplace")}
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--sr-text-primary)]">
                  Kho voucher đổi thưởng
                </div>
                <div className="text-xs text-[var(--sr-text-muted)]">
                  Đổi điểm RE-Points lấy mã giảm giá vé đặt tour
                </div>
              </div>
              <span className="text-xs font-medium text-[var(--sr-accent)] shrink-0">Xem mã</span>
            </button>

            <button
              type="button"
              className="sr-activity-row"
              onClick={() => navigate("/dashboard/assistant")}
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--sr-text-primary)]">
                  Gợi ý AI: Tour nửa ngày dưới 400k
                </div>
                <div className="text-xs text-[var(--sr-text-muted)]">
                  Nhận lịch trình phù hợp cho nhóm bạn hoặc gia đình
                </div>
              </div>
              <span className="text-xs font-medium text-[var(--sr-accent)] shrink-0">Hỏi ngay</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
