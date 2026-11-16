import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Footprints,
  Leaf,
  MapPin,
  Minus,
  Mountain,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import RouteMapPreview from "../../../components/common/RouteMapPreview";
import PayOSPaymentModal from "../components/PayOSPaymentModal";

const DEFAULT_COVER = "/assets/figma/landing-photo.jpeg";
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VND`;
const FILTERS = [
  ["all", "Tất cả"],
  ["easy", "Dễ (Gia đình)"],
  ["moderate", "Trung bình"],
  ["challenging", "Thử thách"],
  ["gps", "Có GPS Checkpoint"],
];
const DIFFICULTY_LABELS = {
  easy: "Dễ (Gia đình)",
  moderate: "Trung bình",
  challenging: "Thử thách",
  expert: "Chuyên gia",
};
const FLASH_SLOTS = ["07:00", "09:00", "11:00", "13:00", "15:00"];

function hasActiveSession() {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  try {
    const encoded = token.split(".")[1];
    const payload = encoded ? JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) : null;
    if (payload?.exp && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
};

const formatSessionDate = (startTime, endTime) => {
  if (!startTime) return "Ngày diễn ra đang được cập nhật";
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return "Ngày diễn ra đang được cập nhật";
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startLabel = formatter.format(start);
  if (!endTime) return startLabel.charAt(0).toUpperCase() + startLabel.slice(1);
  const end = new Date(endTime);
  if (Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
    return startLabel.charAt(0).toUpperCase() + startLabel.slice(1);
  }
  return `${start.toLocaleDateString("vi-VN")} – ${end.toLocaleDateString("vi-VN")}`;
};

export default function TrekkingFigmaPage({ flashOnly = false, publicBrowse = false }) {
  const navigate = useNavigate();
  const { globalSearch = "" } = useOutletContext() || {};
  const { tourId } = useParams();
  const { user } = useUserEco() || {};
  const [searchParams] = useSearchParams();
  const basePath = publicBrowse ? "/trekking" : "/dashboard/trekking";

  const [filter, setFilter] = useState(searchParams.get("gps") ? "gps" : "all");
  const [localSearch, setLocalSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [toursError, setToursError] = useState("");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [people, setPeople] = useState(1);
  const [paymentMethod] = useState("payos");
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
  const [flashData, setFlashData] = useState(null);
  const [loadingFlash, setLoadingFlash] = useState(flashOnly);
  const [flashSeconds, setFlashSeconds] = useState(0);
  const [selectedFlashSlot, setSelectedFlashSlot] = useState(null);
  const [remindedSlots, setRemindedSlots] = useState([]);

  const loadTours = useCallback(() => {
    setLoadingTours(true);
    setToursError("");
    return api
      .get("/tours/")
      .then((res) => {
        const data = res.data?.status === "success" ? res.data?.data : res.data;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRows([]);
        setToursError("Không thể tải danh sách tuyến trekking. Vui lòng thử lại.");
      })
      .finally(() => {
        setLoadingTours(false);
      });
  }, []);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

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
    const timer = window.setInterval(() => setFlashSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [flashData?.session?.id, flashSeconds > 0]);

  useEffect(() => {
    if (!user) return;
    setBookingForm((current) => ({
      ...current,
      customer_name: current.customer_name || user?.name || "",
      customer_phone: current.customer_phone || user?.phone || "",
      customer_email: current.customer_email || user?.email || "",
    }));
  }, [user]);

  useEffect(() => {
    if (!tourId) {
      if (view === "detail" && !selected) setView("list");
      return;
    }
    if (loadingTours) return;
    let mounted = true;
    const wantsBooking = !publicBrowse && searchParams.get("book") === "1";
    setView(wantsBooking ? "booking" : "detail");
    api
      .get(`/tours/${encodeURIComponent(tourId)}/`)
      .then((res) => {
        if (!mounted) return;
        const detail = res.data?.status === "success" ? res.data.data : res.data;
        if (!detail) return;
        const listed = rows.find((tour) => String(tour.id) === String(tourId));
        const hydrated = {
          ...(listed || {}),
          ...detail,
          cover_image_url: detail.cover_image_url || listed?.cover_image_url || DEFAULT_COVER,
          distance: detail.route?.total_distance_km || listed?.route?.total_distance_km || 0,
          difficulty_label:
            detail.difficulty_label ||
            listed?.difficulty_label ||
            DIFFICULTY_LABELS[detail.difficulty_level] ||
            "Trung bình",
        };
        setSelected(hydrated);
        const firstOpen =
          detail.schedules?.find(
            (schedule) => ["open", "almost_full"].includes(schedule.status) && Number(schedule.remaining_slots) > 0
          ) || null;
        setSelectedSchedule(firstOpen);
        if (wantsBooking && !firstOpen) setView("detail");
      })
      .catch(() => {
        if (mounted) setView("list");
      });
    return () => {
      mounted = false;
    };
  }, [tourId, loadingTours, rows, publicBrowse, searchParams]);

  const tours = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((live) => {
      const original = Number(live.price) || 0;
      const canShowEndedItem = flashData?.session_type === "ended";
      const flashItem =
        flashOnly && ["live", "upcoming", "ended"].includes(flashData?.session_type)
          ? flashData.session?.items?.find(
              (item) =>
                Number(item.tour_id) === Number(live.id) &&
                item.status === "approved" &&
                (canShowEndedItem || !item.is_sold_out)
            )
          : null;
      return {
        ...live,
        cover_image_url: live.cover_image_url || DEFAULT_COVER,
        price: original,
        promo_price: flashItem ? Number(flashItem.promo_price) : original,
        discount: flashItem ? Number(flashItem.discount_percent) : 0,
        campaign_item_id: flashItem?.id || null,
        distance: live.route?.total_distance_km || live.distance || 0,
        avg_rating: Number(live.avg_rating || 0),
        total_reviews: Number(live.total_reviews || 0),
        difficulty_label: live.difficulty_label || DIFFICULTY_LABELS[live.difficulty_level] || "Trung bình",
      };
    });
  }, [rows, flashData, flashOnly]);

  const searchQuery = (publicBrowse ? localSearch : globalSearch).trim().toLowerCase();

  const visibleTours = tours.filter((tour) => {
    if (searchQuery) {
      const hay = `${tour.title || ""} ${tour.vendor_name || ""} ${tour.description || ""}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    if (flashOnly) return Boolean(tour.campaign_item_id);
    if (["easy", "moderate", "challenging"].includes(filter)) return tour.difficulty_level === filter;
    if (filter === "gps") return Array.isArray(tour.checkpoints) && tour.checkpoints.length > 0;
    return true;
  });

  const isLiveFlash = flashData?.session_type === "live";
  const isUpcomingFlash = flashData?.session_type === "upcoming";
  const isEndedFlash = flashData?.session_type === "ended";
  const loadingList = loadingTours || (flashOnly && loadingFlash);
  const liveFlashItems = isLiveFlash
    ? (flashData?.session?.items || [])
        .filter((item) => item.status === "approved" && !item.is_sold_out && rows.some((tour) => Number(tour.id) === Number(item.tour_id)))
        .slice(0, 2)
    : [];

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

  const selectedSlotIndex = Math.max(0, FLASH_SLOTS.indexOf(selectedFlashSlot || FLASH_SLOTS[Math.max(0, liveSlotIndex)]));
  const flashMode = selectedSlotIndex < liveSlotIndex ? "expired" : selectedSlotIndex > liveSlotIndex || isUpcomingFlash ? "remind" : "book";
  const countdownLabel = isUpcomingFlash ? "Bắt đầu sau" : "Kết thúc sau";
  const countdownValue = flashSeconds > 0 ? formatCountdown(flashSeconds) : flashData?.session?.countdown_text || "00:00:00";
  const sessionDate = formatSessionDate(flashData?.session?.start_time, flashData?.session?.end_time);

  const chooseTour = async (tour) => {
    setSelected(tour);
    setPeople(1);
    setBookingError("");
    setReceipt(null);
    const localSchedule =
      tour.schedules?.find((schedule) => ["open", "almost_full"].includes(schedule.status) && Number(schedule.remaining_slots) > 0) || null;
    setSelectedSchedule(localSchedule);
    try {
      const response = await api.get(`/tours/${tour.id}/`);
      const detail = response.data?.status === "success" ? response.data.data : response.data;
      if (detail) {
        const hydrated = {
          ...tour,
          ...detail,
          cover_image_url: detail.cover_image_url || tour.cover_image_url || DEFAULT_COVER,
          distance: detail.route?.total_distance_km || tour.distance,
          difficulty_label: detail.difficulty_label || tour.difficulty_label,
        };
        setSelected(hydrated);
        setSelectedSchedule(
          detail.schedules?.find((schedule) => ["open", "almost_full"].includes(schedule.status) && Number(schedule.remaining_slots) > 0) ||
            null
        );
      }
    } catch {
      // Keep the list data visible; checkout remains disabled without a real schedule.
    }
  };

  const openBooking = async (tour, quantity = 1) => {
    if (!hasActiveSession()) {
      navigate("/login", { state: { from: `/dashboard/trekking/${tour.id}?book=1` } });
      return;
    }
    if (publicBrowse) {
      navigate(`/dashboard/trekking/${tour.id}?book=1`);
      return;
    }
    await chooseTour(tour);
    setPeople(quantity);
    setView("booking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDetail = (tour) => {
    if (publicBrowse) {
      navigate(`/trekking/${tour.id}`);
      return;
    }
    chooseTour(tour);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueToPayment = () => {
    if (!selectedSchedule) return setBookingError("Tour này chưa có lịch khởi hành còn chỗ.");
    if (!bookingForm.customer_name.trim()) return setBookingError("Vui lòng nhập họ và tên người đặt.");
    const phoneDigits = bookingForm.customer_phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) return setBookingError("Số điện thoại phải có từ 9 đến 15 chữ số.");
    if (bookingForm.customer_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.customer_email.trim())) {
      return setBookingError("Email chưa đúng định dạng.");
    }
    if (people > Number(selectedSchedule.remaining_slots || 0)) {
      return setBookingError(`Chuyến này chỉ còn ${selectedSchedule.remaining_slots} chỗ.`);
    }
    setBookingError("");
    setView("payment");
  };

  const submitBooking = async () => {
    if (submitting || !selectedSchedule || !selected) return;
    setSubmitting(true);
    setBookingError("");
    try {
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
      });
      const data = response.data?.status === "success" ? response.data.data : response.data;
      setReceipt(data);
      if (data?.payos?.qrCode || data?.payos?.checkoutUrl) {
        setPayosOpen(true);
      } else {
        setBookingError(data?.payment_error || "Đã giữ chỗ nhưng chưa tạo được mã PayOS. Vui lòng thử lại trong lịch sử đặt tour.");
      }
    } catch (error) {
      const data = error.response?.data;
      setBookingError(data?.message || data?.error || data?.detail || "Không thể tạo đơn đặt tour. Vui lòng kiểm tra đăng nhập và thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "booking" && selected && !publicBrowse) {
    return (
      <BookingView
        tour={selected}
        schedule={selectedSchedule}
        onSchedule={setSelectedSchedule}
        people={people}
        setPeople={setPeople}
        form={bookingForm}
        setForm={setBookingForm}
        error={bookingError}
        onBack={() => (tourId ? navigate("/dashboard/trekking") : setView("list"))}
        onContinue={continueToPayment}
      />
    );
  }

  if (view === "payment" && selected && !publicBrowse) {
    return (
      <>
        <PaymentView
          tour={selected}
          schedule={selectedSchedule}
          people={people}
          error={bookingError}
          submitting={submitting}
          bookingCreated={Boolean(receipt)}
          onBack={() => setView("booking")}
          onPay={submitBooking}
        />
        <PayOSPaymentModal
          isOpen={payosOpen}
          paymentData={receipt}
          onClose={() => {
            setPayosOpen(false);
            setView("list");
          }}
          onPaymentSuccess={(paidReceipt) => {
            setReceipt(paidReceipt);
            setPayosOpen(false);
            setView("success");
          }}
        />
      </>
    );
  }

  if (view === "success" && selected && !publicBrowse) {
    return (
      <SuccessView
        tour={selected}
        schedule={selectedSchedule}
        people={people}
        receipt={receipt}
        method={paymentMethod}
        onHome={() => {
          setView("list");
          navigate("/dashboard/trekking");
        }}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <div className={tourId || publicBrowse ? "figma-route-detail-shell" : ""}>
        <DetailView
          tour={selected}
          publicBrowse={publicBrowse}
          signedIn={hasActiveSession()}
          onBack={() => {
            if (tourId) {
              navigate(basePath);
            } else {
              setView("list");
            }
          }}
          onBook={() => openBooking(selected)}
        />
      </div>
    );
  }

  return (
    <div className={`figma-screen figma-trekking-screen ${flashOnly ? "figma-flash-sale-screen" : ""} ${publicBrowse ? "public-trekking-screen" : ""}`}>
      <main className="figma-screen-content">
        {publicBrowse && !flashOnly && (
          <header className="public-trekking-header">
            <div>
              <h1 className="font-fraunces">Tuyến trekking bán đảo Sơn Trà</h1>
              <p>
                Khám phá các tuyến sinh thái đã được Ban Quản lý xác minh, xem lộ trình checkpoint GPS thực địa và chọn lịch khởi hành phù hợp.
              </p>
            </div>
            <label className="public-trekking-search">
              <Search className="w-4 h-4 text-[#4A514C]" aria-hidden="true" />
              <input
                type="search"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Tìm tuyến, đỉnh Bàn Cờ, đơn vị..."
                aria-label="Tìm kiếm tuyến trekking"
              />
            </label>
          </header>
        )}

        {!flashOnly && (
          <div className="figma-filter-row" role="group" aria-label="Lọc tuyến trekking">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={filter === id ? "active" : ""}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {flashOnly ? (
          <section className={`figma-trekking-sale figma-flash-session-view ${flashData?.session_type === "ended" ? "is-ended" : ""}`}>
            <>
              <header className="figma-flash-session-hero">
                <div className="figma-flash-session-heading">
                  <div className="figma-flash-session-title">
                    <Zap />
                    <div>
                      <h2>{flashData?.session?.session_name || "Flash sale"}</h2>
                      {(isLiveFlash || isUpcomingFlash) && (
                        <span>
                          {countdownLabel}&nbsp; <b className="tabular-nums">{countdownValue}</b>
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="figma-flash-session-date">
                    <CalendarDays /> {sessionDate}
                  </p>
                </div>
                <div className="figma-session-times" aria-label="Chọn phiên flash sale">
                  {FLASH_SLOTS.map((time, index) => {
                    const status = index < liveSlotIndex ? "Đã qua" : index === liveSlotIndex && isLiveFlash ? "Đang diễn ra" : "Sắp tới";
                    return (
                      <button
                        type="button"
                        key={time}
                        className={`${time === selectedFlashSlot ? "active" : ""} ${
                          status === "Đang diễn ra" ? "live" : status === "Đã qua" ? "past" : "upcoming"
                        }`}
                        aria-pressed={time === selectedFlashSlot}
                        onClick={() => setSelectedFlashSlot(time)}
                      >
                        <b className="tabular-nums">{time}</b>
                        <small>{status}</small>
                      </button>
                    );
                  })}
                </div>
              </header>
              <p className="figma-session-count tabular-nums">
                {visibleTours.length} ưu đãi trong phiên {selectedFlashSlot || "hiện tại"}
              </p>
            </>
            <div className="figma-trek-list">
              {loadingList &&
                [0, 1].map((item) => (
                  <article key={item} className="figma-tour-row figma-skeleton-row" aria-hidden="true">
                    <span />
                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                    <span />
                  </article>
                ))}
              {!loadingList && toursError && (
                <div className="figma-data-state figma-data-state--error" role="alert">
                  <p>{toursError}</p>
                  <button type="button" onClick={loadTours}>
                    <RefreshCw className="w-4 h-4" /> Thử lại
                  </button>
                </div>
              )}
              {!loadingList &&
                !toursError &&
                visibleTours.map((tour) => (
                  <TourRow
                    key={tour.id}
                    tour={tour}
                    mode={flashMode}
                    reminded={remindedSlots.includes(`${selectedFlashSlot}-${tour.id}`)}
                    onRemind={() => setRemindedSlots((current) => [...new Set([...current, `${selectedFlashSlot}-${tour.id}`])])}
                    onBook={(quantity) => openBooking(tour, quantity)}
                  />
                ))}
              {!loadingList && !toursError && visibleTours.length === 0 && (
                <p className="figma-data-state">Hiện chưa có ưu đãi trong phiên flash sale này.</p>
              )}
            </div>
          </section>
        ) : (
          <>
            {!publicBrowse && isLiveFlash && liveFlashItems.length > 0 && (
              <section className="figma-trekking-flash-preview" aria-labelledby="trekking-live-flash-title">
                <header>
                  <div>
                    <span>
                      <Zap />
                    </span>
                    <div>
                      <h2 id="trekking-live-flash-title">Flash sale đang diễn ra</h2>
                      <p>
                        Kết thúc sau <b className="tabular-nums">{countdownValue}</b>
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => navigate("/dashboard/flash-sale")}>
                    Xem tất cả
                  </button>
                </header>
                <div>
                  {liveFlashItems.map((item) => (
                    <article key={item.id}>
                      <img src={item.tour_cover_image || DEFAULT_COVER} alt={item.tour_title || "Tour flash sale"} />
                      <div>
                        <small className="tabular-nums">-{item.discount_percent}%</small>
                        <h3>{item.tour_title}</h3>
                        <p className="tabular-nums">
                          <strong>{money(item.promo_price)}</strong>
                          <del>{money(item.original_price)}</del>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="figma-all-routes figma-trekking-routes-only">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2>Tất cả tuyến ({visibleTours.length})</h2>
                {(filter !== "all" || searchQuery) && (
                  <button
                    type="button"
                    className="figma-reset-filter-btn"
                    onClick={() => {
                      setFilter("all");
                      setLocalSearch("");
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              <div className="figma-trek-list">
                {loadingTours &&
                  [0, 1, 2].map((item) => (
                    <article key={item} className="figma-tour-row figma-skeleton-row" aria-hidden="true">
                      <span />
                      <div>
                        <span />
                        <span />
                        <span />
                      </div>
                      <span />
                    </article>
                  ))}

                {!loadingTours && toursError && (
                  <div className="figma-data-state figma-data-state--error" role="alert">
                    <p>{toursError}</p>
                    <button type="button" onClick={loadTours}>
                      <RefreshCw className="w-4 h-4" /> Tải lại danh sách
                    </button>
                  </div>
                )}

                {!loadingTours &&
                  !toursError &&
                  visibleTours.map((tour) => (
                    <TourRow key={tour.id} tour={tour} detail onBook={() => openDetail(tour)} />
                  ))}

                {!loadingTours && !toursError && visibleTours.length === 0 && (
                  <div className="figma-data-state">
                    <p>
                      {rows.length === 0
                        ? "Hiện chưa có tuyến trekking nào đang mở bán."
                        : "Không tìm thấy tuyến trekking phù hợp với bộ lọc hiện tại."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TourRow({ tour, onBook, onRemind, reminded = false, detail = false, mode = "book" }) {
  const [quantity, setQuantity] = useState(1);
  const openSchedules = (tour.schedules || []).filter(
    (s) => ["open", "almost_full"].includes(s.status) && Number(s.remaining_slots) > 0
  );
  const nextSchedule = openSchedules[0] || null;
  const hasRealSchedule = Boolean(nextSchedule);
  const capacity = Math.max(1, Number(nextSchedule?.max_capacity ?? tour.max_capacity ?? 15));
  const booked = hasRealSchedule
    ? Math.max(0, Math.min(Number(nextSchedule.booked_count || 0), capacity))
    : 0;
  const available = Number(nextSchedule?.remaining_slots ?? tour._available_slots ?? capacity);
  const progress = hasRealSchedule ? Math.min(100, (booked / capacity) * 100) : 0;
  const checkpointCount = Array.isArray(tour.checkpoints) ? tour.checkpoints.length : 0;

  return (
    <article className={`figma-tour-row ${mode === "expired" ? "is-inactive" : ""}`} aria-disabled={mode === "expired" || undefined}>
      <div className="figma-tour-thumb">
        <img src={tour.cover_image_url || DEFAULT_COVER} alt={tour.title} />
        {Number(tour.discount) > 0 && <span className="tabular-nums">-{tour.discount}%</span>}
      </div>

      <div className="figma-tour-copy">
        <div className="figma-tour-vendor-line">
          <span>{tour.vendor_name || "Đối tác Sơn Trà"}</span>
          {checkpointCount > 0 && <span className="tabular-nums">{checkpointCount} checkpoint GPS</span>}
        </div>
        <h3>{tour.title}</h3>
        <p className="tabular-nums">
          {Number(tour.total_reviews) > 0 ? (
            <>
              <span>
                <Star /> {tour.avg_rating}
              </span>{" "}
              ({tour.total_reviews} đánh giá)
            </>
          ) : (
            <span>Tuyến mới · Chưa có đánh giá</span>
          )}
        </p>
        <div className="figma-tour-meta tabular-nums">
          <span>
            <Navigation /> {tour.distance ? `${tour.distance} km` : "Đang cập nhật"}
          </span>
          <span>
            <Clock3 /> {tour.duration_hours} giờ
          </span>
          <b>
            <Mountain /> {tour.difficulty_label}
          </b>
        </div>
        {hasRealSchedule ? (
          <>
            <small className="tabular-nums">
              Chuyến gần nhất: {nextSchedule.formatted_date} · Đã đặt {booked}/{capacity} chỗ (còn {nextSchedule.remaining_slots})
            </small>
            <div className="figma-row-progress" aria-label={`Đã đặt ${booked} trên ${capacity} chỗ`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <small>Chưa có lịch khởi hành còn chỗ</small>
        )}
      </div>

      <div className="figma-tour-price tabular-nums">
        <strong>{money(detail ? tour.price : tour.promo_price)}/người</strong>
        {!detail && Number(tour.discount) > 0 && <del>{money(tour.price)}/người</del>}
        {mode === "book" && !detail && (
          <div className="figma-tour-quantity">
            <small>Số lượng:</small>
            <button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
              <Minus />
            </button>
            <b>{quantity}</b>
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => setQuantity((current) => Math.min(Math.max(1, available), current + 1))}
            >
              <Plus />
            </button>
          </div>
        )}
        {mode === "expired" && !detail && <span className="figma-flash-ended">Phiên đã kết thúc</span>}
        {mode === "remind" && !detail ? (
          <button type="button" className={`figma-remind-button ${reminded ? "active" : ""}`} onClick={onRemind}>
            <Bell /> {reminded ? "Đã nhắc tôi" : "Nhắc tôi"}
          </button>
        ) : (
          <button type="button" disabled={mode === "expired"} onClick={() => onBook(quantity)}>
            {detail ? "Xem chi tiết" : mode === "expired" ? "Đã kết thúc" : "Đặt ngay"}
          </button>
        )}
      </div>
    </article>
  );
}

function BookingView({ tour, schedule, onSchedule, people, setPeople, form, setForm, error, onBack, onContinue }) {
  const schedules = (tour.schedules || []).filter(
    (item) => ["open", "almost_full"].includes(item.status) && Number(item.remaining_slots) > 0
  );
  const price = Number(tour.campaign_item_id ? tour.promo_price : schedule?.price || tour.price || 0);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const scheduleOptions = schedules.map((item) => ({
    id: item.id,
    top: item.formatted_date || item.departure_date,
    bottom: `${String(item.start_time || "").slice(0, 5)} · Còn ${item.remaining_slots} chỗ`,
  }));

  return (
    <div className="figma-flow-screen">
      <div className="figma-flow-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeft /> Quay lại
        </button>
        <span>
          Trekking&nbsp; / &nbsp;<b>Đặt tour</b>
        </span>
      </div>
      <main className="figma-booking-layout">
        <section>
          <div className="figma-flow-title">
            <h1>Đặt tour</h1>
            <span>
              <CalendarDays /> Lịch khởi hành thật
            </span>
          </div>
          <img className="figma-booking-cover" src={tour.cover_image_url || DEFAULT_COVER} alt={tour.title} />
          <h2>{tour.title}</h2>
          <p className="figma-rating tabular-nums">
            {Number(tour.total_reviews) > 0 ? (
              <>
                <Star /> {tour.avg_rating} ({tour.total_reviews} đánh giá) · {tour.vendor_name || "Đối tác Sơn Trà"}
              </>
            ) : (
              <>{tour.vendor_name || "Đối tác Sơn Trà"} · Trích {tour.esg_fund_percent || 10}% vào Quỹ bảo tồn</>
            )}
          </p>
          <div className="figma-tag-row">
            <span>
              <Mountain className="w-3.5 h-3.5" aria-hidden="true" /> {tour.difficulty_label || "Trung bình"}
            </span>
            <span>
              <Footprints className="w-3.5 h-3.5" aria-hidden="true" /> Chuẩn bị giày trekking
            </span>
            <CheckpointMapButton tour={tour} />
          </div>
          <div className="figma-detail-stats tabular-nums">
            <article>
              <MapPin />
              <span>
                Quãng đường<b>{tour.distance || 0} km</b>
              </span>
            </article>
            <article>
              <Clock3 />
              <span>
                Thời gian<b>{tour.duration_hours || 0} giờ</b>
              </span>
            </article>
            <article>
              <ShieldCheck />
              <span>
                Độ khó<b>{tour.difficulty_label || "Trung bình"}</b>
              </span>
            </article>
            <article>
              <Leaf />
              <span>
                Quỹ bảo tồn<b>{tour.esg_fund_percent || 10}% giá tour</b>
              </span>
            </article>
          </div>
          <div className="figma-capacity wide">
            <span
              style={{
                width: `${
                  schedule ? Math.min(100, (Number(schedule.booked_count || 0) / Number(schedule.max_capacity || 1)) * 100) : 0
                }%`,
              }}
            />
          </div>
          <p className="figma-capacity-label tabular-nums">
            {schedule
              ? `Đã đặt ${schedule.booked_count || 0}/${schedule.max_capacity || tour.max_capacity || 0} chỗ`
              : "Chưa chọn lịch khởi hành"}
            <b>{schedule ? `Còn ${schedule.remaining_slots || 0} chỗ` : "0 chỗ"}</b>
          </p>
          <div className="figma-description">
            <b>Mô tả tuyến đường</b>
            <p>{tour.description || `Trekking khám phá Sơn Trà · ${tour.distance || 0} km · ${tour.duration_hours || 0} giờ.`}</p>
          </div>
          <h2>Điểm checkpoint GPS trên tuyến</h2>
          <TrailCheckpointsTimeline tour={tour} />
        </section>

        <aside>
          <div className="figma-booking-price tabular-nums">
            <strong>{money(price)}</strong>
            <small>/người</small>
            {tour.campaign_item_id && (
              <>
                <del>{money(schedule?.price || tour.price)}</del>
                <span>Tiết kiệm {tour.discount}%</span>
              </>
            )}
          </div>
          <Picker
            title="Chọn lịch khởi hành"
            options={scheduleOptions}
            activeId={schedule?.id}
            onSelect={(id) => onSchedule(schedules.find((item) => String(item.id) === String(id)) || null)}
            empty="Chưa có lịch khởi hành còn chỗ"
          />
          {schedule?.guide_name && (
            <div className="figma-guide-note">
              <UserCheck className="w-4 h-4 text-[#2F5D4A]" aria-hidden="true" />
              <span>
                Hướng dẫn viên phụ trách: <b>{schedule.guide_name}</b>
              </span>
            </div>
          )}
          <div className="figma-people tabular-nums">
            <b>Số lượng người</b>
            <small>Còn {schedule?.remaining_slots || 0} chỗ trống</small>
            <div>
              <span>Số người tham gia:</span>
              <button type="button" aria-label="Giảm số người" onClick={() => setPeople(Math.max(1, people - 1))}>
                <Minus />
              </button>
              <b>{people}</b>
              <button
                type="button"
                aria-label="Tăng số người"
                onClick={() => setPeople(Math.min(Number(schedule?.remaining_slots || 1), people + 1))}
              >
                <Plus />
              </button>
            </div>
          </div>
          <Traveler
            number={1}
            label="Người đặt (Bạn)"
            name={form.customer_name}
            phone={form.customer_phone}
            onName={update("customer_name")}
            onPhone={update("customer_phone")}
          />
          <div className="figma-traveler">
            <label>
              Email
              <input
                type="email"
                value={form.customer_email}
                onChange={update("customer_email")}
                autoComplete="email"
                placeholder="ten@email.com"
              />
            </label>
            <label>
              Điểm đón
              <input value={form.pickup_location} onChange={update("pickup_location")} placeholder="Trung tâm Đà Nẵng" />
            </label>
            <label>
              Ghi chú cho hướng dẫn viên
              <textarea
                value={form.special_notes}
                onChange={update("special_notes")}
                rows="3"
                placeholder="Yêu cầu hỗ trợ, tình trạng sức khỏe hoặc lưu ý khác (không bắt buộc)"
              />
            </label>
          </div>
          {error && (
            <p className="figma-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="figma-order-summary tabular-nums">
            <b>Tóm tắt đơn hàng</b>
            <p>
              Giá vé × {people} người <span>{money(price * people)}</span>
            </p>
            <strong>
              Tổng cộng <span>{money(price * people)}</span>
            </strong>
          </div>
          <button className="figma-continue" type="button" onClick={onContinue} disabled={!schedule}>
            Kiểm tra thông tin
          </button>
        </aside>
      </main>
    </div>
  );
}

function PaymentView({ tour, schedule, people, error, submitting, bookingCreated, onBack, onPay }) {
  return (
    <div className="figma-flow-screen">
      <div className="figma-flow-breadcrumb">
        <button type="button" onClick={onBack} disabled={bookingCreated}>
          <ArrowLeft /> Quay lại
        </button>
        <span>
          Đặt tour&nbsp; / &nbsp;<b>Thanh toán</b>
        </span>
      </div>
      <main className="figma-payment-screen">
        <h1>Xác nhận và thanh toán</h1>
        <div className="figma-hold-banner">
          <ShieldCheck />
          <div>
            <h2>Lịch khởi hành đã sẵn sàng</h2>
            <p>Kiểm tra thông tin trước khi tạo mã VietQR PayOS.</p>
          </div>
          <b className="tabular-nums">{schedule?.remaining_slots || 0} chỗ</b>
        </div>
        <div className="figma-payment-grid">
          <section>
            <h2>
              <ShieldCheck /> Phương thức thanh toán
            </h2>
            <div className="figma-payment-tabs">
              <button type="button" className="active">
                PayOS VietQR
              </button>
            </div>
            <div className="figma-qr figma-pay-at-start">
              <ShieldCheck />
              <div>
                <h3>Thanh toán VietQR an toàn</h3>
                <p>
                  Sau khi xác nhận, hệ thống tạo mã QR theo đúng số tiền và tự động kích hoạt chuyến đi khi PayOS báo thanh toán thành công.
                </p>
              </div>
            </div>
            <div className="figma-payment-info tabular-nums">
              Thông tin đặt chỗ <span>{schedule?.formatted_date || schedule?.departure_date} · {schedule?.time_slot}</span>
            </div>
            {error && (
              <p className="figma-form-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="figma-pay-button" onClick={onPay} disabled={submitting || bookingCreated}>
              {submitting ? (
                "Đang tạo mã PayOS..."
              ) : bookingCreated ? (
                "Đơn đang chờ thanh toán"
              ) : (
                <>
                  <Check /> Tạo mã VietQR và thanh toán
                </>
              )}
            </button>
          </section>
          <OrderCard tour={tour} schedule={schedule} people={people} />
        </div>
        <p className="figma-safe-note">
          <ShieldCheck /> PayOS tự động đối soát giao dịch · Trích {tour.esg_fund_percent || 10}% vào Quỹ bảo tồn Sơn Trà
        </p>
      </main>
    </div>
  );
}

function SuccessView({ tour, schedule, people, receipt, method, onHome }) {
  const total = Number(receipt?.total_price || schedule?.price * people || tour.price * people || 0);
  const methodLabel = receipt?.payment_method || (method === "payos" ? "PayOS VietQR" : "—");
  const downloadReceipt = () => window.print();
  return (
    <div className="figma-flow-screen">
      <main className="figma-success-screen">
        <div className="figma-success-banner">
          <span>
            <Check />
          </span>
          <div>
            <h1>Thanh toán thành công</h1>
            <p>PayOS đã xác nhận giao dịch và Sơn Trà REloop đã kích hoạt chuyến đi của bạn.</p>
          </div>
        </div>
        <div className="figma-success-grid">
          <section>
            <header>
              <h2>Phiếu xác nhận thanh toán</h2>
              <span>
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                {receipt?.payment_status_label || "Đã thanh toán"}
              </span>
            </header>
            <p>
              <b>Sơn Trà REloop</b>
              <br />
              Biên nhận thanh toán · Không phải hóa đơn VAT
            </p>
            <dl className="tabular-nums">
              <div>
                <dt>Mã đơn hàng</dt>
                <dd>{receipt?.order_code || receipt?.id}</dd>
              </div>
              <div>
                <dt>Thời gian xác nhận</dt>
                <dd>{receipt?.created_at || "—"}</dd>
              </div>
              <div>
                <dt>Phương thức</dt>
                <dd>{methodLabel}</dd>
              </div>
            </dl>
            <h3>Chi tiết chuyến đi</h3>
            <dl className="tabular-nums">
              <div>
                <dt>{receipt?.experience_name || tour.title}</dt>
                <dd />
              </div>
              <div>
                <dt>Ngày tham gia</dt>
                <dd>{receipt?.booking_date || schedule?.formatted_date}</dd>
              </div>
              <div>
                <dt>Phiên tour</dt>
                <dd>{receipt?.time_slot || schedule?.time_slot}</dd>
              </div>
              <div>
                <dt>Giá vé × {people} người</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
            <div className="figma-paid-total tabular-nums">
              <span>Tổng đã thanh toán</span>
              <b>{money(total)}</b>
            </div>
            <div className="figma-success-actions">
              <button type="button" onClick={onHome}>
                Xem thêm tour
              </button>
              <button type="button" onClick={downloadReceipt}>
                <Download /> Tải phiếu xác nhận
              </button>
            </div>
          </section>
          <aside>
            <h2>Chuyến đi của bạn</h2>
            <img src={tour.cover_image_url || DEFAULT_COVER} alt={tour.title} />
            <h3>{tour.title}</h3>
            <p className="tabular-nums">
              {tour.distance} km&nbsp; · &nbsp;{tour.duration_hours} giờ
            </p>
            <div className="figma-help">
              <b>Cần hỗ trợ?</b>
              <p>Liên hệ Sơn Trà REloop và cung cấp mã đơn hàng {receipt?.order_code} để được hỗ trợ.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function DetailView({ tour, publicBrowse = false, signedIn = false, onBack, onBook }) {
  const nextSchedule = (tour.schedules || []).find(
    (item) => ["open", "almost_full"].includes(item.status) && Number(item.remaining_slots) > 0
  );
  return (
    <div className={`figma-flow-screen figma-detail-view ${publicBrowse ? "figma-detail-view--public" : ""}`}>
      <div className="figma-detail-top">
        <button type="button" onClick={onBack}>
          <ArrowLeft /> Quay lại danh sách trekking
        </button>
      </div>
      <main>
        <section>
          <img className="figma-detail-cover" src={tour.cover_image_url || DEFAULT_COVER} alt={tour.title} />
          <div className="figma-tag-row">
            <span>
              <Mountain className="w-3.5 h-3.5" aria-hidden="true" /> {tour.difficulty_label || "Trung bình"}
            </span>
            <span>
              <Footprints className="w-3.5 h-3.5" aria-hidden="true" /> Chuẩn bị giày trekking
            </span>
            <CheckpointMapButton tour={tour} />
          </div>
          <h1>{tour.title}</h1>
          <p className="figma-detail-vendor">
            Đơn vị tổ chức: <b>{tour.vendor_name || "Đối tác Sơn Trà"}</b>
            {nextSchedule?.guide_name ? ` · Hướng dẫn viên: ${nextSchedule.guide_name}` : ""}
          </p>
          <p>{tour.description || "Hành trình trekking khám phá thiên nhiên bán đảo Sơn Trà cùng hướng dẫn viên địa phương."}</p>
          <div className="figma-detail-stats tabular-nums">
            <article>
              <MapPin />
              <span>
                Quãng đường<b>{tour.distance || 0} km</b>
              </span>
            </article>
            <article>
              <Clock3 />
              <span>
                Thời gian<b>{tour.duration_hours || 0} giờ</b>
              </span>
            </article>
            <article>
              <ShieldCheck />
              <span>
                Độ khó<b>{tour.difficulty_label || "Trung bình"}</b>
              </span>
            </article>
            <article>
              <Leaf />
              <span>
                Bảo tồn<b>{tour.esg_fund_percent || 10}% quỹ BQL</b>
              </span>
            </article>
          </div>
          <h2>Điểm checkpoint GPS và lộ trình thực địa</h2>
          <TrailCheckpointsTimeline tour={tour} />
          {tour.cancellation_policy && (
            <>
              <h2>Chính sách hủy và đổi lịch</h2>
              <p>{tour.cancellation_policy}</p>
            </>
          )}
        </section>
        <aside>
          <div className="figma-detail-price tabular-nums">
            <strong>{money(nextSchedule?.price || tour.price)}</strong>
            <small>/người</small>
            {nextSchedule ? (
              <span>
                Chuyến gần nhất: {nextSchedule.formatted_date} · {nextSchedule.time_slot}
              </span>
            ) : (
              <span>Hiện chưa có lịch khởi hành còn chỗ.</span>
            )}
          </div>
          <div className="figma-order-note">
            <b>Lịch khởi hành và Green Points</b>
            <p>
              Hoàn thành các điểm quét QR/GPS trên tuyến để nhận Green Points và đóng góp {tour.esg_fund_percent || 10}% vào quỹ bảo tồn Sơn Trà.
            </p>
          </div>
          {publicBrowse && !signedIn && nextSchedule && (
            <p className="figma-auth-gate-note">
              Bạn sẽ được chuyển sang bước đăng nhập du khách trước khi giữ chỗ và thanh toán PayOS VietQR.
            </p>
          )}
          <button type="button" className="figma-pay-button" onClick={onBook} disabled={!nextSchedule}>
            {publicBrowse && !signedIn ? "Đăng nhập để chọn lịch & đặt tour" : "Chọn lịch và đặt tour"}
          </button>
        </aside>
      </main>
    </div>
  );
}

function TrailCheckpointsTimeline({ tour }) {
  const checkpoints = [...(tour?.checkpoints || [])].sort(
    (a, b) => Number(a.order_index || 0) - Number(b.order_index || 0)
  );
  if (!checkpoints.length) {
    return (
      <div className="figma-data-state mt-3">
        <p>Lộ trình chi tiết và điểm checkpoint GPS của tuyến này đang được đơn vị tổ chức cập nhật.</p>
      </div>
    );
  }
  return (
    <div className="figma-itinerary">
      {checkpoints.map((cp, index) => (
        <p key={cp.id || index} className="tabular-nums">
          <b>Điểm {cp.order_index || index + 1}</b>
          <span>
            <strong className="block text-[#191C1A] mb-0.5">{cp.name || `Checkpoint ${index + 1}`}</strong>
            {cp.desc || cp.description || "Điểm kiểm tra GPS/QR an toàn trên tuyến."}
            <small className="block text-[#2F5D4A] mt-1">
              Bán kính quét GPS: {cp.radius_tolerance_m || 30} m
              {cp.is_mandatory ? " · Bắt buộc" : ""}
            </small>
          </span>
        </p>
      ))}
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
      setError(requestError.response?.data?.message || "Không thể tải bản đồ checkpoint lúc này.");
    } finally {
      setLoading(false);
    }
  };

  const checkpoints = routeMap?.checkpoints || tour?.checkpoints || [];
  const coordinates = routeMap?.coordinates || tour?.route?.coordinates || [];

  return (
    <>
      <button type="button" className="figma-checkpoint-button" onClick={showMap} aria-haspopup="dialog" aria-expanded={open}>
        <Navigation /> {checkpointCount > 0 ? `Có GPS Checkpoint (${checkpointCount})` : "Xem bản đồ tuyến"}
      </button>
      {open && (
        <div
          className="figma-map-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`checkpoint-map-${tour.id}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section>
            <header>
              <div>
                <span>
                  <Navigation />
                </span>
                <div>
                  <h2 id={`checkpoint-map-${tour.id}`}>Bản đồ GPS checkpoint</h2>
                  <p>{routeMap?.title || tour.title}</p>
                </div>
              </div>
              <button type="button" aria-label="Đóng bản đồ" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            {loading && (
              <div className="figma-map-loading">
                <span />
                <p>Đang tải tuyến đường và checkpoint...</p>
              </div>
            )}
            {!loading && error && (
              <div className="figma-form-error" role="alert">
                {error}
                <button
                  type="button"
                  onClick={() => {
                    setRouteMap(null);
                    showMap();
                  }}
                >
                  Thử lại
                </button>
              </div>
            )}
            {!loading && !error && (
              <>
                <RouteMapPreview
                  coordinates={coordinates}
                  checkpoints={checkpoints}
                  height="min(52vh, 520px)"
                  tourTitle={tour.title}
                  className="figma-checkpoint-map"
                />
                <div className="figma-checkpoint-summary tabular-nums">
                  <span>
                    <b>{checkpoints.length}</b> checkpoint
                  </span>
                  <span>
                    <b>{routeMap?.total_distance_km || tour?.route?.total_distance_km || tour.distance || 0} km</b> tổng chiều dài
                  </span>
                  <span>
                    <b>{routeMap?.elevation_gain_m || tour?.route?.elevation_gain_m || 0} m</b> độ cao tích lũy
                  </span>
                </div>
                <div className="figma-checkpoint-list">
                  {checkpoints.length ? (
                    checkpoints.map((checkpoint, index) => (
                      <article key={checkpoint.id || index}>
                        <span className="tabular-nums">{checkpoint.order_index || index + 1}</span>
                        <div>
                          <h3>{checkpoint.name || `Checkpoint ${index + 1}`}</h3>
                          <p>{checkpoint.desc || checkpoint.description || "Điểm kiểm tra an toàn trên tuyến."}</p>
                          <small className="tabular-nums">Bán kính quét GPS: {checkpoint.radius_tolerance_m || 30} m</small>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="figma-data-state">Tuyến này chưa được thiết lập checkpoint GPS.</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Picker({ title, options, active, activeId, onSelect, empty }) {
  return (
    <div className="figma-picker">
      <b>{title}</b>
      <div>
        {options.length ? (
          options.map((option, index) => {
            const normalized =
              typeof option === "string" ? { id: option, top: option.split("\n")[0], bottom: option.split("\n")[1] } : option;
            const isActive = activeId !== undefined ? String(normalized.id) === String(activeId) : index === active;
            return (
              <button type="button" className={isActive ? "active" : ""} key={normalized.id} onClick={() => onSelect?.(normalized.id)}>
                <b className="tabular-nums">{normalized.top}</b>
                <small className="tabular-nums">{normalized.bottom}</small>
              </button>
            );
          })
        ) : (
          <p>{empty}</p>
        )}
      </div>
    </div>
  );
}

function Traveler({ number, label, name, phone, onName, onPhone }) {
  return (
    <div className="figma-traveler">
      <h3>
        <span>{number}</span>
        {label}
      </h3>
      <label>
        Họ và tên
        <input value={name} onChange={onName} autoComplete="name" placeholder="Nguyễn Văn An" />
      </label>
      <label>
        Số điện thoại
        <input value={phone} onChange={onPhone} inputMode="tel" autoComplete="tel" placeholder="09x xxx xxxx" />
      </label>
    </div>
  );
}

function OrderCard({ tour, schedule, people }) {
  const unitPrice = Number(tour.campaign_item_id ? tour.promo_price : schedule?.price || tour.price || 0);
  const total = unitPrice * people;
  return (
    <aside className="figma-order-card">
      <h2>Thông tin đặt chỗ</h2>
      <img src={tour.cover_image_url || DEFAULT_COVER} alt={tour.title} />
      <h3>{tour.title}</h3>
      <p className="tabular-nums">
        Tour ghép · {people} người · {tour.distance} km · {tour.duration_hours} giờ
      </p>
      <dl className="tabular-nums">
        <div>
          <dt>Ngày tham gia</dt>
          <dd>{schedule?.formatted_date || "—"}</dd>
        </div>
        <div>
          <dt>Phiên tour</dt>
          <dd>{schedule?.time_slot || "—"}</dd>
        </div>
        <div>
          <dt>Giá vé × {people} người</dt>
          <dd>{money(total)}</dd>
        </div>
        {tour.campaign_item_id && (
          <div className="sale">
            <dt>Ưu đãi flash sale</dt>
            <dd>-{tour.discount}%</dd>
          </div>
        )}
      </dl>
      <strong className="tabular-nums">
        Tổng thanh toán <span>{money(total)}</span>
      </strong>
      <div className="figma-order-note">
        <b>Thanh toán qua PayOS VietQR</b>
        <p>Chuyến đi được xác nhận sau khi PayOS thông báo giao dịch thành công.</p>
      </div>
    </aside>
  );
}
