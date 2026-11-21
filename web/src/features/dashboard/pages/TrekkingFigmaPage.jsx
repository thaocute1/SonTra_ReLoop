import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Minus, Navigation, Plus, X } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import rewardService from "../../../services/rewardService";
import RouteMapPreview from "../../../components/common/RouteMapPreview";
import PayOSPaymentModal from "../components/PayOSPaymentModal";
import { extractErrorMessage } from "../../../utils/apiError";
import { paypalService, openPayPalCheckout } from "../../../services/paypalService";
import { PageHeader, SaasSelect } from "../../../components/ui/SaasPrimitives";

const DEFAULT_TRAIL_IMAGE = "/images/trails/dinh-ban-co.jpg";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "easy", label: "Mức Dễ" },
  { value: "moderate", label: "Mức Khá" },
  { value: "challenging", label: "Thử thách" },
  { value: "gps", label: "Có GPS Checkpoint" },
];
const SORT_OPTIONS = [
  { value: "popular", label: "Phổ biến nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
];
const FLASH_SLOTS = ["07:00", "09:00", "11:00", "13:00", "15:00"];

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

export default function TrekkingFigmaPage({ flashOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { globalSearch = "" } = useOutletContext() || {};
  const { tourId } = useParams();
  const { user, points = 0 } = useUserEco();
  const [searchParams] = useSearchParams();
  const initialTour = tourId ? location.state?.tour || null : null;

  const [filter, setFilter] = useState(searchParams.get("gps") ? "gps" : "all");
  const [sortBy, setSortBy] = useState("popular");
  const [rows, setRows] = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [view, setView] = useState(() => (tourId ? "detail" : "list"));
  const [selected, setSelected] = useState(() => initialTour);
  const [people, setPeople] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("payos");
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    pickup_location: "Trung tâm Đà Nẵng",
    special_notes: "",
  });
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [payosOpen, setPayosOpen] = useState(false);

  const [myVouchers, setMyVouchers] = useState([]);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState("");
  const [usePointsDiscount, setUsePointsDiscount] = useState(false);

  const [flashData, setFlashData] = useState(null);
  const [loadingFlash, setLoadingFlash] = useState(true);
  const [flashSeconds, setFlashSeconds] = useState(0);
  const [selectedFlashSlot, setSelectedFlashSlot] = useState(null);
  const [remindedSlots, setRemindedSlots] = useState([]);

  useEffect(() => {
    let active = true;
    paypalService.config().then((c) => { if (active) setPaypalConfig(c); }).catch(() => {});
    rewardService.fetchMyVouchers().then((v) => {
      if (active && Array.isArray(v)) setMyVouchers(v);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get("/tours/")
      .then((res) => {
        const data = res.data?.status === "success" ? res.data?.data : res.data;
        if (mounted && Array.isArray(data)) setRows(data);
      })
      .catch(() => {
        if (mounted) setRows([]);
      })
      .finally(() => {
        if (mounted) setLoadingTours(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    flashSaleService
      .getActiveSession()
      .then((data) => {
        if (mounted) setFlashData(data);
      })
      .catch(() => {
        if (mounted) setFlashData(null);
      })
      .finally(() => {
        if (mounted) setLoadingFlash(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setFlashSeconds(Number(flashData?.session?.time_remaining_seconds || 0));
  }, [flashData]);

  useEffect(() => {
    if (flashSeconds <= 0) return undefined;
    const timer = window.setInterval(
      () => setFlashSeconds((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [flashData?.session?.id, flashSeconds > 0]);

  useEffect(() => {
    setBookingForm((current) => ({
      ...current,
      customer_name: current.customer_name || user?.name || "",
      customer_phone: current.customer_phone || user?.phone || "",
      customer_email: current.customer_email || user?.email || "",
    }));
  }, [user]);

  useEffect(() => {
    if (!tourId) {
      setView((current) => (current === "success" ? current : "list"));
      return undefined;
    }
    let mounted = true;
    setView("detail");
    const passedTour = location.state?.tour;
    if (passedTour && String(passedTour.id) === String(tourId)) {
      setSelected(passedTour);
      setSelectedSchedule(
        passedTour.schedules?.find(
          (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
        ) || null
      );
    }
    api
      .get(`/tours/${encodeURIComponent(tourId)}/`)
      .then((res) => {
        if (!mounted) return;
        const detail = res.data?.status === "success" ? res.data.data : res.data;
        if (!detail) return;
        const hydrated = {
          ...(passedTour || {}),
          ...detail,
          distance: detail.route?.total_distance_km || passedTour?.route?.total_distance_km || 0,
        };
        setSelected(hydrated);
        setSelectedSchedule(
          detail.schedules?.find(
            (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
          ) || null
        );
      })
      .catch(() => {
        if (mounted && !passedTour) {
          setView("list");
        }
      });
    return () => {
      mounted = false;
    };
  }, [tourId, location.state]);

  const tours = useMemo(() => {
    return rows.map((live) => {
      const original = Number(live.price || 0);
      const canShowEnded = flashData?.session_type === "ended";
      const flashItem =
        flashOnly && ["live", "upcoming", "ended"].includes(flashData?.session_type)
          ? flashData.session?.items?.find(
              (item) =>
                Number(item.tour_id) === Number(live.id) &&
                item.status === "approved" &&
                (canShowEnded || !item.is_sold_out)
            )
          : null;
      const maxCap = Number(live.max_capacity || 0);
      const rawRemaining = live.available_slots ?? live._available_slots ?? live.remaining_slots ?? maxCap;
      return {
        ...live,
        title: live.title || "",
        vendor_name: live.vendor_name || "Đơn vị tổ chức",
        cover_image_url: live.cover_image_url || DEFAULT_TRAIL_IMAGE,
        price: original,
        promo_price: flashItem ? Number(flashItem.promo_price) : live.promo_price || original,
        discount: flashItem ? Number(flashItem.discount_percent) : Number(live.discount || 0),
        campaign_item_id: flashItem?.id || null,
        distance: Number(live.route?.total_distance_km || live.distance || 0),
        avg_rating: Number(live.avg_rating || 0),
        remaining_slots: Math.max(0, Number(rawRemaining || 0)),
      };
    });
  }, [rows, flashData, flashOnly]);

  const visibleTours = useMemo(() => {
    const filtered = tours.filter((tour) => {
      if (globalSearch && !tour.title.toLowerCase().includes(globalSearch.toLowerCase())) {
        return false;
      }
      if (flashOnly) return Boolean(tour.campaign_item_id) || Number(tour.discount) > 0;
      if (["easy", "moderate", "challenging"].includes(filter)) {
        return tour.difficulty_level === filter;
      }
      if (filter === "gps") {
        return Array.isArray(tour.checkpoints) && tour.checkpoints.length > 0;
      }
      return true;
    });

    if (sortBy === "price_asc") return [...filtered].sort((a, b) => a.promo_price - b.promo_price);
    if (sortBy === "price_desc") return [...filtered].sort((a, b) => b.promo_price - a.promo_price);
    return filtered;
  }, [tours, globalSearch, flashOnly, filter, sortBy]);

  const isLiveFlash = flashData?.session_type === "live";
  const isUpcomingFlash = flashData?.session_type === "upcoming";
  const isEndedFlash = flashData?.session_type === "ended";
  const loadingList = loadingTours || (flashOnly && loadingFlash);

  const sessionSlotIndex = useMemo(() => {
    const start = flashData?.session?.start_time ? new Date(flashData.session.start_time) : null;
    const startHour = start && !Number.isNaN(start.getTime()) ? start.getHours() : 9;
    const exactIndex = FLASH_SLOTS.findIndex((slot) => Number(slot.slice(0, 2)) === startHour);
    return exactIndex >= 0 ? exactIndex : 1;
  }, [flashData?.session?.start_time]);

  const liveSlotIndex = useMemo(() => {
    if (isUpcomingFlash) return -1;
    if (isLiveFlash) return sessionSlotIndex;
    return FLASH_SLOTS.length;
  }, [isLiveFlash, isUpcomingFlash, sessionSlotIndex]);

  useEffect(() => {
    if (!flashOnly) return;
    const defaultIndex = isUpcomingFlash ? 0 : isEndedFlash ? sessionSlotIndex : Math.max(0, liveSlotIndex);
    setSelectedFlashSlot(FLASH_SLOTS[Math.min(defaultIndex, FLASH_SLOTS.length - 1)]);
  }, [flashOnly, flashData?.session?.id, isUpcomingFlash, isEndedFlash, liveSlotIndex, sessionSlotIndex]);

  const selectedSlotIndex = Math.max(
    0,
    FLASH_SLOTS.indexOf(selectedFlashSlot || FLASH_SLOTS[Math.max(0, liveSlotIndex)])
  );
  const flashMode =
    selectedSlotIndex < liveSlotIndex
      ? "expired"
      : selectedSlotIndex > liveSlotIndex || isUpcomingFlash
      ? "remind"
      : "book";
  const hasFlashSession = Boolean(flashData?.has_session && flashData?.session);
  const countdownValue = hasFlashSession
    ? flashSeconds > 0
      ? formatCountdown(flashSeconds)
      : flashData?.session?.countdown_text || null
    : null;

  const chooseTour = async (tour) => {
    setSelected(tour);
    setPeople(1);
    setBookingError("");
    setReceipt(null);
    const localSchedule =
      tour.schedules?.find(
        (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
      ) || null;
    setSelectedSchedule(localSchedule);
    try {
      const response = await api.get(`/tours/${tour.id}/`);
      const detail = response.data?.status === "success" ? response.data.data : response.data;
      if (detail) {
        const hydrated = {
          ...tour,
          ...detail,
          distance: detail.route?.total_distance_km || tour.distance,
        };
        setSelected(hydrated);
        setSelectedSchedule(
          detail.schedules?.find(
            (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
          ) || null
        );
      }
    } catch {
      // Keep list data visible when detail request fails.
    }
  };

  const openDetail = async (tour) => {
    await chooseTour(tour);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openBooking = async (tour, quantity = 1) => {
    await chooseTour(tour);
    setPeople(quantity);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateAndSubmitBooking = async () => {
    if (submitting) return;
    if (!selectedSchedule) {
      setBookingError("Tour này hiện chưa có lịch khởi hành còn chỗ từ máy chủ.");
      return;
    }
    if (!bookingForm.customer_name.trim()) {
      setBookingError("Vui lòng nhập họ và tên người đặt.");
      return;
    }
    const phoneDigits = bookingForm.customer_phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setBookingError("Số điện thoại phải có từ 9 đến 15 chữ số.");
      return;
    }
    if (people > Number(selectedSchedule.remaining_slots || 0)) {
      setBookingError(`Chuyến này chỉ còn ${selectedSchedule.remaining_slots} chỗ.`);
      return;
    }

    setSubmitting(true);
    setBookingError("");
    try {
      let data = receipt;
      if (!data) {
        const response = await api.post("/orders/booking/", {
          tour_id: selected.id,
          schedule_id: selectedSchedule.id,
          adults_count: people,
          children_count: 0,
          customer_name: bookingForm.customer_name.trim(),
          customer_phone: bookingForm.customer_phone.trim(),
          customer_email: bookingForm.customer_email.trim(),
          pickup_location: bookingForm.pickup_location.trim() || "Trung tâm Đà Nẵng",
          payment_method: paymentMethod,
          special_notes: bookingForm.special_notes.trim(),
          campaign_item_id: selected.campaign_item_id,
          voucher_code: selectedVoucherCode || undefined,
        });
        data = response.data?.status === "success" ? response.data.data : response.data;
        setReceipt(data);
      }

      if (paymentMethod === "paypal") {
        openPayPalCheckout(await paypalService.create(data.order_id));
        return;
      }
      if (data?.payos?.qrCode || data?.payos?.checkoutUrl) {
        setPayosOpen(true);
      } else {
        setBookingError(
          data?.payment_error || "Đã giữ chỗ nhưng chưa tạo được mã PayOS. Vui lòng kiểm tra trong Đơn đặt của tôi."
        );
      }
    } catch (error) {
      setBookingError(
        extractErrorMessage(error, "Không thể tạo đơn đặt tour. Vui lòng kiểm tra đăng nhập và thử lại.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "success") {
    const total = Number(receipt?.total_price || selected.promo_price * people || 0);
    return (
      <div className="sr-page">
        <div className="sr-surface flex flex-col gap-4 max-w-2xl">
          <p className="sr-eyebrow">Thanh toán thành công</p>
          <h1 className="sr-h1">Đã kích hoạt chuyến đi của bạn</h1>
          <p className="sr-subtitle">
            Mã đơn #{receipt?.order_code || receipt?.id} · {selected.title} · {people} khách · Tổng thanh toán {money(total)}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              className="sr-btn sr-btn-primary"
              onClick={() => navigate("/dashboard/bookings")}
            >
              Xem trong Đơn đặt của tôi
            </button>
            <button
              type="button"
              className="sr-btn sr-btn-secondary"
              onClick={() => setView("list")}
            >
              Khám phá thêm tuyến
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "detail" && !selected) {
    return (
      <div className="sr-page" aria-busy="true" aria-label="Đang tải chi tiết đặt vé">
        <div className="h-5 w-40 rounded bg-stone-200/70 animate-pulse" />
        <div className="sr-detail-split">
          <div className="flex flex-col gap-5">
            <div className="sr-detail-hero bg-stone-200/70 animate-pulse" />
            <div className="h-7 w-2/3 rounded bg-stone-200/70 animate-pulse" />
            <div className="h-4 w-full rounded bg-stone-200/70 animate-pulse" />
          </div>
          <aside className="sr-surface flex flex-col gap-4">
            <div className="h-8 w-32 rounded bg-stone-200/70 animate-pulse" />
            <div className="h-24 w-full rounded bg-stone-200/70 animate-pulse" />
            <div className="h-10 w-full rounded bg-stone-200/70 animate-pulse" />
          </aside>
        </div>
      </div>
    );
  }

  if (view === "detail" && selected) {
    const schedules = (selected.schedules || []).filter(
      (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
    );
    const unitPrice = Number(
      selected.campaign_item_id ? selected.promo_price : selectedSchedule?.price || selected.price || 0
    );
    const subtotal = unitPrice * people;
    const voucherDiscount = selectedVoucherCode ? Math.round(subtotal * 0.15) : 0;
    const pointsDiscount = usePointsDiscount && points >= 200 ? 40000 : 0;
    const finalTotal = Math.max(0, subtotal - voucherDiscount - pointsDiscount);
    const voucherOptions = [
      { value: "", label: "Không dùng voucher" },
      ...myVouchers.map((v) => ({ value: v.code || String(v.id), label: v.title || v.code })),
    ];

    return (
      <div className="sr-page">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="sr-btn sr-btn-ghost"
            onClick={() => (tourId ? navigate("/dashboard/trekking") : setView("list"))}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Quay lại danh sách tour</span>
          </button>
          <CheckpointMapButton tour={selected} />
        </div>

        <div className="sr-split-detail">
          <div className="flex flex-col gap-7 min-w-0">
            <img
              src={selected.cover_image_url}
              alt={selected.title}
              className="w-full h-72 object-cover rounded-xl bg-[var(--sr-bg-subtle)]"
            />

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="sr-eyebrow">
                  {selected.vendor_name || "Sơn Trà ReLoop"} · {selected.difficulty_label || "Mức Khá"}
                </span>
                <span className="text-xs text-[var(--sr-text-secondary)]">
                  {selected.avg_rating || 4.8} ({selected.total_reviews || 0} đánh giá)
                </span>
              </div>
              <h1 className="sr-h1">{selected.title}</h1>
              <p className="sr-subtitle">
                {selected.description ||
                  "Hành trình trekking khám phá rừng nguyên sinh bán đảo Sơn Trà cùng hướng dẫn viên địa phương."}
              </p>
            </div>

            <div className="sr-specs-strip">
              <div>
                <div className="text-xs text-[var(--sr-text-muted)]">Quãng đường</div>
                <div className="font-semibold sr-tabular">{selected.distance || 4.2} km</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sr-text-muted)]">Thời lượng</div>
                <div className="font-semibold sr-tabular">{selected.duration_hours || 2.5} giờ</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sr-text-muted)]">Độ cao tăng</div>
                <div className="font-semibold sr-tabular">240 m</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sr-text-muted)]">Điểm thưởng</div>
                <div className="font-semibold sr-tabular text-[var(--sr-accent)]">+80 RE-Points</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sr-text-muted)]">Hoàn hủy</div>
                <div className="font-semibold">Miễn phí 24h</div>
              </div>
            </div>

            <section className="flex flex-col gap-2" aria-label="Lịch trình dự kiến">
              <h2 className="sr-h2">Lịch trình dự kiến</h2>
              {[
                ["05:30", "Tập kết tại điểm hẹn, nhận gậy trekking và nước điện giải."],
                ["06:30", "Di chuyển theo tuyến đường mòn rừng nguyên sinh và điểm dừng ngắm cảnh."],
                ["08:30", "Nghỉ chân, tổng kết hành trình và ghi nhận điểm RE-Points."],
              ].map(([time, desc]) => (
                <div key={time} className="sr-itinerary-row">
                  <span className="text-xs font-semibold text-[var(--sr-accent)] sr-tabular shrink-0 w-12">
                    {time}
                  </span>
                  <span className="text-sm text-[var(--sr-text-secondary)]">{desc}</span>
                </div>
              ))}
            </section>
          </div>

          {/* Sticky Booking & Voucher Checkout Panel */}
          <aside className="sr-surface flex flex-col gap-4" aria-label="Đặt chỗ và thanh toán">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold sr-tabular">{money(unitPrice)}</span>
              <span className="text-xs text-[var(--sr-text-muted)]">mỗi khách</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Chọn chuyến khởi hành
              </span>
              {schedules.length > 0 ? (
                schedules.map((sch) => {
                  const isActive = String(selectedSchedule?.id) === String(sch.id);
                  return (
                    <button
                      key={sch.id}
                      type="button"
                      onClick={() => setSelectedSchedule(sch)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-xs cursor-pointer ${
                        isActive
                          ? "bg-[var(--sr-accent-soft)] border-[var(--sr-accent)] text-[var(--sr-accent)] font-semibold"
                          : "bg-[var(--sr-bg-surface)] border-[var(--sr-border)] text-[var(--sr-text-primary)]"
                      }`}
                    >
                      <span>
                        {sch.formatted_date || sch.departure_date} · {String(sch.start_time || "").slice(0, 5)}
                      </span>
                      <span className="sr-tabular">Còn {sch.remaining_slots} chỗ</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2.5 rounded-lg border border-[var(--sr-border)] text-xs text-[var(--sr-text-muted)]">
                  Chưa có lịch khởi hành còn chỗ từ máy chủ
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--sr-border)]">
              <span className="text-xs font-medium">Số lượng khách</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Giảm số lượng khách"
                  className="sr-btn sr-btn-secondary sr-btn-sm"
                  onClick={() => setPeople((p) => Math.max(1, p - 1))}
                >
                  <Minus size={13} aria-hidden="true" />
                </button>
                <span className="text-sm font-semibold sr-tabular">{people}</span>
                <button
                  type="button"
                  aria-label="Tăng số lượng khách"
                  className="sr-btn sr-btn-secondary sr-btn-sm"
                  onClick={() =>
                    setPeople((p) =>
                      Math.min(Math.max(1, Number(selectedSchedule?.remaining_slots || 10)), p + 1)
                    )
                  }
                >
                  <Plus size={13} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Ưu đãi & Điểm RE-Points
              </span>
              <SaasSelect
                label="Voucher"
                value={selectedVoucherCode}
                options={voucherOptions}
                onChange={setSelectedVoucherCode}
                className="w-full"
              />
              <button
                type="button"
                role="switch"
                aria-checked={usePointsDiscount}
                disabled={points < 200}
                onClick={() => setUsePointsDiscount((v) => !v)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] text-xs cursor-pointer disabled:opacity-50"
              >
                <span>Dùng 200 RE-Points (-40.000 đ)</span>
                <span className="font-semibold text-[var(--sr-accent)]">
                  {usePointsDiscount ? "Đang bật" : "Áp dụng"}
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
                <span>Họ và tên người đặt</span>
                <input
                  type="text"
                  value={bookingForm.customer_name}
                  onChange={(e) => setBookingForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Nguyễn Minh Anh"
                  className="px-3 py-2 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  value={bookingForm.customer_phone}
                  onChange={(e) => setBookingForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="0905 xxx xxx"
                  className="px-3 py-2 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("payos")}
                className={`py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  paymentMethod === "payos"
                    ? "bg-[var(--sr-accent-soft)] border-[var(--sr-accent)] text-[var(--sr-accent)] font-semibold"
                    : "border-[var(--sr-border)] text-[var(--sr-text-secondary)]"
                }`}
              >
                PayOS VietQR
              </button>
              <button
                type="button"
                disabled={!paypalConfig?.available}
                onClick={() => setPaymentMethod("paypal")}
                className={`py-2 rounded-lg border text-xs font-medium cursor-pointer disabled:opacity-50 ${
                  paymentMethod === "paypal"
                    ? "bg-[var(--sr-accent-soft)] border-[var(--sr-accent)] text-[var(--sr-accent)] font-semibold"
                    : "border-[var(--sr-border)] text-[var(--sr-text-secondary)]"
                }`}
              >
                PayPal / Stripe
              </button>
            </div>

            {bookingError && (
              <p className="text-xs text-[var(--sr-urgent-ink)]" role="alert">
                {bookingError}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--sr-border)]">
              <div className="flex justify-between text-xs text-[var(--sr-text-muted)]">
                <span>Tạm tính ({people} khách)</span>
                <span className="sr-tabular">{money(subtotal)}</span>
              </div>
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-xs text-[var(--sr-accent)]">
                  <span>Voucher {selectedVoucherCode}</span>
                  <span className="sr-tabular">-{money(voucherDiscount)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-xs text-[var(--sr-accent)]">
                  <span>Quy đổi 200 RE-Points</span>
                  <span className="sr-tabular">-{money(pointsDiscount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 border-t border-[var(--sr-border)]">
                <span className="text-sm font-semibold">Tổng thanh toán</span>
                <span className="text-xl font-semibold sr-tabular">{money(finalTotal)}</span>
              </div>

              <button
                type="button"
                className="sr-btn sr-btn-primary sr-btn-lg sr-btn-block mt-1"
                disabled={submitting || !selectedSchedule}
                onClick={validateAndSubmitBooking}
              >
                {submitting ? "Đang xử lý đơn đặt..." : "Xác nhận & Thanh toán"}
              </button>
            </div>
          </aside>
        </div>

        <PayOSPaymentModal
          isOpen={payosOpen}
          paymentData={receipt}
          onClose={() => setPayosOpen(false)}
          onPaymentSuccess={(paidReceipt) => {
            setReceipt(paidReceipt);
            setPayosOpen(false);
            setView("success");
          }}
        />
      </div>
    );
  }

  if (flashOnly) {
    const heroDeal = visibleTours[0] || null;
    const otherDeals = visibleTours.slice(1);
    const bookedCount = heroDeal ? Math.max(0, Number(heroDeal.booked_count || 0)) : 0;
    const maxCap = heroDeal ? Math.max(1, Number(heroDeal.max_capacity || 1)) : 1;
    const fillPct = Math.min(100, Math.round((bookedCount / maxCap) * 100));

    return (
      <div className="sr-page">
        <PageHeader
          title="Suất khởi hành giờ chót"
          subtitle="Giá ưu đãi theo số chỗ trống thực tế từ các đơn vị lữ hành Sơn Trà"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="sr-tabs" role="tablist" aria-label="Phiên Flash sale">
                {FLASH_SLOTS.slice(0, 3).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    role="tab"
                    aria-selected={selectedFlashSlot === slot}
                    onClick={() => setSelectedFlashSlot(slot)}
                    className={`sr-tab ${selectedFlashSlot === slot ? "is-selected" : ""}`}
                  >
                    Phiên {slot}
                  </button>
                ))}
              </div>
              {countdownValue && (
                <span className="sr-urgent-text text-sm sr-tabular" role="timer" aria-live="off">
                  Còn {countdownValue}
                </span>
              )}
            </div>
          }
        />

        {/* Editorial Hero Flash Deal */}
        {loadingList ? (
          <section className="sr-hero-feature" aria-busy="true" aria-label="Đang tải ưu đãi Flash Sale">
            <div className="sr-hero-photo animate-pulse bg-stone-200/70" />
            <div className="sr-hero-copy">
              <div className="h-6 w-2/3 rounded bg-stone-200/70 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-stone-200/70 animate-pulse" />
            </div>
          </section>
        ) : !heroDeal ? (
          <section className="sr-surface p-8 text-center">
            <h2 className="sr-h2">Chưa có suất Flash Sale nào</h2>
            <p className="sr-feature-meta mt-1">Hiện không có tour nào đang mở ưu đãi trong phiên này.</p>
          </section>
        ) : (
        <section className="sr-hero-feature" aria-label="Ưu đãi nổi bật nhất phiên">
          <img
            src={heroDeal.cover_image_url}
            alt={heroDeal.title}
            className="sr-hero-photo"
          />
          <div className="sr-hero-copy">
            <div className="flex flex-col gap-2">
              <p className="sr-urgent-text text-xs">
                Ưu đãi sâu nhất phiên · Giảm {heroDeal.discount || 0}%
              </p>
              <h2 className="sr-feature-title">{heroDeal.title}</h2>
              <p className="sr-feature-meta">
                {heroDeal.vendor_name} · {heroDeal.distance} km · {heroDeal.duration_hours} giờ · Đã đặt {bookedCount}/{maxCap} suất
              </p>
              <div className="sr-progress-track mt-1">
                <div className="sr-progress-fill is-urgent" style={{ width: `${fillPct}%` }} />
              </div>
            </div>

            <div className="sr-feature-footer">
              <div>
                <span className="sr-price-old sr-tabular">{money(heroDeal.price)}</span>
                <span className="sr-price-now sr-tabular">{money(heroDeal.promo_price)}</span>
              </div>
              {flashMode === "remind" ? (
                <button
                  type="button"
                  className="sr-btn sr-btn-secondary"
                  onClick={() =>
                    setRemindedSlots((prev) => [...new Set([...prev, `${selectedFlashSlot}-${heroDeal.id}`])])
                  }
                >
                  {remindedSlots.includes(`${selectedFlashSlot}-${heroDeal.id}`)
                    ? "Đã bật nhắc lịch"
                    : "Nhắc tôi khi mở phiên"}
                </button>
              ) : (
                <button
                  type="button"
                  className="sr-btn sr-btn-primary"
                  disabled={flashMode === "expired"}
                  onClick={() => openBooking(heroDeal, 1)}
                >
                  {flashMode === "expired" ? "Phiên đã kết thúc" : "Đặt suất ưu đãi"}
                </button>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Other Session Deals Table */}
        <section className="flex flex-col gap-3 pt-4 border-t border-[var(--sr-border)]">
          <h2 className="sr-h2">Các chuyến khởi hành khác trong phiên</h2>
          <div className="sr-table-wrap">
            <table className="sr-table">
              <caption className="sr-only">Danh sách các suất Flash Sale đang mở</caption>
              <thead>
                <tr>
                  <th scope="col">Tuyến đường</th>
                  <th scope="col" className="sr-hide-mobile">Cự ly</th>
                  <th scope="col" className="sr-hide-mobile">Chỗ còn lại</th>
                  <th scope="col">Mức giảm</th>
                  <th scope="col">Giá ưu đãi</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  [0, 1].map((idx) => (
                    <tr key={`fs-skeleton-${idx}`} aria-busy="true">
                      <td><div className="h-4 w-44 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td className="sr-hide-mobile"><div className="h-4 w-16 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td className="sr-hide-mobile"><div className="h-4 w-16 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td><div className="h-4 w-12 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td><div className="h-4 w-20 rounded bg-stone-200/70 animate-pulse" /></td>
                      <td><div className="h-7 w-16 rounded bg-stone-200/70 animate-pulse" /></td>
                    </tr>
                  ))
                ) : (otherDeals.length ? otherDeals : visibleTours).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-[var(--sr-text-muted)]">
                      Chưa có suất Flash Sale nào trong phiên này.
                    </td>
                  </tr>
                ) : (
                (otherDeals.length ? otherDeals : visibleTours).map(
                  (deal) => (
                    <tr key={`fs-${deal.id}`}>
                      <td className="font-medium text-[var(--sr-text-primary)]">{deal.title}</td>
                      <td className="sr-hide-mobile sr-tabular">{deal.distance} km</td>
                      <td className="sr-hide-mobile sr-tabular">{deal.remaining_slots} chỗ</td>
                      <td className="sr-urgent-text sr-tabular">-{deal.discount || 0}%</td>
                      <td className="font-semibold text-[var(--sr-text-primary)] sr-tabular">
                        {money(deal.promo_price)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="sr-btn sr-btn-secondary sr-btn-sm"
                          onClick={() => openBooking(deal, 1)}
                        >
                          Giữ suất
                        </button>
                      </td>
                    </tr>
                  )
                )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // Mode: List / Tour Explorer (02 · Khám phá Tour)
  const leadExploreTour = visibleTours[2] || visibleTours[0] || null;
  const secondaryExploreTours = leadExploreTour
    ? visibleTours.filter((t) => t.id !== leadExploreTour.id).slice(0, 2)
    : [];

  return (
    <div className="sr-page">
      <PageHeader
        title="Tuyến trekking tại Sơn Trà"
        subtitle={`${visibleTours.length} hành trình đã xác minh cùng hướng dẫn viên địa phương`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaasSelect
              label="Độ khó"
              value={filter}
              options={DIFFICULTY_OPTIONS}
              onChange={setFilter}
            />
            <SaasSelect
              label="Sắp xếp"
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={setSortBy}
            />
          </div>
        }
      />

      {/* Asymmetric Photography Showcase */}
      {visibleTours.length > 0 && (
        <section className="sr-photo-showcase" aria-label="Tuyến nổi bật">
          <article
            className="flex flex-col gap-3 cursor-pointer"
            onClick={() => openDetail(leadExploreTour)}
          >
            <img
              src={leadExploreTour.cover_image_url}
              alt={leadExploreTour.title}
              className="sr-photo-lead-img"
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="sr-h2">{leadExploreTour.title}</h2>
                <p className="sr-feature-meta">
                  {leadExploreTour.distance} km · {leadExploreTour.duration_hours} giờ · {leadExploreTour.vendor_name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold sr-tabular">{money(leadExploreTour.promo_price)}</div>
                <span className="text-xs font-medium text-[var(--sr-accent)]">Xem chi tiết</span>
              </div>
            </div>
          </article>

          <div className="sr-secondary-list">
            {secondaryExploreTours.map((tour) => (
              <article
                key={`sec-${tour.id}`}
                className="sr-secondary-item"
                onClick={() => openDetail(tour)}
              >
                <img
                  src={tour.cover_image_url}
                  alt={tour.title}
                  className="sr-secondary-thumb"
                />
                <div className="flex flex-col justify-between py-0.5 min-w-0 flex-1">
                  <div>
                    <h3 className="sr-h2 truncate">{tour.title}</h3>
                    <p className="sr-feature-meta">
                      {tour.distance} km · {tour.duration_hours} giờ · Còn {tour.remaining_slots} chỗ
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold sr-tabular">{money(tour.promo_price)}</span>
                    <span className="text-xs font-medium text-[var(--sr-accent)]">Đặt tuyến</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Spacious All-Tours Table */}
      <section className="flex flex-col gap-3 pt-5 border-t border-[var(--sr-border)]">
        <h2 className="sr-h2">Tất cả tuyến đang mở đặt chỗ</h2>
        {loadingTours ? (
          <div className="sr-surface" role="status">
            Đang tải danh sách tuyến trekking...
          </div>
        ) : visibleTours.length === 0 ? (
          <div className="sr-surface">Không tìm thấy tuyến trekking phù hợp với bộ lọc.</div>
        ) : (
          <div className="sr-table-wrap">
            <table className="sr-table">
              <caption className="sr-only">Danh sách tuyến trekking tại Sơn Trà</caption>
              <thead>
                <tr>
                  <th scope="col">Tuyến đường và đơn vị</th>
                  <th scope="col" className="sr-hide-mobile">Độ khó</th>
                  <th scope="col" className="sr-hide-mobile">Cự ly / Thời gian</th>
                  <th scope="col" className="sr-hide-mobile">Trạng thái</th>
                  <th scope="col">Giá / người</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleTours.map((tour) => (
                  <tr key={tour.id}>
                    <td className="font-medium text-[var(--sr-text-primary)]">
                      {tour.title} · {tour.vendor_name}
                    </td>
                    <td className="sr-hide-mobile">{tour.difficulty_label || "Trung bình"}</td>
                    <td className="sr-hide-mobile sr-tabular">
                      {tour.distance} km · {tour.duration_hours} giờ
                    </td>
                    <td className="sr-hide-mobile text-[var(--sr-accent)] font-medium">
                      Còn {tour.remaining_slots} chỗ
                    </td>
                    <td className="font-semibold text-[var(--sr-text-primary)] sr-tabular">
                      {money(tour.promo_price)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sr-btn sr-btn-secondary sr-btn-sm"
                        onClick={() => openDetail(tour)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CheckpointMapButton({ tour }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeMap, setRouteMap] = useState(null);
  const checkpointCount = routeMap?.checkpoints?.length ?? tour?.checkpoints?.length ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const showMap = async () => {
    setOpen(true);
    if (routeMap || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/tours/${tour.id}/route-map/`);
      const data = response.data?.status === "success" ? response.data.data : response.data;
      setRouteMap(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể tải bản đồ tuyến lúc này.");
    } finally {
      setLoading(false);
    }
  };

  const checkpoints = routeMap?.checkpoints || tour?.checkpoints || [];
  const coordinates = routeMap?.coordinates || tour?.route?.coordinates || [];

  return (
    <>
      <button
        type="button"
        className="sr-btn sr-btn-secondary sr-btn-sm"
        onClick={showMap}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Navigation size={14} aria-hidden="true" />
        <span>{checkpointCount > 0 ? `Bản đồ tuyến (${checkpointCount} trạm)` : "Xem bản đồ tuyến"}</span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[var(--scrim-overlay,rgba(15,23,42,0.5))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`route-map-title-${tour.id}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section className="sr-surface w-full max-w-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto shadow-2xl">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h2 id={`route-map-title-${tour.id}`} className="sr-h2">
                    Bản đồ lộ trình tuyến
                  </h2>
                  <p className="text-xs text-[var(--sr-text-muted)]">{routeMap?.title || tour.title}</p>
                </div>
                <button
                  type="button"
                  aria-label="Đóng bản đồ"
                  className="sr-btn sr-btn-secondary sr-btn-sm"
                  onClick={() => setOpen(false)}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </header>

              {loading && <div className="text-sm text-[var(--sr-text-muted)]">Đang tải bản đồ...</div>}
              {!loading && error && (
                <div className="text-sm text-[var(--sr-urgent-ink)]" role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && (
                <RouteMapPreview
                  coordinates={coordinates}
                  checkpoints={checkpoints}
                  height="min(50vh, 29rem)"
                  tourTitle={tour.title}
                />
              )}
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
