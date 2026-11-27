import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  MessageSquare,
  Route,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import { PageHeader } from "../../../components/ui/SaasPrimitives";
import {
  computeRemainingSeconds,
  useFlashSaleRealtime,
  useNowTick,
} from "../../../hooks/useFlashSaleRealtime";

const LOCAL_TRAIL_IMAGES = [
  "/images/trails/dinh-ban-co.jpg",
  "/images/trails/bai-bac.jpg",
  "/images/trails/mui-nghe.jpg",
];
const GENERIC_STOCK_PATTERNS = [
  "images.unsplash.com/photo-1544735716-392fe2489ffa",
  "images.unsplash.com/photo-1596422846543-75c6fc197f07",
  "images.unsplash.com/photo-1448375240586-882707db888b",
  "images.unsplash.com/photo-1507525428034-b723cf961d3e",
];

const resolveTrailFallback = (tour, index = 0) => {
  const haystack = `${tour?.title || ""} ${tour?.slug || ""}`.toLowerCase();
  if (
    haystack.includes("bãi bắc") ||
    haystack.includes("bai-bac") ||
    haystack.includes("cây đa") ||
    haystack.includes("cay-da")
  ) {
    return "/images/trails/bai-bac.jpg";
  }
  if (
    haystack.includes("mũi nghê") ||
    haystack.includes("mui-nghe") ||
    haystack.includes("bình minh") ||
    haystack.includes("san hô") ||
    haystack.includes("bãi nam")
  ) {
    return "/images/trails/mui-nghe.jpg";
  }
  if (
    haystack.includes("bàn cờ") ||
    haystack.includes("bản cờ") ||
    haystack.includes("ban-co") ||
    haystack.includes("tiên sa")
  ) {
    return "/images/trails/dinh-ban-co.jpg";
  }
  return LOCAL_TRAIL_IMAGES[index % LOCAL_TRAIL_IMAGES.length];
};

const resolveTrailImage = (tour, index = 0) => {
  const rawUrl = tour?.cover_image_url;
  const fallback = resolveTrailFallback(tour, index);
  const isGenericStock =
    !rawUrl ||
    GENERIC_STOCK_PATTERNS.some((pattern) => String(rawUrl).includes(pattern));
  if (isGenericStock) {
    return { src: fallback, fallback };
  }
  return { src: rawUrl, fallback };
};

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

const getBookingStatusLabel = (status) => {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "completed") return "Đã hoàn thành";
  if (status === "waiting_payment" || status === "pending") return "Chờ thanh toán";
  if (status === "waiting_confirmation") return "Chờ xác nhận";
  return "Sắp khởi hành";
};

