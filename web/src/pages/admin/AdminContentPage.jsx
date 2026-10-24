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
    organizer: 'Ban Quản Lý Bán Đảo Sơn Trà & Đoàn TN',
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
          organizer: 'Ban Quản Lý Bán Đảo Sơn Trà & Đoàn TN',
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
    <div className="space-y-6 font-be-vietnam">
      {/* 1. Header & Navigation Tabs */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <FileText className="w-4 h-4" />
            <span>AD-03: Quản Trị Nội Dung & Kiểm Duyệt Cộng Đồng</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c] font-fraunces">
            Kiểm Duyệt Bài Viết & Quản Lý Tin Tức
          </h1>
          <p className="text-xs text-[#5d6861] mt-1">
            Kiểm duyệt bài đăng của du khách/đối tác trước khi xuất bản, phát cảnh báo khẩn cấp và điều phối sự kiện Chủ Nhật Xanh.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex bg-[#f4f7f4] p-1 rounded-xl border border-[#e8ece9] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'moderation' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Kiểm Duyệt Bài Viết</span>
              {moderationMetrics.total_pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {moderationMetrics.total_pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'alerts' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cảnh Báo BQL ({alerts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'campaigns' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>Chiến Dịch Dọn Rác ({campaigns.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchData();
              fetchModerationData();
            }}
            className="p-2 border border-[#e8ece9] rounded-xl hover:bg-[#f7f5f0] text-[#5d6861] cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#24563d]' : ''}`} />
          </button>

          {activeTab !== 'moderation' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#24563d] text-white rounded-xl text-xs font-bold hover:bg-[#1d4833] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === 'alerts' ? 'Tạo Cảnh Báo Mới' : 'Tạo Chiến Dịch Mới'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Content Body based on Active Tab */}
      {activeTab === 'moderation' ? (
        <div className="space-y-5">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800 mb-2">
                <span className="text-xs font-bold">Chờ Kiểm Duyệt</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-fraunces text-amber-900">
                {moderationMetrics.total_pending}
              </div>
              <p className="text-[11px] text-amber-700 m-0 mt-1">
                Bài viết cần BQL thẩm định trước khi hiển thị
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-xs font-bold">Đã Phê Duyệt</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-fraunces text-emerald-900">
                {moderationMetrics.total_published}
              </div>
              <p className="text-[11px] text-emerald-700 m-0 mt-1">
                Đang hiển thị công khai trên Bảng tin
              </p>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-rose-800 mb-2">
                <span className="text-xs font-bold">Đã Gỡ Bỏ / Từ Chối</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-fraunces text-rose-900">
                {moderationMetrics.total_archived}
              </div>
              <p className="text-[11px] text-rose-700 m-0 mt-1">
                Vi phạm quy chế hoặc bị ẩn khỏi feed
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-700 mb-2">
                <span className="text-xs font-bold">Tổng Bài Đăng</span>
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-fraunces text-slate-900">
                {moderationMetrics.total_all}
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-1">
                Toàn bộ bài viết trong cơ sở dữ liệu
              </p>
            </div>
          </div>

          {/* Sub-Filters & Search Bar */}
          <div className="bg-white border border-[#e2e8e4] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {[
                { id: 'draft', label: 'Chờ duyệt', count: moderationMetrics.total_pending, badgeColor: 'bg-amber-500 text-white' },
                { id: 'published', label: 'Đã xuất bản', count: moderationMetrics.total_published, badgeColor: 'bg-emerald-600 text-white' },
                { id: 'archived', label: 'Đã gỡ bỏ', count: moderationMetrics.total_archived, badgeColor: 'bg-rose-500 text-white' },
                { id: 'all', label: 'Tất cả bài viết', count: moderationMetrics.total_all, badgeColor: 'bg-slate-500 text-white' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModerationFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border shrink-0 ${
                    moderationFilter === tab.id
                      ? 'bg-[#24563d] text-white border-[#24563d]'
                      : 'bg-[#F7F5F0] text-[#5d6861] border-[#e2e8e4] hover:bg-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    moderationFilter === tab.id ? 'bg-white/20 text-white' : tab.badgeColor
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-[#5d6861] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, tác giả, nội dung..."
                value={moderationSearch}
                onChange={(e) => setModerationSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e2e8e4] text-xs text-[#18211c] placeholder-[#9aa39c] bg-white focus:outline-none focus:border-[#24563d]"
              />
            </div>
          </div>

          {/* Posts Moderation List */}
          <div className="space-y-4">
            {filteredModerationPosts.length === 0 ? (
              <div className="bg-white border border-[#e2e8e4] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#eaf2eb] flex items-center justify-center text-[#24563d]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#18211c] text-sm">
                  {moderationFilter === 'draft' ? 'Không có bài viết nào đang chờ kiểm duyệt' : 'Không tìm thấy bài viết phù hợp'}
                </h3>
                <p className="text-xs text-[#5d6861] max-w-sm m-0">
                  {moderationFilter === 'draft'
                    ? 'Tất cả các bài đăng của du khách và đối tác đã được kiểm duyệt hoàn tất.'
                    : 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để xem các bài viết khác.'}
                </p>
              </div>
            ) : (
              filteredModerationPosts.map((post) => {
                const isDraft = post.status === 'draft';
                const isPublished = post.status === 'published';
                const isArchived = post.status === 'archived';

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-4 ${
                      isDraft 
                        ? 'border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/20' 
                        : (isArchived ? 'border-rose-200 bg-rose-50/10' : 'border-[#e2e8e4]')
                    }`}
                  >
                    {/* Post Top Row: Author & Status */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#eaf2eb] border border-[#24563d]/20 text-[#24563d] font-bold text-xs flex items-center justify-center shadow-2xs font-fraunces shrink-0">
                          {post.author_initials || 'ST'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#18211c]">
                              {post.author_name}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#eaf2eb] text-[#24563d] border border-[#24563d]/20">
                              {post.role_badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#5d6861] flex items-center gap-2 mt-0.5">
                            <span>{post.created_at}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#24563d] font-medium">
                              <MapPin className="w-3 h-3" />
                              {post.location_tag}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isDraft && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                            Chờ BQL duyệt
                          </span>
                        )}
                        {isPublished && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã phê duyệt
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Đã gỡ bỏ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Post Content & Media */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                      <div className="md:col-span-3 space-y-2">
                        <h4 className="font-bold text-[#18211c] text-sm leading-snug">
                          {post.title}
                        </h4>
                        <p className="text-xs text-[#2D3732] leading-relaxed whitespace-pre-line bg-[#F7F5F0]/60 p-3 rounded-xl border border-[#e2e8e4]/60 m-0">
                          {post.content}
                        </p>

                        {/* Badges: collected kg */}
                        {post.collected_kg > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <Recycle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Hành động Xanh: Đã thu gom {post.collected_kg} kg rác (+{post.collected_kg * 10} RE-Points)</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail Preview */}
                      {post.thumbnail_url && (
                        <div className="md:col-span-1 rounded-xl overflow-hidden border border-[#e2e8e4] h-28 w-full bg-slate-100">
                          <img
                            src={post.thumbnail_url}
                            alt="Ảnh đính kèm bài viết"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80";
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Moderation Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#f0f4f1] text-xs">
                      <span className="text-[#5d6861] text-[11px]">
                        Mã bài viết: <strong className="font-mono text-[#18211c]">#{post.id}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {isDraft && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === post.id}
                              onClick={() => handleReviewPost(post.id, 'approve')}
                              className="px-4 py-2 rounded-xl bg-[#24563d] hover:bg-[#1d4833] text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs border-0 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Phê Duyệt Công Khai</span>
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
                              className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ Chối</span>
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
                            className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Gỡ Bỏ Bài Viết</span>
                          </button>
                        )}

                        {isArchived && (
                          <button
                            type="button"
                            disabled={actionLoadingId === post.id}
                            onClick={() => handleReviewPost(post.id, 'restore')}
                            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi Phục Về Chờ Duyệt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : activeTab === 'alerts' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-3 ${
                  item.is_pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#e2e8e4]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.is_pinned && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        <Pin className="w-3 h-3" />
                        Ghim ưu tiên
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      item.alert_level === 'warning' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.alert_level === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {item.alert_level === 'warning' ? 'Nguy cơ sạt lở / Hạn chế' : item.alert_level === 'success' ? 'Đã khắc phục xong' : 'Thông báo hướng dẫn'}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#5d6861]">{item.created_at}</span>
                </div>

                <div>
                  <h3 className="font-bold text-[#18211c] text-sm leading-snug">{item.title}</h3>
                  <p className="text-xs text-[#5d6861] mt-1.5 leading-relaxed line-clamp-3">{item.content}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0f4f1] text-[11px] text-[#5d6861]">
                  <span className="flex items-center gap-1 font-semibold text-[#24563d]">
                    <MapPin className="w-3.5 h-3.5" />
                    {item.location_tag}
                  </span>
                  <span>{item.likes_count} lượt tương tác · {item.comments_count} phản hồi</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-[#e2e8e4] overflow-hidden shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 w-full overflow-hidden relative">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#24563d] text-white rounded-lg text-xs font-bold shadow-md">
                    {ev.reward_points}
                  </span>
                </div>
                
                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-[#18211c] text-sm">{ev.title}</h3>
                  <p className="text-xs text-[#5d6861] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#24563d]" />
                    Đơn vị tổ chức: {ev.organizer}
                  </p>
                  <p className="text-xs text-[#5d6861] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#24563d]" />
                    Thời gian: {ev.event_date}
                  </p>
                  <p className="text-xs text-[#5d6861] flex items-center gap-1.5">
                    <Recycle className="w-3.5 h-3.5 text-emerald-600" />
                    Mục tiêu: {ev.target_kg}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <div className="p-3 bg-[#f7f5f0] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#5d6861]">Đã ghi danh:</span>
                  <span className="font-bold text-[#24563d]">{ev.participants_count} / {ev.max_participants} Tình nguyện viên</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Modal Create Alert or Campaign */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#e8ece9]">
              <h2 className="text-lg font-bold text-[#18211c]">
                {activeTab === 'alerts' ? 'Phát Cảnh Báo / Thông Báo Mới' : 'Tạo Chiến Dịch Dọn Rác Cộng Đồng'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {activeTab === 'alerts' ? (
              <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Tiêu đề thông báo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cảnh báo sạt lở đá cung đường Hoàng Sa..."
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({...alertForm, title: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Mức độ cảnh báo</label>
                  <select
                    value={alertForm.alert_level}
                    onChange={(e) => setAlertForm({...alertForm, alert_level: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  >
                    <option value="warning">Nguy cơ sạt lở / Hạn chế lưu thông (Cảnh báo đỏ)</option>
                    <option value="info">Thông báo hướng dẫn chung (Xanh dương)</option>
                    <option value="success">Thông báo đã khắc phục xong (Xanh lá)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Khu vực áp dụng</label>
                  <input
                    type="text"
                    value={alertForm.location_tag}
                    onChange={(e) => setAlertForm({...alertForm, location_tag: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Nội dung chi tiết thông báo *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập nội dung thông báo gửi đến toàn thể du khách và các đơn vị lữ hành..."
                    value={alertForm.content}
                    onChange={(e) => setAlertForm({...alertForm, content: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={alertForm.is_pinned}
                    onChange={(e) => setAlertForm({...alertForm, is_pinned: e.target.checked})}
                    className="w-4 h-4 text-[#24563d] rounded"
                  />
                  <label htmlFor="is_pinned" className="text-xs font-semibold text-[#18211c]">
                    Ghim lên đầu trang cộng đồng & phát chuông thông báo
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#e8ece9]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-[#e2e8e4] text-[#5d6861] rounded-xl font-bold hover:bg-[#f7f5f0]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#24563d] text-white rounded-xl font-bold hover:bg-[#1d4833]"
                  >
                    Xuất bản ngay
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Tên chiến dịch *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chủ Nhật Xanh - Làm Sạch Bãi Nam..."
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({...campaignForm, title: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18211c] block mb-1">Thời gian diễn ra *</label>
                    <input
                      type="text"
                      required
                      placeholder="06:30 Chủ Nhật hàng tuần"
                      value={campaignForm.event_date}
                      onChange={(e) => setCampaignForm({...campaignForm, event_date: e.target.value})}
                      className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#18211c] block mb-1">Số TNV tối đa</label>
                    <input
                      type="number"
                      value={campaignForm.max_participants}
                      onChange={(e) => setCampaignForm({...campaignForm, max_participants: parseInt(e.target.value) || 30})}
                      className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18211c] block mb-1">Mục tiêu thu gom</label>
                    <input
                      type="text"
                      value={campaignForm.target_kg}
                      onChange={(e) => setCampaignForm({...campaignForm, target_kg: e.target.value})}
                      className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#18211c] block mb-1">Điểm thưởng RE-Points</label>
                    <input
                      type="text"
                      value={campaignForm.reward_points}
                      onChange={(e) => setCampaignForm({...campaignForm, reward_points: e.target.value})}
                      className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#18211c] block mb-1">Link ảnh bìa sự kiện</label>
                  <input
                    type="url"
                    value={campaignForm.image}
                    onChange={(e) => setCampaignForm({...campaignForm, image: e.target.value})}
                    className="w-full p-3 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#e8ece9]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-[#e2e8e4] text-[#5d6861] rounded-xl font-bold hover:bg-[#f7f5f0]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#24563d] text-white rounded-xl font-bold hover:bg-[#1d4833]"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#e8ece9]">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <ShieldAlert className="w-5 h-5" />
                <span>Từ Chối / Gỡ Bỏ Bài Viết</span>
              </div>
              <button 
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false, post: null })}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#5d6861] m-0">
                Bạn đang từ chối hoặc gỡ bài viết <strong className="text-[#18211c]">#{rejectModal.post?.id}</strong> của <strong className="text-[#18211c]">{rejectModal.post?.author_name}</strong>.
              </p>

              <div>
                <label className="font-bold text-[#18211c] block mb-1.5">Lý do từ chối *</label>
                <div className="space-y-2">
                  {[
                    'Vi phạm quy định bảo vệ động vật hoang dã (tiếp cận, cho ăn Voọc)',
                    'Hình ảnh không phù hợp hoặc có hành vi xả rác bừa bãi',
                    'Cung cấp thông tin sai lệch về thời tiết / cảnh báo sạt lở',
                    'Quảng cáo dịch vụ trái phép hoặc không đúng sự thật'
                  ].map((preset) => (
                    <label key={preset} className="flex items-start gap-2 p-2 rounded-xl border border-[#e2e8e4] hover:bg-[#F7F5F0] cursor-pointer">
                      <input
                        type="radio"
                        name="rejection_preset"
                        checked={rejectModal.reasonPreset === preset}
                        onChange={() => setRejectModal({ ...rejectModal, reasonPreset: preset })}
                        className="mt-0.5 text-[#24563d]"
                      />
                      <span className="text-xs text-[#2D3732]">{preset}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Ghi chú bổ sung (tùy chọn)</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú chi tiết gửi cho tác giả..."
                  value={rejectModal.reasonCustom}
                  onChange={(e) => setRejectModal({ ...rejectModal, reasonCustom: e.target.value })}
                  className="w-full p-2.5 border border-[#e2e8e4] rounded-xl focus:outline-none focus:border-[#24563d] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e8ece9]">
                <button
                  type="button"
                  onClick={() => setRejectModal({ ...rejectModal, isOpen: false, post: null })}
                  className="px-4 py-2 border border-[#e2e8e4] text-[#5d6861] rounded-xl font-bold hover:bg-[#f7f5f0]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors"
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
