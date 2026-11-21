import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  Layers,
  MapPin,
  Plus,
  Search,
  X,
  Zap,
} from "lucide-react";
import RouteMapPicker from "../../components/common/RouteMapPicker";
import RouteMapPreview from "../../components/common/RouteMapPreview";
import flashSaleService from "../../services/flashSaleService";
import { realtimeBus } from "../../lib/realtimeBus";
import { api } from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";
import { VENDOR_LABELS } from "../../constants/labels";

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Tất cả độ khó" },
  { value: "easy", label: VENDOR_LABELS.DIFF_EASY },
  { value: "moderate", label: VENDOR_LABELS.DIFF_MODERATE },
  { value: "challenging", label: VENDOR_LABELS.DIFF_CHALLENGING },
];

const CREATE_DIFFICULTY_OPTIONS = [
  { value: "easy", label: VENDOR_LABELS.DIFF_EASY },
  { value: "moderate", label: VENDOR_LABELS.DIFF_MODERATE },
  { value: "challenging", label: VENDOR_LABELS.DIFF_CHALLENGING },
];

const TIME_SLOT_OPTIONS = [
  { value: "05:00 - 09:30", label: "05:00 - 09:30 (Đón bình minh)" },
  { value: "06:00 - 10:30", label: "06:00 - 10:30 (Buổi sáng)" },
  { value: "07:30 - 11:30", label: "07:30 - 11:30 (Sáng muộn)" },
  { value: "13:30 - 17:30", label: "13:30 - 17:30 (Buổi chiều)" },
  { value: "14:30 - 18:30", label: "14:30 - 18:30 (Ngắm hoàng hôn)" },
];

const STATUS_BADGES = {
  published: ["Đã duyệt BQL", "sr-badge-moss"],
  pending: ["Chờ duyệt BQL", "sr-badge-warn"],
  rejected: ["Cần chỉnh sửa", "sr-badge-urgent"],
  draft: ["Bản nháp", "sr-badge-neutral"],
};

const DIFF_LABELS = {
  easy: VENDOR_LABELS.DIFF_EASY,
  moderate: VENDOR_LABELS.DIFF_MODERATE,
  challenging: VENDOR_LABELS.DIFF_CHALLENGING,
};

const getUpcomingDate = (daysAhead = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
};

const formatMoney = (val) => `${Number(val || 0).toLocaleString("vi-VN")} đ`;

