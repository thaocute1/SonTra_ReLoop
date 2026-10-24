import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Ticket,
  MessageSquare, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  QrCode, 
  Printer, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Compass,
  ArrowRight
} from "lucide-react";
import { api } from "../../../lib/axios";
import { realtimeBus } from "../../../lib/realtimeBus";

export default function MyTrekkingBookingsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tours/my-bookings/");
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
        if (res.data.data.length > 0 && !selectedTicket) {
          setSelectedTicket(res.data.data[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load customer bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = realtimeBus.subscribe((e) => {
      if (e.type === "ORDER_CREATED" || e.type === "FLASH_SALE_SLOT_UPDATED") {
        fetchBookings();
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === "flash_sale") return b.is_flash_sale;
    if (activeFilter === "confirmed") return b.status === "confirmed";
    if (activeFilter === "completed") return b.status === "completed";
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D3732]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-be-vietnam">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-[#E2E8E4] relative flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#F7F5F0] hover:bg-[#E2E8E4] text-[#6B7A72] border-0 cursor-pointer transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pb-4 border-b border-[#E2E8E4] pr-10 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
            <Ticket className="w-3.5 h-3.5 text-emerald-600" />
            Vé Điện Tử & Lịch Sử Đặt Chuyến
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-fraunces text-[#2D3732] m-0">
            Lịch Sử Đặt Tour Trekking Sơn Trà
          </h3>
          <p className="text-xs text-[#6B7A72] m-0">
            Xuất trình mã QR E-Ticket tại Trạm Gác / Đội Kiểm Lâm Sơn Trà để làm thủ tục xuất phát cùng Hướng Dẫn Viên.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto shrink-0 border-b border-[#E2E8E4]/60">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeFilter === "all" 
                ? "bg-[#24563d] text-white border-[#24563d]" 
                : "bg-white text-[#6B7A72] border-[#E2E8E4] hover:bg-[#F7F5F0]"
            }`}
          >
            Tất cả vé ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("flash_sale")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
              activeFilter === "flash_sale" 
                ? "bg-amber-500 text-white border-amber-500" 
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Giờ Vàng Flash Sale ({bookings.filter(b => b.is_flash_sale).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("confirmed")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              activeFilter === "confirmed" 
                ? "bg-[#24563d] text-white border-[#24563d]" 
                : "bg-white text-[#6B7A72] border-[#E2E8E4] hover:bg-[#F7F5F0]"
            }`}
          >
            Đã xác nhận ({bookings.filter(b => b.status === "confirmed").length})
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-20 text-center flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#24563d] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#6B7A72]">Đang tải danh sách vé điện tử từ hệ thống...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center flex-1 flex flex-col items-center justify-center gap-3">
            <Compass className="w-12 h-12 text-[#6B7A72]/40" />
            <h4 className="font-fraunces text-base font-bold text-[#2D3732] m-0">Bạn chưa có vé trekking nào</h4>
            <p className="text-xs text-[#6B7A72] max-w-sm m-0">
              Hãy chọn một tuyến trekking sinh thái hoặc săn vé Giờ Vàng Flash Sale để bắt đầu hành trình khám phá!
            </p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 py-4 overflow-y-auto pr-1">
            
            {/* Left Column: Tickets List */}
            <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[58vh] pr-1">
              {filteredBookings.map((b) => {
                const isSelected = selectedTicket?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedTicket(b)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? "bg-[#FAF8F5] border-[#24563d] ring-2 ring-[#24563d]/20 shadow-md" 
                        : "bg-white border-[#E2E8E4] hover:border-[#8DA696] hover:bg-[#F7F5F0]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E8E4]/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-[#24563d]">
                          #{b.order_code}
                        </span>
                        {b.is_flash_sale && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-rose-600" /> Flash Sale
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9EFEC] text-[#24563d] border border-[#DCE5DF]">
                        {b.status_label || "Đã xác nhận"}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <img 
                        src={b.tour_cover_image} 
                        alt="" 
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100" 
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-bold text-xs text-[#2D3732] line-clamp-1 m-0">
                          {b.tour_title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-[#6B7A72]">
                          <Calendar className="w-3 h-3 text-[#24563d]" />
                          <span>{b.scheduled_date} ({b.time_slot})</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[11px] text-[#6B7A72]">{b.total_guests} vé</span>
                          <span className="font-bold font-fraunces text-emerald-800">
                            {b.total_price_formatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-[#E2E8E4]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#4A6B5D] font-bold">HDV & Kiểm Lâm Trực Tuyến</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          const tourId = b.tour_id || '';
                          const dateStr = b.departure_date_raw || '';
                          navigate(`/dashboard/inbox?tour_id=${tourId}&date=${dateStr}`);
                        }}
                        className="text-[11px] font-bold text-[#24563d] hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Khung Chat Đoàn</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Detailed E-Ticket Preview */}
            {selectedTicket && (
              <div className="lg:col-span-7 bg-gradient-to-br from-[#18211c] via-[#24352b] to-[#1c2c23] rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* E-Ticket Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#18211c] flex items-center justify-center font-bold">
                      <Ticket className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] tracking-wider uppercase text-emerald-300 font-bold block">
                        VÉ ĐIỆN TỬ TREKKING SƠN TRÀ
                      </span>
                      <span className="font-mono font-bold text-sm text-white">
                        {selectedTicket.order_code}
                      </span>
                    </div>
                  </div>

                  {selectedTicket.is_flash_sale && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Zap className="w-3 h-3 fill-current" /> Giờ Vàng Eco-Tour
                    </span>
                  )}
                </div>

                {/* Tour Title & Meta */}
                <div className="space-y-1 relative z-10">
                  <span className="text-[11px] text-emerald-200">Hành trình:</span>
                  <h3 className="font-fraunces font-bold text-base sm:text-lg text-white leading-snug m-0">
                    {selectedTicket.tour_title}
                  </h3>
                  <p className="text-[11px] text-slate-300 flex items-center gap-2 m-0 pt-0.5">
                    <span>Thời lượng: {selectedTicket.tour_duration}h</span>
                    <span>•</span>
                    <span>Độ khó: {selectedTicket.tour_difficulty === 'easy' ? 'Dễ' : selectedTicket.tour_difficulty === 'moderate' ? 'Trung bình' : 'Thử thách'}</span>
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs relative z-10">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Ngày khởi hành:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {selectedTicket.scheduled_date}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Khung giờ tập trung:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {selectedTicket.time_slot}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Hướng Dẫn Viên (Eco-Guide):</span>
                    <span className="font-bold text-white truncate block">
                      {selectedTicket.guide_name}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Số lượng khách:</span>
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {selectedTicket.total_guests} chỗ đã giữ
                    </span>
                  </div>

                  <div className="col-span-2 space-y-0.5 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-slate-400 block">Điểm đón khách:</span>
                    <span className="font-medium text-white flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      {selectedTicket.pickup_location}
                    </span>
                  </div>
                </div>

                {/* QR Code & Total Row */}
                <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white text-[#18211c] relative z-10 shadow-md">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#6B7A72] block">Tổng thanh toán:</span>
                    <div className="text-lg font-bold font-fraunces text-[#24563d]">
                      {selectedTicket.total_price_formatted}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Đã đóng góp 10% Quỹ ESG Sơn Trà
                    </span>
                  </div>

                  {/* QR Code Graphic */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-16 h-16 p-1 bg-white rounded-xl border border-slate-300 flex items-center justify-center">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                    <span className="text-[9px] font-mono text-[#6B7A72]">Check-in Code</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      const tourId = selectedTicket.tour_id || '';
                      const dateStr = selectedTicket.departure_date_raw || '';
                      navigate(`/dashboard/inbox?tour_id=${tourId}&date=${dateStr}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer border-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Vào Khung Chat Đoàn</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer border border-white/15 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> In Vé / Tải QR
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#18211c] font-black text-xs transition-colors cursor-pointer border-0 shadow-md"
                  >
                    Đóng
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