export default function DashboardFigmaPage() {
  const navigate = useNavigate();
  const { globalSearch = "" } = useOutletContext() || {};
  const { points = 0, rank, isLoadingEco } = useUserEco();

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
    return rows.map((live, idx) => {
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
      const { src, fallback } = resolveTrailImage(live, idx);

      return {
        ...live,
        id: live.id,
        title: live.title || "",
        description: live.description || "",
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
        cover_image_url: src,
        fallback_image: fallback,
      };
    });
  }, [rows, flashData]);

  const filteredDepartures = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return tours.slice(0, 4);
    return tours.filter(
      (tour) =>
        tour.title.toLowerCase().includes(query) ||
        tour.vendor_name.toLowerCase().includes(query) ||
        tour.difficulty_label.toLowerCase().includes(query)
    );
  }, [tours, globalSearch]);

  const leadTour = tours[0] || null;
  const isLiveFlash = Boolean(flashData?.has_session && flashData?.session_type === "live");
  const isUpcomingFlash = Boolean(flashData?.has_session && flashData?.session_type === "upcoming");
  const flashDeals = useMemo(() => {
    if (!flashData?.has_session || !["live", "upcoming"].includes(flashData?.session_type)) {
      return [];
    }
    const items = Array.isArray(flashData?.session?.items) ? flashData.session.items : [];
    return items.slice(0, 2).map((item, idx) => {
      const matchedTour = rows.find((r) => Number(r.id) === Number(item.tour_id));
      const { src, fallback } = resolveTrailImage(
        {
          title: item.tour_title || matchedTour?.title,
          slug: item.tour_slug || matchedTour?.slug,
          cover_image_url: item.tour_cover_image || matchedTour?.cover_image_url,
        },
        idx
      );
      const basePrice = Number(item.original_price || matchedTour?.price || 0);
      const promoPrice = Number(item.promo_price || basePrice);
      const discount = Number(
        item.discount_percent ?? (basePrice > promoPrice ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0)
      );
      const slotQty = Math.max(1, Number(item.slot_quantity || 1));
      const remainingSlots = Math.max(
        0,
        Number(item.remaining_slots ?? slotQty - Number(item.sold_quantity || 0))
      );

      return {
        id: item.id || item.tour_id,
        tour_id: item.tour_id,
        title: item.tour_title || matchedTour?.title || "Tuyến trekking ưu đãi",
        distance: Number(matchedTour?.distance || matchedTour?.route?.total_distance_km || 0),
        duration_hours: Number(item.tour_duration || matchedTour?.duration_hours || 0),
        price: basePrice,
        promo_price: promoPrice,
        discount,
        remaining_slots: remainingSlots,
        max_capacity: slotQty,
        cover_image_url: src,
        fallback_image: fallback,
      };
    });
  }, [flashData, rows]);
  const upcomingBooking =
    bookings.find((b) =>
      ["confirmed", "waiting_confirmation", "waiting_payment", "pending"].includes(b.status)
    ) || null;
  const countdownText = flashSeconds > 0 ? formatCountdown(flashSeconds) : null;

  const nextMilestone = 1500;
  const milestoneRemaining = Math.max(0, nextMilestone - Number(points || 0));
  const milestonePct = Math.min(100, Math.max(6, Math.round((Number(points || 0) / nextMilestone) * 100)));
  const memberBadge = rank && rank !== "—" ? rank : "Thành viên Xanh";

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
            <Calendar size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{loading ? "Đơn đặt của tôi" : `Đơn đặt của tôi (${bookings.length})`}</span>
          </button>
        }
      />

      {/* Khu vực 1: Featured Travel Experience & Travel Companion (RE-Points + Chuyến đi sắp tới) */}
      <section className="sr-home-hero-grid" aria-label="Tuyến tiêu điểm và thông tin cá nhân">
        {loading ? (
          <article className="sr-home-feature" aria-busy="true" aria-label="Đang tải tuyến tiêu điểm">
            <div className="sr-home-feature-media animate-pulse bg-stone-200/70" />
            <div className="sr-home-feature-body">
              <div className="flex flex-col gap-2.5">
                <div className="h-6 w-3/4 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-full rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-stone-200/70 animate-pulse" />
              </div>
              <div className="sr-home-feature-footer">
                <div className="h-7 w-36 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-9 w-40 rounded bg-stone-200/70 animate-pulse" />
              </div>
            </div>
          </article>
        ) : !leadTour ? (
          <article className="sr-home-feature flex items-center justify-center p-10 text-center">
            <div className="flex flex-col items-center gap-2.5">
              <Compass size={28} strokeWidth={1.5} className="text-[var(--sr-accent)]" aria-hidden="true" />
              <h2 className="sr-home-feature-title">Chưa có tuyến trekking nào</h2>
              <p className="sr-feature-meta">Hiện chưa có tour nào được mở bán trên hệ thống.</p>
            </div>
          </article>
        ) : (
          <article className="sr-home-feature">
            <div className="sr-home-feature-media">
              <img
                src={leadTour.cover_image_url}
                alt={leadTour.title}
                className="sr-home-feature-img"
                onError={handleImageError(leadTour.fallback_image)}
              />
              <div className="sr-home-feature-scrim" aria-hidden="true" />
              <div className="sr-home-feature-badges">
                <span className="sr-home-pill-dark">
                  <Compass size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>Tuyến tiêu điểm · {leadTour.difficulty_label}</span>
                </span>
                {leadTour.rating > 0 && (
                  <span className="sr-home-pill-light sr-tabular">
                    <Star size={14} strokeWidth={1.75} className="text-amber-500 fill-amber-400" aria-hidden="true" />
                    <span>{leadTour.rating.toFixed(1)}</span>
                    <span className="text-[var(--sr-text-muted)]">({leadTour.total_reviews})</span>
                  </span>
                )}
              </div>
            </div>

            <div className="sr-home-feature-body">
              <div className="flex flex-col gap-2">
                <h2 className="sr-home-feature-title">{leadTour.title}</h2>
                <p className="sr-home-feature-desc">
                  {leadTour.description ||
                    "Khám phá cung đường rừng nguyên sinh và tầm nhìn toàn cảnh vịnh Đà Nẵng tại bán đảo Sơn Trà."}
                </p>

                <div className="sr-home-meta-row sr-tabular">
                  <span className="sr-home-meta-item">
                    <Route size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                    <span>{leadTour.distance} km</span>
                  </span>
                  <span className="sr-home-meta-item">
                    <Clock size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                    <span>{leadTour.duration_hours} giờ</span>
                  </span>
                  <span className="sr-home-meta-item">
                    <Users size={15} strokeWidth={1.75} className="sr-home-meta-icon" aria-hidden="true" />
                    <span>Còn {leadTour.remaining_slots} chỗ</span>
                  </span>
                  <span className="text-[var(--sr-text-muted)]">{leadTour.vendor_name}</span>
                </div>
              </div>

              <div className="sr-home-feature-footer">
                <div>
                  <span className="sr-home-price-label">Giá vé trọn gói</span>
                  <div className="sr-home-price-row">
                    <span className="sr-home-price-main sr-tabular">{formatMoney(leadTour.promo_price)}</span>
                    <span className="sr-home-price-unit">/ người</span>
                    {leadTour.price > leadTour.promo_price && (
                      <span className="sr-price-old sr-tabular">{formatMoney(leadTour.price)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className="sr-btn sr-btn-secondary"
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
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        )}

        <aside className="sr-home-companion" aria-label="Điểm thưởng và chuyến đi sắp tới">
          {/* RE-Points Loyalty Experience */}
          <section className="sr-home-loyalty" aria-label="Điểm thưởng RE-Points">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="sr-home-icon-box is-sand" aria-hidden="true">
                  <Award size={18} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-[var(--sr-text-secondary)]">RE-Points khả dụng</span>
              </div>
              <span className="sr-home-loyalty-badge">{memberBadge}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="sr-home-points-value sr-tabular">
                {isLoadingEco && !points ? (
                  <span className="inline-block h-8 w-24 rounded bg-stone-200/70 animate-pulse align-middle" />
                ) : (
                  Number(points || 0).toLocaleString("vi-VN")
                )}
              </span>
              <span className="text-sm text-[var(--sr-text-muted)]">điểm xanh</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--sr-text-secondary)]">Tiến trình mở voucher giảm 20%</span>
                <span className="font-semibold text-[var(--sr-accent)] sr-tabular">{milestonePct}%</span>
              </div>
              <div
                className="sr-home-progress-track"
                role="progressbar"
                aria-valuenow={milestonePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ mở voucher giảm 20%"
              >
                <div className="sr-home-progress-fill" style={{ width: `${milestonePct}%` }} />
              </div>
              <p className="m-0 text-xs text-[var(--sr-text-muted)]">
                {milestoneRemaining > 0
                  ? `Còn thiếu ${milestoneRemaining.toLocaleString("vi-VN")} điểm nữa để đổi voucher giảm 20%`
                  : "Bạn đã đủ điểm để mở voucher giảm 20% ngay"}
              </p>
            </div>

            <button
              type="button"
              className="sr-home-loyalty-cta"
              onClick={() => navigate("/dashboard/marketplace")}
            >
              <span>Đổi voucher ưu đãi</span>
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </section>

          {/* Chuyến đi sắp tới */}
          <section className="sr-home-card sr-home-upcoming" aria-label="Chuyến đi sắp tới">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="sr-home-icon-box" aria-hidden="true">
                  <Calendar size={18} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-[var(--sr-text-secondary)]">Chuyến đi sắp tới</span>
              </div>
              <button
                type="button"
                className="sr-btn sr-btn-ghost sr-btn-sm"
                onClick={() => navigate("/dashboard/bookings")}
              >
                <span>Chi tiết</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2 py-1" aria-busy="true">
                <div className="h-5 w-4/5 rounded bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-3/5 rounded bg-stone-200/70 animate-pulse" />
              </div>
            ) : upcomingBooking ? (
              <div className="sr-home-trip-summary">
                <strong className="text-[15px] font-semibold text-[var(--sr-text-primary)] leading-snug">
                  {upcomingBooking.tour_title}
                </strong>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[var(--sr-text-secondary)] sr-tabular">
                    {upcomingBooking.scheduled_date || "22/11"} · {upcomingBooking.total_guests || upcomingBooking.adults_count || 1} khách
                  </span>
                  <span className="sr-slot-pill">
                    <span className="sr-slot-dot" aria-hidden="true" />
                    <span>{getBookingStatusLabel(upcomingBooking.status)}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="sr-home-trip-summary">
                <strong className="text-[15px] font-semibold text-[var(--sr-text-primary)]">
                  Chưa có lịch khởi hành
                </strong>
                <p className="m-0 text-xs text-[var(--sr-text-muted)] leading-relaxed">
                  Chọn tuyến phù hợp để bắt đầu hành trình khám phá Sơn Trà của bạn.
                </p>
              </div>
            )}
          </section>
        </aside>
      </section>

      {/* Khu vực 2: Flash Sale — Chỉ hiển thị khi thực sự có phiên Flash Sale và suất ưu đãi */}
      {!loading && flashDeals.length > 0 && (
        <section className="sr-home-flash" aria-label="Flash sale giờ chót">
          <div className="sr-home-section-head flex-wrap">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 text-[var(--sr-text-primary)]">
                <Flame size={18} strokeWidth={1.85} className="text-[var(--sr-urgent)]" aria-hidden="true" />
                <h2 className="sr-h2">
                  {isUpcomingFlash ? "Flash sale sắp mở bán" : "Flash sale giờ chót"}
                </h2>
              </span>
              {countdownText && (
                <span className="sr-home-countdown sr-tabular" role="timer" aria-live="off">
                  <Clock size={13} strokeWidth={2} aria-hidden="true" />
                  <span>{isUpcomingFlash ? `Mở bán sau ${countdownText}` : `Kết thúc sau ${countdownText}`}</span>
                </span>
              )}
            </div>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/dashboard/flash-sale")}
            >
              <span>Xem tất cả ưu đãi</span>
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-home-flash-grid">
            {flashDeals.map((deal) => (
              <article key={deal.id} className="sr-home-flash-card">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="sr-home-flash-thumb-wrap">
                    <img
                      src={deal.cover_image_url}
                      alt={deal.title}
                      className="sr-home-flash-thumb"
                      onError={handleImageError(deal.fallback_image)}
                    />
                    {deal.discount > 0 && (
                      <span className="sr-home-discount-tag sr-tabular">-{deal.discount}%</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="m-0 text-[15px] font-semibold text-[var(--sr-text-primary)] truncate">
                      {deal.title}
                    </h3>
                    <p className="m-0 text-xs text-[var(--sr-text-muted)] sr-tabular truncate">
                      {deal.distance > 0 ? `${deal.distance} km · ` : ""}
                      {deal.duration_hours} giờ
                    </p>
                    <span
                      className={`text-xs font-medium sr-tabular ${
                        deal.remaining_slots <= 4
                          ? "text-[var(--sr-urgent-ink)]"
                          : "text-[var(--sr-accent)]"
                      }`}
                    >
                      Còn {deal.remaining_slots}/{deal.max_capacity} suất ưu đãi
                    </span>
                  </div>
                </div>

                <div className="sr-home-flash-side">
                  <div className="text-right">
                    <div className="text-base font-bold text-[var(--sr-accent)] sr-tabular leading-tight">
                      {formatMoney(deal.promo_price)}
                    </div>
                    {deal.price > deal.promo_price && (
                      <div className="text-[11px] line-through text-[var(--sr-text-muted)] sr-tabular">
                        {formatMoney(deal.price)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="sr-btn sr-btn-primary sr-btn-sm"
                    disabled={isLiveFlash && deal.remaining_slots === 0}
                    onClick={() => navigate("/dashboard/flash-sale")}
                  >
                    {isUpcomingFlash ? "Xem lịch" : deal.remaining_slots === 0 ? "Hết suất" : "Giữ suất"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Khu vực 3: Lịch khởi hành 7 ngày tới & Hoạt động và gợi ý nhanh */}
      <section className="sr-home-bottom-grid" aria-label="Lịch khởi hành và hoạt động gợi ý">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="sr-home-section-head">
            <h2 className="sr-h2">Lịch khởi hành 7 ngày tới</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/dashboard/trekking")}
            >
              <span>Tất cả tuyến</span>
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-home-departures-card">
            <div className="sr-table-wrap">
              <table className="sr-home-table">
                <caption className="sr-only">Lịch khởi hành các tuyến trekking Sơn Trà</caption>
                <thead>
                  <tr>
                    <th scope="col">Tuyến trekking</th>
                    <th scope="col" className="sr-hide-mobile">Khởi hành</th>
                    <th scope="col" className="sr-hide-mobile">Chỗ trống</th>
                    <th scope="col">Giá vé</th>
                    <th scope="col" className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [0, 1, 2].map((idx) => (
                      <tr key={`row-skeleton-${idx}`} aria-busy="true">
                        <td><div className="h-4 w-44 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td className="sr-hide-mobile"><div className="h-4 w-24 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td className="sr-hide-mobile"><div className="h-5 w-20 rounded-full bg-stone-200/70 animate-pulse" /></td>
                        <td><div className="h-4 w-20 rounded bg-stone-200/70 animate-pulse" /></td>
                        <td><div className="h-8 w-16 rounded bg-stone-200/70 animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredDepartures.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-[var(--sr-text-muted)]">
                        {globalSearch.trim()
                          ? "Không tìm thấy tuyến phù hợp với từ khóa của bạn."
                          : "Chưa có lịch khởi hành nào."}
                      </td>
                    </tr>
                  ) : (
                    filteredDepartures.map((tour) => {
                      const slotStateClass =
                        tour.remaining_slots === 0
                          ? "is-full"
                          : tour.remaining_slots <= 4
                            ? "is-low"
                            : "";
                      return (
                        <tr key={`row-${tour.id}`}>
                          <td>
                            <div className="font-semibold text-[var(--sr-text-primary)] leading-snug">
                              {tour.title}
                            </div>
                            <div className="text-xs text-[var(--sr-text-muted)] sr-tabular mt-0.5">
                              {tour.distance} km · {tour.duration_hours} giờ
                              <span className="md:hidden"> · {tour.next_departure || "Cuối tuần"}</span>
                            </div>
                          </td>
                          <td className="sr-hide-mobile sr-tabular text-[var(--sr-text-secondary)]">
                            {tour.next_departure || "Cuối tuần"}
                          </td>
                          <td className="sr-hide-mobile">
                            <span className={`sr-slot-pill sr-tabular ${slotStateClass}`}>
                              <span className="sr-slot-dot" aria-hidden="true" />
                              <span>
                                {tour.remaining_slots === 0
                                  ? "Hết chỗ"
                                  : `${tour.remaining_slots}/${tour.max_capacity} chỗ`}
                              </span>
                            </span>
                          </td>
                          <td className="sr-tabular font-semibold text-[var(--sr-text-primary)] whitespace-nowrap">
                            {formatMoney(tour.promo_price)}
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="sr-btn sr-btn-secondary sr-btn-sm sr-home-book-btn"
                              disabled={tour.remaining_slots === 0}
                              onClick={() => navigate(`/dashboard/trekking/${tour.id}`, { state: { tour } })}
                            >
                              {tour.remaining_slots === 0 ? "Hết chỗ" : "Đặt vé"}
                            </button>
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
            <h2 className="sr-h2">Hoạt động và gợi ý nhanh</h2>
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate("/dashboard/assistant")}
            >
              <span>Hỏi Trợ lý AI</span>
              <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="sr-home-quick-card">
            <button
              type="button"
              className="sr-home-quick-row"
              onClick={() => navigate("/dashboard/inbox")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="sr-home-icon-box" aria-hidden="true">
                  <MessageSquare size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
                    Phòng chat chuyến đi
                  </div>
                  <div className="text-xs text-[var(--sr-text-muted)] mt-0.5 leading-snug">
                    Trao đổi trực tiếp với hướng dẫn viên và đoàn trekking
                  </div>
                </div>
              </div>
              <span className="sr-home-quick-cta">
                <span>Mở chat</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              className="sr-home-quick-row"
              onClick={() => navigate("/dashboard/marketplace")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="sr-home-icon-box" aria-hidden="true">
                  <Ticket size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
                    Kho voucher đổi thưởng
                  </div>
                  <div className="text-xs text-[var(--sr-text-muted)] mt-0.5 leading-snug">
                    Đổi điểm RE-Points lấy mã giảm giá vé đặt tour
                  </div>
                </div>
              </div>
              <span className="sr-home-quick-cta">
                <span>Xem mã</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              className="sr-home-quick-row"
              onClick={() => navigate("/dashboard/assistant")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="sr-home-icon-box" aria-hidden="true">
                  <Sparkles size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
                    Gợi ý AI: Tour nửa ngày dưới 400k
                  </div>
                  <div className="text-xs text-[var(--sr-text-muted)] mt-0.5 leading-snug">
                    Nhận lịch trình phù hợp cho nhóm bạn hoặc gia đình
                  </div>
                </div>
              </div>
              <span className="sr-home-quick-cta">
                <span>Hỏi ngay</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
