import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  Zap,
  Gift, 
  Map, 
  Sun, 
  Clock, 
  Star, 
  Plus, 
  Minus, 
  ChevronRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Award,
  Compass,
  ArrowUpRight,
  Menu,
  ShieldCheck,
  Leaf
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};
  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  
  // Quantities for Flash Sale tours
  const [quantities, setQuantities] = useState({
    tour1: 1,
    tour2: 1,
    tour3: 1,
  });

  const [toastMessage, setToastMessage] = useState("");

  const updateQuantity = (tourKey, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [tourKey]: Math.max(1, (prev[tourKey] || 1) + delta),
    }));
  };

  const handleBooking = (tourName, price, qty) => {
    const total = (price * qty).toLocaleString("vi-VN");
    setToastMessage(`Đã thêm ${qty} vé "${tourName}" (Tổng: ${total}đ) vào đơn đặt tour!`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="w-full border-b border-[#E9EFEC] bg-white sticky top-0 z-30">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-6 px-6 sm:px-10">
          <div className="flex items-center gap-3">
            {openSidebar && (
              <button
                type="button"
                className="lg:hidden p-2 bg-[#F7F5F0] text-[#2D3732] rounded-xl border-0 cursor-pointer"
                onClick={openSidebar}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[#6B7A72] text-xs font-medium">Xin chào,</span>
              <h1 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-serif">
                {userName}! 👋
              </h1>
            </div>
          </div>

            <div className="flex items-center gap-3.5">
              <div className="flex items-center bg-[#E9EFEC] py-2 px-4 gap-2 rounded-full border border-[#DCE5DF]">
                <Award className="w-4 h-4 text-[#4A6B5D]" />
                <span className="text-[#4A6B5D] text-xs sm:text-[13px] font-bold">
                  350 RE-Points
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#4A6B5D] text-white w-10 h-10 rounded-2xl font-bold text-sm shadow-sm font-serif">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-10">
          
          {/* Weather & Safety Banner */}
          <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#4A6B5D] py-6 px-7 rounded-3xl text-white shadow-sm gap-4 relative overflow-hidden">
            <div className="flex flex-col max-w-xl gap-1.5 z-10">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-300 animate-spin-slow" />
                <span className="text-white text-base sm:text-lg font-bold font-serif">
                  Thời tiết &amp; An toàn — Sơn Trà hôm nay
                </span>
              </div>
              <p className="text-emerald-50 text-sm leading-relaxed">
                Trời quang, nắng nhẹ. Tuyến Ghềnh Bàng đang mở cửa.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 z-10 shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
              <div className="flex flex-col">
                <span className="text-xs text-emerald-100">Cảnh báo di chuyển</span>
                <span className="text-xs font-bold text-white">An toàn tuyệt đối</span>
              </div>
            </div>
          </section>

          {/* Quick Action Navigation Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <button 
              type="button"
              onClick={() => navigate("/dashboard/trekking")}
              className="flex flex-col items-start bg-[#E9EFEC] hover:bg-[#DCE5DF] transition-all p-5 gap-3 rounded-3xl group border-0 text-left cursor-pointer"
            >
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#4A6B5D] group-hover:scale-110 transition-transform shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[#2D3732] text-sm sm:text-base font-bold font-serif">
                Trekking An Toàn
              </span>
            </button>

            <button 
              type="button"
              onClick={() => navigate("/dashboard/tasks")}
              className="flex flex-col items-start bg-[#E9EFEC] hover:bg-[#DCE5DF] transition-all p-5 gap-3 rounded-3xl group border-0 text-left cursor-pointer"
            >
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#4A6B5D] group-hover:scale-110 transition-transform shadow-sm">
                <Leaf className="w-6 h-6" />
              </div>
              <span className="text-[#2D3732] text-sm sm:text-base font-bold font-serif">
                Nhiệm vụ Xanh
              </span>
            </button>

            <button 
              type="button"
              onClick={() => navigate("/dashboard/marketplace")}
              className="flex flex-col items-start bg-[#E9EFEC] hover:bg-[#DCE5DF] transition-all p-5 gap-3 rounded-3xl group border-0 text-left cursor-pointer"
            >
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#4A6B5D] group-hover:scale-110 transition-transform shadow-sm">
                <Gift className="w-6 h-6" />
              </div>
              <span className="text-[#2D3732] text-sm sm:text-base font-bold font-serif">
                Đổi Phần Thưởng
              </span>
            </button>

            <button className="flex flex-col items-start bg-[#E9EFEC] hover:bg-[#DCE5DF] transition-all p-5 gap-3 rounded-3xl group border-0 text-left cursor-pointer">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#4A6B5D] group-hover:scale-110 transition-transform shadow-sm">
                <Map className="w-6 h-6" />
              </div>
              <span className="text-[#2D3732] text-sm sm:text-base font-bold font-serif">
                Bản Đồ GPS
              </span>
            </button>
          </section>

          {/* Flash Sale Section */}
          <section className="flex flex-col bg-[#F7F5F0] p-6 sm:p-8 gap-6 rounded-3xl border border-[#E9EFEC] shadow-sm">
            {/* Flash Sale Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2F3A35] rounded-2xl flex items-center justify-center text-[#F2B04C]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-[#2F3A35] text-xl sm:text-[22px] font-bold tracking-tight font-serif">
                  Flash Sale hôm nay
                </h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-[#2F3A35] py-1.5 px-3.5 gap-2 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-medium">Kết thúc sau</span>
                  <span className="text-[#F2B04C] text-xs font-bold font-mono">02:45:10</span>
                </div>
                <a href="#all" className="text-[#B8442C] text-xs sm:text-[13px] font-bold hover:underline flex items-center gap-1">
                  Xem tất cả <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Flash Sale Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tour Card 1 */}
              <div className="flex flex-col bg-white p-4 gap-4 rounded-2xl border border-[#F0DCC6] shadow-[0px_4px_16px_#B8442C12] hover:shadow-md transition-shadow">
                <div className="relative overflow-hidden rounded-xl h-44 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
                    alt="Trekking Đỉnh Bàn Cờ"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-[#B8442C] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    -15%
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[#2F3A35] text-base font-bold line-clamp-1 font-serif">
                    Trekking Đỉnh Bàn Cờ
                  </h3>
                  <div className="flex items-center gap-2 text-[#58645D] text-xs">
                    <div className="flex items-center text-amber-500 gap-1 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>4.8</span>
                    </div>
                    <span>(124 đánh giá)</span>
                    <span>•</span>
                    <span>4.2 km · Trung bình</span>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[#2F3A35]">Đã đặt 18/30</span>
                    <span className="text-[#B8442C] font-bold">(Còn 12 chỗ)</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#F0DCC6] h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-[#B8442C] h-full w-[60%] rounded-full"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[#B8442C] text-xl sm:text-2xl font-bold font-serif">
                        450.000đ
                      </span>
                      <span className="text-[#58645D] text-xs">/ khách</span>
                    </div>
                    <span className="text-[#58645D] text-xs line-through">
                      530.000đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#2F3A35] font-bold">Số lượng:</span>
                    <div className="flex items-center border border-[#F0DCC6] rounded-lg px-2 py-1 gap-3 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour1", -1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[#2F3A35] font-bold min-w-[16px] text-center">
                        {quantities.tour1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour1", 1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking("Trekking Đỉnh Bàn Cờ", 450000, quantities.tour1)}
                    className="w-full bg-[#B8442C] hover:bg-[#a03923] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm border-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>

              {/* Tour Card 2 */}
              <div className="flex flex-col bg-white p-4 gap-4 rounded-2xl border border-[#F0DCC6] shadow-[0px_4px_16px_#B8442C12] hover:shadow-md transition-shadow">
                <div className="relative overflow-hidden rounded-xl h-44 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=600&q=80"
                    alt="Bãi Bấc - Cây Đa Di Sản"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-[#B8442C] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    -20%
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[#2F3A35] text-base font-bold line-clamp-1 font-serif">
                    Bãi Bấc - Cây Đa Di Sản
                  </h3>
                  <div className="flex items-center gap-2 text-[#58645D] text-xs">
                    <div className="flex items-center text-amber-500 gap-1 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>4.9</span>
                    </div>
                    <span>(56 đánh giá)</span>
                    <span>•</span>
                    <span>3.1 km · Dễ</span>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[#2F3A35]">Đã đặt 18/30</span>
                    <span className="text-[#B8442C] font-bold">(Còn 12 chỗ)</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#F0DCC6] h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-[#B8442C] h-full w-[60%] rounded-full"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[#B8442C] text-xl sm:text-2xl font-bold font-serif">
                        320.000đ
                      </span>
                      <span className="text-[#58645D] text-xs">/ khách</span>
                    </div>
                    <span className="text-[#58645D] text-xs line-through">
                      400.000đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#2F3A35] font-bold">Số lượng:</span>
                    <div className="flex items-center border border-[#F0DCC6] rounded-lg px-2 py-1 gap-3 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour2", -1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[#2F3A35] font-bold min-w-[16px] text-center">
                        {quantities.tour2}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour2", 1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking("Bãi Bấc - Cây Đa Di Sản", 320000, quantities.tour2)}
                    className="w-full bg-[#B8442C] hover:bg-[#a03923] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm border-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>

              {/* Tour Card 3 */}
              <div className="flex flex-col bg-white p-4 gap-4 rounded-2xl border border-[#F0DCC6] shadow-[0px_4px_16px_#B8442C12] hover:shadow-md transition-shadow">
                <div className="relative overflow-hidden rounded-xl h-44 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
                    alt="Mũi Nghê"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-[#B8442C] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    -12%
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[#2F3A35] text-base font-bold line-clamp-1 font-serif">
                    Mũi Nghê — Đón Bình Minh
                  </h3>
                  <div className="flex items-center gap-2 text-[#58645D] text-xs">
                    <div className="flex items-center text-amber-500 gap-1 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>4.7</span>
                    </div>
                    <span>(89 đánh giá)</span>
                    <span>•</span>
                    <span>5.6 km · Thử thách</span>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-[#2F3A35]">Đã đặt 18/30</span>
                    <span className="text-[#B8442C] font-bold">(Còn 12 chỗ)</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#F0DCC6] h-1.5 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-[#B8442C] h-full w-[60%] rounded-full"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[#B8442C] text-xl sm:text-2xl font-bold font-serif">
                        680.000đ
                      </span>
                      <span className="text-[#58645D] text-xs">/ khách</span>
                    </div>
                    <span className="text-[#58645D] text-xs line-through">
                      770.000đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#2F3A35] font-bold">Số lượng:</span>
                    <div className="flex items-center border border-[#F0DCC6] rounded-lg px-2 py-1 gap-3 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour3", -1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[#2F3A35] font-bold min-w-[16px] text-center">
                        {quantities.tour3}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour3", 1)}
                        className="text-slate-600 hover:text-[#B8442C] p-0.5 border-0 bg-transparent cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking("Mũi Nghê — Đón Bình Minh", 680000, quantities.tour3)}
                    className="w-full bg-[#B8442C] hover:bg-[#a03923] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm border-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Suggested Routes Section */}
          <section className="flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-serif">
                Tuyến đường gợi ý hôm nay
              </h2>
              <a href="#routes" className="text-[#4A6B5D] text-xs sm:text-[13px] font-bold hover:underline">
                Xem tất cả
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col bg-white p-5 gap-3 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow group">
                <div className="h-36 bg-[#F7F5F0] rounded-2xl flex flex-col items-center justify-center border border-[#E2E8E4] group-hover:bg-[#E9EFEC] transition-colors relative overflow-hidden">
                  <MapPin className="w-8 h-8 text-[#4A6B5D] mb-1" />
                  <span className="text-[#6B7A72] text-xs font-medium">Bản đồ tuyến đường</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[#2D3732] text-base font-bold group-hover:text-[#4A6B5D] transition-colors">
                    Đỉnh Bàn Cờ
                  </h4>
                  <span className="text-[#6B7A72] text-xs mt-0.5">
                    4.2 km · Độ khó: Trung bình
                  </span>
                </div>
              </div>

              <div className="flex flex-col bg-white p-5 gap-3 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow group">
                <div className="h-36 bg-[#F7F5F0] rounded-2xl flex flex-col items-center justify-center border border-[#E2E8E4] group-hover:bg-[#E9EFEC] transition-colors relative overflow-hidden">
                  <Compass className="w-8 h-8 text-[#4A6B5D] mb-1" />
                  <span className="text-[#6B7A72] text-xs font-medium">Bản đồ tuyến đường</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[#2D3732] text-base font-bold group-hover:text-[#4A6B5D] transition-colors">
                    Bãi Bấc - Cây Đa Di Sản
                  </h4>
                  <span className="text-[#6B7A72] text-xs mt-0.5">
                    3.1 km · Độ khó: Dễ
                  </span>
                </div>
              </div>

              <div className="flex flex-col bg-white p-5 gap-3 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow group">
                <div className="h-36 bg-[#F7F5F0] rounded-2xl flex flex-col items-center justify-center border border-[#E2E8E4] group-hover:bg-[#E9EFEC] transition-colors relative overflow-hidden">
                  <ArrowUpRight className="w-8 h-8 text-[#4A6B5D] mb-1" />
                  <span className="text-[#6B7A72] text-xs font-medium">Bản đồ tuyến đường</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[#2D3732] text-base font-bold group-hover:text-[#4A6B5D] transition-colors">
                    Mũi Nghê
                  </h4>
                  <span className="text-[#6B7A72] text-xs mt-0.5">
                    5.6 km · Độ khó: Thử thách
                  </span>
                </div>
              </div>
            </div>
          </section>

        </main>
    </div>
  );
}
