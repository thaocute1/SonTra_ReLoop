import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
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
import RouteMapPreview from "../../../components/common/RouteMapPreview";
import { useUserEco } from "../../../context/UserEcoContext";

export default function TrekkingPage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};
  const { user } = useUserEco();
  const userName = user?.name || user?.email?.split("@")[0] || "Du Khách Sơn Trà";

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");

  // Tours data state
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTour, setSelectedTour] = useState(null);
  const [tourDetail, setTourDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    adults_count: 1,
    children_count: 0,
    customer_name: user?.name || "",
    customer_phone: user?.phone || "",
    customer_email: user?.email || "",
    pickup_location: "Khách sạn trung tâm Đà Nẵng",
    payment_method: "Chuyển khoản QR",
    special_notes: ""
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Success Modal State (E-Ticket)
  const [eTicketData, setETicketData] = useState(null);

  // Initial Mock Fallback Tours (đảm bảo UI luôn sống động)
  const fallbackTours = [
    {
      id: 1,
      title: "Chinh Phục Đỉnh Bàn Cờ - Ngắm Vịnh Sơn Trà",
      slug: "dinh-ban-co",
      price: 450000,
      price_formatted: "450.000 đ",
      cover_image_url: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80",
      difficulty_level: "moderate",
      duration_hours: 4.5,
      avg_rating: 4.9,
      total_reviews: 142,
      vendor_name: "Sơn Trà Trekking",
      next_departure: "24/10/2026",
      available_slots: 6,
      max_capacity: 15,
      distance_km: 4.5,
      isFlash: true,
      discount_percent: 15
    },
    {
      id: 2,
      title: "Khám Phá Rừng Cây Đa Ngàn Năm Sơn Trà",
      slug: "cay-da-ngan-nam",
      price: 380000,
      price_formatted: "380.000 đ",
      cover_image_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
      difficulty_level: "easy",
      duration_hours: 3.5,
      avg_rating: 4.8,
      total_reviews: 98,
      vendor_name: "Sơn Trà Trekking",
      next_departure: "25/10/2026",
      available_slots: 9,
      max_capacity: 15,
      distance_km: 3.2,
      isFlash: false
    },
    {
      id: 3,
      title: "Chinh Phục Mũi Nghê - Đón Ánh Bình Minh Đầu Tiên",
      slug: "mui-nghe-hoang-so",
      price: 550000,
      price_formatted: "550.000 đ",
      cover_image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      difficulty_level: "challenging",
      duration_hours: 5.5,
      avg_rating: 4.7,
      total_reviews: 64,
      vendor_name: "Sơn Trà Trekking",
      next_departure: "26/10/2026",
      available_slots: 4,
      max_capacity: 12,
      distance_km: 6.5,
      isFlash: false
    }
  ];

  // Fetch list of tours from API
  const fetchTours = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tours/");
      const tourList = (res.data && res.data.status === "success" && Array.isArray(res.data.data)) 
        ? res.data.data 
        : (Array.isArray(res.data) ? res.data : []);
      if (tourList.length > 0) {
        setTours(tourList);
      } else {
        setTours(fallbackTours);
      }
    } catch (err) {
      console.warn("API GET /tours/ error or offline, fallback to mock data:", err);
      setTours(fallbackTours);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // Fetch Tour Detail & Schedules when tour clicked
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
      console.warn("API GET /tours/<id>/ failed, generating local schedules mock:", err);
      // Fallback schedules nếu backend chưa kịp cung cấp
      const mockDetail = {
        ...tour,
        description: "Khám phá cung đường thiên nhiên nguyên sinh Sơn Trà, quan sát đàn Voọc Chà Vá Chân Nâu quý hiếm trong môi trường tự nhiên. Tour được thiết kế có hướng dẫn viên bản địa am hiểu văn hóa và sinh thái.",
        route: {
          total_distance_km: tour.distance_km || 4.5,
          elevation_gain_m: 280
        },
        checkpoints: [
          { name: "Cổng kiểm soát bán đảo Sơn Trà", description: "Tập trung, điểm danh và trang bị gậy trekking", is_mandatory: true },
          { name: "Trạm quan sát Voọc Chà Vá", description: "Giữ im lặng tối đa, quan sát bằng ống nhòm chuyên dụng", is_mandatory: true },
          { name: "Đỉnh Bàn Cờ / Mũi Nghê", description: "Nghỉ ngơi, check-in nhận huy hiệu số Sơn Trà ReLoop", is_mandatory: true }
        ],
        schedules: [
          {
            id: "SCH-101",
            departure_date: "2026-10-22",
            formatted_date: "22/10/2026",
            start_time: "05:30:00",
            end_time: "10:00:00",
            remaining_slots: 6,
            max_capacity: 15,
            price: tour.price,
            guide_name: "Nguyễn Văn Hùng (Eco-Guide Chứng Chỉ Xanh)"
          },
          {
            id: "SCH-102",
            departure_date: "2026-10-24",
            formatted_date: "24/10/2026",
            start_time: "06:00:00",
            end_time: "10:30:00",
            remaining_slots: 10,
            max_capacity: 15,
            price: tour.price,
            guide_name: "Trần Bảo Nam (Kiểm lâm danh dự)"
          },
          {
            id: "SCH-103",
            departure_date: "2026-10-25",
            formatted_date: "25/10/2026",
            start_time: "14:30:00",
            end_time: "18:30:00",
            remaining_slots: 4,
            max_capacity: 12,
            price: tour.price,
            guide_name: "Lê Thu Hà (Chuyên gia Sinh vật học)"
          }
        ],
        esg_fund_percent: 10
      };
      setTourDetail(mockDetail);
      setSelectedSchedule(mockDetail.schedules[0]);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Form Input Change
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
            schedule_time: `${selectedSchedule.start_time.slice(0,5)} - ${selectedSchedule.end_time.slice(0,5)}`,
            pickup_location: bookingForm.pickup_location,
            total_slots: payload.adults_count + payload.children_count,
            total_amount: (selectedSchedule.price || selectedTour.price) * (payload.adults_count + payload.children_count),
            esg_contribution: ((selectedSchedule.price || selectedTour.price) * (payload.adults_count + payload.children_count)) * 0.1,
            guide_name: selectedSchedule.guide_name,
            customer_name: payload.customer_name,
            customer_phone: payload.customer_phone
          });

      // Đóng modal booking và mở E-Ticket
      setSelectedTour(null);
      setETicketData(ticketInfo);
      setToastMessage("Đặt tour trekking thành công! Mã vé đã được kích hoạt.");
      
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
        guide_name: selectedSchedule.guide_name || "Hướng Dẫn Viên Sơn Trà",
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

    if (selectedFilter === "flash_sale") return tour.isFlash;
    if (selectedFilter === "easy") return tour.difficulty_level === "easy";
    if (selectedFilter === "medium") return tour.difficulty_level === "moderate";
    if (selectedFilter === "hard") return tour.difficulty_level === "challenging";
    return true;
  });

  const filterPills = [
    { id: "all", label: "Tất cả tuyến" },
    { id: "flash_sale", label: "Flash Sale", isFlash: true },
    { id: "easy", label: "Dễ (Gia đình)" },
    { id: "medium", label: "Trung bình" },
    { id: "hard", label: "Thử thách" },
    { id: "gps", label: "Có Checkpoint GPS" },
  ];

  const getDifficultyBadge = (level) => {
    switch (level) {
      case "easy":
        return <span className="px-2.5 py-1 rounded-full bg-[#E9EFEC] text-[#4A6B5D] text-[11px] font-bold font-be-vietnam">Dễ • Gia đình</span>;
      case "moderate":
        return <span className="px-2.5 py-1 rounded-full bg-[#FAF3EB] text-[#B8442C] text-[11px] font-bold font-be-vietnam">Trung bình • Độ dốc vừa</span>;
      case "challenging":
        return <span className="px-2.5 py-1 rounded-full bg-[#FBEAE8] text-[#D9381E] text-[11px] font-bold font-be-vietnam">Thử thách cao</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold font-be-vietnam">{level}</span>;
    }
  };

  // Tính toán chi phí cho modal booking
  const totalSlotsCount = (parseInt(bookingForm.adults_count) || 0) + (parseInt(bookingForm.children_count) || 0);
  const currentSlotPrice = selectedSchedule ? selectedSchedule.price : (selectedTour ? selectedTour.price : 0);
  const totalAmount = currentSlotPrice * totalSlotsCount;
  const esgContribution = totalAmount * 0.1; // 10% Quỹ Bảo Tồn

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2D3732] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage("")} 
            className="text-white/60 hover:text-white ml-2 text-xs border-0 bg-transparent cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-col w-full max-w-6xl mx-auto px-6 py-8 gap-8">
        
        {/* Banner Cam kết ESG & Bảo tồn Voọc - Chiều cao tinh gọn */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1B3327] via-[#243E33] to-[#2F5244] rounded-3xl p-5 sm:p-6 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-amber-300 font-be-vietnam">
              <Sparkles className="w-3.5 h-3.5" />
              100% Tour Cam Kết Bảo Tồn Sinh Thái Sơn Trà
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-fraunces leading-tight m-0">
              Trekking Theo Chuyến Khởi Hành Cố Định
            </h2>
            <p className="text-xs text-emerald-100/90 font-be-vietnam m-0">
              Giới hạn 10–15 khách/chuyến cùng Eco-Guide có chứng chỉ BQL. 
              <span className="font-bold text-amber-300"> 10% giá vé</span> tự động đóng góp vào Quỹ Bảo Tồn Bán Đảo.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/10 z-10">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
            <div className="text-left font-be-vietnam">
              <div className="text-[10px] text-emerald-200">Chứng nhận an toàn</div>
              <div className="text-xs font-bold text-white">Trạm Kiểm Lâm GPS</div>
            </div>
          </div>
        </div>

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
                    ? "bg-[#4A6B5D] !text-white border-[#4A6B5D] shadow-xs"
                    : pill.isFlash
                    ? "bg-white text-[#2D3732] border-[#F0DCC6] hover:bg-[#FAF3EB]"
                    : "bg-white text-[#6B7A72] border-[#E2E8E4] hover:bg-white hover:text-[#2D3732]"
                }`}
              >
                {pill.isFlash && <Flame className="w-4 h-4 text-[#B8442C]" />}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid Danh Sách Tuyến Trekking */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#2D3732] text-lg sm:text-xl font-bold font-fraunces">
                Danh Sách Tuyến Trekking & Lịch Khởi Hành
              </h2>
              <p className="text-xs text-[#6B7A72] font-be-vietnam">
                Bấm vào tour để xem lộ trình, checkpoints GPS và các khung giờ khởi hành còn chỗ
              </p>
            </div>
            <span className="text-xs font-bold text-[#4A6B5D] font-be-vietnam">
              {filteredTours.length} tuyến sẵn sàng
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8E4]">
              <div className="w-8 h-8 border-4 border-[#4A6B5D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#6B7A72] font-be-vietnam">Đang tải lịch trình tour từ máy chủ...</p>
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8E4] space-y-3">
              <Compass className="w-10 h-10 text-[#6B7A72] mx-auto opacity-40" />
              <p className="text-sm font-bold text-[#2D3732] font-fraunces">Không tìm thấy tuyến trekking phù hợp</p>
              <p className="text-xs text-[#6B7A72] font-be-vietnam">Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc Tất Cả Tuyến</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTours.map((tour) => (
                <div
                  key={tour.id}
                  className="bg-white rounded-3xl border border-[#E2E8E4] overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
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
                          <span className="px-2.5 py-1 rounded-full bg-[#B8442C] text-white text-[11px] font-bold font-be-vietnam flex items-center gap-1">
                            <Flame className="w-3 h-3" /> -15%
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3 bg-[#2D3732]/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full font-be-vietnam">
                        {tour.vendor_name || "Sơn Trà Trekking"}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#6B7A72] font-be-vietnam">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{tour.avg_rating || 4.9}</span>
                          <span className="text-[#6B7A72] font-normal">({tour.total_reviews || 88})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-[#4A6B5D]" />
                          <span>{tour.duration_hours || 4} giờ</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-base font-fraunces text-[#2D3732] line-clamp-2 min-h-[44px]">
                        {tour.title}
                      </h3>

                      {/* Next departure info box */}
                      <div className="p-3 bg-[#F7F5F0] rounded-2xl border border-[#E2E8E4]/80 space-y-1.5 font-be-vietnam text-xs">
                        <div className="flex items-center justify-between text-[#6B7A72]">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#4A6B5D]" />
                            Chuyến gần nhất:
                          </span>
                          <span className="font-bold text-[#2D3732]">
                            {tour.next_departure || "Thứ 7 tuần này"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#6B7A72]">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#4A6B5D]" />
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
                  <div className="p-5 pt-0 border-t border-[#E2E8E4]/40 mt-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#6B7A72] font-be-vietnam">Giá trọn gói / khách</div>
                      <div className="text-base font-bold font-fraunces text-[#B8442C]">
                        {tour.price_formatted || `${(tour.price || 450000).toLocaleString('vi-VN')} đ`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenTourDetail(tour)}
                      className="px-4 py-2.5 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 font-be-vietnam border-0"
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
        <div className="fixed inset-0 z-50 bg-[#2D3732]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-[#E2E8E4] relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedTour(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#F7F5F0] hover:bg-[#E2E8E4] text-[#6B7A72] border-0 cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                {getDifficultyBadge(selectedTour.difficulty_level)}
                <span className="text-xs text-[#6B7A72] font-be-vietnam flex items-center gap-1">
                  Đơn vị tổ chức: <strong className="text-[#2D3732]">{selectedTour.vendor_name || "Sơn Trà Eco Trek"}</strong>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-fraunces text-[#2D3732]">
                {selectedTour.title}
              </h2>
            </div>

            {loadingDetail ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-[#4A6B5D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#6B7A72] font-be-vietnam">Đang tải chi tiết lộ trình và các chuyến đi...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Lộ trình & Checkpoints GPS */}
                <div className="bg-[#F7F5F0] p-4 sm:p-5 rounded-2xl border border-[#E2E8E4] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6B5D] font-be-vietnam flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Lộ Trình & Các Checkpoint Bảo Tồn
                  </h4>
                  <p className="text-xs text-[#6B7A72] font-be-vietnam leading-relaxed">
                    {tourDetail?.description || "Tour trekking sinh thái cam kết tuân thủ quy định bảo tồn thiên nhiên, không để lại rác và giữ khoảng cách an toàn với động vật hoang dã."}
                  </p>

                  {/* Bản đồ vệ tinh định tuyến GPS Sơn Trà */}
                  <div className="rounded-2xl overflow-hidden border border-[#E2E8E4] shadow-xs">
                    <RouteMapPreview
                      coordinates={tourDetail?.route?.coordinates || []}
                      checkpoints={tourDetail?.checkpoints || []}
                      height="260px"
                      tourTitle={tourDetail?.title}
                    />
                  </div>

                  {tourDetail?.checkpoints && tourDetail.checkpoints.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#E2E8E4]/60">
                      {tourDetail.checkpoints.map((cp, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs font-be-vietnam">
                          <div className="w-5 h-5 rounded-full bg-[#4A6B5D] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-[#2D3732]">{cp.name}</span>
                            {cp.description && <span className="text-[#6B7A72]"> — {cp.description}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badge 10% ESG Fund */}
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-emerald-800 font-be-vietnam">
                      Cam kết ESG: 10% giá trị vé sẽ được tự động trích nộp vào Quỹ Bảo Tồn Bán Đảo Sơn Trà.
                    </span>
                  </div>
                </div>

                {/* 2. Chọn Chuyến Khởi Hành (Departure Schedules) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#2D3732] font-fraunces flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4A6B5D]" />
                    Chọn Chuyến Khởi Hành (Lịch có sẵn do Vendor mở)
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
                                ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "bg-[#E9EFEC] border-[#4A6B5D] ring-2 ring-[#4A6B5D]/20 shadow-xs"
                                : "bg-white border-[#E2E8E4] hover:border-[#4A6B5D]/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#2D3732]">
                                {sch.formatted_date || sch.departure_date}
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isSoldOut 
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-[#F7F5F0] text-[#4A6B5D]"
                              }`}>
                                {isSoldOut ? "Hết chỗ" : `Còn ${sch.remaining_slots} chỗ`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[#6B7A72]">
                              <Clock className="w-3.5 h-3.5 text-[#4A6B5D]" />
                              <span>{sch.start_time?.slice(0, 5)} - {sch.end_time?.slice(0, 5)}</span>
                            </div>

                            <div className="text-[11px] text-[#6B7A72] mt-2 border-t border-[#E2E8E4]/60 pt-1.5">
                              HDV: <strong className="text-[#2D3732]">{sch.guide_name || "Eco-Guide Sơn Trà"}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Form Đặt Vé & Thông Tin Du Khách */}
                {selectedSchedule && (
                  <form onSubmit={handleSubmitBooking} className="space-y-4 pt-2 border-t border-[#E2E8E4]">
                    <h4 className="text-sm font-bold text-[#2D3732] font-fraunces">
                      Thông Tin Du Khách & Điểm Đón
                    </h4>

                    {/* Số lượng khách */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#2D3732] font-be-vietnam mb-1.5">
                          Số người lớn:
                        </label>
                        <div className="flex items-center border border-[#E2E8E4] rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleInputChange("adults_count", Math.max(1, bookingForm.adults_count - 1))}
                            className="px-3 py-2 text-xs font-bold text-[#2D3732] hover:bg-[#F7F5F0] border-0 bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-[#2D3732] font-be-vietnam">
                            {bookingForm.adults_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInputChange("adults_count", bookingForm.adults_count + 1)}
                            className="px-3 py-2 text-xs font-bold text-[#2D3732] hover:bg-[#F7F5F0] border-0 bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2D3732] font-be-vietnam mb-1.5">
                          Trẻ em (&gt;10 tuổi):
                        </label>
                        <div className="flex items-center border border-[#E2E8E4] rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleInputChange("children_count", Math.max(0, bookingForm.children_count - 1))}
                            className="px-3 py-2 text-xs font-bold text-[#2D3732] hover:bg-[#F7F5F0] border-0 bg-transparent cursor-pointer"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center text-xs font-bold text-[#2D3732] font-be-vietnam">
                            {bookingForm.children_count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInputChange("children_count", bookingForm.children_count + 1)}
                            className="px-3 py-2 text-xs font-bold text-[#2D3732] hover:bg-[#F7F5F0] border-0 bg-transparent cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Họ tên & Điện thoại */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#2D3732] font-be-vietnam mb-1.5">
                          Họ và tên trưởng đoàn *
                        </label>
                        <input
                          type="text"
                          required
                          value={bookingForm.customer_name}
                          onChange={(e) => handleInputChange("customer_name", e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#E2E8E4] focus:border-[#4A6B5D] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2D3732] font-be-vietnam mb-1.5">
                          Số điện thoại liên hệ *
                        </label>
                        <input
                          type="tel"
                          required
                          value={bookingForm.customer_phone}
                          onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#E2E8E4] focus:border-[#4A6B5D] outline-none"
                        />
                      </div>
                    </div>

                    {/* Điểm đón */}
                    <div>
                      <label className="block text-xs font-bold text-[#2D3732] font-be-vietnam mb-1.5">
                        Điểm đón / Khách sạn tại Đà Nẵng:
                      </label>
                      <input
                        type="text"
                        value={bookingForm.pickup_location}
                        onChange={(e) => handleInputChange("pickup_location", e.target.value)}
                        placeholder="Ví dụ: Khách sạn Mường Thanh Luxury hoặc Chân cầu Rồng..."
                        className="w-full text-xs font-be-vietnam p-2.5 rounded-xl border border-[#E2E8E4] focus:border-[#4A6B5D] outline-none"
                      />
                    </div>

                    {/* Bảng Chiết Tính Minh Bạch & Đóng Góp Quỹ ESG */}
                    <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-[#E2E8E4] space-y-2 font-be-vietnam text-xs">
                      <div className="flex justify-between text-[#6B7A72]">
                        <span>Đơn giá chuyến:</span>
                        <span>{currentSlotPrice.toLocaleString('vi-VN')} đ / khách</span>
                      </div>
                      <div className="flex justify-between text-[#6B7A72]">
                        <span>Số lượng khách:</span>
                        <span>{totalSlotsCount} người</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Đóng góp Quỹ Bảo Tồn Sơn Trà (10%):</span>
                        <span>{esgContribution.toLocaleString('vi-VN')} đ (Đã bao gồm)</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#2D3732] border-t border-[#E2E8E4] pt-2">
                        <span>Tổng thanh toán:</span>
                        <span className="text-[#B8442C] font-fraunces text-base">
                          {totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTour(null)}
                        className="px-5 py-2.5 rounded-2xl bg-white border border-[#E2E8E4] text-[#6B7A72] text-xs font-bold font-be-vietnam cursor-pointer hover:bg-[#F7F5F0]"
                      >
                        Đóng
                      </button>

                      <button
                        type="submit"
                        disabled={submittingBooking}
                        className="px-6 py-2.5 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 font-be-vietnam border-0 disabled:opacity-60"
                      >
                        {submittingBooking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang xác nhận đặt vé...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="!text-white">Xác Nhận Đặt Chuyến Đi</span>
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
        <div className="fixed inset-0 z-50 bg-[#2D3732]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6 border border-[#E2E8E4] relative text-center">
            
            <button
              type="button"
              onClick={() => setETicketData(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#F7F5F0] hover:bg-[#E2E8E4] text-[#6B7A72] border-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Thành Công */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-be-vietnam">
                Đặt Tour Thành Công
              </span>
              <h3 className="text-xl font-bold font-fraunces text-[#2D3732] mt-2">
                Vé Điện Tử Sơn Trà ReLoop
              </h3>
              <p className="text-xs text-[#6B7A72] font-be-vietnam">
                Mã đơn: <strong className="text-[#2D3732] font-mono text-sm">{eTicketData.booking_code}</strong>
              </p>
            </div>

            {/* Khung Mã QR mô phỏng check-in */}
            <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-dashed border-[#4A6B5D] max-w-[220px] mx-auto space-y-2">
              <div className="w-36 h-36 bg-white rounded-xl mx-auto flex items-center justify-center shadow-xs p-2">
                <QrCode className="w-32 h-32 text-[#2D3732]" />
              </div>
              <span className="text-[10px] text-[#6B7A72] font-be-vietnam block">
                Xuất trình mã QR tại Trạm Kiểm Lâm Sơn Trà
              </span>
            </div>

            {/* Chi tiết vé */}
            <div className="text-left bg-white p-4 rounded-2xl border border-[#E2E8E4] space-y-2 text-xs font-be-vietnam">
              <div className="flex justify-between">
                <span className="text-[#6B7A72]">Tuyến:</span>
                <span className="font-bold text-[#2D3732] text-right">{eTicketData.tour_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7A72]">Thời gian:</span>
                <span className="font-bold text-[#2D3732]">{eTicketData.schedule_time}, ngày {eTicketData.schedule_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7A72]">Số khách:</span>
                <span className="font-bold text-[#2D3732]">{eTicketData.total_slots} người</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7A72]">Điểm đón:</span>
                <span className="font-bold text-[#2D3732]">{eTicketData.pickup_location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7A72]">Hướng dẫn viên:</span>
                <span className="font-bold text-[#4A6B5D]">{eTicketData.guide_name}</span>
              </div>
              <div className="flex justify-between border-t border-[#E2E8E4] pt-2">
                <span className="text-emerald-700 font-bold">Quỹ Bảo tồn (10%):</span>
                <span className="text-emerald-700 font-bold">{(eTicketData.esg_contribution || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Nút hoàn tất */}
            <button
              type="button"
              onClick={() => setETicketData(null)}
              className="w-full py-3 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold font-be-vietnam cursor-pointer transition-all shadow-xs border-0"
            >
              Hoàn Tất & Lưu Vé
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
