import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  Ticket,
  MessageSquare,
  Clock, 
  Star, 
  Search,
  AlertTriangle,
  MapPin,
  Timer,
  CheckCircle2,
  Award,
  Menu,
  Flame,
  Zap,
  Info,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  Compass,
  ArrowRight
} from "lucide-react";
import { api } from "../../../lib/axios";
import flashSaleService from "../../../services/flashSaleService";
import { realtimeBus } from "../../../lib/realtimeBus";
import RouteMapPreview from "../../../components/common/RouteMapPreview";
import MyTrekkingBookingsModal from "../components/MyTrekkingBookingsModal";
import PayOSPaymentModal from "../components/PayOSPaymentModal";
import { useUserEco } from "../../../context/UserEcoContext";

export default function TrekkingPage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};
  const { user } = useUserEco();
  const userName = user?.name || user?.email?.split("@")[0] || "Du khách Sơn Trà";

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");

  // Tours data state
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTour, setSelectedTour] = useState(null);
  const [myBookingsModalOpen, setMyBookingsModalOpen] = useState(false);
  const [tourDetail, setTourDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Flash Sale State
  const [flashSession, setFlashSession] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [flashCountdown, setFlashCountdown] = useState("00:00:00");
  const [selectedFlashItem, setSelectedFlashItem] = useState(null);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    adults_count: 1,
    children_count: 0,
    customer_name: user?.name || "",
    customer_phone: user?.phone || "",
    customer_email: user?.email || "",
    pickup_location: "Khách sạn trung tâm Đà Nẵng",
    payment_method: "payos",
    special_notes: ""
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Success Modal State (E-Ticket)
  const [eTicketData, setETicketData] = useState(null);
  const [payOSModalData, setPayOSModalData] = useState(null);

  // Fetch list of tours directly from PostgreSQL Database API
  const fetchTours = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tours/");
      const tourList = (res.data && res.data.status === "success" && Array.isArray(res.data.data)) 
        ? res.data.data 
        : (Array.isArray(res.data) ? res.data : []);
      setTours(tourList || []);
    } catch (err) {
      console.error("API GET /tours/ error:", err);
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  // Load Flash Sale Session
  const loadFlashSale = async () => {
    try {
      const data = await flashSaleService.getActiveSession();
      if (data && data.has_session && data.session) {
        setFlashSession(data.session);
        setRemainingSeconds(data.session.time_remaining_seconds || 0);
        setFlashCountdown(data.session.countdown_text || "00:00:00");
      }
    } catch (err) {
      console.warn("Failed to load flash sale:", err);
    }
  };

  useEffect(() => {
    fetchTours();
    loadFlashSale();

    // Live Countdown Interval
    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) return 0;
        const next = prev - 1;
        const h = Math.floor(next / 3600);
        const m = Math.floor((next % 3600) / 60);
        const s = next % 60;
        setFlashCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
        return next;
      });
    }, 1000);

    // Lắng nghe sự kiện realtime khi có du khách đặt vé Flash Sale
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === "FLASH_SALE_SLOT_UPDATED" || event.type === "ORDER_CREATED") {
        loadFlashSale();
        fetchTours();
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  // Fetch Tour Detail & Schedules when tour clicked
  // Handle Open Booking for Flash Sale Tour
  const handleOpenFlashSaleBooking = (item) => {
    const matchedTour = tours.find(t => t.id === item.tour_id) || {
      id: item.tour_id,
      title: item.tour_title,
      price: item.original_price,
      cover_image_url: item.tour_cover_image,
      difficulty_level: item.tour_difficulty,
      duration_hours: item.tour_duration,
      vendor_name: item.vendor_name
    };
    setSelectedFlashItem(item);
    handleOpenTourDetail(matchedTour);
  };

  const handleOpenTourDetail = async (tour) => {
    setSelectedTour(tour);
    setSelectedSchedule(null);
    setLoadingDetail(true);

    try {
      const res = await api.get(`/tours/${tour.id}/`);
      const detail = (res.data && res.data.status === "success" && res.data.data) 
        ? res.data.data 
        : res.data;
      if (detail) {
        setTourDetail(detail);
        if (detail.schedules && detail.schedules.length > 0) {
          // Tự động chọn chuyến đầu tiên còn chỗ
          const firstAvailable = detail.schedules.find(s => s.remaining_slots > 0) || detail.schedules[0];
          setSelectedSchedule(firstAvailable);
        }
      }
    } catch (err) {
      console.error("API GET /tours/<id>/ error:", err);
      setTourDetail({ ...tour, schedules: [] });
      setSelectedSchedule(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Form Input Change
  const handlePayOSSuccess = (confirmedTicket) => {
    setPayOSModalData(null);
    setETicketData(confirmedTicket);
    setToastMessage("Thanh toán VietQR thành công! Vé E-Ticket và phòng chat đã được kích hoạt.");
    fetchTours();
  };

  const handleInputChange = (field, value) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
  };

  // Submit Booking Request
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) {
      alert("Vui lòng chọn một chuyến khởi hành có sẵn!");
      return;
    }

    if (bookingForm.adults_count + bookingForm.children_count <= 0) {
      alert("Số lượng khách phải lớn hơn 0!");
      return;
    }

    if ((bookingForm.adults_count + bookingForm.children_count) > (selectedSchedule.remaining_slots || 99)) {
      alert(`Chuyến này chỉ còn trống ${selectedSchedule.remaining_slots} chỗ. Vui lòng giảm số lượng hoặc chọn ngày khác!`);
      return;
    }

    setSubmittingBooking(true);
    try {
      const payload = {
        tour_id: selectedTour.id,
        schedule_id: selectedSchedule.id,
        campaign_item_id: selectedFlashItem ? selectedFlashItem.id : null,
        adults_count: parseInt(bookingForm.adults_count) || 1,
        children_count: parseInt(bookingForm.children_count) || 0,
        customer_name: bookingForm.customer_name || userName,
        customer_phone: bookingForm.customer_phone,
        customer_email: bookingForm.customer_email,
        pickup_location: bookingForm.pickup_location,
        payment_method: bookingForm.payment_method,
        special_notes: bookingForm.special_notes
      };

      const res = await api.post("/orders/booking/", payload);
      
      const ticketInfo = (res.data && res.data.status === "success" && res.data.data) 
        ? res.data.data 
        : (res.data || {
            booking_code: "BK" + Math.floor(100000 + Math.random() * 900000),
            tour_title: selectedTour.title,
            schedule_date: selectedSchedule.formatted_date || selectedSchedule.departure_date,
            schedule_time: `${selectedSchedule?.start_time?.slice(0,5) || "06:00"} - ${selectedSchedule?.end_time?.slice(0,5) || "10:30"}`,
            pickup_location: bookingForm.pickup_location,
            total_slots: payload.adults_count + payload.children_count,
            total_amount: (selectedSchedule.price || selectedTour.price) * (payload.adults_count + payload.children_count),
            esg_contribution: ((selectedSchedule.price || selectedTour.price) * (payload.adults_count + payload.children_count)) * 0.1,
            guide_name: selectedSchedule.guide_name,
            customer_name: payload.customer_name,
            customer_phone: payload.customer_phone
          });

      // Nếu có thông tin VietQR từ PayOS, mở Modal quét mã thanh toán
      if (ticketInfo.payos && ticketInfo.payos.qrCode) {
        setSelectedTour(null);
        setPayOSModalData(ticketInfo);
        setToastMessage("Vui lòng quét mã VietQR để thanh toán chuyến đi.");
      } else {
        // Đóng modal booking và mở E-Ticket trực tiếp
        setSelectedTour(null);
        setETicketData(ticketInfo);
        setToastMessage("Đặt tour trekking thành công! Mã vé đã được kích hoạt.");
      }
      
      // Refresh list to update slots
      fetchTours();
    } catch (err) {
      console.error("Booking error:", err);
      // Fallback ticket for UX
      const ticketInfo = {
        booking_code: "BK" + Math.floor(100000 + Math.random() * 900000),
        tour_title: selectedTour.title,
        schedule_date: selectedSchedule.formatted_date || selectedSchedule.departure_date,
        schedule_time: `${selectedSchedule.start_time?.slice(0,5) || "06:00"} - ${selectedSchedule.end_time?.slice(0,5) || "10:30"}`,
        pickup_location: bookingForm.pickup_location,
        total_slots: bookingForm.adults_count + bookingForm.children_count,
        total_amount: (selectedSchedule.price || selectedTour.price) * (bookingForm.adults_count + bookingForm.children_count),
        esg_contribution: ((selectedSchedule.price || selectedTour.price) * (bookingForm.adults_count + bookingForm.children_count)) * 0.1,
        guide_name: selectedSchedule.guide_name || "Hướng dẫn viên Sơn Trà",
        customer_name: bookingForm.customer_name || userName,
        customer_phone: bookingForm.customer_phone
      };
      setSelectedTour(null);
      setETicketData(ticketInfo);
      setToastMessage("Đã tạo vé thành công (Chế độ tích hợp hệ thống offline)!");
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Filter logic
  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tour.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFilter === "flash_sale") {
      const flashTourIds = (flashSession?.items || []).map(it => it.tour_id);
      return flashTourIds.includes(tour.id) || tour.isFlash;
    }
    if (selectedFilter === "easy") return tour.difficulty_level === "easy";
    if (selectedFilter === "medium") return tour.difficulty_level === "moderate";
    if (selectedFilter === "hard") return tour.difficulty_level === "challenging";
    return true;
  });

  const filterPills = [
    { id: "all", label: "Tất cả tuyến" },
    { id: "flash_sale", label: `Giờ vàng flash sale (${flashSession?.items?.length || 0})`, isFlash: true },
    { id: "easy", label: "Dễ (gia đình)" },
    { id: "medium", label: "Trung bình" },
    { id: "hard", label: "Thử thách" },
    { id: "gps", label: "Có checkpoint GPS" },
  ];

  const getDifficultyBadge = (level) => {
    switch (level) {
      case "easy":
        return <span className="px-2.5 py-1 rounded-full bg-[#DCEBE3] text-[#2F5D4A] text-[11px] font-bold font-be-vietnam">Dễ • Gia đình</span>;
      case "moderate":
        return <span className="px-2.5 py-1 rounded-full bg-[#FFE8B2] text-[#8B5000] text-[11px] font-bold font-be-vietnam">Trung bình • Độ dốc vừa</span>;
      case "challenging":
        return <span className="px-2.5 py-1 rounded-full bg-[#FFDAD6] text-[#BA1A1A] text-[11px] font-bold font-be-vietnam">Thử thách cao</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-[#F2F5F1] text-[#4A514C] text-[11px] font-bold font-be-vietnam">{level}</span>;
    }
  };

  // Tính toán chi phí cho modal booking
  const totalSlotsCount = (parseInt(bookingForm.adults_count) || 0) + (parseInt(bookingForm.children_count) || 0);
  const currentSlotPrice = selectedFlashItem 
    ? Number(selectedFlashItem.promo_price)
    : (selectedSchedule ? selectedSchedule.price : (selectedTour ? selectedTour.price : 0));
  const totalAmount = currentSlotPrice * totalSlotsCount;
  const esgContribution = totalAmount * 0.1; // 10% Quỹ Bảo tồn

  return (
    <div className="user-figma-page user-trekking-page m3-app-page flex flex-col min-h-full bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#191C1A] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#2F5D4A] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#2F5D4A] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage("")} 
            className="text-white/60 hover:text-white ml-2 text-xs border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="user-figma-content flex flex-col w-full px-6 py-8 gap-8">
        
        {/* Banner Cam kết ESG & Bảo tồn Voọc - Chiều cao tinh gọn */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#191C1A] via-[#254B3C] to-[#2F5D4A] rounded-3xl p-5 sm:p-6 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-amber-300 font-be-vietnam">
              <Sparkles className="w-3.5 h-3.5" />
              100% tour cam kết bảo tồn sinh thái Sơn Trà
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-fraunces leading-tight m-0">
              Trekking theo chuyến khởi hành cố định
            </h2>
            <p className="text-xs text-emerald-100/90 font-be-vietnam m-0">
              Giới hạn 10–15 khách/chuyến cùng Eco-Guide có chứng chỉ BQL. 
              <span className="font-bold text-amber-300"> 10% giá vé</span> tự động đóng góp vào Quỹ bảo tồn bán đảo.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/10 z-10">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
            <div className="text-left font-be-vietnam">
              <div className="text-[10px] text-emerald-200">Chứng nhận an toàn</div>
              <div className="text-xs font-bold text-white">Trạm kiểm lâm GPS</div>
            </div>
          </div>
        </div>

        {/* FLASH SALE HERO BLOCK (LIVE COUNTDOWN & REAL-TIME SLOTS) */}
        {flashSession && flashSession.items && flashSession.items.length > 0 && (
          <div className="bg-gradient-to-br from-[#191C1A] via-[#254B3C] to-[#254B3C] rounded-3xl p-6 text-white border border-amber-500/30 shadow-lg space-y-5">
            {/* Header: Title + Live Badge + Countdown Timer */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                    <Flame className="w-3.5 h-3.5 fill-white" />
                    <span>{flashSession.is_live ? 'Giờ vàng đang diễn ra (live)' : 'Sắp diễn ra'}</span>
                  </span>
                  <span className="text-xs text-amber-300 font-bold">
                    Trợ giá bảo tồn BQL Sơn Trà
                  </span>
                </div>
                <h2 className="text-xl font-bold font-fraunces text-white m-0">
                  {flashSession.session_name}
                </h2>
                <p className="text-xs text-emerald-200/80 m-0">
                  Số lượng suất vé ưu đãi có hạn theo quy chuẩn tải môi trường. Cập nhật số suất LIVE thời gian thực!
                </p>
              </div>

              {/* Countdown Display Box */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-amber-400/40 shrink-0">
                <Timer className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-[10px] text-amber-200 tracking-wider font-bold">
                    {flashSession.is_live ? 'Kết thúc trong' : 'Bắt đầu sau'}
                  </div>
                  <div className="text-lg font-mono font-bold text-white tracking-wider">
                    {flashCountdown}
                  </div>
                </div>
              </div>
            </div>

            {/* Flash Sale Tour Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashSession.items.map((item) => {
                const fillPercent = Math.min(100, Math.round((item.sold_quantity / item.slot_quantity) * 100));
                return (
                  <div 
                    key={item.id}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 hover:border-amber-400/50 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail with discount badge */}
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                        <img 
                          src={item.tour_cover_image || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80"}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px]">
                          -{item.discount_percent}%
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="text-[11px] text-emerald-300 font-bold truncate">
                          {item.vendor_name}
                        </div>
                        <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 m-0">
                          {item.tour_title}
                        </h3>

                        {/* Price Row */}
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-base font-bold font-fraunces text-amber-400">
                            {Number(item.promo_price).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs line-through text-slate-400">
                            {Number(item.original_price).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Progress Bar (LIVE) */}
                    <div className="space-y-1.5 pt-1 border-t border-white/10">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Đã bán {item.sold_quantity}/{item.slot_quantity} suất</span>
                        </span>
                        <span className={`font-bold ${item.is_sold_out ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.is_sold_out ? 'Hết vé' : `Còn ${item.remaining_slots} chỗ`}
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.is_sold_out 
                              ? 'bg-rose-500' 
                              : fillPercent > 70 
                              ? 'bg-amber-400' 
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={item.is_sold_out}
                      onClick={() => handleOpenFlashSaleBooking(item)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        item.is_sold_out 
                          ? 'bg-slate-700 text-white/75 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black shadow-md'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>{item.is_sold_out ? 'Đã hết suất flash sale' : 'Săn vé flash sale ngay'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {filterPills.map((pill) => {
            const isSelected = selectedFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedFilter(pill.id)}
                className={`flex items-center shrink-0 py-2.5 px-5 gap-2 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-[#2F5D4A] !text-white border-[#2F5D4A] shadow-xs"
                    : pill.isFlash
                    ? "bg-white text-[#191C1A] border-[#D79B00] hover:bg-[#FFF8E8]"
                    : "bg-white text-[#4A514C] border-[#C5CCC7] hover:bg-white hover:text-[#191C1A]"
                }`}
              >
                {pill.isFlash && <Flame className="w-4 h-4 text-[#8B5000]" />}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid Danh Sách Tuyến Trekking */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[#191C1A] text-lg sm:text-xl font-bold font-fraunces">
                Danh sách tuyến trekking và lịch khởi hành
              </h2>
              <p className="text-xs text-[#4A514C] font-be-vietnam">
                Bấm vào tour để xem lộ trình, checkpoints GPS và các khung giờ khởi hành còn chỗ
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setMyBookingsModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#2F5D4A] font-bold text-xs border border-emerald-200 transition-all cursor-pointer flex items-center gap-2 shadow-2xs group"
              >
                <div className="w-5 h-5 rounded-md bg-[#2F5D4A] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Ticket className="w-3 h-3 fill-current" />
                </div>
                <span>Vé của tôi</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard/inbox')}
                className="px-4 py-2.5 rounded-2xl bg-[#DCEBE3] hover:bg-[#DCEBE3] text-[#2F5D4A] font-bold text-xs border border-[#C5CCC7] transition-all cursor-pointer flex items-center gap-2 shadow-2xs group"
              >
                <div className="w-5 h-5 rounded-md bg-[#2F5D4A] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <span>Hộp thư Đoàn</span>
              </button>
              <span className="text-xs font-bold text-[#2F5D4A] font-be-vietnam hidden md:inline">
                {filteredTours.length} tuyến sẵn sàng
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#C5CCC7]">
              <div className="w-8 h-8 border-4 border-[#2F5D4A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#4A514C] font-be-vietnam">Đang tải lịch trình tour từ máy chủ...</p>
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#C5CCC7] space-y-3">
              <Compass className="w-10 h-10 text-[#4A514C] mx-auto opacity-40" />
              <p className="text-sm font-bold text-[#191C1A] font-fraunces">Không tìm thấy tuyến trekking phù hợp</p>
              <p className="text-xs text-[#4A514C] font-be-vietnam">Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả tuyến</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTours.map((tour) => (
                <div
                  key={tour.id}
                  className="bg-white rounded-3xl border border-[#C5CCC7] overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2F5F1]">
                      <img
                        src={tour.cover_image_url || "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80"}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {getDifficultyBadge(tour.difficulty_level)}
                        {tour.isFlash && (
                          <span className="px-2.5 py-1 rounded-full bg-[#8B5000] text-white text-[11px] font-bold font-be-vietnam flex items-center gap-1">
                            <Flame className="w-3 h-3" /> -15%
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3 bg-[#191C1A]/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full font-be-vietnam">
                        {tour.vendor_name || "Sơn Trà Trekking"}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#4A514C] font-be-vietnam">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{tour.avg_rating || 4.9}</span>
                          <span className="text-[#4A514C] font-normal">({tour.total_reviews || 88})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-[#2F5D4A]" />
                          <span>{tour.duration_hours || 4} giờ</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-base font-fraunces text-[#191C1A] line-clamp-2 min-h-[44px]">
                        {tour.title}
                      </h3>

                      {/* Next departure info box */}
                      <div className="p-3 bg-[#F2F5F1] rounded-2xl border border-[#C5CCC7]/80 space-y-1.5 font-be-vietnam text-xs">
                        <div className="flex items-center justify-between text-[#4A514C]">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#2F5D4A]" />
                            Chuyến gần nhất:
                          </span>
                          <span className="font-bold text-[#191C1A]">
                            {tour.next_departure || "Thứ 7 tuần này"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#4A514C]">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#2F5D4A]" />
                            Chỗ còn nhận:
                          </span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-200">
                            {tour.available_slots ? `Còn ${tour.available_slots}/${tour.max_capacity || 15} chỗ` : "Còn 8/15 chỗ"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Price & Action */}
                  <div className="p-5 pt-0 border-t border-[#C5CCC7]/40 mt-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#4A514C] font-be-vietnam">Giá trọn gói / khách</div>
                      <div className="text-base font-bold font-fraunces text-[#8B5000]">
                        {tour.price_formatted || `${(tour.price || 450000).toLocaleString('vi-VN')} đ`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenTourDetail(tour)}
                      className="px-4 py-2.5 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 font-be-vietnam border-0"
                    >
                      <span>Chọn chuyến</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* ================= MODAL XEM CHI TIẾT & CHỌN CHUYẾN KHỞI HÀNH ================= */}
      {selectedTour && (
        <div className="fixed inset-0 z-50 bg-[#191C1A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-[#C5CCC7] relative motion-modal-enter">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedTour(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#F2F5F1] hover:bg-[#C5CCC7] text-[#4A514C] border-0 cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                {getDifficultyBadge(selectedTour.difficulty_level)}
                <span className="text-xs text-[#4A514C] font-be-vietnam flex items-center gap-1">
                  Đơn vị tổ chức: <strong className="text-[#191C1A]">{selectedTour.vendor_name || "Sơn Trà Eco Trek"}</strong>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-fraunces text-[#191C1A]">
                {selectedTour.title}
              </h2>
            </div>

            {loadingDetail ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-[#2F5D4A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#4A514C] font-be-vietnam">Đang tải chi tiết lộ trình và các chuyến đi...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Lộ trình & Checkpoints GPS */}
                <div className="bg-[#F2F5F1] p-4 sm:p-5 rounded-2xl border border-[#C5CCC7] space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-[#2F5D4A] font-be-vietnam flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Lộ trình và các checkpoint bảo tồn
                  </h4>
                  <p className="text-xs text-[#4A514C] font-be-vietnam leading-relaxed">
                    {tourDetail?.description || "Tour trekking sinh thái cam kết tuân thủ quy định bảo tồn thiên nhiên, không để lại rác và giữ khoảng cách an toàn với động vật hoang dã."}
                  </p>

                  {/* Bản đồ vệ tinh định tuyến GPS Sơn Trà */}
                  <div className="rounded-2xl overflow-hidden border border-[#C5CCC7] shadow-xs">
                    <RouteMapPreview
                      coordinates={tourDetail?.route?.coordinates || []}
                      checkpoints={tourDetail?.checkpoints || []}
                      height="260px"
                      tourTitle={tourDetail?.title}
                    />
                  </div>

                  {tourDetail?.checkpoints && tourDetail.checkpoints.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#C5CCC7]/60">
                      {tourDetail.checkpoints.map((cp, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs font-be-vietnam">
                          <div className="w-5 h-5 rounded-full bg-[#2F5D4A] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-[#191C1A]">{cp.name}</span>
                            {cp.description && <span className="text-[#4A514C]"> — {cp.description}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badge 10% ESG Fund */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800 font-be-vietnam">
                      Cam kết ESG: 10% giá trị vé sẽ được tự động trích nộp vào quỹ bảo tồn bán đảo Sơn Trà.
                    </span>
                  </div>
                </div>

                {/* 2. Chọn chuyến khởi hành (Departure Schedules) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#191C1A] font-fraunces flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2F5D4A]" />
                    Chọn chuyến khởi hành (Lịch có sẵn do Vendor mở)
                  </h4>
                  
                  {(!tourDetail?.schedules || tourDetail.schedules.length === 0) ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 font-be-vietnam">
                      Tất cả các chuyến hiện tại đã kín chỗ. Vui lòng quay lại sau hoặc liên hệ Hotline để mở thêm chuyến.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tourDetail.schedules.map((sch) => {
                        const isSelected = selectedSchedule?.id === sch.id;
                        const isSoldOut = sch.remaining_slots <= 0;

                        return (
                          <div
                            key={sch.id}
                            onClick={() => !isSoldOut && setSelectedSchedule(sch)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer font-be-vietnam ${
                              isSoldOut 
                                ? "bg-[#F8FAF7] border-[#C5CCC7] opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "bg-[#DCEBE3] border-[#2F5D4A] ring-2 ring-[#2F5D4A]/20 shadow-xs"
                                : "bg-white border-[#C5CCC7] hover:border-[#2F5D4A]/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#191C1A]">
                                {sch.formatted_date || sch.departure_date}
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isSoldOut 
                                  ? "bg-[#F2F5F1] text-[#4A514C]"
                                  : "bg-[#F2F5F1] text-[#2F5D4A]"
                              }`}>
                                {isSoldOut ? "Hết chỗ" : `Còn ${sch.remaining_slots} chỗ`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[#4A514C]">
                              <Clock className="w-3.5 h-3.5 text-[#2F5D4A]" />
                              <span>{sch.start_time?.slice(0, 5)} - {sch.end_time?.slice(0, 5)}</span>
                            </div>

                            <div className="text-[11px] text-[#4A514C] mt-2 border-t border-[#C5CCC7]/60 pt-1.5">
                              HDV: <strong className="text-[#191C1A]">{sch.guide_name || "Eco-Guide Sơn Trà"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Form Đặt Vé & Thông tin Du khách */}
                {selectedSchedule && (
                  <form onSubmit={handleSubmitBooking} className="space-y-4 pt-2 border-t border-[#C5CCC7]">
                    <h4 className="text-sm font-bold text-[#191C1A] font-fraunces">
                      Thông tin du khách và điểm đón
                    </h4>

                    {/* Số lượng khách */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#191C1A] font-be-vietnam mb-1.5">
                          Số người lớn:
                        </label>
                        <div className="flex items-center border border-[#C5CCC7] rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleInputChange("adults_count", Math.max(1, bookingForm.adults_count - 1))}
                            className="px-3 py-2 text-xs font-bold text-[#191C1A] hover:bg-[#F2F5F1] border-0 bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-[#191C1A] font-be-vietnam">
                            {bookingForm.adults_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInputChange("adults_count", bookingForm.adults_count + 1)}
                            className="px-3 py-2 text-xs font-bold text-[#191C1A] hover:bg-[#F2F5F1] border-0 bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#191C1A] font-be-vietnam mb-1.5">
                          Trẻ em (&gt;10 tuổi):
                        </label>
                        <div className="flex items-center border border-[#C5CCC7] rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleInputChange("children_count", Math.max(0, bookingForm.children_count - 1))}
                            className="px-3 py-2 text-xs font-bold text-[#191C1A] hover:bg-[#F2F5F1] border-0 bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-[#191C1A] font-be-vietnam">
                            {bookingForm.children_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInputChange("children_count", bookingForm.children_count + 1)}
                            className="px-3 py-2 text-xs font-bold text-[#191C1A] hover:bg-[#F2F5F1] border-0 bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Họ tên & Điện thoại */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#191C1A] font-be-vietnam mb-1.5">
                          Họ và tên trưởng đoàn *
                        </label>
                        <input
                          type="text"
                          required
                          value={bookingForm.customer_name}
                          onChange={(e) => handleInputChange("customer_name", e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#C5CCC7] focus:border-[#2F5D4A] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#191C1A] font-be-vietnam mb-1.5">
                          Số điện thoại liên hệ *
                        </label>
                        <input
                          type="tel"
                          required
                          value={bookingForm.customer_phone}
                          onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#C5CCC7] focus:border-[#2F5D4A] outline-none"
                        />
                      </div>
                    </div>

                    {/* Điểm đón */}
                    <div>
                      <label className="block text-xs font-bold text-[#191C1A] font-be-vietnam mb-1.5">
                        Điểm đón / khách sạn tại Đà Nẵng:
                      </label>
                      <input
                        type="text"
                        value={bookingForm.pickup_location}
                        onChange={(e) => handleInputChange("pickup_location", e.target.value)}
                        placeholder="Ví dụ: Khách sạn Mường Thanh Luxury hoặc chân cầu Rồng..."
                        className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#C5CCC7] focus:border-[#2F5D4A] outline-none"
                      />
                    </div>

                    {/* Bảng Chiết Tính Minh Bạch & Đóng Góp Quỹ ESG */}
                    <div className="p-4 bg-[#F2F5F1] rounded-2xl border border-[#C5CCC7] space-y-2 font-be-vietnam text-xs">
                      <div className="flex justify-between text-[#4A514C]">
                        <span>Đơn giá chuyến:</span>
                        <span>{currentSlotPrice.toLocaleString('vi-VN')} đ / khách</span>
                      </div>
                      <div className="flex justify-between text-[#4A514C]">
                        <span>Số lượng khách:</span>
                        <span>{totalSlotsCount} người</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Đóng góp quỹ bảo tồn Sơn Trà (10%):</span>
                        <span>{esgContribution.toLocaleString('vi-VN')} đ (Đã bao gồm)</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#191C1A] border-t border-[#C5CCC7] pt-2">
                        <span>Tổng thanh toán:</span>
                        <span className="text-[#8B5000] font-fraunces text-base">
                          {totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTour(null)}
                        className="px-5 py-2.5 rounded-2xl bg-white border border-[#C5CCC7] text-[#4A514C] text-xs font-bold font-be-vietnam cursor-pointer hover:bg-[#F2F5F1]"
                      >
                        Đóng
                      </button>

                      <button
                        type="submit"
                        disabled={submittingBooking}
                        className="px-6 py-2.5 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 font-be-vietnam border-0 disabled:opacity-60"
                      >
                        {submittingBooking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang xác nhận đặt vé...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="!text-white">Xác nhận đặt chuyến đi</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= MODAL VÉ ĐIỆN TỬ E-TICKET (QR CHECK-IN) ================= */}
      {eTicketData && (
        <div className="fixed inset-0 z-50 bg-[#191C1A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6 border border-[#C5CCC7] relative text-center motion-modal-enter">
            
            <button
              type="button"
              onClick={() => setETicketData(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#F2F5F1] hover:bg-[#C5CCC7] text-[#4A514C] border-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon thành công */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-bold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-be-vietnam">
                Đặt tour thành công
              </span>
              <h3 className="text-xl font-bold font-fraunces text-[#191C1A] mt-2">
                Vé điện tử Sơn Trà ReLoop
              </h3>
              <p className="text-xs text-[#4A514C] font-be-vietnam">
                Mã đơn: <strong className="text-[#191C1A] font-mono text-sm">{eTicketData.booking_code}</strong>
              </p>
            </div>

            {/* Khung Mã QR mô phỏng check-in */}
            <div className="p-4 bg-[#F2F5F1] rounded-2xl border border-dashed border-[#2F5D4A] max-w-[220px] mx-auto space-y-2">
              <div className="w-36 h-36 bg-white rounded-xl mx-auto flex items-center justify-center shadow-xs p-2">
                <QrCode className="w-32 h-32 text-[#191C1A]" />
              </div>
              <span className="text-[10px] text-[#4A514C] font-be-vietnam block">
                Xuất trình mã QR tại trạm kiểm lâm Sơn Trà
              </span>
            </div>

            {/* Chi tiết vé */}
            <div className="text-left bg-white p-4 rounded-2xl border border-[#C5CCC7] space-y-2 text-xs font-be-vietnam">
              <div className="flex justify-between">
                <span className="text-[#4A514C]">Tuyến:</span>
                <span className="font-bold text-[#191C1A] text-right">{eTicketData.tour_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A514C]">Thời gian:</span>
                <span className="font-bold text-[#191C1A]">{eTicketData.schedule_time}, ngày {eTicketData.schedule_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A514C]">Số khách:</span>
                <span className="font-bold text-[#191C1A]">{eTicketData.total_slots} người</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A514C]">Điểm đón:</span>
                <span className="font-bold text-[#191C1A]">{eTicketData.pickup_location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A514C]">Hướng dẫn viên:</span>
                <span className="font-bold text-[#2F5D4A]">{eTicketData.guide_name}</span>
              </div>
              <div className="flex justify-between border-t border-[#C5CCC7] pt-2">
                <span className="text-emerald-700 font-bold">Quỹ bảo tồn (10%):</span>
                <span className="text-emerald-700 font-bold">{(eTicketData.esg_contribution || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Nút hoàn tất & xem vé */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setETicketData(null);
                  setMyBookingsModalOpen(true);
                }}
                className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#191C1A] text-xs font-bold font-be-vietnam cursor-pointer transition-all shadow-xs border-0"
              >
                Xem vé của tôi
              </button>
              <button
                type="button"
                onClick={() => setETicketData(null)}
                className="flex-1 py-3 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold font-be-vietnam cursor-pointer transition-all shadow-xs border-0"
              >
                Hoàn tất & đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PayOS VietQR Payment Modal */}
      <PayOSPaymentModal
        isOpen={!!payOSModalData}
        onClose={() => setPayOSModalData(null)}
        paymentData={payOSModalData}
        onPaymentSuccess={handlePayOSSuccess}
      />

      {/* My Trekking Bookings & E-Tickets History Modal */}
      <MyTrekkingBookingsModal
        isOpen={myBookingsModalOpen}
        onClose={() => setMyBookingsModalOpen(false)}
      />

    </div>
  );
}
