import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
  const { 
    openIncidentModal, 
    userPoints: contextPoints, 
    updateUserPoints, 
    currentUser 
  } = outletContext;

  const storedUser = JSON.parse(localStorage.getItem("user_info") || "null");
  const user = currentUser || storedUser;
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.avatar_url;
  const points = user?.total_eco_points ?? contextPoints ?? 450;

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

  // 3 Tuyến đường Trekking nổi bật với hình ảnh thực tế chất lượng cao
  // 3 Tuyến đường Trekking nổi bật
  const featuredRoutes = [
    {
      id: "dinh-ban-co",
      name: "Đỉnh Bàn Cờ — Màn Sương Trên Biển",
      distance: "4.2 km",
      duration: "2.5 giờ",
      difficulty: "Trung bình",
      diffColor: "bg-amber-100 text-amber-800 border-amber-200",
      difficulty: "Vừa phải",
      diffColor: "bg-amber-50 text-amber-700 border-amber-200",
      image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=700&q=80",
      description: "Cung đường lên đỉnh cao nhất Sơn Trà, ngắm toàn cảnh vịnh Đà Nẵng giữa mây mờ huyền ảo.",
      elevation: "+480m"
    },
    {
      id: "cay-da-ngan-nam",
      name: "Rừng Cổ Thụ — Cây Đa Di Sản Bãi Bấc",
      distance: "3.1 km",
      duration: "1.5 giờ",
      difficulty: "Dễ đi",
      diffColor: "bg-[#E9EFEC] text-[#4A6B5D] border-[#DCE5DF]",
      diffColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      image: "https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=700&q=80",
      description: "Trekking dưới tán rừng nguyên sinh mát rượi, chiêm ngưỡng cụ đa 800 năm tuổi kỳ vĩ.",
      elevation: "+150m"
    },
    {
      id: "mui-nghe",
      name: "Mũi Nghê — Đón Bình Minh Đầu Tiên",
      distance: "5.6 km",
      duration: "3.5 giờ",
      difficulty: "Thử thách",
      diffColor: "bg-red-100 text-red-800 border-red-200",
      diffColor: "bg-rose-50 text-rose-700 border-rose-200",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80",
      description: "Vượt qua vách đá và trảng cỏ ven biển đến hồ bơi tự nhiên hoang sơ đẹp nhất bán đảo.",
      elevation: "+320m"
    }
  ];

  // 3 Trải nghiệm Tour Sinh Thái Nổi Bật từ đối tác xanh
  const partnerTours = [
    {
      id: 1,
      title: "Lặn Ngắm San Hô Bãi Nam & Nhặt Rác Đại Dương",
      provider: "Sơn Trà Coral Conservation",
      price: "450.000 đ",
      duration: "Nửa ngày",
      rating: 4.9,
      reviewsCount: 128,
      slotsLeft: 6,
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
      badge: "🌿 Tour Xanh Tiêu Biểu"
    },
    {
      id: 2,
      title: "Trekking Tìm Hiểu Loài Voọc Chà Vá Cùng Kiểm Lâm",
      provider: "Green Trek Son Tra Eco",
      price: "380.000 đ",
      duration: "4 giờ",
      rating: 4.8,
      reviewsCount: 94,
      slotsLeft: 8,
      image: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=600&q=80",
      badge: "🐒 Bảo Tồn Động Vật"
    },
    {
      id: 3,
      title: "Chinh Phục Mũi Nghê & Đón Ánh Bình Minh Đảo Ngọc",
      provider: "Đà Nẵng Adventure Trail",
      price: "680.000 đ",
      duration: "1 ngày",
      rating: 5.0,
      reviewsCount: 62,
      slotsLeft: 4,
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
      badge: "🌅 Đón Bình Minh Sớm"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white font-be-vietnam text-[#2D3732]">
    <div className="flex flex-col min-h-screen bg-white font-be-vietnam text-[#1E293B]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#1E293B] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-700 animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex flex-col w-full max-w-7xl mx-auto p-5 sm:p-8 lg:p-10 gap-8 lg:gap-10">

        {/* ================= KHỐI 1: HERO THỜI TIẾT & AN TOÀN SINH THÁI SƠN TRÀ ================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D3732] via-[#3B5A45] to-[#243E30] text-white p-6 sm:p-8 lg:p-10 shadow-lg border border-[#4A6B5D]/40">
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-[#8DA696]/10 rounded-full blur-2xl pointer-events-none" />
        {/* ================= KHỐI 1: HERO THỜI TIẾT & AN TOÀN SINH THÁI (NỀN TRẮNG SANG TRỌNG) ================= */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#E2E8F0] shadow-2xs flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle Eco Accent Line on top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#2F5244]" />

          <div className="relative z-10 flex flex-col gap-6">
            {/* Top row: Greeting & Conservation Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Trạm Quan Trắc Rừng Sơn Trà (Live)
                  </span>
                  <span className="text-xs text-emerald-100/70 hidden sm:inline">
                    • Cập nhật 10 phút trước
                  </span>
                </div>
                <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold font-fraunces m-0 tracking-tight">
                  {getGreeting()}, {userName}!
                </h1>
                <p className="text-emerald-100 text-xs sm:text-sm m-0 leading-relaxed max-w-2xl font-light">
                  Thời tiết Bán đảo Sơn Trà hôm nay rất trong lành, tầm nhìn xa trên 10km. Hãy mang theo bình nước cá nhân và cùng chung tay giữ gìn vẻ đẹp thiên nhiên.
                </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F1F5F9] pb-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-[#EFF6F2] text-[#2F5244] text-xs font-bold px-3 py-1 rounded-full border border-[#D4E2D9] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2F5244] animate-pulse" />
                  Trạm Quan Trắc Rừng Sơn Trà (Live)
                </span>
                <span className="text-xs text-[#94A3B8] hidden sm:inline">
                  • Cập nhật 10 phút trước
                </span>
              </div>
              <h1 className="text-[#1E293B] text-2xl sm:text-3xl lg:text-4xl font-bold font-fraunces m-0 tracking-tight">
                {getGreeting()}, {userName}!
              </h1>
              <p className="text-[#475569] text-xs sm:text-sm m-0 leading-relaxed max-w-2xl font-normal">
                Thời tiết Bán đảo Sơn Trà hôm nay rất trong lành, tầm nhìn xa trên 10km. Hãy mang theo bình nước cá nhân và cùng chung tay giữ gìn vẻ đẹp thiên nhiên.
              </p>
            </div>

              {/* Trail Status Badge */}
              <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-300" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-emerald-100 font-medium">Tình trạng các tuyến</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1.5 font-fraunces">
                    Mở Cửa An Toàn 100%
                  </span>
                </div>
            {/* Trail Status Badge */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] px-4 py-3 rounded-2xl border border-[#E2E8F0] shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#2F5244]" />
              <div className="flex flex-col">
                <span className="text-[11px] text-[#64748B] font-medium">Tình trạng các tuyến</span>
                <span className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5 font-fraunces">
                  Mở Cửa An Toàn 100%
                </span>
              </div>
            </div>
          </div>

            {/* Bottom row: 4 Weather & Forest Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-emerald-100 truncate">Nhiệt độ ven rừng</span>
                  <span className="text-base font-bold text-white font-fraunces">27°C · Mát mẻ</span>
                </div>
          {/* 4 Weather & Forest Metrics: Đồng Nhất 1 Họ Màu Dịu Mắt */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9]">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#64748B] truncate">Nhiệt độ ven rừng</span>
                <span className="text-base font-bold text-[#1E293B] font-fraunces">27°C · Mát mẻ</span>
              </div>
            </div>

              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
                  <Wind className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-emerald-100 truncate">Gió biển Đông Bắc</span>
                  <span className="text-base font-bold text-white font-fraunces">12 km/h · Nhẹ</span>
                </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9]">
                <Wind className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#64748B] truncate">Gió biển Đông Bắc</span>
                <span className="text-base font-bold text-[#1E293B] font-fraunces">12 km/h · Nhẹ</span>
              </div>
            </div>

              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-emerald-100 truncate">Chỉ số UV / Nắng</span>
                  <span className="text-base font-bold text-white font-fraunces">Mức 3 · Trung bình</span>
                </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9]">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#64748B] truncate">Chỉ số UV / Nắng</span>
                <span className="text-base font-bold text-[#1E293B] font-fraunces">Mức 3 · Trung bình</span>
              </div>
            </div>

              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-emerald-100 truncate">Triều cường ngắm san hô</span>
                  <span className="text-base font-bold text-white font-fraunces">14:00 - 17:00</span>
                </div>
            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9]">
                <Compass className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#64748B] truncate">Triều cường ngắm san hô</span>
                <span className="text-base font-bold text-[#1E293B] font-fraunces">14:00 - 17:00</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= KHỐI 2: ADVENTURE PASSPORT MINI-WIDGET & NHIỆM VỤ XANH ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* PASSPORT MINI CARD (5 Cột) */}
          <div className="lg:col-span-5 bg-[#F7F5F0] p-6 rounded-3xl border border-[#E2E8E4] flex flex-col justify-between gap-6 shadow-xs relative">
          <div className="lg:col-span-5 bg-[#F8FAFC] p-6 rounded-3xl border border-[#E2E8F0] flex flex-col justify-between gap-6 shadow-2xs relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center border border-[#D4E2D9]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D3732] font-fraunces m-0">
                  <h3 className="text-sm font-bold text-[#1E293B] font-fraunces m-0">
                    Adventure Passport Của Bạn
                  </h3>
                  <span className="text-[11px] text-[#6B7A72]">
                  <span className="text-[11px] text-[#64748B]">
                    Mã định danh du khách xanh
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#4A6B5D] hover:bg-[#E9EFEC] text-xs font-bold border border-[#DCE5DF] transition-colors cursor-pointer shadow-xs"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#2F5244] hover:bg-[#EFF6F2] text-xs font-bold border border-[#E2E8F0] transition-colors cursor-pointer shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Mã QR</span>
              </button>
            </div>

            {/* Identity & Stats Row */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8E4]">
              <div className="w-14 h-14 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center font-bold text-xl font-fraunces overflow-hidden border border-[#DCE5DF] shrink-0">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center font-bold text-xl font-fraunces overflow-hidden border border-[#D4E2D9] shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold text-[#2D3732] truncate font-fraunces">
                <span className="text-sm font-bold text-[#1E293B] truncate font-fraunces">
                  {userName}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-[#4A6B5D] bg-[#E9EFEC] px-2 py-0.5 rounded-full border border-[#DCE5DF]">
                  <span className="text-[10px] font-bold text-[#2F5244] bg-[#EFF6F2] px-2 py-0.5 rounded-full border border-[#D4E2D9]">
                    🌿 Trekker Tiên Phong
                  </span>
                  <span className="text-[11px] text-[#6B7A72]">
                  <span className="text-[11px] text-[#64748B]">
                    Cấp 2
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Metrics Mini Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8E4]">
                <span className="text-lg font-bold text-[#4A6B5D] font-fraunces block">
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-lg font-bold text-[#D97706] font-fraunces block">
                  {points}
                </span>
                <span className="text-[10px] text-[#6B7A72] block">RE-Points</span>
                <span className="text-[10px] text-[#64748B] block">RE-Points</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8E4]">
                <span className="text-lg font-bold text-[#2D3732] font-fraunces block">
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-lg font-bold text-[#1E293B] font-fraunces block">
                  12.5
                </span>
                <span className="text-[10px] text-[#6B7A72] block">Km Trekking</span>
                <span className="text-[10px] text-[#64748B] block">Km Trekking</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8E4]">
                <span className="text-lg font-bold text-[#2D3732] font-fraunces block">
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-lg font-bold text-[#1E293B] font-fraunces block">
                  4.8 kg
                </span>
                <span className="text-[10px] text-[#6B7A72] block">Rác Đã Gom</span>
                <span className="text-[10px] text-[#64748B] block">Rác Đã Gom</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E2E8E4]">
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => navigate("/dashboard/marketplace")}
                className="py-2.5 px-3 bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-xs"
                className="py-2.5 px-3 bg-[#2F5244] hover:bg-[#243E33] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đổi Quà Xanh</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/profile")}
                className="py-2.5 px-3 bg-white hover:bg-[#E9EFEC] text-[#2D3732] text-xs font-bold rounded-xl transition-colors cursor-pointer border border-[#E2E8E4] flex items-center justify-center gap-1"
                className="py-2.5 px-3 bg-white hover:bg-[#F8FAFC] text-[#1E293B] text-xs font-bold rounded-xl transition-colors cursor-pointer border border-[#E2E8F0] flex items-center justify-center gap-1"
              >
                <span>Hồ Sơ Của Bạn</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#6B7A72]" />
                <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>
            </div>
          </div>

          {/* ACTIVE ECO-MISSIONS (7 Cột) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E2E8E4] flex flex-col justify-between gap-5 shadow-xs">
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E2E8F0] flex flex-col justify-between gap-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-[#4A6B5D]" />
                  <h3 className="text-base font-bold text-[#2D3732] font-fraunces m-0">
                  <Leaf className="w-4 h-4 text-[#2F5244]" />
                  <h3 className="text-base font-bold text-[#1E293B] font-fraunces m-0">
                    Nhiệm Vụ Xanh Cần Làm Hôm Nay
                  </h3>
                </div>
                <p className="text-xs text-[#6B7A72] m-0 mt-0.5">
                <p className="text-xs text-[#64748B] m-0 mt-0.5">
                  Tích lũy thêm RE-Points bằng hành động bảo tồn thực tế
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard/tasks")}
                className="text-xs font-bold text-[#4A6B5D] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                className="text-xs font-bold text-[#2F5244] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
              >
                <span>Tất cả nhiệm vụ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Mini Mission Items */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9EFEC]/60 transition-colors border border-[#E2E8E4] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#4A6B5D] flex items-center justify-center shrink-0 border border-[#E2E8E4]">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6F2]/50 transition-colors border border-[#E2E8F0] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5244] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#2D3732] truncate m-0">
                  <h4 className="text-xs font-bold text-[#1E293B] truncate m-0">
                    Thu gom 2kg rác nhựa tại Bãi Nam
                  </h4>
                  <span className="text-[11px] text-[#6B7A72]">
                  <span className="text-[11px] text-[#64748B]">
                    Chụp ảnh rác gom được gửi lên hệ thống
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-[#E67E22] bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +100 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#4A6B5D] hover:text-white text-[#4A6B5D] border border-[#DCE5DF] transition-colors cursor-pointer"
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5244] hover:text-white text-[#2F5244] border border-[#E2E8F0] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9EFEC]/60 transition-colors border border-[#E2E8E4] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#4A6B5D] flex items-center justify-center shrink-0 border border-[#E2E8E4]">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6F2]/50 transition-colors border border-[#E2E8F0] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5244] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#2D3732] truncate m-0">
                  <h4 className="text-xs font-bold text-[#1E293B] truncate m-0">
                    Không dùng chai nhựa một lần khi Trekking
                  </h4>
                  <span className="text-[11px] text-[#6B7A72]">
                  <span className="text-[11px] text-[#64748B]">
                    Quét mã QR tại trạm tiếp nước sạch miễn phí BQL
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-[#E67E22] bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +30 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#4A6B5D] hover:text-white text-[#4A6B5D] border border-[#DCE5DF] transition-colors cursor-pointer"
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5244] hover:text-white text-[#2F5244] border border-[#E2E8F0] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9EFEC]/60 transition-colors border border-[#E2E8E4] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#4A6B5D] flex items-center justify-center shrink-0 border border-[#E2E8E4]">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6F2]/50 transition-colors border border-[#E2E8F0] gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#2F5244] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#2D3732] truncate m-0">
                  <h4 className="text-xs font-bold text-[#1E293B] truncate m-0">
                    Check-in GPS &amp; Báo cáo an toàn đường mòn
                  </h4>
                  <span className="text-[11px] text-[#6B7A72]">
                  <span className="text-[11px] text-[#64748B]">
                    Đánh dấu trạm dừng Đỉnh Bàn Cờ an toàn
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-[#E67E22] bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    +50 pts
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#4A6B5D] hover:text-white text-[#4A6B5D] border border-[#DCE5DF] transition-colors cursor-pointer"
                    className="p-1.5 rounded-lg bg-white hover:bg-[#2F5244] hover:text-white text-[#2F5244] border border-[#E2E8F0] transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Progress bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E4] text-xs">
              <span className="text-[#6B7A72]">Tiến độ tuần: <strong>2/3 hoàn thành</strong></span>
              <div className="w-40 bg-[#E2E8E4] h-2 rounded-full overflow-hidden">
                <div className="bg-[#4A6B5D] h-full rounded-full w-[66%]" />
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-xs">
              <span className="text-[#64748B]">Tiến độ tuần: <strong className="text-[#1E293B]">2/3 hoàn thành</strong></span>
              <div className="w-40 bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                <div className="bg-[#2F5244] h-full rounded-full w-[66%]" />
              </div>
            </div>
          </div>

        </section>

        {/* ================= KHỐI 3: TUYẾN ĐƯỜNG TREKKING ĐẸP NHẤT SƠN TRÀ ================= */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#4A6B5D]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#2D3732] font-fraunces m-0">
                <Compass className="w-5 h-5 text-[#2F5244]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] font-fraunces m-0">
                  Tuyến Đường Trekking Đẹp Nhất Sơn Trà
                </h2>
              </div>
              <p className="text-xs text-[#6B7A72] m-0 mt-1">
              <p className="text-xs text-[#64748B] m-0 mt-1">
                Lộ trình chính thức có kiểm lâm hỗ trợ và cảnh báo an toàn GPS thời gian thực
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/dashboard/trekking")}
              className="text-xs font-bold text-[#4A6B5D] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
              className="text-xs font-bold text-[#2F5244] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
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
                className="flex flex-col bg-white rounded-3xl border border-[#E2E8E4] overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                className="flex flex-col bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                {/* Visual Image Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={route.image}
                    alt={route.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  
                  {/* Difficulty Tag */}
                  <div className={`absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-xs ${route.diffColor}`}>
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
                    <h3 className="text-base font-bold text-[#2D3732] font-fraunces group-hover:text-[#4A6B5D] transition-colors line-clamp-1 m-0">
                    <h3 className="text-base font-bold text-[#1E293B] font-fraunces group-hover:text-[#2F5244] transition-colors line-clamp-1 m-0">
                      {route.name}
                    </h3>
                    <p className="text-xs text-[#6B7A72] line-clamp-2 leading-relaxed m-0">
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed m-0">
                      {route.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E4] text-xs">
                    <span className="text-[#4A6B5D] font-bold flex items-center gap-1">
                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-xs">
                    <span className="text-[#2F5244] font-bold flex items-center gap-1">
                      Khám phá chi tiết &amp; GPS
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#E9EFEC] text-[#4A6B5D] group-hover:bg-[#4A6B5D] group-hover:text-white flex items-center justify-center transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#EFF6F2] text-[#2F5244] group-hover:bg-[#2F5244] group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= KHỐI 4: TRẢI NGHIỆM TOUR SINH THÁI NỔI BẬT ================= */}
        <section className="flex flex-col gap-5 bg-[#F7F5F0] p-6 sm:p-8 rounded-3xl border border-[#E2E8E4]">
        <section className="flex flex-col gap-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#4A6B5D]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#2D3732] font-fraunces m-0">
                <HeartHandshake className="w-5 h-5 text-[#2F5244]" />
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] font-fraunces m-0">
                  Trải Nghiệm Tour Sinh Thái Nổi Bật
                </h2>
              </div>
              <p className="text-xs text-[#6B7A72] m-0 mt-1">
              <p className="text-xs text-[#64748B] m-0 mt-1">
                Các chuyến dã ngoại do đối tác lữ hành xanh phối hợp cùng BQL Bán đảo Sơn Trà tổ chức
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/dashboard/trekking")}
              className="text-xs font-bold text-[#4A6B5D] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
              className="text-xs font-bold text-[#2F5244] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <span>Xem tất cả tour</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partnerTours.map((tour) => (
              <div 
                key={tour.id}
                className="bg-white rounded-2xl border border-[#E2E8E4] p-4 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-shadow"
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100">
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
                  <div className="flex items-center justify-between text-[11px] text-[#6B7A72]">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>{tour.provider}</span>
                    <div className="flex items-center text-amber-500 font-bold gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{tour.rating}</span>
                      <span className="text-[#6B7A72] font-normal">({tour.reviewsCount})</span>
                      <span className="text-[#94A3B8] font-normal">({tour.reviewsCount})</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#2D3732] font-fraunces line-clamp-2 m-0">
                  <h3 className="text-sm font-bold text-[#1E293B] font-fraunces line-clamp-2 m-0">
                    {tour.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[#6B7A72]">Thời lượng: {tour.duration}</span>
                    <span className="text-[#B8442C] font-bold">Còn {tour.slotsLeft} chỗ</span>
                    <span className="text-[#64748B]">Thời lượng: {tour.duration}</span>
                    <span className="text-[#D97706] font-bold">Còn {tour.slotsLeft} chỗ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E4] mt-auto">
                <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#6B7A72]">Giá vé trọn gói</span>
                    <span className="text-base font-bold text-[#4A6B5D] font-fraunces">
                    <span className="text-[10px] text-[#94A3B8]">Giá vé trọn gói</span>
                    <span className="text-base font-bold text-[#2F5244] font-fraunces">
                      {tour.price}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/trekking")}
                    className="px-4 py-2 bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 shadow-xs"
                    className="px-4 py-2 bg-[#2F5244] hover:bg-[#243E33] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 shadow-xs"
                  >
                    Đặt Tour
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= KHỐI 5: NGUYÊN TẮC 5K BẢO TỒN VOỌC & CỨU HỘ KHẨN CẤP ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* QUY TẮC BẢO TỒN VOỌC (8 Cột) */}
          <div className="lg:col-span-8 bg-[#E9EFEC]/60 p-6 sm:p-7 rounded-3xl border border-[#DCE5DF] flex flex-col justify-between gap-5">
          <div className="lg:col-span-8 bg-[#F8FAFC] p-6 sm:p-7 rounded-3xl border border-[#E2E8F0] flex flex-col justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#4A6B5D] flex items-center justify-center font-bold shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#2F5244] flex items-center justify-center font-bold border border-[#E2E8F0] shadow-2xs">
                🐒
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D3732] font-fraunces m-0">
                <h3 className="text-base font-bold text-[#1E293B] font-fraunces m-0">
                  Quy Tắc 5K Khi Khám Phá Rừng Bán Đảo Sơn Trà
                </h3>
                <p className="text-xs text-[#6B7A72] m-0">
                <p className="text-xs text-[#64748B] m-0">
                  Chung tay bảo tồn Voọc Chà Vá Chân Nâu — Nữ hoàng linh trưởng của Sơn Trà
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-[#DCE5DF] flex items-start gap-2.5">
                <span className="font-bold text-[#4A6B5D] shrink-0">01.</span>
                <span><strong>Giữ khoảng cách:</strong> Luôn duy trì cự ly tối thiểu 5m, không rượt đuổi hay tiếp cận quá gần thú hoang.</span>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5244] shrink-0">01.</span>
                <span className="text-[#475569]"><strong className="text-[#1E293B]">Giữ khoảng cách:</strong> Luôn duy trì cự ly tối thiểu 5m, không rượt đuổi hay tiếp cận quá gần thú hoang.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#DCE5DF] flex items-start gap-2.5">
                <span className="font-bold text-[#4A6B5D] shrink-0">02.</span>
                <span><strong>Không cho ăn:</strong> Thức ăn của con người gây bệnh đường ruột và làm mất bản năng kiếm ăn tự nhiên của linh trưởng.</span>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5244] shrink-0">02.</span>
                <span className="text-[#475569]"><strong className="text-[#1E293B]">Không cho ăn:</strong> Thức ăn của con người gây bệnh đường ruột và làm mất bản năng kiếm ăn tự nhiên của linh trưởng.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#DCE5DF] flex items-start gap-2.5">
                <span className="font-bold text-[#4A6B5D] shrink-0">03.</span>
                <span><strong>Giữ yên tĩnh:</strong> Không mở loa kéo, còi xe lớn trong rừng để tránh làm động vật hoảng sợ và lạc bầy.</span>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5244] shrink-0">03.</span>
                <span className="text-[#475569]"><strong className="text-[#1E293B]">Giữ yên tĩnh:</strong> Không mở loa kéo, còi xe lớn trong rừng để tránh làm động vật hoảng sợ và lạc bầy.</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#DCE5DF] flex items-start gap-2.5">
                <span className="font-bold text-[#4A6B5D] shrink-0">04.</span>
                <span><strong>Không xả rác:</strong> Mang tất cả rác thải cá nhân ra khỏi rừng, đặc biệt là túi nilon và chai nhựa.</span>
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] flex items-start gap-2.5">
                <span className="font-bold text-[#2F5244] shrink-0">04.</span>
                <span className="text-[#475569]"><strong className="text-[#1E293B]">Không xả rác:</strong> Mang tất cả rác thải cá nhân ra khỏi rừng, đặc biệt là túi nilon và chai nhựa.</span>
              </div>
            </div>
          </div>

          {/* CỨU HỘ & BÁO CÁO SỰ CỐ KHẨN CẤP (4 Cột) */}
          <div className="lg:col-span-4 bg-[#2D3732] text-white p-6 rounded-3xl border border-[#4A6B5D] flex flex-col justify-between gap-5 shadow-sm">
          {/* CỨU HỘ & BÁO CÁO SỰ CỐ KHẨN CẤP (4 Cột - NỀN TRẮNG VIỀN ĐỎ DỊU) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-rose-200/80 flex flex-col justify-between gap-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-fraunces m-0">
                <h3 className="text-sm font-bold text-[#991B1B] font-fraunces m-0">
                  Cứu Hộ &amp; Báo Cáo Sự Cố
                </h3>
                <span className="text-[11px] text-emerald-200">
                <span className="text-[11px] text-[#64748B]">
                  Trực ban BQL 24/7
                </span>
              </div>
            </div>

            <p className="text-xs text-emerald-100 leading-relaxed m-0 font-light">
            <p className="text-xs text-[#475569] leading-relaxed m-0 font-normal">
              Nếu bạn phát hiện sạt lở, cháy rừng, bẫy thú hoặc gặp sự cố chấn thương khi đi trekking, hãy báo cáo ngay cho lực lượng kiểm lâm.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={openIncidentModal}
                className="w-full py-3 bg-[#B8442C] hover:bg-[#963723] text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 shadow-xs"
                className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer border-0 flex items-center justify-center gap-2 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Báo Cáo Sự Cố Môi Trường</span>
              </button>

              <a
                href="tel:02363831111"
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer border border-white/20 flex items-center justify-center gap-2 no-underline"
                className="w-full py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1E293B] text-xs font-bold rounded-2xl transition-colors cursor-pointer border border-[#E2E8F0] flex items-center justify-center gap-2 no-underline"
              >
                <PhoneCall className="w-4 h-4 text-emerald-300" />
                <PhoneCall className="w-4 h-4 text-[#2F5244]" />
                <span>Hotline Cứu Hộ: 0236.3831.111</span>
              </a>
            </div>
          </div>

        </section>

      </main>

      {/* ================= MODAL MÃ QR ĐỊNH DANH DU KHÁCH ================= */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-be-vietnam animate-fade-in"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-be-vietnam animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-2xl border border-[#E2E8E4] text-center"
            className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-5 shadow-2xl border border-[#E2E8F0] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full border-b border-[#E2E8E4] pb-3">
              <span className="text-xs font-bold text-[#4A6B5D] flex items-center gap-1.5 font-fraunces">
            <div className="flex items-center justify-between w-full border-b border-[#E2E8F0] pb-3">
              <span className="text-xs font-bold text-[#2F5244] flex items-center gap-1.5 font-fraunces">
                <ShieldCheck className="w-4 h-4" />
                Mã Hộ Chiếu Sinh Thái
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
                className="p-1 text-[#64748B] hover:text-[#1E293B] border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-bold text-[#2D3732] font-fraunces m-0">
              <h3 className="text-lg font-bold text-[#1E293B] font-fraunces m-0">
                {userName}
              </h3>
              <span className="text-xs text-[#6B7A72]">
              <span className="text-xs text-[#64748B]">
                Mã số: <strong>{user?.qr_token || `ST-QUEST-${user?.id || '8888'}`}</strong>
              </span>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#4A6B5D] shadow-inner flex flex-col items-center justify-center">
            <div className="p-4 bg-white rounded-2xl border-2 border-[#2F5244] shadow-inner flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  user?.qr_token || `https://sontrareloop.vn/passport/${user?.id || '8888'}`
                )}`}
                alt="QR Code du khách"
                className="w-44 h-44 rounded-lg"
              />
            </div>

            <p className="text-[11px] text-[#6B7A72] leading-relaxed m-0">
            <p className="text-[11px] text-[#64748B] leading-relaxed m-0">
              Đưa mã QR này cho Ban Quản Lý hoặc Nhân viên Trạm Dừng Sơn Trà để ghi nhận check-in tuyến đường và tích điểm RE-Points.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                showToast("Đã lưu mã QR vào bộ nhớ đệm!");
              }}
              className="w-full py-2.5 bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
              className="w-full py-2.5 bg-[#2F5244] hover:bg-[#243E33] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}