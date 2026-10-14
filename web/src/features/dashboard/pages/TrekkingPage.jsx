import React, { useState } from "react";
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
  Info
} from "lucide-react";

export default function TrekkingPage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};
  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  // Quantities for tours
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
    setToastMessage(`Đã thêm ${qty} vé "${tourName}" (Tổng: ${total} VNĐ) vào đơn đặt tour!`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const filterPills = [
    { id: "all", label: "Tất cả" },
    { id: "flash_sale", label: "Flash Sale", isFlash: true },
    { id: "easy", label: "Dễ (Gia đình)" },
    { id: "medium", label: "Trung bình" },
    { id: "hard", label: "Thử thách" },
    { id: "gps", label: "Có GPS Checkpoint" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="w-full border-b border-[#E9EFEC] bg-white sticky top-0 z-30">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-6 px-6 sm:px-10 gap-4">
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
            <h1 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
              Trekking An Toàn
            </h1>
          </div>

            {/* Search Input Bar */}
            <div className="flex items-center bg-white py-2.5 px-4 gap-2.5 rounded-2xl border border-[#E2E8E4] w-full max-w-md shadow-xs focus-within:border-[#4A6B5D]">
              <Search className="w-4 h-4 text-[#757575] shrink-0" />
              <input
                type="text"
                placeholder="Tìm tuyến Trekking, Mũi Nghê, Đỉnh Bàn Cờ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-[#2D3732] placeholder-[#757575] bg-transparent border-0 outline-none font-be-vietnam"
              />
            </div>

            {/* RE-Points & User Initials */}
            <div className="hidden sm:flex items-center gap-3.5">
              <div className="flex items-center bg-[#E9EFEC] py-2 px-4 gap-2 rounded-full border border-[#DCE5DF]">
                <Award className="w-4 h-4 text-[#4A6B5D]" />
                <span className="text-[#4A6B5D] text-xs sm:text-[13px] font-bold font-be-vietnam">
                  350 RE-Points
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#4A6B5D] text-white w-10 h-10 rounded-2xl font-bold text-sm shadow-sm font-fraunces">
                {userName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-8">
          
          {/* Filter Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {filterPills.map((pill) => {
              const isSelected = selectedFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedFilter(pill.id)}
                  className={`flex items-center shrink-0 py-2.5 px-5 gap-2 rounded-full text-[13px] font-bold font-be-vietnam transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-[#4A6B5D] text-white border-[#4A6B5D]"
                      : pill.isFlash
                      ? "bg-white text-[#2F3A35] border-[#F0DCC6] hover:bg-[#FAF3EB]"
                      : "bg-white text-[#6B7A72] border-[#E2E8E4] hover:bg-[#F7F5F0] hover:text-[#2D3732]"
                  }`}
                >
                  {pill.isFlash && <Flame className="w-4 h-4 text-[#B8442C]" />}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section: Đang giảm giá (On-sale Tours) */}
          <section className="flex flex-col bg-[#FBF1E6] p-6 sm:p-8 gap-6 rounded-3xl">
            {/* Header with Flame Icon and Countdown Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-[#B8442C]" />
                <h2 className="text-[#2F3A35] text-xl sm:text-2xl font-bold font-fraunces m-0">
                  Đang giảm giá
                </h2>
                <div className="flex items-center bg-[#2F3A35] py-1.5 px-3.5 gap-2 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-medium font-be-vietnam">Kết thúc sau</span>
                  <span className="text-[#F2B04C] text-xs font-bold font-mono">02:45:10</span>
                </div>
              </div>
            </div>

            {/* On-Sale Tour Cards */}
            <div className="flex flex-col gap-6">
              
              {/* Tour 1: Chinh phục Đỉnh Bàn Cờ */}
              <div className="flex flex-col lg:flex-row items-stretch bg-white p-5 gap-6 rounded-3xl border border-[#F0DCC6] shadow-[0px_4px_16px_#B8442C12] hover:shadow-md transition-shadow">
                {/* Image Thumbnail */}
                <div className="relative w-full lg:w-48 h-44 lg:h-auto rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
                    alt="Chinh phục Đỉnh Bàn Cờ"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#B8442C] text-white text-xs font-bold px-2.5 py-1 rounded-full font-be-vietnam">
                    -15%
                  </div>
                </div>

                {/* Tour Info Content */}
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#2D3732] text-lg font-bold font-fraunces m-0">
                      Chinh phục Đỉnh Bàn Cờ
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center text-amber-500 gap-1 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="text-[#B8442C] font-bold">4.8</span>
                      </div>
                      <span className="text-[#6B7A72]">(124 đánh giá)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A72] font-be-vietnam">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#4A6B5D]" />
                      <span>4.2 km</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-[#4A6B5D]" />
                      <span>2.5 giờ</span>
                    </div>
                    <div className="flex items-center bg-[#FDEEE1] py-1 px-3 gap-1.5 rounded-xl text-[#9B4912] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Dốc cao, cần giày trekking</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 w-full max-w-xs">
                    <span className="text-[#2F3A35] text-xs font-bold font-be-vietnam">
                      Đã đặt 18/30
                    </span>
                    <div className="w-full bg-[#F0DCC6] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#B8442C] h-full w-[60%] rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Price & Action Section */}
                <div className="flex flex-col justify-between items-start lg:items-end gap-4 shrink-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0">
                  <div className="flex flex-col items-start lg:items-end gap-1">
                    <span className="text-[#B8442C] text-xl sm:text-2xl font-bold font-fraunces">
                      382.500 VNĐ<span className="text-xs text-[#6B7A72] font-normal font-be-vietnam">/người</span>
                    </span>
                    <span className="text-[#6B7A72] text-xs font-bold line-through font-be-vietnam">
                      450.000 VNĐ/người
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#2F3A35] text-xs font-bold font-be-vietnam">Số lượng:</span>
                    <div className="flex items-center border border-[#F0DCC6] rounded-full overflow-hidden bg-[#F7F5F0]">
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour1", -1)}
                        className="px-3 py-1.5 text-[#2F3A35] hover:text-[#B8442C] font-bold border-0 bg-transparent cursor-pointer"
                      >
                        −
                      </button>
                      <span className="px-3 py-1.5 text-xs font-bold text-[#2F3A35] font-be-vietnam">
                        {quantities.tour1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour1", 1)}
                        className="px-3 py-1.5 text-[#2F3A35] hover:text-[#B8442C] font-bold border-0 bg-transparent cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking("Chinh phục Đỉnh Bàn Cờ", 382500, quantities.tour1)}
                    className="w-full lg:w-auto bg-[#B8442C] hover:bg-[#a03923] text-white font-bold py-2.5 px-6 rounded-full transition-colors cursor-pointer text-xs font-be-vietnam border-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>

              {/* Tour 2: Bãi Bấc - Cây Đa Di Sản */}
              <div className="flex flex-col lg:flex-row items-stretch bg-white p-5 gap-6 rounded-3xl border border-[#F0DCC6] shadow-[0px_4px_16px_#B8442C12] hover:shadow-md transition-shadow">
                {/* Image Thumbnail */}
                <div className="relative w-full lg:w-48 h-44 lg:h-auto rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&w=600&q=80"
                    alt="Bãi Bấc - Cây Đa Di Sản"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#B8442C] text-white text-xs font-bold px-2.5 py-1 rounded-full font-be-vietnam">
                    -15%
                  </div>
                </div>

                {/* Tour Info Content */}
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#2D3732] text-lg font-bold font-fraunces m-0">
                      Bãi Bấc - Cây Đa Di Sản
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center text-amber-500 gap-1 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="text-[#B8442C] font-bold">4.8</span>
                      </div>
                      <span className="text-[#6B7A72]">(124 đánh giá)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A72] font-be-vietnam">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#4A6B5D]" />
                      <span>3.1 km</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-[#4A6B5D]" />
                      <span>1.5 giờ</span>
                    </div>
                    <div className="flex items-center bg-[#FDEEE1] py-1 px-3 gap-1.5 rounded-xl text-[#9B4912] font-bold">
                      <Info className="w-3.5 h-3.5" />
                      <span>Phù hợp gia đình, có trạm nước</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 w-full max-w-xs">
                    <span className="text-[#2F3A35] text-xs font-bold font-be-vietnam">
                      Đã đặt 18/30
                    </span>
                    <div className="w-full bg-[#F0DCC6] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#B8442C] h-full w-[60%] rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Price & Action Section */}
                <div className="flex flex-col justify-between items-start lg:items-end gap-4 shrink-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0">
                  <div className="flex flex-col items-start lg:items-end gap-1">
                    <span className="text-[#B8442C] text-xl sm:text-2xl font-bold font-fraunces">
                      382.500 VNĐ<span className="text-xs text-[#6B7A72] font-normal font-be-vietnam">/người</span>
                    </span>
                    <span className="text-[#6B7A72] text-xs font-bold line-through font-be-vietnam">
                      450.000 VNĐ/người
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#2F3A35] text-xs font-bold font-be-vietnam">Số lượng:</span>
                    <div className="flex items-center border border-[#F0DCC6] rounded-full overflow-hidden bg-[#F7F5F0]">
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour2", -1)}
                        className="px-3 py-1.5 text-[#2F3A35] hover:text-[#B8442C] font-bold border-0 bg-transparent cursor-pointer"
                      >
                        −
                      </button>
                      <span className="px-3 py-1.5 text-xs font-bold text-[#2F3A35] font-be-vietnam">
                        {quantities.tour2}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity("tour2", 1)}
                        className="px-3 py-1.5 text-[#2F3A35] hover:text-[#B8442C] font-bold border-0 bg-transparent cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBooking("Bãi Bấc - Cây Đa Di Sản", 382500, quantities.tour2)}
                    className="w-full lg:w-auto bg-[#B8442C] hover:bg-[#a03923] text-white font-bold py-2.5 px-6 rounded-full transition-colors cursor-pointer text-xs font-be-vietnam border-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Section: Tất cả tuyến (All Routes) */}
          <section className="flex flex-col gap-5">
            <h2 className="text-[#2F3A35] text-xl font-bold font-fraunces m-0">
              Tất cả tuyến
            </h2>

            <div className="flex flex-col lg:flex-row items-stretch bg-white p-5 gap-6 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow">
              {/* Image Placeholder */}
              <div className="w-full lg:w-48 h-36 lg:h-auto rounded-2xl bg-[#F7F5F0] border border-[#E2E8E4] flex items-center justify-center text-[#6B7A72] text-xs font-medium shrink-0 font-be-vietnam">
                Bản đồ Mũi Nghê
              </div>

              {/* Route Info */}
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0">
                    Mũi Nghê
                  </h3>
                  <span className="text-[#4A6B5D] text-sm font-bold border border-[#E2E8E4] px-3 py-1 rounded-xl bg-white font-be-vietnam">
                    450.000 VNĐ/người
                  </span>
                </div>

                <div className="flex items-center gap-6 text-xs text-[#6B7A72] font-be-vietnam">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    <span>5.6 km</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    <span>3.5 giờ</span>
                  </div>
                </div>

                <div className="flex items-center bg-[#FDEEE1] py-1.5 px-3 gap-2 rounded-xl text-[#9B4912] text-xs font-bold w-fit">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Địa hình đá trơn trượt khi mưa</span>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => handleBooking("Mũi Nghê", 450000, 1)}
                    className="border border-[#4A6B5D] text-[#4A6B5D] hover:bg-[#4A6B5D] hover:text-white font-bold py-2 px-5 rounded-full transition-colors cursor-pointer text-xs font-be-vietnam bg-white"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          </section>

        </main>
    </div>
  );
}
