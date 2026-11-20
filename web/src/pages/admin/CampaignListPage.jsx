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
import { SaasSelect } from '../../components/ui/SaasPrimitives';

export const CampaignListPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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
    max_items_per_vendor: 3,
    registration_deadline: ''
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
        setLoadError('');
        if (res.campaigns && res.campaigns.length > 0 && !sessionForm.campaign_id) {
          setSessionForm(prev => ({ ...prev, campaign_id: res.campaigns[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load flash sale campaigns:', err);
      setLoadError(err.response?.status === 403
        ? 'Tài khoản hiện tại không có quyền xem dữ liệu Flash Sale. Chiến dịch chưa bị xóa; hãy đăng nhập bằng tài khoản BQL/staff được cấp quyền rồi tải lại.'
        : 'Không tải được dữ liệu Flash Sale. Hãy thử tải lại trang.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Lắng nghe sự kiện realtime khi có du khách đặt mua slot Flash Sale
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === 'FLASH_SALE_SLOT_UPDATED' || event.type === 'ORDER_CREATED') {
        // Keep polling/manual refresh as the source of truth for external order updates.
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
          max_items_per_vendor: 3,
          registration_deadline: ''
        });
        setData(current => ({ ...current, campaigns: [res.data, ...current.campaigns], metrics: { ...current.metrics, total_campaigns: current.metrics.total_campaigns + 1 } }));
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
        setToastMessage('Đã mở phiên giờ vàng mới thành công!');
        setShowCreateSessionModal(false);
        setSessionForm({
          campaign_id: data.campaigns[0]?.id || '',
          session_name: '',
          start_time: '',
          end_time: '',
          auto_extend_enabled: true,
          max_extend_minutes: 30
        });
        const created = res.data;
        setData(current => ({ ...current, campaigns: current.campaigns.map(campaign => campaign.id === created.campaign_id ? { ...campaign, sessions: [created, ...(campaign.sessions || [])], total_sessions: (campaign.total_sessions || 0) + 1 } : campaign) }));
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        alert(err.response.data.message);
        return;
      }
      alert('Lỗi thiết lập phiên giờ vàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateSessionModal = () => {
    const selectableCampaign = data.campaigns.find(campaign => campaign.status !== 'ended' && campaign.status !== 'paused');
    setSessionForm(previous => ({ ...previous, campaign_id: selectableCampaign?.id || '' }));
    setShowCreateSessionModal(true);
  };

  // Handle Review Item
  const handleReviewItem = async (itemId, action) => {
    try {
      const res = await flashSaleService.reviewItem(itemId, action);
      if (res?.status === 'success') {
        setToastMessage(action === 'approve' ? 'Đã duyệt tour vào phiên flash sale!' : 'Đã từ chối tour tham gia.');
        setData(current => ({ ...current, pending_items: current.pending_items.filter(item => item.id !== itemId), metrics: { ...current.metrics, pending_items_count: Math.max(0, current.metrics.pending_items_count - 1) } }));
        realtimeBus.emit('FLASH_SALE_SLOT_UPDATED', { itemId, action });
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xử lý.');
    }
  };

  const handleCampaignStatus = async (campaignId, campaignStatus) => {
    try {
      const res = await flashSaleService.updateCampaignStatus(campaignId, campaignStatus);
      if (res?.status === 'success') {
        setToastMessage(campaignStatus === 'active' ? 'Đã mở nhận đăng ký cho chiến dịch.' : 'Đã cập nhật trạng thái chiến dịch.');
        setData(current => ({ ...current, campaigns: current.campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, status: campaignStatus } : campaign) }));
      }
    } catch (err) {
      console.error('Campaign status update failed:', err.response?.data || err);
      alert(err.response?.data?.message || err.response?.data?.detail || 'Không thể cập nhật trạng thái chiến dịch.');
    }
  };

  const metrics = data.metrics;

  return (
    <div className="m3-app-page min-w-0 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--sr-text-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[var(--sr-accent)] flex items-center gap-3 animate-fade-in text-xs font-bold">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="admin-page-header bg-white rounded-2xl p-6 shadow-xs flex justify-start items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData(false)}
            className="p-2.5 border border-[var(--sr-border)] rounded-xl hover:bg-[var(--sr-bg-page)] text-[var(--sr-text-secondary)] transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--sr-accent)]' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateCampaignModal(true)}
            disabled={Boolean(loadError)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--sr-accent)] text-[var(--sr-accent)] text-xs font-bold rounded-xl hover:bg-[var(--sr-accent-soft)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Megaphone className="w-4 h-4" />
            <span>Tạo chiến dịch</span>
          </button>

          <button
            onClick={openCreateSessionModal}
            disabled={Boolean(loadError)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sr-accent)] text-white text-xs font-bold rounded-xl hover:bg-[var(--sr-accent-hover)] transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Thiết lập phiên giờ vàng</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-[var(--sr-warn)] bg-[var(--sr-warn-soft)] px-5 py-4 text-sm text-[var(--sr-warn)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{loadError}</div>
            <button type="button" onClick={() => loadData(false)} className="shrink-0 rounded-lg border border-[var(--sr-warn)] px-3 py-1.5 font-bold hover:bg-[var(--sr-warn-soft)]">Tải lại</button>
          </div>
        </div>
      )}

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--sr-border)] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--sr-text-secondary)] mb-2">
            <span className="text-xs font-bold">Tổng chiến dịch</span>
            <Megaphone className="w-4 h-4 text-[var(--sr-accent)]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-[var(--sr-text-primary)]">
            {loadError ? 'Chưa có' : metrics.total_campaigns}
          </div>
          <p className="text-xs text-[var(--sr-text-secondary)] m-0 mt-1">
            Chương trình kích cầu du lịch sinh thái
          </p>
        </div>

        <div className="bg-[var(--sr-accent-soft)] border border-[var(--sr-border-strong)] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--sr-accent-ink)] mb-2">
            <span className="text-xs font-bold">Phiên đang mở (LIVE)</span>
            <Flame className="w-4 h-4 text-[var(--sr-accent)]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-[var(--sr-accent-ink)]">
            {loadError ? 'Chưa có' : metrics.active_sessions}
          </div>
          <p className="text-xs text-[var(--sr-accent-ink)] m-0 mt-1">
            Khung giờ vàng du khách đang săn vé
          </p>
        </div>

        <div className="bg-[var(--sr-warn-soft)] border border-[var(--sr-warn)] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--sr-warn)] mb-2">
            <span className="text-xs font-bold">Tổng suất vé kích cầu</span>
            <Compass className="w-4 h-4 text-[var(--sr-warn)]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-[var(--sr-warn)]">
            {loadError ? 'Chưa có' : `${metrics.total_sold} / ${metrics.total_slots}`}
          </div>
          <p className="text-xs text-[var(--sr-warn)] m-0 mt-1">
            Đã bán đạt {metrics.avg_fill_rate}% chỉ tiêu phiên
          </p>
        </div>

        <div className="bg-[var(--sr-bg-page)] border border-[var(--sr-border)] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[var(--sr-text-secondary)] mb-2">
            <span className="text-xs font-bold">Tỷ lệ lấp đầy (% fill)</span>
            <TrendingUp className="w-4 h-4 text-[var(--sr-accent)]" />
          </div>
          <div className="text-2xl font-bold font-fraunces text-[var(--sr-text-primary)]">
            {loadError ? 'Chưa có' : `${metrics.avg_fill_rate}%`}
          </div>
          <div className="w-full bg-[var(--sr-bg-subtle)] h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-[var(--sr-accent)] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.avg_fill_rate)}%` }}
            />
          </div>
        </div>
      </div>

      {data.pending_items.length > 0 && (
        <section className="bg-white border border-[var(--sr-warn)] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[var(--sr-text-primary)] text-sm m-0">Tour chờ duyệt ({data.pending_items.length})</h2>
              <p className="text-xs text-[var(--sr-text-secondary)] m-0 mt-1">Chỉ tour được duyệt mới xuất hiện với du khách.</p>
            </div>
          </div>
          <div className="space-y-2">
            {data.pending_items.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--sr-border)] p-3 text-xs">
                <div>
                  <strong className="text-[var(--sr-text-primary)] block">{item.tour_title}</strong>
                  <span className="text-[var(--sr-text-secondary)]">{item.vendor_name} · {Number(item.promo_price).toLocaleString('vi-VN')}đ · {item.slot_quantity} suất</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleReviewItem(item.id, 'reject')} className="px-3 py-1.5 rounded-lg border border-[var(--sr-urgent)] text-[var(--sr-urgent-ink)] font-bold hover:bg-[var(--sr-urgent-soft)]">Từ chối</button>
                  <button type="button" onClick={() => handleReviewItem(item.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-[var(--sr-accent)] text-white font-bold hover:bg-[var(--sr-accent-hover)]">Duyệt</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Campaign & Session Content */}
      <div className="space-y-6">
        {loadError ? null : data.campaigns.length === 0 ? (
          <div className="bg-white border border-[var(--sr-border)] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--sr-accent-soft)] flex items-center justify-center text-[var(--sr-accent)]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[var(--sr-text-primary)] text-sm">Chưa có chiến dịch flash sale nào</h3>
            <p className="text-xs text-[var(--sr-text-secondary)] max-w-sm m-0">
              Hãy bấm vào "Tạo chiến dịch" để khởi động chương trình giờ vàng săn tour đầu tiên cho Sơn Trà.
            </p>
          </div>
        ) : (
          data.campaigns.map((camp) => (
            <div key={camp.id} className="bg-white border border-[var(--sr-border)] rounded-3xl p-6 shadow-xs space-y-5">
              {/* Campaign Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--sr-border)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--sr-accent)] text-white text-xs font-bold">
                      {camp.status === 'active' ? 'Chiến dịch đang chạy' : camp.status}
                    </span>
                    <span className="text-xs text-[var(--sr-text-secondary)]">
                      Mã: #{camp.id} • Tối đa {camp.max_items_per_vendor} tour/đối tác
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-fraunces text-[var(--sr-text-primary)] m-0">
                    {camp.title}
                  </h2>
                  <p className="text-xs text-[var(--sr-text-secondary)] m-0 max-w-3xl">
                    {camp.description}
                  </p>
                  <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                    Hạn đăng ký: {camp.registration_deadline ? new Date(camp.registration_deadline).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-[var(--sr-text-secondary)] bg-[var(--sr-bg-page)] px-4 py-2.5 rounded-2xl border border-[var(--sr-border)] shrink-0">
                  <div>
                    <span className="text-xs text-[var(--sr-text-muted)] block font-normal">Phiên giờ vàng</span>
                    <span className="text-[var(--sr-accent-ink)]">{camp.total_sessions} phiên</span>
                  </div>
                  <div className="w-px h-6 bg-[var(--sr-border)]" />
                  <div>
                    <span className="text-xs text-[var(--sr-text-muted)] block font-normal">Vé đã bán</span>
                    <span className="text-[var(--sr-accent)]">{camp.total_sold} / {camp.total_slots}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {camp.status !== 'active' && (
                  <button type="button" onClick={() => handleCampaignStatus(camp.id, 'active')} className="px-3 py-1.5 rounded-lg bg-[var(--sr-accent)] text-white text-xs font-bold">Mở nhận đăng ký</button>
                )}
                {camp.status === 'active' && (
                  <button type="button" onClick={() => handleCampaignStatus(camp.id, 'paused')} className="px-3 py-1.5 rounded-lg border border-[var(--sr-warn)] text-[var(--sr-warn)] text-xs font-bold">Tạm dừng đăng ký</button>
                )}
                {camp.status !== 'ended' && (
                  <button type="button" onClick={() => handleCampaignStatus(camp.id, 'ended')} className="px-3 py-1.5 rounded-lg border border-[var(--sr-border-strong)] text-[var(--sr-text-secondary)] text-xs font-bold">Kết thúc chiến dịch</button>
                )}
              </div>

              {/* Sessions in Campaign */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-[var(--sr-text-primary)] tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--sr-accent)]" />
                  <span>Các khung giờ vàng (sessions)</span>
                </div>

                {camp.sessions.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-[var(--sr-border)] text-center text-xs text-[var(--sr-text-secondary)]">
                    Chưa có phiên giờ vàng nào được thiết lập trong chiến dịch này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {camp.sessions.map((sess) => (
                      <div 
                        key={sess.id}
                        className={`rounded-2xl border p-5 transition-all space-y-4 ${
                          sess.is_live 
                            ? 'border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)]/10 ring-1 ring-[var(--sr-border-strong)]' 
                            : 'border-[var(--sr-border)] bg-[var(--sr-bg-page)]'
                        }`}
                      >
                        {/* Session Top Line */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                              sess.is_live 
                                ? 'bg-[var(--sr-accent)] text-white animate-pulse' 
                                : sess.is_upcoming 
                                ? 'bg-[var(--sr-warn-soft)] text-[var(--sr-warn)] border border-[var(--sr-warn)]' 
                                : 'bg-[var(--sr-bg-subtle)] text-[var(--sr-text-secondary)]'
                            }`}>
                              {sess.is_live ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                  <span>Đang diễn ra (live)</span>
                                </>
                              ) : sess.is_upcoming ? (
                                <span>Sắp diễn ra</span>
                              ) : (
                                <span>Đã kết thúc</span>
                              )}
                            </span>

                            <h3 className="font-bold text-sm text-[var(--sr-text-primary)] m-0">
                              {sess.session_name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[var(--sr-border)] rounded-xl font-mono text-[var(--sr-accent)] font-bold">
                              <Clock className="w-3.5 h-3.5 text-[var(--sr-warn)]" />
                              <span>Còn lại: {sess.countdown_text}</span>
                            </div>
                            {sess.auto_extend_enabled && (
                              <span className="px-2.5 py-1 bg-[var(--color-info-subtle)] text-[var(--color-info)] text-xs font-bold rounded-lg border border-[var(--color-info)]">
                                Tự động gia hạn +{sess.max_extend_minutes}p
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Items in Session */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-[var(--sr-text-secondary)]">
                            Danh sách tour mở bán ưu đãi ({sess.items.length} tour):
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sess.items.map((item) => (
                              <div 
                                key={item.id}
                                className="bg-white rounded-xl border border-[var(--sr-border)] p-3 flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img 
                                    src={item.tour_cover_image || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=200&q=80"} 
                                    alt="" 
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[var(--sr-border)]"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-bold text-xs text-[var(--sr-text-primary)] truncate">
                                      {item.tour_title}
                                    </div>
                                    <div className="text-xs text-[var(--sr-text-secondary)] flex items-center gap-2 mt-0.5">
                                      <span className="text-[var(--sr-urgent)] font-bold">
                                        {Number(item.promo_price).toLocaleString('vi-VN')} đ
                                      </span>
                                      <span className="line-through text-[var(--sr-text-muted)] text-xs">
                                        {Number(item.original_price).toLocaleString('vi-VN')} đ
                                      </span>
                                      <span className="px-1.5 py-0.2 bg-[var(--sr-urgent-soft)] text-[var(--sr-urgent-ink)] rounded text-xs font-bold">
                                        -{item.discount_percent}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-xs font-bold text-[var(--sr-accent)]">
                                    {item.sold_quantity} / {item.slot_quantity} suất
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                    item.is_sold_out ? 'bg-[var(--sr-bg-subtle)] text-[var(--sr-text-muted)]' : 'bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)]'
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
        <div role="dialog" aria-modal="true" aria-label="Tạo chiến dịch" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[var(--sr-border)] space-y-4 motion-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[var(--sr-accent)]" />
                <h3 className="font-bold text-[var(--sr-text-primary)] text-base">Khởi tạo chiến dịch kích cầu mới</h3>
              </div>
              <button 
                onClick={() => setShowCreateCampaignModal(false)}
                aria-label="Đóng biểu mẫu tạo chiến dịch"
                className="w-12 h-12 inline-flex items-center justify-center rounded-full text-[var(--sr-text-muted)] hover:text-[var(--sr-text-secondary)] hover:bg-[var(--sr-bg-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sr-accent)]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Tên chiến dịch *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tuần lễ Sơn Trà xanh 2026..."
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Mô tả mục tiêu chiến dịch</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả thông điệp bảo tồn sinh thái và chính sách trợ giá..."
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Tối đa tour/đối tác</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={campaignForm.max_items_per_vendor}
                    onChange={(e) => setCampaignForm({ ...campaignForm, max_items_per_vendor: e.target.value })}
                    className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Trạng thái ban đầu</label>
                  <SaasSelect
                    value={campaignForm.status || 'active'}
                    options={[
                      { value: 'active', label: 'Kích hoạt ngay (Active)' },
                      { value: 'draft', label: 'Bản nháp (Draft)' },
                    ]}
                    onChange={(val) => setCampaignForm({ ...campaignForm, status: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Hạn đăng ký *</label>
                <input
                  type="datetime-local"
                  required
                  value={campaignForm.registration_deadline}
                  onChange={(e) => setCampaignForm({ ...campaignForm, registration_deadline: e.target.value })}
                  className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 border border-[var(--sr-border)] rounded-xl text-[var(--sr-text-secondary)] font-bold hover:bg-[var(--sr-bg-page)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[var(--sr-accent)] text-white rounded-xl font-bold hover:bg-[var(--sr-accent-hover)] transition-colors"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Session */}
      {showCreateSessionModal && (
        <div role="dialog" aria-modal="true" aria-label="Tạo phiên giờ vàng" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[var(--sr-border)] space-y-4 motion-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--sr-warn)] fill-[var(--sr-warn)]" />
                <h3 className="font-bold text-[var(--sr-text-primary)] text-base">Thiết lập phiên giờ vàng (flash session)</h3>
              </div>
              <button 
                onClick={() => setShowCreateSessionModal(false)}
                aria-label="Đóng biểu mẫu tạo phiên giờ vàng"
                className="w-12 h-12 inline-flex items-center justify-center rounded-full text-[var(--sr-text-muted)] hover:text-[var(--sr-text-secondary)] hover:bg-[var(--sr-bg-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sr-accent)]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Thuộc chiến dịch *</label>
                <SaasSelect
                  value={String(sessionForm.campaign_id || '')}
                  options={data.campaigns.map((c) => ({ value: String(c.id), label: c.title }))}
                  onChange={(val) => setSessionForm({ ...sessionForm, campaign_id: val })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Tên phiên giờ vàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giờ vàng 12h00 - săn tour hoàng hôn..."
                  value={sessionForm.session_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                  className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sr-accent-soft)] border border-[var(--sr-border-strong)]">
                <input
                  type="checkbox"
                  id="auto_extend"
                  checked={sessionForm.auto_extend_enabled}
                  onChange={(e) => setSessionForm({ ...sessionForm, auto_extend_enabled: e.target.checked })}
                  className="rounded text-[var(--sr-accent)]"
                />
                <label htmlFor="auto_extend" className="text-xs text-[var(--sr-accent-ink)] font-bold cursor-pointer">
                  Kích hoạt Tự động gia hạn thêm 30 phút nếu còn trên 20% số suất
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Bắt đầu *</label>
                  <input type="datetime-local" required value={sessionForm.start_time} onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })} className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]" />
                </div>
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Kết thúc *</label>
                  <input type="datetime-local" required value={sessionForm.end_time} onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })} className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]" />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="px-4 py-2 border border-[var(--sr-border)] rounded-xl text-[var(--sr-text-secondary)] font-bold hover:bg-[var(--sr-bg-page)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[var(--sr-accent)] text-white rounded-xl font-bold hover:bg-[var(--sr-accent-hover)] transition-colors"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Mở phiên giờ vàng'}
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
