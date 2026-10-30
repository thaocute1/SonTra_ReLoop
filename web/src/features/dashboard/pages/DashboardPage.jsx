import React, { useState, useEffect } from "react";
import { api } from "../../../lib/axios";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useUserEco } from "../../../context/UserEcoContext";
import { 
  Sun, 
  Wind, 
  Droplets, 
  Compass, 
  CheckCircle2, 
  Award, 
  QrCode, 
  ArrowRight, 
  MapPin, 
  ShieldCheck, 
  Leaf, 
  Trash2, 
  AlertTriangle, 
  HeartHandshake, 
  ChevronRight, 
  Clock, 
  Star, 
  Users, 
  ExternalLink,
  Sparkles,
  PhoneCall,
  X
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { openIncidentModal } = outletContext;

  const { 
    user, 
    points, 
    totalKm, 
    totalTrashKg, 
    completedTasksCount, 
    totalTasksCount, 
    rank,
    tasks
  } = useUserEco();

  const userName = user?.name || user?.email?.split("@")[0] || "Du khách Sơn Trà";
  const userInitials = user?.avatarText || "ST";
  const userAvatar = user?.avatarUrl;

  const [toastMessage, setToastMessage] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // 3 Tuyến đường Trekking nổi bật từ Database
  const [featuredRoutes, setFeaturedRoutes] = useState([]);
  const [partnerTours, setPartnerTours] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDbTours() {
      try {
        const res = await api.get('/tours/');
        const list = (res.data?.status === 'success' && Array.isArray(res.data?.data)) 
          ? res.data.data 
          : (Array.isArray(res.data) ? res.data : []);
        if (isMounted && list.length > 0) {
          setFeaturedRoutes(list.slice(0, 3).map(t => ({
            id: t.slug || t.id,
            name: t.title,
            distance: t.route?.total_distance_km ? `${t.route.total_distance_km} km` : `${t.duration_hours * 1.2} km`,
            duration: `${t.duration_hours} giờ`,
            difficulty: t.difficulty_label || "Vừa phải",
            diffColor: t.difficulty_level === 'easy' 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : (t.difficulty_level === 'challenging' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"),
            image: t.cover_image_url || "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=700&q=80",
            description: t.description,
            elevation: t.route?.elevation_gain_m ? `+${t.route.elevation_gain_m}m` : "+300m"
          })));

          setPartnerTours(list.slice(0, 3).map((t, idx) => ({
            id: t.id,
            slug: t.slug || t.id,
            title: t.title,
            provider: t.vendor_name || "Sơn Trà Trekking",
            price: t.price_formatted || `${Number(t.price).toLocaleString('vi-VN')} đ`,
            duration: `${t.duration_hours} giờ`,
            rating: Number(t.avg_rating) || 4.9,
            reviewsCount: t.total_reviews || 95,
            slotsLeft: t._available_slots || t.max_capacity || 8,
            image: t.cover_image_url || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
            badge: idx === 0 ? "Tour xanh tiêu biểu" : (idx === 1 ? "Bảo tồn động vật" : "Đón bình minh sớm")
          })));
        }
      } catch (err) {
        console.warn("Could not load tours from DB in DashboardPage:", err);
      }
    }
    loadDbTours();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="user-figma-page user-home-page m3-app-page flex flex-col min-h-full bg-white text-[#2D3732]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#191C1A] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A514C] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="user-figma-content flex flex-col w-full px-6 py-8 gap-8 motion-stagger">

        {/* ================= KHỐI 1: HERO THỜI TIẾT & AN TOÀN SINH THÁI (GỌN GÀNG, DẢI MỎNG THỜI TIẾT) ================= */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C5CCC7] shadow-2xs flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-forest-700" />

          {/* Header row: Greeting + Live Forest Observation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-forest-50 text-forest-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-forest-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-700 animate-pulse" />
                  Trạm quan trắc rừng Sơn Trà (live)
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Cập nhật 10 phút trước
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-fraunces text-[#191C1A] m-0">
                {getGreeting()}, {userName}!
              </h1>
              <p className="text-xs text-[#4A514C] m-0 mt-0.5 font-be-vietnam">
                Thời tiết bán đảo Sơn Trà trong lành, tầm nhìn xa trên 10km. Cùng chung tay giữ gìn vẻ đẹp thiên nhiên hoang sơ.
              </p>
            </div>

            {/* Trail Status Badge */}
            <div className="flex items-center gap-2.5 bg-forest-50 px-3.5 py-2 rounded-2xl border border-forest-200 shrink-0">
              <ShieldCheck className="w-5 h-5 text-forest-700" />
              <div className="text-left font-be-vietnam">
                <div className="text-[10px] text-forest-700 font-medium">Tình trạng đường mòn</div>
                <div className="text-xs font-bold text-[#191C1A] font-fraunces">Mở cửa an toàn 100%</div>
              </div>
            </div>
          </div>

          {/* 4 Weather & Forest Metrics: Dải Mỏng 1 Hàng Tiết Kiệm Không Gian */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#C5CCC7]">
            <div className="bg-[#F2F5F1] py-2 px-3 rounded-xl border border-[#C5CCC7]/80 flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#4A514C] truncate">Nhiệt độ ven rừng</div>
                <div className="text-xs font-bold text-[#191C1A] font-fraunces truncate">27°C · mát mẻ</div>
              </div>
            </div>
            <div className="bg-[#F2F5F1] py-2 px-3 rounded-xl border border-[#C5CCC7]/80 flex items-center gap-2.5">
              <Wind className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#4A514C] truncate">Gió ven biển</div>
                <div className="text-xs font-bold text-[#191C1A] font-fraunces truncate">12 km/h · nhẹ</div>
              </div>
            </div>
            <div className="bg-[#F2F5F1] py-2 px-3 rounded-xl border border-[#C5CCC7]/80 flex items-center gap-2.5">
              <Droplets className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#4A514C] truncate">Chỉ số UV / nắng</div>
                <div className="text-xs font-bold text-[#191C1A] font-fraunces truncate">Mức 3 · trung bình</div>
              </div>
            </div>
            <div className="bg-[#F2F5F1] py-2 px-3 rounded-xl border border-[#C5CCC7]/80 flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#4A514C] truncate">Triều cường ngắm san hô</div>
                <div className="text-xs font-bold text-[#191C1A] font-fraunces truncate">14:00 - 17:00</div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= KHỐI 2: ADVENTURE PASSPORT MINI-WIDGET & NHIỆM VỤ XANH ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* PASSPORT MINI CARD (5 Cột) */}
          <div className="lg:col-span-5 bg-[#F2F5F1] p-6 rounded-3xl border border-[#C5CCC7] flex flex-col justify-between gap-6 shadow-2xs relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center border border-[#C5CCC7]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191C1A] font-fraunces m-0">
                    Hộ chiếu khám phá của bạn
                  </h3>
                  <span className="text-[11px] text-[#4A514C]">
                    Mã định danh du khách xanh
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#2F5D4A] hover:bg-[#DCEBE3] text-xs font-bold border border-[#C5CCC7] transition-colors cursor-pointer shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Mã QR</span>
              </button>
            </div>

            {/* Identity & Stats Row */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#C5CCC7]">
              <div className="w-14 h-14 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center font-bold text-xl font-fraunces overflow-hidden border border-[#C5CCC7] shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold text-[#191C1A] truncate font-fraunces">
                  {userName}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-[#2F5D4A] bg-[#DCEBE3] px-2 py-0.5 rounded-full border border-[#C5CCC7]">
                    Trekker tiên phong
                  </span>
                  <span className="text-[11px] text-[#4A514C]">
                    Cấp 2
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Metrics Mini Grid (Đồng nhất 100% từ context) */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-2xl border border-[#C5CCC7]">
                <span className="text-lg font-bold text-amber-600 font-fraunces block">
                  {points}
                </span>
                <span className="text-[10px] text-[#4A514C] block">RE-Points</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#C5CCC7]">
                <span className="text-lg font-bold text-[#191C1A] font-fraunces block">
                  {totalKm} km
                </span>
                <span className="text-[10px] text-[#4A514C] block">Trekking</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#C5CCC7]">
                <span className="text-lg font-bold text-forest-700 font-fraunces block">
                  {totalTrashKg} kg
                </span>
                <span className="text-[10px] text-[#4A514C] block">Rác đã gom</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#C5CCC7]">
              <button
                type="button"
                onClick={() => navigate("/dashboard/marketplace")}
                className="py-2.5 px-3 bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đổi quà xanh</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/profile")}
                className="py-2.5 px-3 bg-white hover:bg-[#F2F5F1] text-[#191C1A] text-xs font-bold rounded-xl transition-colors cursor-pointer border border-[#C5CCC7] flex items-center justify-center gap-1"
              >
                <span>Hồ sơ của bạn</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#4A514C]" />
              </button>
            </div>
          </div>

          {/* ACTIVE ECO-MISSIONS (7 Cột) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#C5CCC7] flex flex-col justify-between gap-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-[#2F5D4A]" />
                  <h3 className="text-base font-bold text-[#191C1A] font-fraunces m-0">
                    Nhiệm vụ xanh cần làm hôm nay
                  </h3>
                </div>
                <p className="text-xs text-[#4A514C] m-0 mt-0.5">
                  Tích lũy thêm RE-Points bằng hành động bảo tồn thực tế
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard/tasks")}
                className="text-xs font-bold text-[#2F5D4A] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
              >
                <span>Tất cả nhiệm vụ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Mini Mission Items */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F5F1] hover:bg-[#DCEBE3]/50 transition-colors border border-[#C5CCC7] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5D4A] flex items-center justify-center shrink-0 border border-[#C5CCC7]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#191C1A] truncate m-0">
                    Thu gom 2kg rác nhựa tại Bãi Nam
                  </h4>
                  <span className="text-[11px] text-[#4A514C]">
                    Chụp ảnh rác gom được gửi lên hệ thống
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +100 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5D4A] hover:text-white text-[#2F5D4A] border border-[#C5CCC7] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F5F1] hover:bg-[#DCEBE3]/50 transition-colors border border-[#C5CCC7] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5D4A] flex items-center justify-center shrink-0 border border-[#C5CCC7]">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#191C1A] truncate m-0">
                    Không dùng chai nhựa một lần khi Trekking
                  </h4>
                  <span className="text-[11px] text-[#4A514C]">
                    Quét mã QR tại trạm tiếp nước sạch miễn phí BQL
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +30 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5D4A] hover:text-white text-[#2F5D4A] border border-[#C5CCC7] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F5F1] hover:bg-[#DCEBE3]/50 transition-colors border border-[#C5CCC7] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5D4A] flex items-center justify-center shrink-0 border border-[#C5CCC7]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#191C1A] truncate m-0">
                    Check-in GPS &amp; Báo cáo an toàn đường mòn
                  </h4>
                  <span className="text-[11px] text-[#4A514C]">
                    Đánh dấu trạm dừng đỉnh Bàn Cờ an toàn
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +50 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5D4A] hover:text-white text-[#2F5D4A] border border-[#C5CCC7] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Progress bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#C5CCC7] text-xs">
              <span className="text-[#4A514C]">Tiến độ tuần: <strong className="text-[#191C1A]">2/3 hoàn thành</strong></span>
              <div className="w-40 bg-[#F2F5F1] h-2 rounded-full overflow-hidden">
                <div className="bg-[#2F5D4A] h-full rounded-full w-[66%]" />
              </div>
            </div>
          </div>

        </section>

        {/* ================= KHỐI 3: TUYẾN ĐƯỜNG TREKKING ĐẸP NHẤT SƠN TRÀ ================= */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#2F5D4A]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#191C1A] font-fraunces m-0">
                  Tuyến đường trekking đẹp nhất Sơn Trà
                </h2>
              </div>
              <p className="text-xs text-[#4A514C] m-0 mt-1">
                Lộ trình chính thức có kiểm lâm hỗ trợ và cảnh báo an toàn GPS thời gian thực
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/dashboard/trekking")}
              className="text-xs font-bold text-[#2F5D4A] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <span>Xem bản đồ và tất cả tuyến</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredRoutes.map((route) => (
              <div 
                key={route.id}
                onClick={() => navigate("/dashboard/trekking")}
                className="flex flex-col bg-white rounded-3xl border border-[#C5CCC7] overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                {/* Visual Image Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-[#F2F5F1]">
                  <img
                    src={route.image}
                    alt={route.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  
                  {/* Difficulty Tag */}
                  <div className={`absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-2xs ${route.diffColor}`}>
                    {route.difficulty}
                  </div>

                  {/* Elevation & Distance overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {route.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      {route.duration}
                    </span>
                    <span className="bg-black/40 px-2 py-0.5 rounded-md text-[10px]">
                      {route.elevation}
                    </span>
                  </div>
                </div>

                {/* Content info */}
                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold text-[#191C1A] font-fraunces group-hover:text-[#2F5D4A] transition-colors line-clamp-1 m-0">
                      {route.name}
                    </h3>
                    <p className="text-xs text-[#4A514C] line-clamp-2 leading-relaxed m-0">
                      {route.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#C5CCC7] text-xs">
                    <span className="text-[#2F5D4A] font-bold flex items-center gap-1">
                      Khám phá chi tiết &amp; GPS
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#DCEBE3] text-[#2F5D4A] group-hover:bg-[#2F5D4A] group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= KHỐI 4: TRẢI NGHIỆM TOUR SINH THÁI NỔI BẬT ================= */}
        <section className="flex flex-col gap-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#C5CCC7] shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#2F5D4A]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#191C1A] font-fraunces m-0">
                  Trải nghiệm tour sinh thái nổi bật
                </h2>
              </div>
              <p className="text-xs text-[#4A514C] m-0 mt-1">
                Các chuyến dã ngoại do đối tác lữ hành xanh phối hợp cùng BQL bán đảo Sơn Trà tổ chức
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/dashboard/trekking")}
              className="text-xs font-bold text-[#2F5D4A] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <span>Xem tất cả tour</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partnerTours.map((tour) => (
              <div 
                key={tour.id}
                className="bg-white rounded-2xl border border-[#C5CCC7] p-4 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="relative h-44 rounded-xl overflow-hidden bg-[#F2F5F1]">
                  <img
                    src={tour.image}
                    alt={tour.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {tour.badge}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-[#4A514C]">
                    <span>{tour.provider}</span>
                    <div className="flex items-center text-amber-500 font-bold gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{tour.rating}</span>
                      <span className="text-[#4A514C] font-normal">({tour.reviewsCount})</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#191C1A] font-fraunces line-clamp-2 m-0">
                    {tour.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[#4A514C]">Thời lượng: {tour.duration}</span>
                    <span className="text-[#8B5000] font-bold">Còn {tour.slotsLeft} chỗ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#C5CCC7] mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#4A514C]">Giá vé trọn gói</span>
                    <span className="text-base font-bold text-[#2F5D4A] font-fraunces">
                      {tour.price}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/trekking")}
                    className="px-4 py-2 bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 shadow-xs"
                  >
                    Đặt tour
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= KHỐI 5: NGUYÊN TẮC 5K BẢO TỒN VOỌC & CỨU HỘ KHẨN CẤP ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* QUY TẮC BẢO TỒN VOỌC (8 Cột) */}
          <div className="lg:col-span-8 bg-[#F2F5F1] p-6 sm:p-7 rounded-3xl border border-[#C5CCC7] flex flex-col justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#2F5D4A] flex items-center justify-center font-bold border border-[#C5CCC7] shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-[#2F5D4A]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191C1A] font-fraunces m-0">
                  Quy tắc 5K khi khám phá rừng bán đảo Sơn Trà
                </h3>
                <p className="text-xs text-[#4A514C] m-0">
                  Chung tay bảo tồn voọc chà vá chân nâu — nữ hoàng linh trưởng của Sơn Trà
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-[#C5CCC7] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5D4A] shrink-0">01.</span>
                <span className="text-[#4A514C]"><strong className="text-[#191C1A]">Giữ khoảng cách:</strong> Luôn duy trì cự ly tối thiểu 5m, không rượt đuổi hay tiếp cận quá gần thú hoang.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C5CCC7] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5D4A] shrink-0">02.</span>
                <span className="text-[#4A514C]"><strong className="text-[#191C1A]">Không cho ăn:</strong> Thức ăn của con người gây bệnh đường ruột và làm mất bản năng kiếm ăn tự nhiên của linh trưởng.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C5CCC7] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5D4A] shrink-0">03.</span>
                <span className="text-[#4A514C]"><strong className="text-[#191C1A]">Giữ yên tĩnh:</strong> Không mở loa kéo, còi xe lớn trong rừng để tránh làm động vật hoảng sợ và lạc bầy.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C5CCC7] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5D4A] shrink-0">04.</span>
                <span className="text-[#4A514C]"><strong className="text-[#191C1A]">Không xả rác:</strong> Mang tất cả rác thải cá nhân ra khỏi rừng, đặc biệt là túi nilon và chai nhựa.</span>
              </div>
            </div>
          </div>

          {/* CỨU HỘ & BÁO CÁO SỰ CỐ KHẨN CẤP (4 Cột - NỀN TRẮNG VIỀN ĐỎ DỊU) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-rose-200/80 flex flex-col justify-between gap-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#93000A] font-fraunces m-0">
                  Cứu hộ &amp; báo cáo sự cố
                </h3>
                <span className="text-[11px] text-[#4A514C]">
                  Trực ban BQL 24/7
                </span>
              </div>
            </div>

            <p className="text-xs text-[#4A514C] leading-relaxed m-0 font-normal">
              Nếu bạn phát hiện sạt lở, cháy rừng, bẫy thú hoặc gặp sự cố chấn thương khi đi trekking, hãy báo cáo ngay cho lực lượng kiểm lâm.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={openIncidentModal}
                className="w-full py-3 bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Báo cáo sự cố môi trường</span>
              </button>

              <a
                href="tel:02363831111"
                className="w-full py-2.5 bg-[#F2F5F1] hover:bg-[#F2F5F1] text-[#191C1A] text-xs font-bold rounded-2xl transition-colors cursor-pointer border border-[#C5CCC7] flex items-center justify-center gap-2 no-underline"
              >
                <PhoneCall className="w-4 h-4 text-[#2F5D4A]" />
                <span>Hotline cứu hộ: 0236.3831.111</span>
              </a>
            </div>
          </div>

        </section>

      </main>

      {/* ================= MODAL MÃ QR ĐỊNH DANH DU KHÁCH ================= */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-be-vietnam motion-backdrop-enter"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-2xl border border-[#C5CCC7] text-center motion-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full border-b border-[#C5CCC7] pb-3">
              <span className="text-xs font-bold text-[#2F5D4A] flex items-center gap-1.5 font-fraunces">
                <ShieldCheck className="w-4 h-4" />
                Mã hộ chiếu sinh thái
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 text-[#4A514C] hover:text-[#191C1A] border-0 bg-transparent cursor-pointer motion-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-bold text-[#191C1A] font-fraunces m-0">
                {userName}
              </h3>
              <span className="text-xs text-[#4A514C]">
                Mã số: <strong>{user?.qr_token || `ST-QUEST-${user?.id || '8888'}`}</strong>
              </span>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#2F5D4A] shadow-inner flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  user?.qr_token || `https://sontrareloop.vn/passport/${user?.id || '8888'}`
                )}`}
                alt="Mã QR du khách"
                className="w-44 h-44 rounded-lg"
              />
            </div>

            <p className="text-[11px] text-[#4A514C] leading-relaxed m-0">
              Đưa mã QR này cho ban quản lý hoặc nhân viên trạm dừng Sơn Trà để ghi nhận check-in tuyến đường và tích điểm RE-Points.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                showToast("Đã lưu mã QR vào bộ nhớ đệm!");
              }}
              className="w-full py-2.5 bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 motion-press"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
