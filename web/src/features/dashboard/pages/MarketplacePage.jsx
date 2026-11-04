import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useUserEco } from "../../../context/UserEcoContext";
import { 
  CheckCircle2,
  Award,
  Gift,
  Ticket,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Leaf,
  ShieldCheck,
  X,
  Loader2
} from "lucide-react";
import rewardService from "../../../services/rewardService";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { points: currentPoints, updatePoints, refreshEcoData } = useUserEco();

  const setPoints = (newPoints) => {
    updatePoints(newPoints);
  };

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'vouchers' | 'gifts' | 'my_rewards' | 'ledger'
  const [toastMessage, setToastMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [confirmModalItem, setConfirmModalItem] = useState(null);
  const [successModalData, setSuccessModalData] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);

  // Pure Database State (No hardcoded mock lists)
  const [allRewards, setAllRewards] = useState([]);
  const [myRewards, setMyRewards] = useState([]);
  const [pointsLedger, setPointsLedger] = useState([]);

  // Fetch real data from Backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRealData() {
      setIsLoading(true);
      try {
        const [rewardsData, userVouchersData, ledgerData] = await Promise.all([
          rewardService.fetchRewards(),
          rewardService.fetchMyVouchers(),
          rewardService.fetchPointsLedger()
        ]);

        if (!isMounted) return;

        setAllRewards(rewardsData || []);
        setMyRewards(userVouchersData || []);
        setPointsLedger(ledgerData || []);
      } catch (err) {
        console.error("Error loading marketplace data from API:", err);
        setAllRewards([]);
        setMyRewards([]);
        setPointsLedger([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRealData();
    return () => { isMounted = false; };
  }, []);

  // Filtered lists derived directly from Database
  const vouchersList = allRewards.filter(r => r.type === "voucher");
  const giftsList = allRewards.filter(r => r.type === "gift");

  // Trigger Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Open Confirm Modal
  const handleOpenConfirm = (item) => {
    const required = item.points_required || 0;
    if (currentPoints < required) {
      showToast(`Bạn còn thiếu ${required - currentPoints} RE-Points nữa để đổi phần thưởng này!`);
      return;
    }
    setConfirmModalItem(item);
  };

  // Execute Real-time Atomic Redemption via Backend API
  const handleExecuteRedeem = async () => {
    if (!confirmModalItem || isSubmitting) return;
    setIsSubmitting(true);
    const item = confirmModalItem;
    const requiredPoints = item.points_required || 0;

    const voucherId = parseInt(item.id, 10);
    if (!isNaN(voucherId)) {
      const res = await rewardService.redeemReward(voucherId);
      if (res.success) {
        const { new_total_points, user_voucher, message } = res.data;
        
        // Update Points in state & layout header
        setPoints(new_total_points);

        // Add to user vouchers wallet
        setMyRewards(prev => [user_voucher, ...prev]);

        // Add to points ledger
        const newLedgerItem = {
          id: Date.now(),
          points_change: -requiredPoints,
          type: "spend",
          reason: `Đổi phần thưởng: ${item.title}`,
          created_at: new Date().toLocaleDateString('vi-VN') + " " + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          reference_type: "voucher_redemption"
        };
        setPointsLedger(prev => [newLedgerItem, ...prev]);

        setConfirmModalItem(null);
        setSuccessModalData(user_voucher);
        setIsSubmitting(false);
        showToast(message || "Đổi phần thưởng thành công!");
        return;
      } else {
        showToast(res.error || "Giao dịch không thành công. Vui lòng kiểm tra lại số dư điểm.");
        setIsSubmitting(false);
        return;
      }
    } else {
      showToast("Phần thưởng không hợp lệ.");
      setIsSubmitting(false);
    }
  };

  // Copy voucher code
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã "${code}" vào bộ nhớ tạm!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#1E293B] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#334155] animate-fade-in font-be-vietnam max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-col w-full max-w-6xl mx-auto px-6 py-8 gap-8">
        
        {/* ================= HERO REWARD BANNER & POINTS STATUS ================= */}
        <section className="bg-[#2F5244] p-6 sm:p-8 rounded-3xl text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          {/* Background Decorative Circles */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full pointer-events-none blur-2xl" />
          <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-400/10 rounded-full pointer-events-none blur-xl" />

          {/* Left: Titles */}
          <div className="flex flex-col max-w-xl gap-2 z-10">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 text-emerald-100 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-be-vietnam flex items-center gap-1.5 border border-white/15">
                <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                Hệ Sinh Thái Kinh Tế Tuần Hoàn
              </span>
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold font-fraunces m-0">
              Đổi Thưởng Xanh Sơn Trà
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed font-be-vietnam m-0">
              Quy đổi <strong>RE-Points</strong> tích lũy từ trekking, dọn rác và bảo vệ môi trường để nhận voucher giảm giá tour lữ hành và quà lưu niệm sinh thái bảo tồn.
            </p>
          </div>

          {/* Right: Personal Point Card */}
          <div className="flex flex-col bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl w-full md:w-auto shrink-0 gap-4 z-10">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-200 font-be-vietnam">
                  Số Dư Điểm Của Bạn
                </span>
                <div className="flex items-center gap-2 text-white font-bold text-2xl font-fraunces">
                  <Award className="w-6 h-6 text-[#FBBF24] fill-[#FBBF24]" />
                  <span>{currentPoints}</span>
                  <span className="text-xs text-emerald-200 font-be-vietnam font-normal">RE-Points</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-white/70 block font-be-vietnam">Danh hiệu</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 font-be-vietnam bg-white/10 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đại Sứ Xanh
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-xs font-be-vietnam">
              <span className="text-emerald-100/80 text-[11px]">Cần thêm điểm?</span>
              <button
                type="button"
                onClick={() => navigate("/dashboard/tasks")}
                className="py-1 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-all border border-white/20 flex items-center gap-1 cursor-pointer"
              >
                <span>Làm nhiệm vụ tích điểm</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ================= TAB NAVIGATION FILTER ================= */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#2F5244] text-white border-[#2F5244] shadow-xs"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
              }`}
            >
              Tất Cả Ưu Đãi
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab("vouchers")}
              className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer flex items-center gap-1.5 ${
                activeTab === "vouchers"
                  ? "bg-[#2F5244] text-white border-[#2F5244] shadow-xs"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              Voucher Tour Trekking ({vouchersList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gifts")}
              className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer flex items-center gap-1.5 ${
                activeTab === "gifts"
                  ? "bg-[#2F5244] text-white border-[#2F5244] shadow-xs"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Quà Sinh Thái Tại Trạm ({giftsList.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("my_rewards")}
              className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer flex items-center gap-1.5 ${
                activeTab === "my_rewards"
                  ? "bg-[#2F5244] text-white border-[#2F5244] shadow-xs"
                  : "bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-[#2F5244]" />
              Kho Quà Của Tôi
              <span className="bg-[#2F5244] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {myRewards.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all border cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ledger"
                  ? "bg-[#2F5244] text-white border-[#2F5244] shadow-xs"
                  : "bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#2F5244]" />
              Nhật Ký Điểm
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-3 text-[#4A6B5D] font-be-vietnam text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang tải danh mục đổi thưởng từ hệ thống...</span>
          </div>
        )}

        {/* ================= TAB 1: ALL EMPTY STATE ================= */}
        {!isLoading && activeTab === "all" && allRewards.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-cream-50 rounded-3xl border border-dashed border-slate-300 text-center gap-3.5 font-be-vietnam">
            <div className="w-14 h-14 rounded-2xl bg-white text-forest-700 flex items-center justify-center border border-slate-200 shadow-2xs">
              <Gift className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-slate-800 text-base font-bold font-fraunces m-0">
              Chưa có phần thưởng nào khả dụng
            </h3>
            <p className="text-xs text-slate-500 max-w-md m-0 leading-relaxed">
              Các đơn vị lữ hành và BQL Sơn Trà đang chuẩn bị đợt quà tặng mới. Bạn có thể tích lũy thêm điểm thưởng ngay hôm nay.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard/tasks")}
              className="mt-1 py-2 px-5 rounded-full bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold border-0 cursor-pointer shadow-xs transition-all"
            >
              Làm nhiệm vụ để tích điểm
            </button>
          </div>
        )}

        {/* ================= TAB 1 & 2: VOUCHERS LIST ================= */}
        {!isLoading && (activeTab === "all" || activeTab === "vouchers") && vouchersList.length > 0 && (
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[#1E293B] text-xl font-bold tracking-tight font-fraunces m-0">
                  Voucher Giảm Giá Tour Trekking
                </h2>
                <p className="text-xs text-[#64748B] font-be-vietnam mt-0.5 m-0">
                  Tài trợ bởi các đối tác lữ hành & BQL. Áp dụng giảm trừ trực tiếp khi đặt tour trực tuyến.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vouchersList.map((voucher) => {
                const required = voucher.points_required || 0;
                const canAfford = currentPoints >= required;
                return (
                  <div
                    key={voucher.id}
                    className="flex flex-col sm:flex-row items-stretch bg-white rounded-3xl border border-[#E2E8F0] hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Voucher Image & Discount Badge */}
                    <div className="sm:w-44 h-48 sm:h-auto bg-[#F8FAFC] relative shrink-0 overflow-hidden">
                      <img
                        src={voucher.image}
                        alt={voucher.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-[#D97706] text-white text-xs font-bold font-fraunces px-2.5 py-1 rounded-xl shadow-xs">
                        {voucher.discount_badge}
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[#1E293B] text-[11px] font-medium font-be-vietnam px-2 py-0.5 rounded-md">
                        Hạn {voucher.valid_days || 30} ngày
                      </div>
                    </div>

                    {/* Voucher Info */}
                    <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-[#2F5244] uppercase tracking-wider font-be-vietnam">
                          {voucher.vendor_name}
                        </span>
                        <h3 className="text-[#1E293B] text-base font-bold font-fraunces m-0 line-clamp-2">
                          {voucher.title}
                        </h3>
                        <p className="text-xs text-[#64748B] font-be-vietnam leading-relaxed m-0 line-clamp-2">
                          {voucher.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                        <div className="flex items-center gap-1 text-[#D97706] font-bold text-sm font-fraunces">
                          <Award className="w-4 h-4 text-[#D97706] fill-[#D97706]" />
                          <span>{required} RE-Points</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenConfirm(voucher)}
                          className={`py-2 px-4 rounded-full text-xs font-bold font-be-vietnam transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                            canAfford
                              ? "bg-[#2F5244] hover:bg-[#243E33] text-white shadow-xs"
                              : "bg-[#F1F5F9] text-[#94A3B8]"
                          }`}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>{canAfford ? "Đổi Voucher" : `Thiếu ${required - currentPoints} Pt`}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty Vouchers Tab State */}
        {!isLoading && activeTab === "vouchers" && vouchersList.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-[#F8FAFC] rounded-3xl border border-dashed border-[#E2E8F0] text-center gap-3">
            <Ticket className="w-12 h-12 text-[#94A3B8]" />
            <h3 className="text-[#1E293B] text-base font-bold font-fraunces m-0">
              Chưa có voucher tour nào
            </h3>
            <p className="text-xs text-[#64748B] max-w-sm font-be-vietnam m-0">
              Hiện tại chưa có voucher giảm giá tour nào được phát hành trong cơ sở dữ liệu.
            </p>
          </div>
        )}

        {/* ================= TAB 1 & 3: ECO GIFTS LIST ================= */}
        {!isLoading && (activeTab === "all" || activeTab === "gifts") && giftsList.length > 0 && (
          <section className="flex flex-col gap-5 pt-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[#1E293B] text-xl font-bold tracking-tight font-fraunces m-0">
                  Quà Lưu Niệm Sinh Thái (Nhận Tại Trạm)
                </h2>
                <span className="bg-[#EFF6F2] text-[#2F5244] text-[11px] font-bold px-2.5 py-0.5 rounded-full font-be-vietnam">
                  On-site Pickup
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-be-vietnam mt-0.5 m-0">
                Đổi điểm nhận mã QR. Xuất trình mã tại Văn phòng BQL Sơn Trà hoặc trạm đón tiếp để nhận vật phẩm trực tiếp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {giftsList.map((gift) => {
                const required = gift.points_required || 0;
                const canAfford = currentPoints >= required;
                return (
                  <div
                    key={gift.id}
                    className="flex flex-col bg-white rounded-3xl border border-[#E2E8F0] hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Image */}
                    <div className="w-full h-44 bg-[#F8FAFC] relative overflow-hidden">
                      <img
                        src={gift.image}
                        alt={gift.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium font-be-vietnam px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        Nhận tại trạm
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-[#1E293B] text-sm font-bold font-fraunces m-0 line-clamp-2">
                          {gift.title}
                        </h3>
                        <p className="text-[11px] text-[#64748B] font-be-vietnam leading-relaxed m-0 line-clamp-2">
                          {gift.description}
                        </p>
                        {gift.pickup_location && (
                          <div className="mt-1 flex items-start gap-1 text-[11px] text-[#2F5244] font-medium font-be-vietnam bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#2F5244]" />
                            <span className="line-clamp-2">{gift.pickup_location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[#D97706] font-bold text-sm font-fraunces">
                          {required} <span className="text-xs text-[#64748B] font-normal">Pt</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenConfirm(gift)}
                          className={`py-2 px-3.5 rounded-full text-xs font-bold font-be-vietnam transition-all cursor-pointer border-0 ${
                            canAfford
                              ? "bg-[#2F5244] hover:bg-[#243E33] text-white shadow-xs"
                              : "bg-[#F1F5F9] text-[#94A3B8]"
                          }`}
                        >
                          {canAfford ? "Đổi Quà" : `Thiếu ${required - currentPoints} Pt`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty Gifts Tab State */}
        {!isLoading && activeTab === "gifts" && giftsList.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-[#F7F5F0] rounded-3xl border border-dashed border-[#DCE5DF] text-center gap-3">
            <Gift className="w-12 h-12 text-[#8DA696]" />
            <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0">
              Chưa có quà sinh thái nào
            </h3>
            <p className="text-xs text-[#6B7A72] max-w-sm font-be-vietnam m-0">
              Hiện tại chưa có quà lưu niệm sinh thái nào mở đổi trong cơ sở dữ liệu.
            </p>
          </div>
        )}

        {/* ================= TAB 4: MY REWARDS (KHO QUÀ CỦA TÔI) ================= */}
        {activeTab === "my_rewards" && (
          <section className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[#2D3732] text-xl font-bold tracking-tight font-fraunces m-0">
                  Kho Voucher & Quà Tặng Của Tôi
                </h2>
                <p className="text-xs text-[#6B7A72] font-be-vietnam mt-0.5 m-0">
                  Danh sách ưu đãi lưu trữ trực tiếp trên tài khoản của bạn. Xuất trình mã QR tại trạm hoặc dùng khi đặt tour.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="text-xs font-bold text-[#4A6B5D] hover:underline flex items-center gap-1 font-be-vietnam cursor-pointer bg-transparent border-0"
              >
                + Đổi thêm quà mới
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {myRewards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-cream-50 rounded-3xl border border-dashed border-slate-300 text-center gap-3.5 font-be-vietnam">
                <div className="w-14 h-14 rounded-2xl bg-white text-forest-700 flex items-center justify-center border border-slate-200 shadow-2xs">
                  <Ticket className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-slate-800 text-base font-bold font-fraunces m-0">
                  Kho quà của bạn đang trống
                </h3>
                <p className="text-xs text-slate-500 max-w-md m-0 leading-relaxed">
                  Bạn chưa đổi phần thưởng nào. Hãy hoàn thành các thử thách xanh để tích lũy RE-Points và mở khóa voucher giảm giá tour!
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/tasks")}
                    className="py-2 px-5 rounded-full bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold border-0 cursor-pointer shadow-xs transition-all"
                  >
                    Làm nhiệm vụ để tích điểm
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="py-2 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer shadow-2xs transition-all"
                  >
                    Xem ưu đãi hiện có
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myRewards.map((item) => {
                  const isUnused = item.status === "unused";
                  const isVoucher = item.type === "voucher";

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between p-6 rounded-3xl border transition-all ${
                        isUnused
                          ? "bg-white border-[#E2E8E4] shadow-xs hover:shadow-md"
                          : "bg-slate-50 border-slate-200 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Header Status */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full font-be-vietnam flex items-center gap-1 ${
                            isUnused
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-200 text-gray-700"
                          }`}>
                            {isUnused ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            {isUnused ? "Khả dụng / Chưa dùng" : "Đã sử dụng"}
                          </span>

                          <span className="text-[11px] text-[#6B7A72] font-be-vietnam">
                            Hạn dùng: <strong>{item.expires_at || "Không thời hạn"}</strong>
                          </span>
                        </div>

                        {/* Title & Vendor */}
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#4A6B5D] font-be-vietnam">
                            {item.vendor_name}
                          </span>
                          <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0 mt-0.5">
                            {item.title}
                          </h3>
                        </div>

                        {/* Code Display Box */}
                        <div className="flex items-center justify-between bg-[#F7F5F0] p-3 rounded-2xl border border-[#E2E8E4]">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-[#6B7A72] font-be-vietnam">
                              {isVoucher ? "Mã Khuyến Mãi" : "Mã Quà Tặng"}
                            </span>
                            <span className="font-mono text-base font-bold text-[#2D3732] tracking-wider">
                              {item.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              title="Sao chép mã"
                              className="p-2 bg-white hover:bg-emerald-50 text-[#4A6B5D] rounded-xl border border-[#DCE5DF] cursor-pointer transition-colors"
                            >
                              {copiedCode === item.code ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setQrModalItem(item)}
                              title="Xem mã QR"
                              className="p-2 bg-[#4A6B5D] hover:bg-[#3B5A45] text-white rounded-xl border-0 cursor-pointer transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {item.pickup_location && (
                          <div className="flex items-start gap-1.5 text-xs text-[#4A6B5D] font-be-vietnam">
                            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Địa điểm nhận: <strong>{item.pickup_location}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E9EFEC] gap-3">
                        <span className="text-xs text-[#6B7A72] font-medium font-be-vietnam">
                          Đã trừ: {item.points_spent} Pt
                        </span>

                        {isVoucher && isUnused && (
                          <button
                            type="button"
                            onClick={() => navigate("/dashboard/trekking")}
                            className="py-2 px-4 rounded-full bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold font-be-vietnam border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <span>Dùng khi đặt tour</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isVoucher && isUnused && (
                          <button
                            type="button"
                            onClick={() => setQrModalItem(item)}
                            className="py-2 px-4 rounded-full bg-[#2D3732] hover:bg-[#4A6B5D] text-white text-xs font-bold font-be-vietnam border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Mã QR Nhận Quà</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 5: POINTS LEDGER (LỊCH SỬ BIẾN ĐỘNG ĐIỂM) ================= */}
        {activeTab === "ledger" && (
          <section className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h2 className="text-[#2D3732] text-xl font-bold tracking-tight font-fraunces m-0">
                Nhật Ký Biến Động RE-Points
              </h2>
              <p className="text-xs text-[#6B7A72] font-be-vietnam mt-0.5 m-0">
                Lịch sử minh bạch ghi nhận từng điểm thưởng bạn đóng góp và quy đổi trên bán đảo Sơn Trà.
              </p>
            </div>

            {pointsLedger.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-cream-50 rounded-3xl border border-dashed border-slate-300 text-center gap-3.5 font-be-vietnam">
                <div className="w-14 h-14 rounded-2xl bg-white text-forest-700 flex items-center justify-center border border-slate-200 shadow-2xs">
                  <Clock className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-slate-800 text-base font-bold font-fraunces m-0">
                  Chưa có lịch sử biến động điểm
                </h3>
                <p className="text-xs text-slate-500 max-w-md m-0 leading-relaxed">
                  Bạn chưa có giao dịch cộng điểm hoặc đổi điểm nào được ghi nhận. Hãy tham gia ngay các nhiệm vụ xanh để tích lũy điểm đầu tiên!
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/tasks")}
                  className="mt-1 py-2 px-5 rounded-full bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold border-0 cursor-pointer shadow-xs transition-all"
                >
                  Làm nhiệm vụ để tích điểm
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E2E8E4] overflow-hidden shadow-xs">
                <div className="divide-y divide-[#E9EFEC]">
                  {pointsLedger.map((record) => {
                    const isEarn = record.type === "earn" || (record.points_change && record.points_change > 0);
                    const changeAmount = record.points_change !== undefined ? record.points_change : record.points;
                    const formattedChange = changeAmount > 0 ? `+${changeAmount}` : `${changeAmount}`;

                    return (
                      <div
                        key={record.id}
                        className="p-5 flex items-center justify-between gap-4 hover:bg-[#F7F5F0]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isEarn
                              ? "bg-emerald-100 text-[#4A6B5D]"
                              : "bg-amber-100 text-[#B8442C]"
                          }`}>
                            {isEarn ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                              {record.reason}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-[#6B7A72] font-be-vietnam">
                              <span>{record.created_at}</span>
                              {record.reference_type && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#4A6B5D]">{record.reference_type}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`font-fraunces font-bold text-base shrink-0 ${
                          isEarn ? "text-[#4A6B5D]" : "text-[#B8442C]"
                        }`}>
                          {formattedChange} RE-Points
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* ================= MODAL: XÁC NHẬN ĐỔI THƯỞNG ================= */}
      {confirmModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in font-be-vietnam">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8E4]">
            
            <div className="flex items-center justify-between border-b border-[#E9EFEC] pb-3">
              <div className="flex items-center gap-2 text-[#4A6B5D]">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold font-fraunces text-[#2D3732] m-0">
                  Xác Nhận Đổi Thưởng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                className="p-1 rounded-lg text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-4 bg-[#F7F5F0] p-4 rounded-2xl border border-[#E2E8E4]">
              <img
                src={confirmModalItem.image}
                alt={confirmModalItem.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[#4A6B5D] uppercase tracking-wider">
                  {confirmModalItem.tag}
                </span>
                <h4 className="text-sm font-bold text-[#2D3732] font-fraunces m-0">
                  {confirmModalItem.title}
                </h4>
                {confirmModalItem.pickup_location && (
                  <span className="text-[11px] text-[#6B7A72] line-clamp-1">
                    Nhận tại: {confirmModalItem.pickup_location}
                  </span>
                )}
              </div>
            </div>

            {/* Point calculation breakdown */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center text-[#6B7A72]">
                <span>Điểm RE-Points hiện có:</span>
                <span className="font-bold text-[#2D3732] font-fraunces text-sm">{currentPoints} Pt</span>
              </div>
              <div className="flex justify-between items-center text-[#B8442C]">
                <span>Điểm quy đổi cần trừ:</span>
                <span className="font-bold font-fraunces text-sm">
                  -{confirmModalItem.points_required} Pt
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E9EFEC] text-[#2D3732] font-bold">
                <span>Số dư sau khi đổi:</span>
                <span className="text-[#4A6B5D] font-fraunces text-base">
                  {currentPoints - confirmModalItem.points_required} RE-Points
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <strong>Lưu ý:</strong> Điểm sẽ được khấu trừ trực tiếp trong cơ sở dữ liệu và lưu vào <em>Kho Quà Của Tôi</em>.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-full border border-[#DCE5DF] bg-white text-[#6B7A72] hover:bg-[#F7F5F0] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteRedeem}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold border-0 cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Xác Nhận Đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ĐỔI THÀNH CÔNG ================= */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in font-be-vietnam">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-5 border border-[#E2E8E4]">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#4A6B5D] flex items-center justify-center shadow-inner animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-bold font-fraunces text-[#2D3732] m-0">
                Đổi Thưởng Thành Công!
              </h3>
              <p className="text-xs text-[#6B7A72] m-0">
                Cảm ơn bạn đã đóng góp cho Sơn Trà. Phần thưởng đã được cập nhật vào cơ sở dữ liệu.
              </p>
            </div>

            {/* Generated Code Box */}
            <div className="w-full bg-[#F7F5F0] p-4 rounded-2xl border border-[#E2E8E4] flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-[#6B7A72] uppercase tracking-wider">
                {successModalData.type === "voucher" ? "Mã Voucher Của Bạn" : "Mã Quà Tặng Nhận Tại Trạm"}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-[#2D3732] tracking-wider">
                  {successModalData.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(successModalData.code)}
                  className="p-1.5 rounded-lg bg-white text-[#4A6B5D] border border-[#DCE5DF] hover:bg-emerald-50 cursor-pointer"
                >
                  {copiedCode === successModalData.code ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <span className="text-[11px] text-[#4A6B5D] font-medium">
                Hạn sử dụng: {successModalData.expires_at || "Không thời hạn"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setSuccessModalData(null);
                  setActiveTab("my_rewards");
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold border-0 cursor-pointer transition-colors"
              >
                Xem Trong Kho Quà
              </button>
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="w-full py-2.5 px-4 rounded-full bg-[#F7F5F0] hover:bg-[#E9EFEC] text-[#2D3732] text-xs font-bold border-0 cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MÃ QR NHẬN QUÀ / DÙNG VOUCHER ================= */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in font-be-vietnam">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4 border border-[#E2E8E4]">
            
            <div className="flex items-center justify-between w-full border-b border-[#E9EFEC] pb-2">
              <span className="text-xs font-bold font-fraunces text-[#2D3732]">
                Mã QR Xác Thực
              </span>
              <button
                type="button"
                onClick={() => setQrModalItem(null)}
                className="p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Presentation */}
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-[#4A6B5D] flex flex-col items-center gap-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrModalItem.code)}`}
                alt={`QR code for ${qrModalItem.code}`}
                className="w-44 h-44 rounded-lg object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=180&q=80";
                }}
              />
              <span className="font-mono text-sm font-bold text-[#2D3732]">
                {qrModalItem.code}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-[#2D3732] font-fraunces m-0">
                {qrModalItem.title}
              </h4>
              <p className="text-xs text-[#6B7A72] m-0">
                {qrModalItem.pickup_location 
                  ? `Xuất trình mã này tại: ${qrModalItem.pickup_location}`
                  : "Quét mã để áp dụng giảm giá trực tiếp tại quầy thanh toán."
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() => setQrModalItem(null)}
              className="w-full py-2.5 px-4 rounded-full bg-[#4A6B5D] text-white text-xs font-bold border-0 cursor-pointer"
            >
              Hoàn Tất
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

