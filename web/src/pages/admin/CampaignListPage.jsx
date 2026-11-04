import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Flame, 
  Building2, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  X, 
  Check, 
  AlertCircle,
  RefreshCw,
  Compass
} from 'lucide-react';
import flashSaleService from '../../services/flashSaleService';
import { realtimeBus } from '../../lib/realtimeBus';

export const CampaignListPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: {
      total_campaigns: 0,
      active_sessions: 0,
      total_slots: 0,
      total_sold: 0,
      avg_fill_rate: 0,
      pending_items_count: 0
    },
    campaigns: [],
    pending_items: []
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'pending'
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    banner_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    max_items_per_vendor: 3
  });

  const [sessionForm, setSessionForm] = useState({
    campaign_id: '',
    session_name: '',
    start_time: '',
    end_time: '',
    auto_extend_enabled: true,
    max_extend_minutes: 30
  });

  // Load Admin Data from API
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await flashSaleService.getAdminCampaigns();
      if (res) {
        setData(res);
        if (res.campaigns && res.campaigns.length > 0 && !sessionForm.campaign_id) {
          setSessionForm(prev => ({ ...prev, campaign_id: res.campaigns[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load flash sale campaigns:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Lắng nghe sự kiện realtime khi có du khách đặt mua slot Flash Sale
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === 'FLASH_SALE_SLOT_UPDATED' || event.type === 'ORDER_CREATED') {
        loadData(true);
      }
    });

    return unsubscribe;
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Create Campaign
  const handleCreateCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!campaignForm.title) {
      alert('Vui lòng nhập tiêu đề chiến dịch!');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await flashSaleService.createCampaign(campaignForm);
      if (res?.status === 'success') {
        setToastMessage('Đã khởi tạo Chiến dịch kích cầu du lịch sinh thái thành công!');
        setShowCreateCampaignModal(false);
        setCampaignForm({
          title: '',
          description: '',
          banner_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
          max_items_per_vendor: 3
        });
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi tạo chiến dịch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Session
  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    if (!sessionForm.session_name) {
      alert('Vui lòng nhập tên phiên giờ vàng!');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await flashSaleService.createSession(sessionForm);
      if (res?.status === 'success') {
        setToastMessage('Đã mở Phiên Giờ Vàng mới thành công!');
        setShowCreateSessionModal(false);
        setSessionForm({
          campaign_id: data.campaigns[0]?.id || '',
          session_name: '',
          start_time: '',
          end_time: '',
          auto_extend_enabled: true,
          max_extend_minutes: 30
        });
        loadData(true);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi thiết lập phiên giờ vàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Review Item
  const handleReviewItem = async (itemId, action) => {
    try {
      const res = await flashSaleService.reviewItem(itemId, action);
      if (res?.status === 'success') {
        setToastMessage(action === 'approve' ? 'Đã duyệt tour vào phiên Flash Sale!' : 'Đã từ chối tour tham gia.');
        loadData(true);
        realtimeBus.emit('FLASH_SALE_SLOT_UPDATED', { itemId, action });
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xử lý.');
    }
  };

  const metrics = data.metrics;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#18211c] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#24563d] flex items-center gap-3 animate-fade-in text-xs font-bold">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#24563d] rounded-lg text-xs font-bold mb-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Kích Cầu Du Lịch Sinh Thái • Flash Sale</span>
          </div>
          <h1 className="text-2xl font-bold font-fraunces text-[#18211c]">
            Chiến Dịch & Giờ Vàng Săn Tour
          </h1>
          <p className="text-xs text-[#5d6861] mt-1">
            Quản lý chiến dịch kích cầu, thiết lập khung giờ vàng và kiểm duyệt suất tour ưu đãi từ đối tác lữ hành.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData(false)}
            className="p-2.5 border border-[#e2e8e4] rounded-xl hover:bg-[#f7f5f0] text-[#5d6861] transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#24563d]' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateCampaignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#24563d] text-[#24563d] text-xs font-bold rounded-xl hover:bg-[#eaf2eb] transition-colors cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Tạo Chiến Dịch</span>
          </button>

          <button
            onClick={() => setShowCreateSessionModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#24563d] text-white text-xs font-bold rounded-xl hover:bg-[#1d4833] transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thiết Lập Phiên Giờ Vàng</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8e4] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#5d6861] mb-2">
            <span className="text-xs font-bold">Tổng Chiến Dịch</span>
            <Megaphone className="w-4 h-4 text-[#24563d]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-[#18211c]">
            {metrics.total_campaigns}
          </div>
          <p className="text-[11px] text-[#5d6861] m-0 mt-1">
            Chương trình kích cầu du lịch sinh thái
          </p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">Phiên Đang Mở (LIVE)</span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-emerald-900">
            {metrics.active_sessions}
          </div>
          <p className="text-[11px] text-emerald-700 m-0 mt-1">
            Khung giờ vàng du khách đang săn vé
          </p>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">Tổng Suất Vé Kích Cầu</span>
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-amber-900">
            {metrics.total_sold} / {metrics.total_slots}
          </div>
          <p className="text-[11px] text-amber-700 m-0 mt-1">
            Đã bán đạt {metrics.avg_fill_rate}% chỉ tiêu phiên
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-xs font-bold">Tỷ Lệ Lấp Đầy (% Fill)</span>
            <TrendingUp className="w-4 h-4 text-[#24563d]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-slate-900">
            {metrics.avg_fill_rate}%
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-[#24563d] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, metrics.avg_fill_rate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Campaign & Session Content */}
      <div className="space-y-6">
        {data.campaigns.length === 0 ? (
          <div className="bg-white border border-[#e2e8e4] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#eaf2eb] flex items-center justify-center text-[#24563d]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#18211c] text-sm">Chưa có Chiến dịch Flash Sale nào</h3>
            <p className="text-xs text-[#5d6861] max-w-sm m-0">
              Hãy bấm vào "Tạo Chiến Dịch" để khởi động chương trình giờ vàng săn tour đầu tiên cho Sơn Trà.
            </p>
          </div>
        ) : (
          data.campaigns.map((camp) => (
            <div key={camp.id} className="bg-white border border-[#e2e8e4] rounded-3xl p-6 shadow-xs space-y-5">
              {/* Campaign Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#e2e8e4]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#24563d] text-white text-[10px] font-bold">
                      {camp.status === 'active' ? 'Chiến Dịch Đang Chạy' : camp.status}
                    </span>
                    <span className="text-xs text-[#5d6861]">
                      Mã: #{camp.id} • Tối đa {camp.max_items_per_vendor} tour/đối tác
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-fraunces text-[#18211c] m-0">
                    {camp.title}
                  </h2>
                  <p className="text-xs text-[#5d6861] m-0 max-w-3xl">
                    {camp.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-[#5d6861] bg-[#f7f5f0] px-4 py-2.5 rounded-2xl border border-[#e2e8e4] shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-normal">Phiên giờ vàng</span>
                    <span className="text-emerald-800">{camp.total_sessions} phiên</span>
                  </div>
                  <div className="w-px h-6 bg-slate-300" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-normal">Vé đã bán</span>
                    <span className="text-[#24563d]">{camp.total_sold} / {camp.total_slots}</span>
                  </div>
                </div>
              </div>

              {/* Sessions in Campaign */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#18211c] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#24563d]" />
                  <span>Các Khung Giờ Vàng (Sessions)</span>
                </div>

                {camp.sessions.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-[#e2e8e4] text-center text-xs text-[#5d6861]">
                    Chưa có phiên giờ vàng nào được thiết lập trong chiến dịch này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {camp.sessions.map((sess) => (
                      <div 
                        key={sess.id}
                        className={`rounded-2xl border p-5 transition-all space-y-4 ${
                          sess.is_live 
                            ? 'border-emerald-300 bg-emerald-50/10 ring-1 ring-emerald-200' 
                            : 'border-[#e2e8e4] bg-[#fcfdfc]'
                        }`}
                      >
                        {/* Session Top Line */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                              sess.is_live 
                                ? 'bg-emerald-600 text-white animate-pulse' 
                                : sess.is_upcoming 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sess.is_live ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                  <span>ĐANG DIỄN RA (LIVE)</span>
                                </>
                              ) : sess.is_upcoming ? (
                                <span>SẮP DIỄN RA</span>
                              ) : (
                                <span>ĐÃ KẾT THÚC</span>
                              )}
                            </span>

                            <h3 className="font-bold text-sm text-[#18211c] m-0">
                              {sess.session_name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e2e8e4] rounded-xl font-mono text-[#24563d] font-bold">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Còn lại: {sess.countdown_text}</span>
                            </div>
                            {sess.auto_extend_enabled && (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200">
                                Tự động gia hạn +{sess.max_extend_minutes}p
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Items in Session */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-[#5d6861]">
                            Danh sách Tour mở bán ưu đãi ({sess.items.length} tour):
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sess.items.map((item) => (
                              <div 
                                key={item.id}
                                className="bg-white rounded-xl border border-[#e2e8e4] p-3 flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img 
                                    src={item.tour_cover_image || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=200&q=80"} 
                                    alt="" 
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#e2e8e4]"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-[#18211c] truncate">
                                      {item.tour_title}
                                    </div>
                                    <div className="text-[11px] text-[#5d6861] flex items-center gap-2 mt-0.5">
                                      <span className="text-rose-600 font-bold">
                                        {Number(item.promo_price).toLocaleString('vi-VN')} đ
                                      </span>
                                      <span className="line-through text-slate-400 text-[10px]">
                                        {Number(item.original_price).toLocaleString('vi-VN')} đ
                                      </span>
                                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">
                                        -{item.discount_percent}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-[11px] font-bold text-[#24563d]">
                                    {item.sold_quantity} / {item.slot_quantity} suất
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    item.is_sold_out ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {item.is_sold_out ? 'Hết vé' : `Còn ${item.remaining_slots} chỗ`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Create Campaign */}
      {showCreateCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e8e4] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8e4]">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#24563d]" />
                <h3 className="font-bold text-[#18211c] text-base">Khởi Tạo Chiến Dịch Kích Cầu Mới</h3>
              </div>
              <button 
                onClick={() => setShowCreateCampaignModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18211c] block mb-1">Tên Chiến Dịch *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tuần Lễ Sơn Trà Xanh 2026..."
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Mô Tả Mục Tiêu Chiến Dịch</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả thông điệp bảo tồn sinh thái và chính sách trợ giá..."
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Tối đa Tour/Đối Tác</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={campaignForm.max_items_per_vendor}
                    onChange={(e) => setCampaignForm({ ...campaignForm, max_items_per_vendor: e.target.value })}
                    className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Trạng Thái Ban Đầu</label>
                  <select
                    value={campaignForm.status || 'active'}
                    onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}
                    className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  >
                    <option value="active">Kích hoạt ngay (Active)</option>
                    <option value="draft">Bản nháp (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e2e8e4]">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 border border-[#e2e8e4] rounded-xl text-[#5d6861] font-bold hover:bg-[#f7f5f0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#24563d] text-white rounded-xl font-bold hover:bg-[#1d4833] transition-colors"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Chiến Dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Session */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e8e4] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8e4]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-[#18211c] text-base">Thiết Lập Phiên Giờ Vàng (Flash Session)</h3>
              </div>
              <button 
                onClick={() => setShowCreateSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18211c] block mb-1">Thuộc Chiến Dịch *</label>
                <select
                  value={sessionForm.campaign_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, campaign_id: e.target.value })}
                  className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                >
                  {data.campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Tên Phiên Giờ Vàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giờ Vàng 12h00 - Săn Tour Hoàng Hôn..."
                  value={sessionForm.session_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                  className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <input
                  type="checkbox"
                  id="auto_extend"
                  checked={sessionForm.auto_extend_enabled}
                  onChange={(e) => setSessionForm({ ...sessionForm, auto_extend_enabled: e.target.checked })}
                  className="rounded text-[#24563d]"
                />
                <label htmlFor="auto_extend" className="text-xs text-emerald-900 font-bold cursor-pointer">
                  Kích hoạt Tự động gia hạn thêm 30 phút nếu còn trên 20% số suất
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#e2e8e4]">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="px-4 py-2 border border-[#e2e8e4] rounded-xl text-[#5d6861] font-bold hover:bg-[#f7f5f0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#24563d] text-white rounded-xl font-bold hover:bg-[#1d4833] transition-colors"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Mở Phiên Giờ Vàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignListPage;
