import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Award, 
  Compass, 
  Trees, 
  ShieldAlert, 
  Info,
  X,
  ExternalLink,
  Sparkles,
  Inbox
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import { realtimeBus } from '../../lib/realtimeBus';

// Subtle Web Audio notification chime (like Facebook's soft ding)
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignored if browser restricts autoplay before user interaction
  }
}

export function NotificationBell({ role = 'customer', className = '' }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Facebook-style Floating Live Toast Alert
  const [liveToast, setLiveToast] = useState(null);

  const containerRef = useRef(null);

  // Fetch notifications from Backend API
  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(role);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Lắng nghe realtime bus để cập nhật chuông ngay tức thì khi có bài đăng/duyệt bài
    const unsubscribe = realtimeBus.subscribe((event) => {
      loadNotifications();

      // Facebook-style Live Banner Notification
      if (role === 'customer' && event.type === 'POST_STATUS_CHANGED') {
        if (event.payload?.action === 'approve') {
          playNotificationSound();
          setLiveToast({
            title: 'Bài viết đã được BQL phê duyệt!',
            content: 'Ban Quản Lý Sơn Trà vừa phê duyệt bài viết của bạn. Bài viết đã được xuất bản công khai lên Bảng tin!',
            link: '/dashboard/community',
            category: 'reward'
          });
        } else if (event.payload?.action === 'reject') {
          setLiveToast({
            title: 'Thông báo kiểm duyệt bài viết',
            content: 'Bài viết của bạn đã bị từ chối hoặc gỡ bỏ do chưa đáp ứng quy chế bảo tồn Sơn Trà.',
            link: '/dashboard/community',
            category: 'incident'
          });
        }
      } else if (role === 'admin' && event.type === 'POST_CREATED') {
        playNotificationSound();
        setLiveToast({
          title: 'Bài viết mới chờ kiểm duyệt',
          content: 'Du khách vừa gửi một bài viết chia sẻ mới. Bấm vào để thẩm định và phê duyệt nội dung.',
          link: '/admin/content',
          category: 'system_alert'
        });
      }
    });

    // Auto-refresh notifications every 30s
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [role]);

  // Auto-dismiss live toast after 6 seconds
  useEffect(() => {
    if (liveToast) {
      const timer = setTimeout(() => {
        setLiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [liveToast]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = () => {
    const ids = notifications.map(n => n.id);
    notificationService.markAllAsRead(ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (item) => {
    // Đánh dấu đã đọc
    if (!item.is_read) {
      notificationService.markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    notificationService.dismissNotification(id);
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      setUnreadCount(filtered.filter(n => !n.is_read).length);
      return filtered;
    });
  };

  // Filtered items based on tab
  const displayedNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  // Category Icon & Badge Colors
  const renderCategoryIcon = (category) => {
    switch (category) {
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'incident':
        return <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />;
      case 'reward':
        return <Award className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'event':
        return <Trees className="w-4 h-4 text-[#24563d] shrink-0" />;
      case 'booking':
        return <Compass className="w-4 h-4 text-sky-600 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'system_alert':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'incident':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'reward':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'event':
        return 'bg-[#eaf2eb] text-[#24563d] border-[#24563d]/20';
      case 'booking':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        title="Thông báo hệ thống"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className={`w-9 h-9 rounded-2xl border transition-all flex items-center justify-center cursor-pointer relative outline-none select-none ${
          isOpen
            ? 'bg-[#24563d] text-white border-[#24563d] shadow-sm'
            : 'bg-white text-[#5d6861] hover:text-[#18211c] hover:bg-[#F7F5F0] border-[#e2e8e4] shadow-2xs'
        }`}
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        
        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ================= FACEBOOK-STYLE FLOATING LIVE TOAST BANNER ================= */}
      {liveToast && (
        <div 
          onClick={() => {
            navigate(liveToast.link);
            setLiveToast(null);
          }}
          className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-2xl border border-emerald-300 shadow-2xl p-4 flex items-start gap-3.5 cursor-pointer animate-in slide-in-from-top-4 fade-in duration-300 hover:border-[#24563d] transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <Sparkles className="w-5 h-5 text-emerald-700 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Thông Báo Mới
              </span>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLiveToast(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 bg-transparent border-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <h4 className="text-xs font-bold text-[#18211c] m-0 mb-1 leading-snug">
              {liveToast.title}
            </h4>

            <p className="text-[11px] text-[#5d6861] m-0 leading-relaxed line-clamp-2">
              {liveToast.content}
            </p>

            <span className="text-[10px] text-[#24563d] font-bold mt-1.5 inline-block group-hover:underline">
              Bấm để xem chi tiết &rarr;
            </span>
          </div>
        </div>
      )}

      {/* ================= DROPDOWN POPOVER ================= */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-[#e2e8e4] shadow-xl z-50 overflow-hidden flex flex-col font-be-vietnam animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Popover Header */}
          <div className="px-4 py-3.5 bg-[#F7F5F0]/80 border-b border-[#e2e8e4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-fraunces font-bold text-sm text-[#18211c]">
                Thông Báo
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-[#24563d] hover:text-[#1b3d2b] flex items-center gap-1 cursor-pointer bg-transparent border-0 p-1 rounded-md transition-colors"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 pt-2 border-b border-[#e2e8e4] gap-4 bg-white text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-2 font-bold cursor-pointer transition-all border-b-2 bg-transparent ${
                activeTab === 'all'
                  ? 'border-[#24563d] text-[#24563d]'
                  : 'border-transparent text-[#64748B] hover:text-[#18211c]'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`pb-2 font-bold cursor-pointer transition-all border-b-2 bg-transparent flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'border-[#24563d] text-[#24563d]'
                  : 'border-transparent text-[#64748B] hover:text-[#18211c]'
              }`}
            >
              Chưa đọc
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications List Container */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-[#f0f3f1]">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-[#eaf2eb] flex items-center justify-center text-[#24563d]">
                  <Inbox className="w-6 h-6 text-[#24563d]" />
                </div>
                <span className="text-xs font-bold text-[#18211c]">
                  {activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </span>
                <p className="text-[11px] text-[#64748B] max-w-xs leading-relaxed m-0">
                  {activeTab === 'unread' 
                    ? 'Bạn đã xem hết các thông báo mới nhất từ Ban Quản Lý và đối tác.'
                    : 'Các thông báo khẩn cấp, cập nhật duyệt bài và điểm thưởng sẽ hiển thị tại đây.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group relative ${
                    item.is_read ? 'bg-white hover:bg-[#F7F5F0]/60' : 'bg-[#f4f8f5]/80 hover:bg-[#ebf3ed]'
                  }`}
                >
                  {/* Category Icon */}
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e2e8e4] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {renderCategoryIcon(item.category)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category_label || 'Thông Báo'}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {item.timestamp}
                      </span>
                    </div>

                    <h4 className={`text-xs m-0 mb-1 leading-snug line-clamp-1 ${
                      item.is_read ? 'font-semibold text-[#18211c]' : 'font-bold text-[#18211c]'
                    }`}>
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-[#5d6861] m-0 leading-relaxed line-clamp-2">
                      {item.content}
                    </p>
                  </div>

                  {/* Unread indicator dot & dismiss button */}
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Chưa đọc" />
                    )}
                    <button
                      type="button"
                      title="Ẩn thông báo"
                      onClick={(e) => handleDismiss(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-[#DC2626] rounded-md transition-opacity bg-transparent border-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="px-4 py-2.5 bg-[#F7F5F0]/90 border-t border-[#e2e8e4] flex items-center justify-between text-[11px]">
            <span className="text-[#64748B]">
              Ban Quản Lý Bán Đảo Sơn Trà &copy; 2026
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(role === 'vendor' ? '/vendor/dashboard' : (role === 'admin' ? '/admin' : '/dashboard/community'));
              }}
              className="text-[#24563d] hover:text-[#1b3d2b] font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              <span>Xem bảng tin</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
