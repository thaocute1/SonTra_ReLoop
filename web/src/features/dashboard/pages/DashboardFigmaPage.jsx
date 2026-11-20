import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import { PageHeader } from "../../../components/ui/SaasPrimitives";

const CURATED_TRAILS = [
  {
    id: 1,
    title: "Chinh phục Đỉnh Bàn Cờ: Rừng sương sớm",
    vendor_name: "Sơn Trà Eco-Guide",
    rating: 4.9,
    total_reviews: 42,
    distance: 4.2,
    duration_hours: 2.5,
    difficulty_label: "Mức Khá",
    price: 450000,
    promo_price: 382500,
    discount: 15,
    remaining_slots: 6,
    max_capacity: 20,
    next_departure: "22/11 · 05:30",
    cover_image_url: "/images/trails/dinh-ban-co.jpg",
    fallback_image: "/images/trails/dinh-ban-co.jpg",
  },
  {
    id: 2,
    title: "Bãi Bấc: Cây Đa Di Sản",
    vendor_name: "Đà Nẵng Green Trek",
    rating: 4.8,
    total_reviews: 31,
    distance: 3.1,
    duration_hours: 2.0,
    difficulty_label: "Mức Dễ",
    price: 400000,
    promo_price: 320000,
    discount: 20,
    remaining_slots: 4,
    max_capacity: 15,
    next_departure: "23/11 · 07:00",
    cover_image_url: "/images/trails/bai-bac.jpg",
    fallback_image: "/images/trails/bai-bac.jpg",
  },
  {
    id: 3,
    title: "Mũi Nghê: Bình minh biển Đông",
    vendor_name: "Hải Đăng Trail",
    rating: 4.9,
    total_reviews: 19,
    distance: 5.4,
    duration_hours: 3.5,
    difficulty_label: "Thử thách",
    price: 625000,
    promo_price: 550000,
    discount: 12,
    remaining_slots: 5,
    max_capacity: 12,
    next_departure: "24/11 · 05:00",
    cover_image_url: "/images/trails/mui-nghe.jpg",
    fallback_image: "/images/trails/mui-nghe.jpg",
  },
];

const DEFAULT_FLASH_SECONDS = 2 * 3600 + 48 * 60 + 15;

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const getDifficultyLabel = (level, fallback) => {
  if (level === "easy") return "Mức Dễ";
  if (level === "moderate") return "Mức Khá";
  if (level === "challenging") return "Thử thách";
  return fallback;
};

export default function DashboardFigmaPage() {
  const navigate = useNavigate();
  const { points = 0 } = useUserEco();

  const [rows, setRows] = useState([]);
  const [flashData, setFlashData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashSeconds, setFlashSeconds] = useState(DEFAULT_FLASH_SECONDS);

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

  useEffect(() => {
    const serverSeconds = Number(flashData?.session?.time_remaining_seconds);
    setFlashSeconds(serverSeconds > 0 ? serverSeconds : DEFAULT_FLASH_SECONDS);
  }, [flashData?.session?.id, flashData?.session?.time_remaining_seconds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlashSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tours = useMemo(() => {
    const sourceRows = rows.length > 0 ? rows : CURATED_TRAILS;
    return sourceRows.map((live, index) => {
      const fallback = CURATED_TRAILS[index % CURATED_TRAILS.length];
      const basePrice = Number(live.price) || fallback.price;
      const flashItem =
        flashData?.session_type === "live"
          ? flashData.session?.items?.find((item) => Number(item.tour_id) === Number(live.id))
          : null;
      const discount = flashItem
        ? Number(flashItem.discount_percent) || fallback.discount
        : Number(live.discount) || fallback.discount;
      const promoPrice = flashItem
        ? Number(flashItem.promo_price)
        : live.promo_price || Math.round(basePrice * (1 - discount / 100));
      const maxCap = Number(live.max_capacity) || fallback.max_capacity;
      const remaining =
        live.available_slots !== null && live.available_slots !== undefined
          ? Number(live.available_slots)
          : fallback.remaining_slots;

      return {
        ...fallback,
        ...live,
        id: live.id || fallback.id,
        title: live.title || fallback.title,
        vendor_name: live.vendor_name || fallback.vendor_name,
        rating: Number(live.avg_rating) || fallback.rating,
        total_reviews: Number(live.total_reviews) || fallback.total_reviews,
        distance: Number(live.distance || live.route?.total_distance_km) || fallback.distance,
        duration_hours: Number(live.duration_hours) || fallback.duration_hours,
        difficulty_label: getDifficultyLabel(live.difficulty_level, fallback.difficulty_label),
        price: basePrice,
        promo_price: promoPrice,
        discount,
        remaining_slots: Math.max(0, remaining),
        max_capacity: Math.max(1, maxCap),
        cover_image_url: live.cover_image_url || fallback.cover_image_url,
        fallback_image: fallback.fallback_image,
      };
    });
  }, [rows, flashData]);

  const leadTour = tours[0] || CURATED_TRAILS[0];
  const flashDeals = tours.slice(1, 3);
  const upcomingBooking = bookings.find((b) => b.status === "confirmed") || bookings[0] || null;
  const countdownText = formatCountdown(flashSeconds);

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
            Đơn đặt của tôi ({bookings.length || 2})
          </button>
        }
      />

      {/* Band 1: Borderless Editorial Feature & Key Metrics */}
      <section className="sr-hero-split" aria-label="Tuyến tiêu điểm và chỉ số cá nhân">
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
                  onClick={() => navigate(`/dashboard/trekking/${leadTour.id}`)}
                >
                  Xem lịch trình
                </button>
                <button
                  type="button"
                  className="sr-btn sr-btn-primary"
                  disabled={leadTour.remaining_slots === 0}
                  onClick={() => navigate(`/dashboard/trekking/${leadTour.id}`)}
                >
                  <span>{leadTour.remaining_slots === 0 ? "Hết chỗ" : "Đặt chuyến này"}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </article>

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
              {Number(points || 0).toLocaleString("vi-VN")}
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
            {upcomingBooking ? (
              <>
                <strong className="sr-h2">{upcomingBooking.tour_title}</strong>
                <span className="sr-feature-meta">
                  {upcomingBooking.scheduled_date || "22/11"} · {upcomingBooking.adults_count || 1} khách · Đã xác nhận
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
            <span className="sr-urgent-text sr-tabular" role="timer" aria-live="off">
              Kết thúc sau {countdownText}
            </span>
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
          {flashDeals.map((deal) => (
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
          ))}
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
                {(loading ? CURATED_TRAILS : tours).slice(0, 4).map((tour) => (
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
                        onClick={() => navigate(`/dashboard/trekking/${tour.id}`)}
                      >
                        Đặt vé
                      </button>
                    </td>
                  </tr>
                ))}
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