export const VendorExperiencesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoutesView =
    location.search.includes("view=routes") || location.pathname.includes("/routes");

  const [selectedRouteForView, setSelectedRouteForView] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [addScheduleModalOpen, setAddScheduleModalOpen] = useState(false);
  const [selectedTourForSchedule, setSelectedTourForSchedule] = useState(null);
  const [detailTourModal, setDetailTourModal] = useState(null);

  // Flash Sale Modal
  const [flashModalOpen, setFlashModalOpen] = useState(false);
  const [noFlashModalOpen, setNoFlashModalOpen] = useState(false);
  const [checkingFlashTourId, setCheckingFlashTourId] = useState(null);
  const [selectedTourForFlash, setSelectedTourForFlash] = useState(null);
  const [flashPromoPrice, setFlashPromoPrice] = useState(350000);
  const [flashSlotQty, setFlashSlotQty] = useState(10);
  const [flashSessionId, setFlashSessionId] = useState("");
  const [flashContext, setFlashContext] = useState({ sessions: [], registrations: [] });
  const [usePriceTiers, setUsePriceTiers] = useState(false);
  const [flashTiers, setFlashTiers] = useState([
    { label: "Bậc 1", quantity: 4, price: 320000 },
    { label: "Bậc 2", quantity: 6, price: 380000 },
  ]);
  const [isSubmittingFlash, setIsSubmittingFlash] = useState(false);
  const [isLoadingFlashContext, setIsLoadingFlashContext] = useState(false);
  const [flashError, setFlashError] = useState("");
  const [flashLoginRequired, setFlashLoginRequired] = useState(false);

  const [newTourForm, setNewTourForm] = useState({
    title: "",
    description: "",
    price: 450000,
    max_capacity: 15,
    difficulty_level: "moderate",
    duration_hours: 4.5,
    cover_image_url:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
    start_point: "Chân dốc Hoàng Sa, Thọ Quang, Đà Nẵng",
    end_point: "Đỉnh Bàn Cờ (độ cao 700m)",
    total_distance_km: 4.5,
    elevation_gain_m: 350,
    checkpoints: [],
    coordinates: [],
    initial_date: getUpcomingDate(2),
    initial_time: "06:00 - 10:30",
    guide_id: "",
  });

  const [newScheduleForm, setNewScheduleForm] = useState({
    departure_date: getUpcomingDate(5),
    time_slot: "06:00 - 10:30",
    max_capacity: 15,
    price: 450000,
    guide_id: "",
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchTours = async () => {
    try {
      const res = await api.get("/vendors/tours/");
      if (res.data?.status === "success") {
        setTours(res.data.data || []);
      }
    } catch (e) {
      console.warn("Không thể tải danh sách trải nghiệm:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === "TOUR_REVIEWED") fetchTours();
    });
    window.addEventListener("focus", fetchTours);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", fetchTours);
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/vendors/guides/")
      .then((response) => {
        if (active) {
          setGuides((response.data.data || []).filter((g) => g.status === "active"));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!flashModalOpen) return undefined;
    let mounted = true;
    setIsLoadingFlashContext(true);
    const loadFlashContext = () =>
      flashSaleService
        .getVendorRegistrations()
        .then((context) => {
          if (!mounted) return;
          setFlashContext(context);
          setFlashSessionId((current) =>
            context.sessions.some((s) => String(s.id) === String(current))
              ? current
              : context.sessions[0]?.id || ""
          );
        })
        .catch((error) => {
          if (!mounted) return;
          setFlashContext({ sessions: [], registrations: [] });
          setFlashLoginRequired(error.response?.status === 401);
          setFlashError(
            error.response?.status === 401
              ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản đối tác."
              : extractErrorMessage(error, "Không tải được phiên Flash Sale. Vui lòng thử lại.")
          );
        })
        .finally(() => {
          if (mounted) setIsLoadingFlashContext(false);
        });
    loadFlashContext();
    const timer = window.setInterval(loadFlashContext, 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [flashModalOpen]);

  const guideOptions = [
    { value: "", label: "Chưa phân công HDV" },
    ...guides.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  const guideById = (guideId) => guides.find((g) => String(g.id) === String(guideId));

  const assignScheduleGuide = async (schedule, guideId) => {
    try {
      const response = await api.patch(`/tours/vendor/schedules/${schedule.id}/guide/`, {
        guide_id: guideId ? Number(guideId) : null,
      });
      const updated = response.data?.data;
      const selectedGuide = guideById(guideId);
      setTours((current) =>
        current.map((tour) => ({
          ...tour,
          schedules: (tour.schedules || []).map((item) =>
            item.id === schedule.id
              ? {
                  ...item,
                  ...updated,
                  guide_id: guideId ? Number(guideId) : null,
                  guide_name: selectedGuide?.name || updated?.guide_name || "",
                }
              : item
          ),
        }))
      );
      showToast("Đã cập nhật hướng dẫn viên cho chuyến đi.");
    } catch (error) {
      showToast(error.response?.data?.message || "Không thể cập nhật hướng dẫn viên.");
    }
  };

  const handleCreateTourSubmit = async (e) => {
    e.preventDefault();
    if (!newTourForm.title.trim()) {
      showToast("Vui lòng nhập tên trải nghiệm trekking.");
      return;
    }
    const payload = {
      title: newTourForm.title,
      description:
        newTourForm.description ||
        "Trải nghiệm trekking sinh thái bán đảo Sơn Trà cùng hướng dẫn viên địa phương.",
      price: Number(newTourForm.price),
      max_capacity: Number(newTourForm.max_capacity),
      difficulty_level: newTourForm.difficulty_level,
      duration_hours: Number(newTourForm.duration_hours),
      cover_image_url: newTourForm.cover_image_url,
      start_point: newTourForm.start_point,
      end_point: newTourForm.end_point,
      total_distance_km: Number(newTourForm.total_distance_km),
      elevation_gain_m: Number(newTourForm.elevation_gain_m),
      checkpoints: newTourForm.checkpoints || [],
      coordinates: newTourForm.coordinates || [],
      initial_schedule: {
        departure_date: newTourForm.initial_date.split("-").reverse().join("/"),
        time_slot: newTourForm.initial_time,
        guide_id: newTourForm.guide_id ? Number(newTourForm.guide_id) : null,
        guide_name: guideById(newTourForm.guide_id)?.name || "",
      },
    };
    try {
      const res = await api.post("/vendors/tours/", payload);
      if (res.data?.status === "success") {
        showToast(`Đã gửi trải nghiệm "${payload.title}" và đang chờ BQL phê duyệt.`);
        fetchTours();
      }
    } catch (err) {
      showToast(extractErrorMessage(err, "Không thể tạo trải nghiệm. Vui lòng thử lại."));
      return;
    }
    setCreateModalOpen(false);
    setWizardStep(1);
  };

  const handleAddScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTourForSchedule) return;
    const formattedDate = newScheduleForm.departure_date.split("-").reverse().join("/");
    try {
      await api.post(`/vendors/tours/${selectedTourForSchedule.id}/schedules/`, {
        departure_date: newScheduleForm.departure_date,
        time_slot: newScheduleForm.time_slot,
        max_capacity: Number(newScheduleForm.max_capacity),
        price: Number(newScheduleForm.price),
        guide_id: newScheduleForm.guide_id ? Number(newScheduleForm.guide_id) : null,
      });
      showToast(`Đã mở thêm chuyến khởi hành ngày ${formattedDate} thành công.`);
      await fetchTours();
    } catch (err) {
      showToast(extractErrorMessage(err, "Không thể mở thêm chuyến khởi hành."));
    }
    setAddScheduleModalOpen(false);
  };

  const handleOpenFlashSale = async (tour) => {
    if (checkingFlashTourId !== null) return;
    const basePrice = Number(tour.price || 400000);
    setSelectedTourForFlash(tour);
    setFlashPromoPrice(Math.round(basePrice * 0.85));
    setUsePriceTiers(false);
    setFlashTiers([
      { label: "Bậc 1", quantity: 4, price: Math.round(basePrice * 0.75) },
      { label: "Bậc 2", quantity: 6, price: Math.round(basePrice * 0.88) },
    ]);
    setFlashError("");
    setFlashLoginRequired(false);
    setCheckingFlashTourId(tour.id);
    try {
      const context = await flashSaleService.getVendorRegistrations();
      setFlashContext(context);
      if (!context.sessions || context.sessions.length === 0) {
        setNoFlashModalOpen(true);
        return;
      }
      setFlashSessionId(context.sessions[0]?.id || "");
      setFlashModalOpen(true);
    } catch (error) {
      setFlashContext({ sessions: [], registrations: [] });
      setFlashLoginRequired(error.response?.status === 401);
      setFlashError(
        error.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản đối tác."
          : extractErrorMessage(error, "Không tải được phiên Flash Sale. Vui lòng thử lại.")
      );
      setFlashModalOpen(true);
    } finally {
      setCheckingFlashTourId(null);
    }
  };

  const selectedFlashSession = flashContext.sessions.find(
    (s) => String(s.id) === String(flashSessionId)
  );
  const canUsePriceTiers = Boolean(selectedFlashSession?.dynamic_pricing_enabled);

  const handleRegisterFlashSale = async (e) => {
    e.preventDefault();
    if (!selectedTourForFlash || isSubmittingFlash || isLoadingFlashContext) return;
    setFlashError("");
    setFlashLoginRequired(false);
    if (selectedTourForFlash.status !== "published") {
      setFlashError("Tour cần được BQL phê duyệt và xuất bản trước khi đăng ký Flash Sale.");
      return;
    }
    if (!selectedFlashSession) {
      setFlashError("Vui lòng chọn phiên Flash Sale đang nhận đăng ký.");
      return;
    }

    const payload = {
      session_id: flashSessionId,
      tour_id: selectedTourForFlash.id,
    };

    if (canUsePriceTiers && usePriceTiers) {
      const tourPrice = Number(selectedTourForFlash.price);
      if (!Array.isArray(flashTiers) || flashTiers.length < 2) {
        setFlashError("Cần ít nhất 2 bậc giá khi bật chế độ chia bậc.");
        return;
      }
      let prevPrice = 0;
      let totalQty = 0;
      for (let i = 0; i < flashTiers.length; i += 1) {
        const tier = flashTiers[i];
        const qty = Number(tier.quantity);
        const price = Number(tier.price);
        if (!Number.isInteger(qty) || qty < 1) {
          setFlashError(`Số suất của bậc ${i + 1} phải là số nguyên lớn hơn 0.`);
          return;
        }
        if (!Number.isFinite(price) || price <= 0 || price >= tourPrice) {
          setFlashError(`Giá của bậc ${i + 1} phải lớn hơn 0 và thấp hơn giá niêm yết.`);
          return;
        }
        if (i > 0 && price <= prevPrice) {
          setFlashError(`Giá của bậc ${i + 1} phải cao hơn giá bậc ${i}.`);
          return;
        }
        prevPrice = price;
        totalQty += qty;
      }
      payload.price_tiers = flashTiers.map((tier, i) => ({
        label: String(tier.label || `Bậc ${i + 1}`).trim() || `Bậc ${i + 1}`,
        quantity: Number(tier.quantity),
        price: Number(tier.price),
      }));
      payload.promo_price = payload.price_tiers[0].price;
      payload.slot_quantity = totalQty;
    } else {
      if (
        !Number.isFinite(flashPromoPrice) ||
        flashPromoPrice <= 0 ||
        flashPromoPrice >= Number(selectedTourForFlash.price)
      ) {
        setFlashError("Giá ưu đãi phải lớn hơn 0 và thấp hơn giá niêm yết.");
        return;
      }
      if (!Number.isInteger(flashSlotQty) || flashSlotQty < 1 || flashSlotQty > 100) {
        setFlashError("Số suất phải là số nguyên từ 1 đến 100.");
        return;
      }
      payload.promo_price = flashPromoPrice;
      payload.slot_quantity = flashSlotQty;
    }

    setIsSubmittingFlash(true);
    try {
      const result = await flashSaleService.registerTourItem(payload);
      showToast(result.message || "Đã gửi đăng ký và đang chờ BQL duyệt.");
      setFlashModalOpen(false);
    } catch (err) {
      setFlashLoginRequired(err.response?.status === 401);
      setFlashError(extractErrorMessage(err, "Không thể gửi đăng ký Flash Sale."));
    } finally {
      setIsSubmittingFlash(false);
    }
  };

  const filteredTours = tours.filter((t) => {
    if (selectedDifficulty !== "all" && t.difficulty_level !== selectedDifficulty) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const activeRouteTour =
    selectedRouteForView ||
    filteredTours[0] ||
    tours[0] ||
    null;

  const flashSessionOptions = flashContext.sessions.map((s) => ({
    value: String(s.id),
    label: s.title || `Phiên #${s.id}`,
  }));

  return (
    <div className="sr-page">
      <PageHeader
        title="Trải nghiệm & Tuyến GPS"
        subtitle="Quản lý sản phẩm trekking, mở chuyến khởi hành, cấu hình checkpoint QR và đăng ký Flash sale."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-tabs" role="tablist" aria-label="Chế độ xem">
              <button
                type="button"
                role="tab"
                aria-selected={!isRoutesView}
                onClick={() => navigate("/vendor/experiences")}
                className={`sr-tab ${!isRoutesView ? "is-selected" : ""}`}
              >
                Danh sách trải nghiệm
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRoutesView}
                onClick={() => navigate("/vendor/experiences?view=routes")}
                className={`sr-tab ${isRoutesView ? "is-selected" : ""}`}
              >
                Bản đồ tuyến &amp; GPS
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                setCreateModalOpen(true);
              }}
              className="sr-btn sr-btn-primary"
            >
              <Plus size={15} aria-hidden="true" />
              <span>{VENDOR_LABELS.CREATE_EXPERIENCE}</span>
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div role="status" className="sr-callout sr-callout-moss justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="sr-btn sr-btn-sm sr-btn-ghost"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="sr-toolbar">
        <div className="sr-search-box !flex w-full md:w-80">
          <Search size={14} aria-hidden="true" />
          <input
            type="text"
            aria-label="Tìm tên trải nghiệm, địa điểm"
            placeholder="Tìm tên trải nghiệm, địa điểm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sr-toolbar-group">
          <SaasSelect
            label="Độ khó"
            value={selectedDifficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={setSelectedDifficulty}
          />
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-12 text-center text-sm text-[var(--sr-text-muted)]">
          Đang tải danh sách trải nghiệm...
        </p>
      ) : filteredTours.length === 0 ? (
        <section className="sr-surface py-12 text-center flex flex-col items-center gap-3">
          <Compass size={28} className="text-[var(--sr-text-muted)]" aria-hidden="true" />
          <p className="font-semibold text-[var(--sr-text-primary)]">
            Chưa có trải nghiệm nào phù hợp
          </p>
          <p className="text-xs text-[var(--sr-text-muted)]">
            Tạo trải nghiệm mới và thiết lập tọa độ checkpoint để gửi BQL Sơn Trà phê duyệt.
          </p>
          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setCreateModalOpen(true);
            }}
            className="sr-btn sr-btn-primary mt-2"
          >
            <Plus size={15} aria-hidden="true" />
            <span>{VENDOR_LABELS.CREATE_EXPERIENCE}</span>
          </button>
        </section>
      ) : isRoutesView ? (
        <div className="sr-split-detail">
          <div className="flex flex-col gap-3">
            {filteredTours.map((tour) => {
              const selected = activeRouteTour?.id === tour.id;
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setSelectedRouteForView(tour)}
                  className={`sr-card-item text-left cursor-pointer ${selected ? "is-selected" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--sr-text-primary)]">{tour.title}</span>
                    <span className="sr-badge sr-badge-moss sr-tabular">
                      {tour.total_distance_km || 4.2} km
                    </span>
                  </div>
                  <p className="text-xs text-[var(--sr-text-muted)]">
                    {tour.start_point || "Sơn Trà"} tới {tour.end_point || "Đỉnh Bàn Cờ"} ·{" "}
                    {(tour.checkpoints || []).length} trạm kiểm soát QR
                  </p>
                </button>
              );
            })}
          </div>

          {activeRouteTour && (
            <section className="sr-surface flex flex-col gap-4">
              <div>
                <span className="sr-eyebrow">Bản đồ tuyến GPS &amp; Checkpoint</span>
                <h2 className="sr-h2 mt-1">{activeRouteTour.title}</h2>
                <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                  Cự ly {activeRouteTour.total_distance_km || 4.2} km · Độ cao tích lũy{" "}
                  {activeRouteTour.elevation_gain_m || 350} m
                </p>
              </div>
              <RouteMapPreview
                coordinates={activeRouteTour.coordinates}
                checkpoints={activeRouteTour.checkpoints}
                height={320}
              />
            </section>
          )}
        </div>
      ) : (
        <div className="sr-split-detail">
          <div className="flex flex-col gap-4">
            {filteredTours.map((tour) => {
              const [stLabel, stCls] = STATUS_BADGES[tour.status] || STATUS_BADGES.draft;
              const isSelected = activeRouteTour?.id === tour.id;
              return (
                <article
                  key={tour.id}
                  className={`sr-card-item ${isSelected ? "is-selected" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`sr-badge ${stCls}`}>
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{stLabel}</span>
                        </span>
                        <span className="sr-badge sr-badge-neutral">
                          {DIFF_LABELS[tour.difficulty_level] || VENDOR_LABELS.DIFF_MODERATE}
                        </span>
                      </div>

                      <h2 className="sr-h2">{tour.title}</h2>

                      <p className="text-xs text-[var(--sr-text-muted)] flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} aria-hidden="true" />
                          {tour.total_distance_km || 4.2} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" />
                          {tour.duration_hours || 4} giờ
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers size={12} aria-hidden="true" />
                          {(tour.checkpoints || []).length} checkpoint GPS
                        </span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-semibold text-[var(--sr-text-primary)] sr-tabular">
                        {formatMoney(tour.price)}
                      </p>
                      <p className="text-xs text-[var(--sr-text-muted)]">mỗi khách</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sr-border)] pt-3">
                    <span className="text-xs font-medium text-[var(--sr-text-secondary)]">
                      {(tour.schedules || []).length} chuyến khởi hành đang mở
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRouteForView(tour)}
                        className="sr-btn sr-btn-sm sr-btn-ghost"
                      >
                        <Eye size={13} aria-hidden="true" />
                        <span>Xem tuyến</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTourModal(tour)}
                        className="sr-btn sr-btn-sm sr-btn-secondary"
                      >
                        <span>Quản lý chuyến</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFlashSale(tour)}
                        disabled={checkingFlashTourId === tour.id}
                        className="sr-btn sr-btn-sm sr-btn-secondary"
                      >
                        <Zap size={13} aria-hidden="true" />
                        <span>{checkingFlashTourId === tour.id ? "Đang kiểm tra..." : "Flash sale"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTourForSchedule(tour);
                          setNewScheduleForm((prev) => ({
                            ...prev,
                            price: tour.price || 450000,
                            max_capacity: tour.max_capacity || 15,
                          }));
                          setAddScheduleModalOpen(true);
                        }}
                        className="sr-btn sr-btn-sm sr-btn-primary"
                      >
                        <Calendar size={13} aria-hidden="true" />
                        <span>{VENDOR_LABELS.OPEN_SCHEDULE}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right Inspector: Route & Checkpoint GPS */}
          {activeRouteTour && (
            <aside className="sr-surface flex flex-col gap-4">
              <div>
                <span className="sr-eyebrow">Chi tiết tuyến đang chọn</span>
                <h2 className="sr-h2 mt-1">{activeRouteTour.title}</h2>
                <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
                  {activeRouteTour.start_point || "Bán đảo Sơn Trà"} ·{" "}
                  {activeRouteTour.total_distance_km || 4.2} km
                </p>
              </div>

              <RouteMapPreview
                coordinates={activeRouteTour.coordinates}
                checkpoints={activeRouteTour.checkpoints}
                height={200}
              />

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-[var(--sr-text-primary)]">
                  Trạm kiểm soát QR / GPS ({(activeRouteTour.checkpoints || []).length})
                </h3>
                {(activeRouteTour.checkpoints || []).length === 0 ? (
                  <p className="text-xs text-[var(--sr-text-muted)]">
                    Chưa có trạm kiểm soát nào được cấu hình cho tuyến này.
                  </p>
                ) : (
                  (activeRouteTour.checkpoints || []).map((cp, idx) => (
                    <div key={cp.id || idx} className="sr-kv-row">
                      <span className="font-medium text-[var(--sr-text-primary)]">
                        CP-{String(idx + 1).padStart(2, "0")} · {cp.name || cp.title}
                      </span>
                      <span className="text-xs font-semibold text-[var(--sr-accent-ink)]">
                        QR xác thực
                      </span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Modal: Create Experience Wizard */}
      {createModalOpen && (
        <div className="sr-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-exp-title">
          <form onSubmit={handleCreateTourSubmit} className="sr-modal-panel">
            <header className="flex items-center justify-between border-b border-[var(--sr-border)] px-5 py-4">
              <div>
                <h2 id="create-exp-title" className="sr-h2">{VENDOR_LABELS.CREATE_EXPERIENCE}</h2>
                <p className="text-xs text-[var(--sr-text-muted)]">Bước {wizardStep} / 3</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Đóng hộp thoại tạo trải nghiệm"
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {wizardStep === 1 && (
                <>
                  <div className="sr-field">
                    <label className="sr-field-label" htmlFor="exp-title">Tên trải nghiệm</label>
                    <input
                      id="exp-title"
                      className="sr-input"
                      required
                      value={newTourForm.title}
                      onChange={(e) => setNewTourForm({ ...newTourForm, title: e.target.value })}
                      placeholder="Ví dụ: Chinh phục Đỉnh Bàn Cờ - Rừng sương sớm"
                    />
                  </div>
                  <div className="sr-field">
                    <label className="sr-field-label" htmlFor="exp-desc">Mô tả trải nghiệm</label>
                    <textarea
                      id="exp-desc"
                      className="sr-textarea"
                      rows={3}
                      value={newTourForm.description}
                      onChange={(e) => setNewTourForm({ ...newTourForm, description: e.target.value })}
                      placeholder="Mô tả lộ trình, điểm nổi bật sinh thái và lưu ý an toàn..."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sr-field">
                      <label className="sr-field-label" htmlFor="exp-price">Giá niêm yết (VND)</label>
                      <input
                        id="exp-price"
                        className="sr-input"
                        type="number"
                        min="50000"
                        value={newTourForm.price}
                        onChange={(e) => setNewTourForm({ ...newTourForm, price: e.target.value })}
                      />
                    </div>
                    <div className="sr-field">
                      <label className="sr-field-label" htmlFor="exp-cap">Sức chứa tối đa</label>
                      <input
                        id="exp-cap"
                        className="sr-input"
                        type="number"
                        min="1"
                        max="50"
                        value={newTourForm.max_capacity}
                        onChange={(e) =>
                          setNewTourForm({ ...newTourForm, max_capacity: e.target.value })
                        }
                      />
                    </div>
                    <div className="sr-field">
                      <span className="sr-field-label">Cấp độ khó</span>
                      <SaasSelect
                        label=""
                        value={newTourForm.difficulty_level}
                        options={CREATE_DIFFICULTY_OPTIONS}
                        onChange={(val) =>
                          setNewTourForm({ ...newTourForm, difficulty_level: val })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sr-field">
                      <label className="sr-field-label" htmlFor="exp-start">Điểm xuất phát</label>
                      <input
                        id="exp-start"
                        className="sr-input"
                        value={newTourForm.start_point}
                        onChange={(e) =>
                          setNewTourForm({ ...newTourForm, start_point: e.target.value })
                        }
                      />
                    </div>
                    <div className="sr-field">
                      <label className="sr-field-label" htmlFor="exp-end">Điểm kết thúc</label>
                      <input
                        id="exp-end"
                        className="sr-input"
                        value={newTourForm.end_point}
                        onChange={(e) =>
                          setNewTourForm({ ...newTourForm, end_point: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <RouteMapPicker
                    checkpoints={newTourForm.checkpoints}
                    onChange={(updatedCheckpoints) =>
                      setNewTourForm((prev) => ({
                        ...prev,
                        checkpoints: updatedCheckpoints,
                      }))
                    }
                    onDistanceChange={(km) =>
                      setNewTourForm((prev) => ({ ...prev, total_distance_km: km }))
                    }
                    onElevationChange={(gain) =>
                      setNewTourForm((prev) => ({ ...prev, elevation_gain_m: gain }))
                    }
                    onDetailedRoute={(coords) =>
                      setNewTourForm((prev) => ({ ...prev, coordinates: coords }))
                    }
                  />
                </>
              )}

              {wizardStep === 3 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sr-field">
                    <label className="sr-field-label" htmlFor="exp-init-date">Ngày khởi hành đầu tiên</label>
                    <input
                      id="exp-init-date"
                      className="sr-input"
                      type="date"
                      value={newTourForm.initial_date}
                      onChange={(e) =>
                        setNewTourForm({ ...newTourForm, initial_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="sr-field">
                    <span className="sr-field-label">Khung giờ khởi hành</span>
                    <SaasSelect
                      label=""
                      value={newTourForm.initial_time}
                      options={TIME_SLOT_OPTIONS}
                      onChange={(val) => setNewTourForm({ ...newTourForm, initial_time: val })}
                    />
                  </div>
                  <div className="sr-field sm:col-span-2">
                    <span className="sr-field-label">Hướng dẫn viên phụ trách</span>
                    <SaasSelect
                      label=""
                      value={String(newTourForm.guide_id || "")}
                      options={guideOptions}
                      onChange={(val) => setNewTourForm({ ...newTourForm, guide_id: val })}
                    />
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  wizardStep > 1 ? setWizardStep((s) => s - 1) : setCreateModalOpen(false)
                }
                className="sr-btn sr-btn-secondary"
              >
                {wizardStep > 1 ? "Quay lại" : "Hủy"}
              </button>
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => s + 1)}
                  className="sr-btn sr-btn-primary"
                >
                  Tiếp tục
                </button>
              ) : (
                <button type="submit" className="sr-btn sr-btn-primary">
                  Gửi BQL phê duyệt
                </button>
              )}
            </footer>
          </form>
        </div>
      )}

      {/* Modal: Add Schedule */}
      {addScheduleModalOpen && selectedTourForSchedule && (
        <div className="sr-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-sched-title">
          <form onSubmit={handleAddScheduleSubmit} className="sr-modal-panel max-w-lg">
            <header className="flex items-center justify-between border-b border-[var(--sr-border)] px-5 py-4">
              <div>
                <h2 id="add-sched-title" className="sr-h2">{VENDOR_LABELS.OPEN_SCHEDULE}</h2>
                <p className="text-xs text-[var(--sr-text-muted)]">{selectedTourForSchedule.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddScheduleModalOpen(false)}
                aria-label="Đóng hộp thoại mở chuyến"
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-5 flex flex-col gap-4">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="sched-date">Ngày khởi hành</label>
                <input
                  id="sched-date"
                  type="date"
                  className="sr-input"
                  required
                  value={newScheduleForm.departure_date}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, departure_date: e.target.value })
                  }
                />
              </div>
              <div className="sr-field">
                <span className="sr-field-label">Khung giờ</span>
                <SaasSelect
                  label=""
                  value={newScheduleForm.time_slot}
                  options={TIME_SLOT_OPTIONS}
                  onChange={(val) => setNewScheduleForm({ ...newScheduleForm, time_slot: val })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sr-field">
                  <label className="sr-field-label" htmlFor="sched-cap">Số chỗ tối đa</label>
                  <input
                    id="sched-cap"
                    type="number"
                    min="1"
                    max="50"
                    className="sr-input"
                    value={newScheduleForm.max_capacity}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, max_capacity: e.target.value })
                    }
                  />
                </div>
                <div className="sr-field">
                  <label className="sr-field-label" htmlFor="sched-price">Giá chuyến (VND)</label>
                  <input
                    id="sched-price"
                    type="number"
                    min="50000"
                    className="sr-input"
                    value={newScheduleForm.price}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="sr-field">
                <span className="sr-field-label">Hướng dẫn viên phụ trách</span>
                <SaasSelect
                  label=""
                  value={String(newScheduleForm.guide_id || "")}
                  options={guideOptions}
                  onChange={(val) => setNewScheduleForm({ ...newScheduleForm, guide_id: val })}
                />
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
              <button
                type="button"
                onClick={() => setAddScheduleModalOpen(false)}
                className="sr-btn sr-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" className="sr-btn sr-btn-primary">
                Xác nhận mở chuyến
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal: No Flash Sale Available */}
      {noFlashModalOpen && (
        <div className="sr-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="no-flash-title">
          <div
            className="sr-modal-panel w-full"
            style={{ maxWidth: "580px", borderRadius: "12px" }}
          >
            <header className="flex items-center justify-between gap-4 border-b border-[var(--sr-border)]/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Zap size={19} className="shrink-0 text-black" aria-hidden="true" />
                <h2 id="no-flash-title" className="text-base font-semibold leading-none text-[var(--sr-text-primary)]">
                  Thông báo Flash Sale
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNoFlashModalOpen(false)}
                aria-label="Đóng thông báo Flash Sale"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--sr-border)] text-[var(--sr-text-secondary)] transition-colors hover:bg-[var(--sr-bg-page)] hover:text-[var(--sr-text-primary)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="flex flex-col gap-1.5 px-6 py-5">
              <p className="text-[17px] font-semibold leading-snug text-[var(--sr-text-primary)]">
                Chưa có Flash Sale nào đang mở
              </p>
              <p className="text-sm leading-relaxed text-[var(--sr-text-secondary)]">
                Vui lòng quay lại sau nhé!
              </p>
            </div>

            <footer className="flex items-center justify-end border-t border-[var(--sr-border)]/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setNoFlashModalOpen(false)}
                className="sr-btn sr-btn-primary h-10 min-h-[40px] px-5"
              >
                Đã hiểu
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal: Flash Sale Registration */}
      {flashModalOpen && selectedTourForFlash && (
        <div className="sr-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="flash-title">
          <form onSubmit={handleRegisterFlashSale} className="sr-modal-panel max-w-lg">
            <header className="flex items-center justify-between border-b border-[var(--sr-border)] px-5 py-4">
              <div>
                <h2 id="flash-title" className="sr-h2">Đăng ký phiên Flash Sale</h2>
                <p className="text-xs text-[var(--sr-text-muted)]">{selectedTourForFlash.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setFlashModalOpen(false)}
                aria-label="Đóng hộp thoại Flash Sale"
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-5 flex flex-col gap-4">
              {flashError && (
                <div role="alert" className="sr-callout sr-callout-urgent">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex flex-col gap-1">
                    <span>{flashError}</span>
                    {flashLoginRequired && (
                      <button
                        type="button"
                        onClick={() => navigate("/partner/login")}
                        className="sr-btn sr-btn-sm sr-btn-secondary self-start mt-1"
                      >
                        Đăng nhập lại
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="sr-field">
                <span className="sr-field-label">Chọn phiên Flash Sale đang mở</span>
                {flashSessionOptions.length > 0 ? (
                  <SaasSelect
                    label=""
                    value={String(flashSessionId)}
                    options={flashSessionOptions}
                    onChange={setFlashSessionId}
                  />
                ) : (
                  <p className="text-xs text-[var(--sr-text-muted)]">
                    {isLoadingFlashContext
                      ? "Đang tải danh sách phiên Flash Sale..."
                      : "Hiện chưa có phiên Flash Sale nào đang nhận đăng ký."}
                  </p>
                )}
              </div>

              {canUsePriceTiers && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-3.5 py-2.5">
                  <div>
                    <span className="text-xs font-semibold text-[var(--sr-accent-ink)] block">
                      Phiên này hỗ trợ định giá theo bậc
                    </span>
                    <span className="text-[11px] text-[var(--sr-text-secondary)]">
                      Chia suất giá rẻ nhất cho người đặt sớm, tự tăng giá ở bậc kế tiếp
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={usePriceTiers}
                    onClick={() => setUsePriceTiers((v) => !v)}
                    className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
                  >
                    {usePriceTiers ? "Đang bật chia bậc" : "Bật chia bậc giá"}
                  </button>
                </div>
              )}

              {canUsePriceTiers && usePriceTiers ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="sr-field-label">Cấu hình các bậc giá (Giá gốc: {formatMoney(selectedTourForFlash.price)})</span>
                    {flashTiers.length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const last = flashTiers[flashTiers.length - 1];
                          setFlashTiers((prev) => [
                            ...prev,
                            {
                              label: `Bậc ${prev.length + 1}`,
                              quantity: 4,
                              price: Math.min(
                                Math.max(1000, Number(selectedTourForFlash.price) - 10000),
                                Number(last?.price || flashPromoPrice) + 30000
                              ),
                            },
                          ]);
                        }}
                        className="sr-btn sr-btn-sm sr-btn-secondary"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Thêm bậc</span>
                      </button>
                    )}
                  </div>
                  {flashTiers.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded-xl border border-[var(--sr-border)] p-2.5 bg-[var(--sr-bg-page)]">
                      <div className="col-span-3">
                        <label className="text-[11px] font-medium text-[var(--sr-text-muted)] block mb-1">Nhãn bậc</label>
                        <input
                          type="text"
                          className="sr-input text-xs"
                          value={tier.label}
                          onChange={(e) =>
                            setFlashTiers((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row))
                            )
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[11px] font-medium text-[var(--sr-text-muted)] block mb-1">Số suất</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          className="sr-input text-xs"
                          value={tier.quantity}
                          onChange={(e) =>
                            setFlashTiers((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, quantity: Number(e.target.value) } : row))
                            )
                          }
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[11px] font-medium text-[var(--sr-text-muted)] block mb-1">Giá ưu đãi (VND)</label>
                        <input
                          type="number"
                          min="1000"
                          className="sr-input text-xs"
                          value={tier.price}
                          onChange={(e) =>
                            setFlashTiers((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, price: Number(e.target.value) } : row))
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {flashTiers.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Xóa bậc ${idx + 1}`}
                            onClick={() => setFlashTiers((prev) => prev.filter((_, i) => i !== idx))}
                            className="sr-btn sr-btn-sm sr-btn-secondary"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-[var(--sr-text-muted)]">
                    Tổng số suất: <strong>{flashTiers.reduce((acc, row) => acc + (Number(row.quantity) || 0), 0)} suất</strong> · Giá khởi điểm: <strong>{formatMoney(flashTiers[0]?.price || 0)}</strong>
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sr-field">
                    <label className="sr-field-label" htmlFor="flash-price">Giá ưu đãi (VND)</label>
                    <input
                      id="flash-price"
                      type="number"
                      className="sr-input"
                      value={flashPromoPrice}
                      onChange={(e) => setFlashPromoPrice(Number(e.target.value))}
                    />
                    <span className="text-xs text-[var(--sr-text-muted)]">
                      Giá gốc: {formatMoney(selectedTourForFlash.price)}
                    </span>
                  </div>
                  <div className="sr-field">
                    <label className="sr-field-label" htmlFor="flash-qty">Số suất ưu đãi</label>
                    <input
                      id="flash-qty"
                      type="number"
                      min="1"
                      max="100"
                      className="sr-input"
                      value={flashSlotQty}
                      onChange={(e) => setFlashSlotQty(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
              <button
                type="button"
                onClick={() => setFlashModalOpen(false)}
                className="sr-btn sr-btn-secondary"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmittingFlash || isLoadingFlashContext || flashSessionOptions.length === 0}
                className="sr-btn sr-btn-primary"
              >
                <Zap size={14} aria-hidden="true" />
                <span>{isSubmittingFlash ? "Đang gửi..." : "Gửi đăng ký BQL"}</span>
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal: Tour Detail & Schedule Guide Assignment */}
      {detailTourModal && (
        <div className="sr-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="detail-exp-title">
          <div className="sr-modal-panel">
            <header className="flex items-center justify-between border-b border-[var(--sr-border)] px-5 py-4">
              <div>
                <h2 id="detail-exp-title" className="sr-h2">{detailTourModal.title}</h2>
                <p className="text-xs text-[var(--sr-text-muted)]">
                  Quản lý các chuyến khởi hành và phân công hướng dẫn viên
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTourModal(null)}
                aria-label="Đóng chi tiết trải nghiệm"
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {(detailTourModal.schedules || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--sr-text-muted)]">
                  Chưa có chuyến khởi hành nào. Hãy nhấn Mở chuyến mới để tạo lịch.
                </p>
              ) : (
                <div className="sr-table-wrap">
                  <table className="sr-table">
                    <thead>
                      <tr>
                        <th scope="col">Ngày khởi hành</th>
                        <th scope="col">Khung giờ</th>
                        <th scope="col">Đã đặt</th>
                        <th scope="col">Hướng dẫn viên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailTourModal.schedules || []).map((sch) => (
                        <tr key={sch.id}>
                          <td className="font-semibold text-[var(--sr-text-primary)] sr-tabular">
                            {sch.departure_date}
                          </td>
                          <td className="sr-tabular">{sch.time_slot}</td>
                          <td className="sr-tabular">
                            {sch.booked_slots || 0} / {sch.max_capacity || 15}
                          </td>
                          <td>
                            <SaasSelect
                              label=""
                              value={String(sch.guide_id || "")}
                              options={guideOptions}
                              onChange={(val) => assignScheduleGuide(sch, val)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <footer className="flex justify-end border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
              <button
                type="button"
                onClick={() => setDetailTourModal(null)}
                className="sr-btn sr-btn-secondary"
              >
                Đóng
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorExperiencesPage;
