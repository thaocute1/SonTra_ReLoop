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
import {
  computeRemainingSeconds,
  formatCountdown,
  useFlashSaleRealtime,
  useNowTick,
} from '../../hooks/useFlashSaleRealtime';
import { PageHeader, SaasSelect } from '../../components/ui/SaasPrimitives';

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
    max_extend_minutes: 30,
    dynamic_pricing_enabled: false
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

  const nowMs = useNowTick(1000);
  const expiredRefreshRef = React.useRef(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useFlashSaleRealtime(() => {
    loadData(true);
  });

  // Auto-refresh silently when any live/upcoming session hits 00:00:00 (e.g. auto-extend or status flip)
  useEffect(() => {
    let shouldRefresh = false;
    for (const camp of data.campaigns || []) {
      for (const sess of camp.sessions || []) {
        if (sess.is_ended) continue;
        const remaining = computeRemainingSeconds(sess, nowMs);
        const key = `${sess.id}:${sess.end_time}`;
        if (remaining === 0 && !expiredRefreshRef.current.has(key)) {
          expiredRefreshRef.current.add(key);
          shouldRefresh = true;
        }
      }
    }
    if (shouldRefresh) {
      loadData(true);
    }
  }, [nowMs, data.campaigns]);

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
          max_extend_minutes: 30,
          dynamic_pricing_enabled: false
        });
        const created = res.data;
        setData(current => ({ ...current, campaigns: current.campaigns.map(campaign => campaign.id === created.campaign_id ? { ...campaign, sessions: [created, ...(campaign.sessions || [])], total_sessions: (campaign.total_sessions || 0) + 1 } : campaign) }));
        realtimeBus.emit('FLASH_SALE_SLOT_UPDATED', { sessionId: created?.id });
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
        realtimeBus.emit('FLASH_SALE_SLOT_UPDATED', { campaignId, campaignStatus });
      }
    } catch (err) {
      console.error('Campaign status update failed:', err.response?.data || err);
      alert(err.response?.data?.message || err.response?.data?.detail || 'Không thể cập nhật trạng thái chiến dịch.');
    }
  };

  const metrics = data.metrics;

  return (
    <div className="sr-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--sr-text-primary)] text-white px-5 py-3 rounded-xl shadow-2xl border border-[var(--sr-accent)] flex items-center gap-3 text-xs font-bold">
          <span>{toastMessage}</span>
        </div>
      )}

      <PageHeader
        title="Chiến dịch & giờ vàng"
        subtitle="Điều phối các đợt kích cầu du lịch sinh thái, khung giờ vàng săn tour và duyệt sản phẩm ưu đãi từ đối tác."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(false)}
              className="sr-btn sr-btn-sm sr-btn-secondary"
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateCampaignModal(true)}
              disabled={Boolean(loadError)}
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <Megaphone size={14} aria-hidden="true" />
              <span>Tạo chiến dịch</span>
            </button>

            <button
              type="button"
              onClick={openCreateSessionModal}
              disabled={Boolean(loadError)}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Thiết lập phiên giờ vàng</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div role="alert" className="sr-callout sr-callout-urgent justify-between items-center">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button type="button" onClick={() => loadData(false)} className="sr-btn sr-btn-sm sr-btn-secondary shrink-0">
            Tải lại
          </button>
        </div>
      )}

      {/* Band 1: Uniform 4-Column KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Thống kê chiến dịch giờ vàng">
        <article className="sr-card justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--sr-text-secondary)]">Tổng chiến dịch</span>
            <Megaphone size={15} className="text-[var(--sr-text-muted)] shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <strong className="block text-2xl font-semibold sr-tabular text-[var(--sr-text-primary)] leading-none">
              {loadError ? '—' : metrics.total_campaigns}
            </strong>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Chương trình kích cầu sinh thái
            </p>
          </div>
        </article>

        <article className="sr-card justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--sr-text-secondary)]">Phiên đang mở (LIVE)</span>
            <Flame size={15} className="text-[var(--sr-accent)] shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <strong className="text-2xl font-semibold sr-tabular text-[var(--sr-accent-ink)] leading-none">
                {loadError ? '—' : metrics.active_sessions}
              </strong>
              {!loadError && metrics.active_sessions > 0 && (
                <span className="sr-badge sr-badge-moss">LIVE</span>
              )}
            </div>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Khung giờ vàng đang diễn ra
            </p>
          </div>
        </article>

        <article className="sr-card justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--sr-text-secondary)]">Suất vé kích cầu</span>
            <Compass size={15} className="text-[var(--sr-text-muted)] shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <strong className="block text-2xl font-semibold sr-tabular text-[var(--sr-text-primary)] leading-none">
              {loadError ? '—' : `${metrics.total_sold} / ${metrics.total_slots}`}
            </strong>
            <div className="sr-progress-track">
              <div
                className="sr-progress-fill"
                style={{ width: `${Math.min(100, loadError ? 0 : metrics.avg_fill_rate)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              {data.pending_items.length > 0 ? `${data.pending_items.length} tour chờ duyệt ưu đãi` : 'Đã bán trên toàn chiến dịch'}
            </p>
          </div>
        </article>

        <article className="sr-card justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--sr-text-secondary)]">Tỷ lệ lấp đầy</span>
            <TrendingUp size={15} className="text-[var(--sr-accent)] shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <strong className="block text-2xl font-semibold sr-tabular text-[var(--sr-accent-ink)] leading-none">
              {loadError ? '—' : `${metrics.avg_fill_rate}%`}
            </strong>
            <div className="sr-progress-track">
              <div
                className="sr-progress-fill"
                style={{ width: `${Math.min(100, loadError ? 0 : metrics.avg_fill_rate)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Hiệu suất tiêu thụ vé giờ vàng
            </p>
          </div>
        </article>
      </section>

      {data.pending_items.length > 0 && (
        <section className="sr-table-card">
          <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sr-border)]">
            <div>
              <h2 className="sr-h2 m-0">Tour chờ duyệt ({data.pending_items.length})</h2>
              <p className="text-xs text-[var(--sr-text-muted)] m-0 mt-0.5">
                Chỉ tour được duyệt mới xuất hiện với du khách.
              </p>
            </div>
            <span className="sr-badge sr-badge-warn">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>Cần phê duyệt</span>
            </span>
          </div>
          <div className="divide-y divide-[var(--sr-border)]">
            {data.pending_items.map(item => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <strong className="text-[var(--sr-text-primary)] block text-sm">{item.tour_title}</strong>
                  <span className="text-[var(--sr-text-secondary)]">
                    {item.vendor_name} · <strong className="text-[var(--sr-text-primary)]">{Number(item.promo_price).toLocaleString('vi-VN')}đ</strong> · {item.slot_quantity} suất
                  </span>
                  {item.price_tiers?.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.price_tiers.map((tier) => (
                        <span key={tier.tier_index} className="sr-badge sr-badge-neutral">
                          {tier.label}: {Number(tier.price).toLocaleString('vi-VN')}đ ({tier.quantity} suất)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleReviewItem(item.id, 'reject')} className="sr-btn sr-btn-sm sr-btn-destructive">Từ chối</button>
                  <button type="button" onClick={() => handleReviewItem(item.id, 'approve')} className="sr-btn sr-btn-sm sr-btn-primary">Duyệt</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Campaign & Session Content */}
      {loadError ? null : data.campaigns.length === 0 ? (
        <section className="sr-table-card">
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold text-[var(--sr-text-primary)] m-0">
              Chưa có chiến dịch flash sale nào
            </p>
            <p className="text-xs text-[var(--sr-text-muted)] max-w-sm m-0">
              Hãy bấm vào "Tạo chiến dịch" để khởi động chương trình giờ vàng săn tour đầu tiên cho Sơn Trà.
            </p>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {data.campaigns.map((camp) => {
            const campFillPct = camp.total_slots > 0
              ? Math.round((camp.total_sold / camp.total_slots) * 100)
              : 0;
            const campStatusBadge =
              camp.status === 'active'
                ? { cls: 'sr-badge-moss', label: 'Đang chạy' }
                : camp.status === 'paused'
                ? { cls: 'sr-badge-warn', label: 'Tạm dừng' }
                : { cls: 'sr-badge-neutral', label: camp.status === 'ended' ? 'Đã kết thúc' : camp.status };

            return (
              <article key={camp.id} className="sr-table-card overflow-hidden">
                {/* Campaign Header */}
                <div className="p-5 sm:p-6 border-b border-[var(--sr-border)] space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`sr-badge ${campStatusBadge.cls}`}>
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{campStatusBadge.label}</span>
                        </span>
                        <span className="text-xs font-mono text-[var(--sr-text-muted)]">
                          #{camp.id}
                        </span>
                        <span className="text-xs text-[var(--sr-text-muted)]">
                          · Tối đa {camp.max_items_per_vendor} tour/đối tác
                        </span>
                        <span className="text-xs text-[var(--sr-text-muted)]">
                          · Hạn ĐK: {camp.registration_deadline ? new Date(camp.registration_deadline).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                        </span>
                      </div>

                      <h2 className="text-lg font-semibold text-[var(--sr-text-primary)] m-0 leading-snug">
                        {camp.title}
                      </h2>

                      {camp.description && (
                        <p className="text-xs text-[var(--sr-text-secondary)] m-0 max-w-3xl leading-relaxed">
                          {camp.description}
                        </p>
                      )}
                    </div>

                    {/* Campaign Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {camp.status !== 'active' && (
                        <button type="button" onClick={() => handleCampaignStatus(camp.id, 'active')} className="sr-btn sr-btn-sm sr-btn-primary">
                          Mở nhận đăng ký
                        </button>
                      )}
                      {camp.status === 'active' && (
                        <button type="button" onClick={() => handleCampaignStatus(camp.id, 'paused')} className="sr-btn sr-btn-sm sr-btn-secondary">
                          Tạm dừng đăng ký
                        </button>
                      )}
                      {camp.status !== 'ended' && (
                        <button type="button" onClick={() => handleCampaignStatus(camp.id, 'ended')} className="sr-btn sr-btn-sm sr-btn-destructive">
                          Kết thúc chiến dịch
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Campaign Metrics & Progress Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--sr-border)]">
                    <div className="flex items-center justify-between sm:justify-start sm:gap-3 text-xs">
                      <span className="text-[var(--sr-text-muted)]">Số phiên giờ vàng</span>
                      <strong className="sr-tabular text-[var(--sr-text-primary)]">{camp.total_sessions} phiên</strong>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start sm:gap-3 text-xs">
                      <span className="text-[var(--sr-text-muted)]">Vé đã bán</span>
                      <strong className="sr-tabular text-[var(--sr-accent-ink)]">{camp.total_sold} / {camp.total_slots} suất</strong>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[var(--sr-text-muted)] shrink-0">Tiến độ bán vé</span>
                      <div className="sr-progress-track flex-1">
                        <div className="sr-progress-fill" style={{ width: `${Math.min(100, campFillPct)}%` }} />
                      </div>
                      <strong className="sr-tabular text-[var(--sr-text-primary)] shrink-0">{campFillPct}%</strong>
                    </div>
                  </div>
                </div>

                {/* Sessions in Campaign */}
                <div className="p-5 sm:p-6 bg-[var(--sr-bg-page)]/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[var(--sr-text-secondary)] flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--sr-accent)]" aria-hidden="true" />
                      <span>Các khung giờ vàng ({camp.sessions.length})</span>
                    </div>
                  </div>

                  {camp.sessions.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-[var(--sr-border)] bg-white text-center text-xs text-[var(--sr-text-muted)]">
                      Chưa có phiên giờ vàng nào được thiết lập trong chiến dịch này.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {camp.sessions.map((sess) => {
                        const remainingLabel = sess.is_ended
                          ? '00:00:00'
                          : formatCountdown(computeRemainingSeconds(sess, nowMs));

                        return (
                          <div
                            key={sess.id}
                            className={`rounded-xl border bg-white overflow-hidden ${
                              sess.is_live
                                ? 'border-[var(--sr-accent)]/50'
                                : 'border-[var(--sr-border)]'
                            }`}
                          >
                            {/* Unified Session Header Bar */}
                            <div className={`px-4 py-3 border-b border-[var(--sr-border)] flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                              sess.is_live ? 'bg-[var(--sr-accent-soft)]/35' : 'bg-[var(--sr-bg-page)]/60'
                            }`}>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className={`sr-badge ${
                                  sess.is_live
                                    ? 'sr-badge-moss'
                                    : sess.is_upcoming
                                    ? 'sr-badge-warn'
                                    : 'sr-badge-neutral'
                                }`}>
                                  <span className="sr-badge-dot" aria-hidden="true" />
                                  <span>
                                    {sess.is_live ? 'Đang diễn ra (LIVE)' : sess.is_upcoming ? 'Sắp diễn ra' : 'Đã kết thúc'}
                                  </span>
                                </span>
                                <h3 className="text-sm font-semibold text-[var(--sr-text-primary)] m-0">
                                  {sess.session_name}
                                </h3>
                              </div>

                              {/* Unified Session Policy & Countdown Group */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="sr-badge sr-badge-neutral font-mono sr-tabular">
                                  <Clock size={12} className="text-[var(--sr-warn)]" aria-hidden="true" />
                                  <span>Còn lại: {remainingLabel}</span>
                                </span>

                                {sess.auto_extend_enabled && (
                                  <span className="sr-badge sr-badge-neutral">
                                    {sess.extend_count > 0
                                      ? `Đã gia hạn +${sess.max_extend_minutes}p`
                                      : `Tự động gia hạn +${sess.max_extend_minutes}p`}
                                  </span>
                                )}

                                {sess.dynamic_pricing_enabled && (
                                  <span className="sr-badge sr-badge-moss">
                                    Giá theo bậc
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Items in Session */}
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs text-[var(--sr-text-muted)]">
                                <span className="font-medium">Tour mở bán ưu đãi ({sess.items.length})</span>
                              </div>

                              {sess.items.length === 0 ? (
                                <p className="text-xs text-[var(--sr-text-muted)] m-0 py-2">
                                  Chưa có tour nào được thêm vào phiên này.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {sess.items.map((item) => {
                                    const itemFillPct = item.slot_quantity > 0
                                      ? Math.round((item.sold_quantity / item.slot_quantity) * 100)
                                      : 0;

                                    return (
                                      <div
                                        key={item.id}
                                        className="rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)]/35 p-3.5 flex gap-3.5 items-start"
                                      >
                                        <img
                                          src={item.tour_cover_image || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=200&q=80'}
                                          alt={item.tour_title}
                                          className="w-20 h-20 rounded-lg object-cover shrink-0 border border-[var(--sr-border)]"
                                        />

                                        <div className="min-w-0 flex-1 space-y-2">
                                          <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-semibold text-[var(--sr-text-primary)] m-0 leading-snug line-clamp-1">
                                              {item.tour_title}
                                            </h4>
                                            <span className={`sr-badge shrink-0 ${
                                              item.is_sold_out ? 'sr-badge-neutral' : 'sr-badge-moss'
                                            }`}>
                                              {item.is_sold_out ? 'Hết vé' : `Còn ${item.remaining_slots} chỗ`}
                                            </span>
                                          </div>

                                          <div className="flex flex-wrap items-baseline gap-2">
                                            <strong className="text-base font-bold sr-tabular text-[var(--sr-accent-ink)]">
                                              {Number(item.promo_price).toLocaleString('vi-VN')} đ
                                            </strong>
                                            <span className="line-through text-xs text-[var(--sr-text-muted)] sr-tabular">
                                              {Number(item.original_price).toLocaleString('vi-VN')} đ
                                            </span>
                                            <span className="sr-badge sr-badge-urgent">
                                              -{item.discount_percent}%
                                            </span>
                                          </div>

                                          {item.price_tiers?.length > 1 && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {item.price_tiers.map((tier) => (
                                                <span key={tier.tier_index} className="sr-badge sr-badge-neutral">
                                                  {tier.label}: {Number(tier.price).toLocaleString('vi-VN')}đ ({tier.remaining_in_tier}/{tier.quantity})
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          <div className="flex items-center gap-2.5 pt-0.5 text-xs">
                                            <div className="sr-progress-track flex-1">
                                              <div
                                                className="sr-progress-fill"
                                                style={{ width: `${Math.min(100, itemFillPct)}%` }}
                                              />
                                            </div>
                                            <span className="sr-tabular font-medium text-[var(--sr-text-secondary)] shrink-0">
                                              {item.sold_quantity} / {item.slot_quantity} suất
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

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

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-[var(--sr-accent-soft)] border border-[var(--sr-border-strong)] space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_extend"
                      checked={sessionForm.auto_extend_enabled}
                      onChange={(e) => setSessionForm({ ...sessionForm, auto_extend_enabled: e.target.checked })}
                      className="rounded text-[var(--sr-accent)]"
                    />
                    <label htmlFor="auto_extend" className="text-xs text-[var(--sr-accent-ink)] font-bold cursor-pointer">
                      Kích hoạt Tự động gia hạn thêm nếu còn trên 20% số suất (5 phút cuối phiên)
                    </label>
                  </div>
                  {sessionForm.auto_extend_enabled && (
                    <div className="flex items-center gap-2 pl-6">
                      <label htmlFor="max_extend_minutes" className="text-xs text-[var(--sr-accent-ink)]">Số phút gia hạn:</label>
                      <input
                        id="max_extend_minutes"
                        type="number"
                        min={5}
                        max={180}
                        value={sessionForm.max_extend_minutes}
                        onChange={(e) => setSessionForm({ ...sessionForm, max_extend_minutes: Number(e.target.value) })}
                        className="w-24 px-2.5 py-1 border border-[var(--sr-border-strong)] rounded-lg bg-white text-xs text-[var(--sr-text-primary)]"
                      />
                      <span className="text-xs text-[var(--sr-accent-ink)]">phút</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)]">
                  <input
                    type="checkbox"
                    id="dynamic_pricing_enabled"
                    checked={sessionForm.dynamic_pricing_enabled}
                    onChange={(e) => setSessionForm({ ...sessionForm, dynamic_pricing_enabled: e.target.checked })}
                    className="rounded text-[var(--sr-accent)]"
                  />
                  <label htmlFor="dynamic_pricing_enabled" className="text-xs text-[var(--sr-text-primary)] font-bold cursor-pointer">
                    Cho phép đối tác chia bậc giá lũy tiến theo số suất (Tiered Pricing)
                  </label>
                </div>
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
