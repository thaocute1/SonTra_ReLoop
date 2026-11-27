import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Pin, 
  Users, 
  Recycle, 
  Sparkles, 
  Send, 
  RefreshCw,
  Search,
  MapPin,
  Clock,
  Award,
  ShieldAlert,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Filter,
  Check,
  ShieldCheck,
  Inbox,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../../lib/axios';
import { realtimeBus } from '../../lib/realtimeBus';
import { PageHeader, SaasSelect } from '../../components/ui/SaasPrimitives';

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'alerts' | 'campaigns'
  const [alerts, setAlerts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Community Moderation State
  const [allModerationPosts, setAllModerationPosts] = useState([]);
  const [moderationFilter, setModerationFilter] = useState('draft'); // 'draft' | 'published' | 'archived' | 'all'
  const [moderationSearch, setModerationSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Derived Metrics (Calculated instantly in 0ms without server request)
  const moderationMetrics = useMemo(() => {
    const total_pending = allModerationPosts.filter(p => p.status === 'draft').length;
    const total_published = allModerationPosts.filter(p => p.status === 'published').length;
    const total_archived = allModerationPosts.filter(p => p.status === 'archived').length;
    return {
      total_pending,
      total_published,
      total_archived,
      total_all: total_pending + total_published + total_archived
    };
  }, [allModerationPosts]);

  // Derived Filtered Posts (Calculated instantly in 0ms on tab click or search typing)
  const filteredModerationPosts = useMemo(() => {
    let result = allModerationPosts;
    if (moderationFilter !== 'all') {
      result = result.filter(p => p.status === moderationFilter);
    }
    if (moderationSearch.trim()) {
      const q = moderationSearch.toLowerCase().trim();
      result = result.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q)) ||
        (p.author_name && p.author_name.toLowerCase().includes(q)) ||
        (p.location_tag && p.location_tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allModerationPosts, moderationFilter, moderationSearch]);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    post: null,
    reasonPreset: 'Vi phạm quy định bảo vệ động vật hoang dã',
    reasonCustom: ''
  });

  // Form states for creating Alert
  const [alertForm, setAlertForm] = useState({
    title: '',
    content: '',
    location_tag: 'Bán đảo Sơn Trà',
    alert_level: 'warning',
    is_pinned: true,
  });

  // Form states for creating Clean-up Campaign
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    organizer: 'Ban quản lý bán đảo Sơn Trà & Đoàn TN',
    event_date: '',
    target_kg: '80 kg rác tái chế',
    max_participants: 40,
    reward_points: '+100 RE-Points',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  });

  // Fetch BQL Alerts & Campaigns
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch BQL Alerts
      const resPosts = await api.get('/cms-chatbot/community/posts/', {
        params: { feed_type: 'bql' }
      });
      if (resPosts.data?.status === 'success') {
        setAlerts(resPosts.data.data || []);
      }

      // 2. Fetch Cleanup campaigns
      const resEvents = await api.get('/cms-chatbot/community/events/');
      if (resEvents.data?.status === 'success') {
        setCampaigns(resEvents.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load content data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Moderation Posts from DB (All posts cached in memory for 0ms tab switching)
  const fetchModerationData = async (silent = false) => {
    if (!silent && allModerationPosts.length === 0) setLoading(true);
    try {
      const res = await api.get('/cms-chatbot/community/admin/posts/', {
        params: { status: 'all' }
      });
      if (res.data?.status === 'success') {
        setAllModerationPosts(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load moderation posts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchModerationData();

    // Lắng nghe sự kiện Du khách/Vendor đăng bài -> Cập nhật ngầm tức thì (<10ms)
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === 'POST_CREATED' || event.type === 'POST_STATUS_CHANGED') {
        fetchModerationData(true);
        fetchData();
      }
    });

    // Auto-poll ngầm dự phòng mỗi 12 giây
    const autoPoll = setInterval(() => {
      fetchModerationData(true);
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(autoPoll);
    };
  }, []);

  // Review Actions: Approve, Reject, Restore with 0ms Optimistic UI
  const handleReviewPost = async (postId, action, customReason = '') => {
    setActionLoadingId(postId);
    const backup = [...allModerationPosts];

    // Optimistic Update: Cập nhật giao diện & số đếm ngay lập tức trong 0ms!
    setAllModerationPosts(prev => prev.map(p => {
      if (p.id === postId) {
        let newStatus = p.status;
        let newStatusLabel = p.status_label;
        if (action === 'approve') {
          newStatus = 'published';
          newStatusLabel = 'Đã phê duyệt';
        } else if (action === 'reject') {
          newStatus = 'archived';
          newStatusLabel = 'Đã gỡ bỏ';
        } else if (action === 'restore') {
          newStatus = 'draft';
          newStatusLabel = 'Chờ kiểm duyệt';
        }
        return { ...p, status: newStatus, status_label: newStatusLabel };
      }
      return p;
    }));

    // Phát sự kiện realtime đồng bộ sang giao diện Du khách ngay lập tức (<10ms)
    realtimeBus.emit('POST_STATUS_CHANGED', { postId, action });

    try {
      const payload = {
        action,
        rejection_reason: customReason
      };
      const res = await api.patch(`/cms-chatbot/community/admin/posts/${postId}/review/`, payload);
      if (res.data?.status === 'success') {
        let msg = 'Đã cập nhật trạng thái bài viết thành công!';
        if (action === 'approve') {
          msg = `${res.data.data?.message || 'Đã phê duyệt bài viết công khai thành công!'}`;
        } else if (action === 'reject') {
          msg = 'Đã gỡ bỏ bài viết khỏi Bảng tin cộng đồng.';
        } else if (action === 'restore') {
          msg = 'Đã đưa bài viết về hàng đợi chờ kiểm duyệt.';
        }
        setToastNotification({ text: msg, type: action === 'reject' ? 'warning' : 'success' });
        // Đồng bộ ngầm để đảm bảo tính nhất quán của máy chủ
        fetchModerationData(true);
        fetchData();
      } else {
        setAllModerationPosts(backup);
        setToastNotification({ text: 'Có lỗi xảy ra khi xử lý kiểm duyệt.', type: 'error' });
      }
    } catch (err) {
      console.error('Error reviewing post:', err);
      setAllModerationPosts(backup);
      setToastNotification({ text: 'Lỗi kết nối tới máy chủ khi kiểm duyệt.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Rejection from Modal
  const confirmReject = () => {
    if (!rejectModal.post) return;
    const finalReason = rejectModal.reasonCustom.trim() || rejectModal.reasonPreset;
    handleReviewPost(rejectModal.post.id, 'reject', finalReason);
    setRejectModal({
      isOpen: false,
      post: null,
      reasonPreset: 'Vi phạm quy định bảo vệ động vật hoang dã',
      reasonCustom: ''
    });
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.content) {
      alert('Vui lòng điền đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    try {
      const res = await api.post('/cms-chatbot/community/posts/create/', {
        title: alertForm.title,
        content: alertForm.content,
        location_tag: alertForm.location_tag,
        post_type: 'bql_alert',
        alert_level: alertForm.alert_level,
        is_pinned: alertForm.is_pinned
      });

      if (res.data?.status === 'success') {
        alert('Đã xuất bản thông báo BQL thành công và phát cảnh báo đến ứng dụng Mobile!');
        setShowModal(false);
        setAlertForm({
          title: '',
          content: '',
          location_tag: 'Bán đảo Sơn Trà',
          alert_level: 'warning',
          is_pinned: true,
        });
        fetchData();
        fetchModerationData();
      } else {
        alert('Có lỗi xảy ra khi tạo thông báo!');
      }
    } catch (err) {
      console.error('Error submitting alert:', err);
      alert('Không thể kết nối tới Backend!');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.event_date) {
      alert('Vui lòng điền tiêu đề và thời gian diễn ra chiến dịch dọn rác!');
      return;
    }

    try {
      const res = await api.post('/cms-chatbot/community/events/', campaignForm);
      if (res.data?.status === 'success') {
        alert('Đã khởi tạo chiến dịch dọn dẹp cộng đồng thành công! Du khách có thể ghi danh trên app.');
        setShowModal(false);
        setCampaignForm({
          title: '',
          organizer: 'Ban quản lý bán đảo Sơn Trà & Đoàn TN',
          event_date: '',
          target_kg: '80 kg rác tái chế',
          max_participants: 40,
          reward_points: '+100 RE-Points',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
        });
        fetchData();
      } else {
        alert('Có lỗi xảy ra khi tạo chiến dịch!');
      }
    } catch (err) {
      console.error('Error submitting campaign:', err);
      alert('Không thể kết nối tới Backend!');
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Tin tức, sự kiện & kiểm duyệt"
        subtitle="Kiểm duyệt bài đăng cộng đồng, phát hành cảnh báo thực địa BQL và quản lý chiến dịch dọn rác Sơn Trà."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-segment-group" role="group" aria-label="Phân mục nội dung">
              <button
                type="button"
                aria-pressed={activeTab === 'moderation'}
                onClick={() => setActiveTab('moderation')}
                className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                  activeTab === 'moderation' ? 'is-selected' : ''
                }`}
              >
                <ShieldCheck size={13} aria-hidden="true" />
                <span>Kiểm duyệt bài viết ({moderationMetrics.total_pending})</span>
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'alerts'}
                onClick={() => setActiveTab('alerts')}
                className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                  activeTab === 'alerts' ? 'is-selected' : ''
                }`}
              >
                <AlertTriangle size={13} aria-hidden="true" />
                <span>Cảnh báo BQL ({alerts.length})</span>
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'campaigns'}
                onClick={() => setActiveTab('campaigns')}
                className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                  activeTab === 'campaigns' ? 'is-selected' : ''
                }`}
              >
                <Recycle size={13} aria-hidden="true" />
                <span>Chiến dịch dọn rác ({campaigns.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchData();
                fetchModerationData();
              }}
              className="sr-btn sr-btn-sm sr-btn-secondary"
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Làm mới</span>
            </button>

            {activeTab !== 'moderation' && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="sr-btn sr-btn-sm sr-btn-primary"
              >
                <Plus size={14} aria-hidden="true" />
                <span>{activeTab === 'alerts' ? 'Tạo cảnh báo mới' : 'Tạo chiến dịch mới'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Content Body based on Active Tab */}
      {activeTab === 'moderation' ? (
        <>
          {/* Band 1: Moderation Summary */}
          <section className="sr-grid-8-4" aria-label="Thống kê kiểm duyệt bài viết">
            <article className="sr-hero-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                    Hàng đợi chờ kiểm duyệt
                  </span>
                  <strong className="sr-metric-hero sr-tabular">
                    {moderationMetrics.total_pending} bài chờ duyệt
                  </strong>
                </div>
                <span className="sr-badge sr-badge-warn">
                  <span className="sr-badge-dot" aria-hidden="true" />
                  <span>Cần thẩm định trước khi hiển thị</span>
                </span>
              </div>
            </article>

            <article className="sr-card justify-between">
              <div className="sr-kv-row">
                <span className="text-[var(--sr-text-secondary)]">Đã phê duyệt công khai</span>
                <strong className="sr-tabular text-[var(--sr-accent-ink)]">
                  {moderationMetrics.total_published} bài
                </strong>
              </div>
              <div className="sr-kv-row">
                <span className="text-[var(--sr-text-secondary)]">Đã gỡ bỏ / từ chối</span>
                <strong className="sr-tabular text-[var(--sr-urgent-ink)]">
                  {moderationMetrics.total_archived} bài
                </strong>
              </div>
              <div className="sr-kv-row">
                <span className="text-[var(--sr-text-secondary)]">Tổng bài đăng</span>
                <strong className="sr-tabular text-[var(--sr-text-primary)]">
                  {moderationMetrics.total_all} bài
                </strong>
              </div>
            </article>
          </section>

          {/* Band 2: Filter Toolbar + Moderation List inside one cohesive sr-table-card */}
          <section className="sr-table-card">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)]">
              <div className="sr-segment-group" role="group" aria-label="Lọc trạng thái bài viết">
                {[
                  { id: 'draft', label: `Chờ duyệt (${moderationMetrics.total_pending})` },
                  { id: 'published', label: `Đã xuất bản (${moderationMetrics.total_published})` },
                  { id: 'archived', label: `Đã gỡ bỏ (${moderationMetrics.total_archived})` },
                  { id: 'all', label: `Tất cả bài viết (${moderationMetrics.total_all})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={moderationFilter === tab.id}
                    onClick={() => setModerationFilter(tab.id)}
                    className={`sr-segment-btn ${moderationFilter === tab.id ? 'is-selected' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="sr-toolbar-search">
                <Search size={14} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Tìm tiêu đề, tác giả, nội dung"
                  placeholder="Tìm tiêu đề, tác giả, nội dung..."
                  value={moderationSearch}
                  onChange={(e) => setModerationSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredModerationPosts.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--sr-text-muted)] m-0">
                {moderationFilter === 'draft'
                  ? 'Không có bài viết nào đang chờ kiểm duyệt.'
                  : 'Không tìm thấy bài viết phù hợp với bộ lọc hiện tại.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--sr-border)]">
                {filteredModerationPosts.map((post) => {
                  const isDraft = post.status === 'draft';
                  const isPublished = post.status === 'published';
                  const isArchived = post.status === 'archived';

                  return (
                    <article key={post.id} className="p-5 space-y-4">
                      {/* Post Top Row: Author & Status */}
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="sr-avatar" aria-hidden="true">
                            {post.author_initials || 'ST'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[var(--sr-text-primary)]">
                                {post.author_name}
                              </span>
                              <span className="sr-badge sr-badge-neutral">
                                {post.role_badge}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--sr-text-muted)] flex items-center gap-2 mt-0.5">
                              <span>{post.created_at}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-[var(--sr-accent-ink)] font-medium">
                                <MapPin className="w-3 h-3" />
                                {post.location_tag}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isDraft && (
                            <span className="sr-badge sr-badge-warn">
                              <span className="sr-badge-dot" aria-hidden="true" />
                              <span>Chờ BQL duyệt</span>
                            </span>
                          )}
                          {isPublished && (
                            <span className="sr-badge sr-badge-moss">
                              <span className="sr-badge-dot" aria-hidden="true" />
                              <span>Đã phê duyệt</span>
                            </span>
                          )}
                          {isArchived && (
                            <span className="sr-badge sr-badge-urgent">
                              <span className="sr-badge-dot" aria-hidden="true" />
                              <span>Đã gỡ bỏ</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Post Content & Media */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                        <div className="md:col-span-3 space-y-2">
                          <h4 className="font-semibold text-[var(--sr-text-primary)] text-sm leading-snug m-0">
                            {post.title}
                          </h4>
                          <p className="text-xs text-[var(--sr-text-secondary)] leading-relaxed whitespace-pre-line m-0">
                            {post.content}
                          </p>

                          {post.collected_kg > 0 && (
                            <span className="sr-badge sr-badge-moss">
                              <Recycle className="w-3.5 h-3.5" />
                              <span>Hành động xanh: đã thu gom {post.collected_kg} kg rác (+{post.collected_kg * 10} RE-Points)</span>
                            </span>
                          )}
                        </div>

                        {post.thumbnail_url && (
                          <div className="md:col-span-1 rounded-xl overflow-hidden border border-[var(--sr-border)] h-28 w-full bg-[var(--sr-bg-subtle)]">
                            <img
                              src={post.thumbnail_url}
                              alt="Ảnh đính kèm bài viết"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80";
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Moderation Actions Footer */}
                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-[var(--sr-text-muted)]">
                          Mã bài viết: <strong className="font-mono text-[var(--sr-text-primary)]">#{post.id}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoadingId === post.id}
                                onClick={() => handleReviewPost(post.id, 'approve')}
                                className="sr-btn sr-btn-sm sr-btn-primary"
                              >
                                <Check size={14} aria-hidden="true" />
                                <span>Phê duyệt công khai</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionLoadingId === post.id}
                                onClick={() => setRejectModal({
                                  isOpen: true,
                                  post: post,
                                  reasonPreset: 'Vi phạm quy định bảo vệ động vật hoang dã',
                                  reasonCustom: ''
                                })}
                                className="sr-btn sr-btn-sm sr-btn-destructive"
                              >
                                <XCircle size={14} aria-hidden="true" />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {isPublished && (
                            <button
                              type="button"
                              disabled={actionLoadingId === post.id}
                              onClick={() => setRejectModal({
                                isOpen: true,
                                post: post,
                                reasonPreset: 'Hình ảnh không phù hợp hoặc xả rác',
                                reasonCustom: ''
                              })}
                              className="sr-btn sr-btn-sm sr-btn-destructive"
                            >
                              <ShieldAlert size={14} aria-hidden="true" />
                              <span>Gỡ bỏ bài viết</span>
                            </button>
                          )}

                          {isArchived && (
                            <button
                              type="button"
                              disabled={actionLoadingId === post.id}
                              onClick={() => handleReviewPost(post.id, 'restore')}
                              className="sr-btn sr-btn-sm sr-btn-secondary"
                            >
                              <RotateCcw size={14} aria-hidden="true" />
                              <span>Khôi phục về chờ duyệt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : activeTab === 'alerts' ? (
        <div className="sr-grid-2">
          {alerts.map((item) => (
            <article key={item.id} className="sr-card justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.is_pinned && (
                    <span className="sr-badge sr-badge-warn">
                      <Pin className="w-3 h-3" />
                      <span>Ghim ưu tiên</span>
                    </span>
                  )}
                  <span className={`sr-badge ${
                    item.alert_level === 'warning'
                      ? 'sr-badge-urgent'
                      : item.alert_level === 'success'
                      ? 'sr-badge-moss'
                      : 'sr-badge-neutral'
                  }`}>
                    {item.alert_level === 'warning' ? 'Nguy cơ sạt lở / Hạn chế' : item.alert_level === 'success' ? 'Đã khắc phục xong' : 'Thông báo hướng dẫn'}
                  </span>
                </div>

                <span className="text-xs text-[var(--sr-text-muted)] shrink-0">{item.created_at}</span>
              </div>

              <div>
                <h3 className="sr-h2 m-0">{item.title}</h3>
                <p className="text-xs text-[var(--sr-text-secondary)] mt-1.5 leading-relaxed line-clamp-3 m-0">{item.content}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--sr-border)] text-xs text-[var(--sr-text-muted)]">
                <span className="flex items-center gap-1 font-semibold text-[var(--sr-accent-ink)]">
                  <MapPin className="w-3.5 h-3.5" />
                  {item.location_tag}
                </span>
                <span>{item.likes_count} lượt tương tác · {item.comments_count} phản hồi</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((ev) => (
            <article key={ev.id} className="sr-table-card overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-40 w-full overflow-hidden relative">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                  <span className="sr-badge sr-badge-moss absolute top-3 right-3">
                    {ev.reward_points}
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="sr-h2 m-0">{ev.title}</h3>
                  <p className="text-xs text-[var(--sr-text-secondary)] flex items-center gap-1.5 m-0">
                    <Users className="w-3.5 h-3.5 text-[var(--sr-accent)]" />
                    Đơn vị tổ chức: {ev.organizer}
                  </p>
                  <p className="text-xs text-[var(--sr-text-secondary)] flex items-center gap-1.5 m-0">
                    <Clock className="w-3.5 h-3.5 text-[var(--sr-accent)]" />
                    Thời gian: {ev.event_date}
                  </p>
                  <p className="text-xs text-[var(--sr-text-secondary)] flex items-center gap-1.5 m-0">
                    <Recycle className="w-3.5 h-3.5 text-[var(--sr-accent)]" />
                    Mục tiêu: {ev.target_kg}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <div className="p-3 bg-[var(--sr-bg-page)] rounded-xl border border-[var(--sr-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--sr-text-secondary)]">Đã ghi danh:</span>
                  <span className="font-bold text-[var(--sr-accent)]">{ev.participants_count} / {ev.max_participants} Tình nguyện viên</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 3. Modal Create Alert or Campaign */}
      {showModal && (
        <div role="dialog" aria-modal="true" aria-label="Biểu mẫu nội dung quản trị" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 motion-backdrop-enter">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl motion-modal-enter">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--sr-border)]">
              <h2 className="text-lg font-bold text-[var(--sr-text-primary)]">
                {activeTab === 'alerts' ? 'Phát cảnh báo / thông báo mới' : 'Tạo chiến dịch dọn rác cộng đồng'}
              </h2>
              <button
                type="button"
                aria-label="Đóng biểu mẫu"
                onClick={() => setShowModal(false)}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={16} />
              </button>
            </div>

            {activeTab === 'alerts' ? (
              <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Tiêu đề thông báo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cảnh báo sạt lở đá cung đường Hoàng Sa..."
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({...alertForm, title: e.target.value})}
                    className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Mức độ cảnh báo</label>
                  <SaasSelect
                    value={alertForm.alert_level}
                    options={[
                      { value: 'warning', label: 'Nguy cơ sạt lở / hạn chế lưu thông (cảnh báo đỏ)' },
                      { value: 'info', label: 'Thông báo hướng dẫn chung (xanh dương)' },
                      { value: 'success', label: 'Thông báo đã khắc phục xong (xanh lá)' },
                    ]}
                    onChange={(val) => setAlertForm({ ...alertForm, alert_level: val })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Khu vực áp dụng</label>
                  <input
                    type="text"
                    value={alertForm.location_tag}
                    onChange={(e) => setAlertForm({...alertForm, location_tag: e.target.value})}
                    className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Nội dung chi tiết thông báo *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập nội dung thông báo gửi đến toàn thể du khách và các đơn vị lữ hành..."
                    value={alertForm.content}
                    onChange={(e) => setAlertForm({...alertForm, content: e.target.value})}
                    className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={alertForm.is_pinned}
                    onChange={(e) => setAlertForm({...alertForm, is_pinned: e.target.checked})}
                    className="w-4 h-4 text-[var(--sr-accent)] rounded"
                  />
                  <label htmlFor="is_pinned" className="text-xs font-semibold text-[var(--sr-text-primary)]">
                    Ghim lên đầu trang cộng đồng & phát chuông thông báo
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--sr-border)]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-[var(--sr-border)] text-[var(--sr-text-secondary)] rounded-xl font-bold hover:bg-[var(--sr-bg-page)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--sr-accent)] text-white rounded-xl font-bold hover:bg-[var(--sr-accent-hover)]"
                  >
                    Xuất bản ngay
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Tên chiến dịch *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chủ nhật xanh - làm sạch Bãi Nam..."
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({...campaignForm, title: e.target.value})}
                    className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Thời gian diễn ra *</label>
                    <input
                      type="text"
                      required
                      placeholder="06:30 Chủ nhật hàng tuần"
                      value={campaignForm.event_date}
                      onChange={(e) => setCampaignForm({...campaignForm, event_date: e.target.value})}
                      className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Số TNV tối đa</label>
                    <input
                      type="number"
                      value={campaignForm.max_participants}
                      onChange={(e) => setCampaignForm({...campaignForm, max_participants: parseInt(e.target.value) || 30})}
                      className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Mục tiêu thu gom</label>
                    <input
                      type="text"
                      value={campaignForm.target_kg}
                      onChange={(e) => setCampaignForm({...campaignForm, target_kg: e.target.value})}
                      className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Điểm thưởng RE-Points</label>
                    <input
                      type="text"
                      value={campaignForm.reward_points}
                      onChange={(e) => setCampaignForm({...campaignForm, reward_points: e.target.value})}
                      className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Link ảnh bìa sự kiện</label>
                  <input
                    type="url"
                    value={campaignForm.image}
                    onChange={(e) => setCampaignForm({...campaignForm, image: e.target.value})}
                    className="w-full p-3 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--sr-border)]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-[var(--sr-border)] text-[var(--sr-text-secondary)] rounded-xl font-bold hover:bg-[var(--sr-bg-page)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--sr-accent)] text-white rounded-xl font-bold hover:bg-[var(--sr-accent-hover)]"
                  >
                    Khởi tạo sự kiện
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. Rejection Modal */}
      {rejectModal.isOpen && (
        <div role="dialog" aria-modal="true" aria-label="Xác nhận kiểm duyệt nội dung" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 motion-backdrop-enter">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl motion-modal-enter">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--sr-border)]">
              <div className="flex items-center gap-2 text-[var(--sr-urgent-ink)] font-bold text-base">
                <ShieldAlert className="w-5 h-5" />
                <span>Từ chối / gỡ bỏ bài viết</span>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại từ chối"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false, post: null })}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[var(--sr-text-secondary)] m-0">
                Bạn đang từ chối hoặc gỡ bài viết <strong className="text-[var(--sr-text-primary)]">#{rejectModal.post?.id}</strong> của <strong className="text-[var(--sr-text-primary)]">{rejectModal.post?.author_name}</strong>.
              </p>

              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1.5">Lý do từ chối *</label>
                <div className="space-y-2">
                  {[
                    'Vi phạm quy định bảo vệ động vật hoang dã (tiếp cận, cho ăn voọc)',
                    'Hình ảnh không phù hợp hoặc có hành vi xả rác bừa bãi',
                    'Cung cấp thông tin sai lệch về thời tiết / cảnh báo sạt lở',
                    'Quảng cáo dịch vụ trái phép hoặc không đúng sự thật'
                  ].map((preset) => (
                    <label key={preset} className="flex items-start gap-2 p-2 rounded-xl border border-[var(--sr-border)] hover:bg-[var(--sr-bg-page)] cursor-pointer">
                      <input
                        type="radio"
                        name="rejection_preset"
                        checked={rejectModal.reasonPreset === preset}
                        onChange={() => setRejectModal({ ...rejectModal, reasonPreset: preset })}
                        className="mt-0.5 text-[var(--sr-accent)]"
                      />
                      <span className="text-xs text-[var(--sr-text-primary)]">{preset}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--sr-text-primary)] block mb-1">Ghi chú bổ sung (tùy chọn)</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú chi tiết gửi cho tác giả..."
                  value={rejectModal.reasonCustom}
                  onChange={(e) => setRejectModal({ ...rejectModal, reasonCustom: e.target.value })}
                  className="w-full p-2.5 border border-[var(--sr-border)] rounded-xl focus:outline-none focus:border-[var(--sr-accent)] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={() => setRejectModal({ ...rejectModal, isOpen: false, post: null })}
                  className="px-4 py-2 border border-[var(--sr-border)] text-[var(--sr-text-secondary)] rounded-xl font-bold hover:bg-[var(--sr-bg-page)]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-4 py-2 bg-[var(--sr-urgent)] hover:bg-[var(--sr-urgent)] text-white rounded-xl font-bold transition-colors"
                >
                  Xác nhận gỡ bài
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
