import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  MapPin, 
  CalendarDays, 
  Users, 
  Gift, 
  TrendingUp, 
  MessageSquare, 
  Bell, 
  Settings, 
  Search, 
  Info, 
  Plus, 
  Check, 
  Eye, 
  LayoutDashboard,
  LogOut, 
  ChevronDown, 
  Menu, 
  X, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  Filter, 
  Phone, 
  Clock, 
  Send,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Radio,
  FileText
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import { api } from '../../lib/axios';
import NotificationBell from '../../components/notifications/NotificationBell';

export const VendorInboxPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);

  // Trips & Messages state
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tripDetail, setTripDetail] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'today' | 'upcoming'

  // Input state
  const [inputMessage, setInputMessage] = useState('');
  const [messageType, setMessageType] = useState('text'); // 'text' | 'guide_note' | 'bql_alert'

  const messagesEndRef = useRef(null);

  // Vendor Profile
  const vendorInfo = (() => {
    try {
      const cached = localStorage.getItem('vendor_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.vendor_info) return parsed.vendor_info;
      }
    } catch (e) {}
    return {
      brand_name: 'Sơn Trà Trekking Partner',
      status_label: 'Đối tác chính thức BQL',
      avatar_text: 'ST'
    };
  })();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/partner/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Trips list
  const fetchTrips = async (isInitial = false) => {
    if (isInitial) setLoadingTrips(true);
    try {
      const res = await api.get('/vendors/inbox/trips/');
      if (res.data && res.data.status === 'success') {
        const list = res.data.data || [];
        setTrips(list);
        if (list.length > 0 && (!selectedTrip || isInitial)) {
          setSelectedTrip(list[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching trip channels:', err);
    } finally {
      if (isInitial) setLoadingTrips(false);
    }
  };

  // 2. Fetch Messages for selected trip
  const fetchMessages = async (trip, showSpinner = false) => {
    if (!trip) return;
    if (showSpinner) setLoadingMessages(true);
    try {
      const res = await api.get(`/vendors/inbox/messages/?tour_id=${trip.tour_id}&date=${trip.scheduled_date}`);
      if (res.data && res.data.status === 'success') {
        setMessages(res.data.data.messages || []);
        setTripDetail(res.data.data.trip || null);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTrips(true);
  }, []);

  useEffect(() => {
    if (selectedTrip) {
      fetchMessages(selectedTrip, true);
    }
  }, [selectedTrip]);

  // Polling messages every 5 seconds
  useEffect(() => {
    if (!selectedTrip) return;
    const interval = setInterval(() => {
      fetchMessages(selectedTrip, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTrip]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedTrip || sending) return;

    const textToSend = inputMessage.trim();
    const typeToSend = messageType;
    setInputMessage('');
    setSending(true);

    // Optimistic message
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: 9999,
      sender_name: vendorInfo.brand_name || 'Hướng Dẫn Viên',
      sender_role: 'guide',
      sender_role_label: 'Hướng Dẫn Viên Đoàn',
      content: textToSend,
      message_type: typeToSend,
      image_url: null,
      created_at: new Date().toISOString(),
      time_formatted: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      is_me: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const payload = {
        tour_id: selectedTrip.tour_id,
        scheduled_date: selectedTrip.scheduled_date,
        content: textToSend,
        message_type: typeToSend
      };
      const res = await api.post('/vendors/inbox/messages/', payload);
      if (res.data && res.data.status === 'success') {
        // Refresh messages
        fetchMessages(selectedTrip, false);
        fetchTrips(false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
      setMessageType('text');
    }
  };

  // Quick preset messages
  const handleQuickSend = (text, type = 'text') => {
    setInputMessage(text);
    setMessageType(type);
  };

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    const matchesSearch = t.tour_title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'today') return t.is_today;
    if (filterTab === 'upcoming') return !t.is_today;
    return true;
  });

  // Sidebar Menu Navigation Structure
  const navGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'QUẢN LÝ DỊCH VỤ & TOUR',
      items: [
        { id: 'experiences', label: 'Tour & Tuyến GPS', icon: Compass, path: '/vendor/experiences' },
        { id: 'bookings', label: 'Đơn đặt', icon: CalendarDays, path: '/vendor/bookings' },
        { id: 'rewards', label: 'Ưu đãi Green Points', icon: Gift, path: '/vendor/dashboard' },
        { id: 'revenue', label: 'Doanh thu & Đối soát', icon: TrendingUp, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'TƯƠNG TÁC & THIẾT LẬP',
      items: [
        { id: 'inbox', label: 'Hộp thư', icon: MessageSquare, path: '/vendor/inbox' },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings, path: '/vendor/dashboard' }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-[#F7F5F0]/40 font-sans text-[#2D3732] overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= FIXED LEFT SIDEBAR ================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[248px] bg-[#F7F5F0] p-5 flex flex-col justify-between border-r border-[#E2E8E4] transition-transform duration-300 shrink-0 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo & Portal Badge */}
          <div className="flex items-center justify-between">
            <Link to="/vendor/dashboard" className="flex items-center gap-2.5 no-underline">
              <img 
                src={logoImg} 
                alt="Logo" 
                className="w-8 h-8 rounded-xl object-cover shadow-xs border border-[#E2E8E4]" 
              />
              <div className="flex flex-col">
                <span className="text-[#2D3732] font-bold text-sm leading-tight font-fraunces">
                  Sơn Trà REloop
                </span>
                <span className="text-[#6B7A72] text-[10px] font-medium tracking-wide uppercase font-be-vietnam">
                  Cổng Đối Tác
                </span>
              </div>
            </Link>
            <button 
              type="button" 
              className="lg:hidden p-1 text-[#6B7A72] hover:text-[#2D3732]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-210px)] pr-1">
            {navGroups.map((group, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#6B7A72] tracking-wider px-3 uppercase font-be-vietnam">
                  {group.title}
                </span>
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const active = item.id === 'inbox';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-xs font-bold transition-all border-0 text-left cursor-pointer ${
                        active
                          ? "bg-[#E9EFEC] text-[#4A6B5D]"
                          : "text-[#6B7A72] hover:bg-[#E9EFEC]/50 hover:text-[#2D3732]"
                      }`}
                    >
                      <IconComp className={`w-4 h-4 shrink-0 ${active ? "text-[#4A6B5D]" : "text-[#6B7A72]"}`} />
                      <span className="flex-1 font-be-vietnam font-semibold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Logout item */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-xs font-bold text-[#B8442C] hover:bg-rose-50 transition-all border-0 text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0 text-[#B8442C]" />
                <span className="flex-1 font-be-vietnam font-semibold">Đăng xuất</span>
              </button>
            </div>
          </nav>
        </div>

        {/* User Profile Card at Bottom of Sidebar */}
        <div 
          onClick={() => navigate('/vendor/dashboard')}
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#E2E8E4] hover:bg-[#E9EFEC]/40 shadow-xs mt-4"
        >
          <div className="w-9 h-9 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            {vendorInfo.avatar_text || 'ST'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-bold truncate font-fraunces">
              {vendorInfo.brand_name}
            </span>
            <span className="text-[#6B7A72] text-[11px] font-be-vietnam truncate">
              {vendorInfo.status_label || 'Đối tác chính thức'}
            </span>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT MAIN LAYOUT ================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-[70px] bg-white border-b border-[#E9EFEC] px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 bg-[#F7F5F0] text-[#2D3732] rounded-xl border border-[#E2E8E4] cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[#2D3732] text-lg sm:text-[20px] font-bold tracking-tight font-fraunces">
                  Hộp Thư Điều Phối Thực Địa
                </h1>
                <span className="text-[11px] font-bold bg-[#E9EFEC] text-[#4A6B5D] px-2.5 py-0.5 rounded-full border border-[#DCE5DF]">
                  Kênh 3 Bên
                </span>
              </div>
              <p className="text-[11px] text-[#6B7A72] font-be-vietnam hidden sm:block">
                Liên lạc trực tiếp giữa Ban Quản Lý Kiểm Lâm, Hướng Dẫn Viên đoàn và Du Khách tham gia trekking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchTrips(false);
                if (selectedTrip) fetchMessages(selectedTrip, true);
              }}
              title="Làm mới cuộc trò chuyện"
              className="p-2 rounded-xl text-[#6B7A72] hover:text-[#2D3732] hover:bg-[#F7F5F0] border border-[#E2E8E4] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <NotificationBell />

            <div className="w-8 h-8 rounded-xl bg-[#4A6B5D] text-white flex items-center justify-center font-bold text-xs font-fraunces">
              {vendorInfo.avatar_text || 'ST'}
            </div>
          </div>
        </header>

        {/* Split Screen Container: Left (Trips List) + Right (Group Chat Box) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ================= COLUMN 1: TRIPS LIST (340px) ================= */}
          <section className="w-full sm:w-[320px] md:w-[360px] bg-white border-r border-[#E2E8E4] flex flex-col shrink-0 h-[calc(100vh-70px)]">
            
            {/* Search & Tabs Header */}
            <div className="p-4 border-b border-[#E9EFEC] space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
                <input
                  type="text"
                  placeholder="Tìm chuyến đi hoặc cung đường..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F7F5F0] rounded-xl text-xs text-[#2D3732] placeholder-[#6B7A72] border border-[#E2E8E4] focus:outline-hidden focus:border-[#4A6B5D] transition-colors"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-[#F7F5F0] p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'upcoming', label: 'Sắp tới' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-0 ${
                      filterTab === tab.id
                        ? 'bg-white text-[#4A6B5D] shadow-xs'
                        : 'text-[#6B7A72] hover:text-[#2D3732]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trips Stream */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E9EFEC]">
              {loadingTrips ? (
                <div className="p-8 text-center text-xs text-[#6B7A72]">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#4A6B5D]" />
                  Đang tải danh sách chuyến đi...
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7A72]">
                  Không tìm thấy chuyến đi nào phù hợp.
                </div>
              ) : (
                filteredTrips.map((trip) => {
                  const isSelected = selectedTrip?.trip_id === trip.trip_id;
                  return (
                    <div
                      key={trip.trip_id}
                      onClick={() => setSelectedTrip(trip)}
                      className={`p-3.5 flex gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#E9EFEC]/60 border-l-4 border-l-[#4A6B5D]'
                          : 'hover:bg-[#F7F5F0]/70'
                      }`}
                    >
                      {/* Tour Image / Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-[#E2E8E4] overflow-hidden shrink-0 border border-[#E2E8E4] relative">
                        {trip.cover_image_url ? (
                          <img
                            src={trip.cover_image_url}
                            alt={trip.tour_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#E9EFEC] text-[#4A6B5D] font-bold text-xs">
                            ST
                          </div>
                        )}
                        {trip.is_today && (
                          <span className="absolute bottom-0 inset-x-0 bg-[#4A6B5D] text-white text-[8px] font-bold text-center py-0.5 leading-none">
                            HÔM NAY
                          </span>
                        )}
                      </div>

                      {/* Info & Last message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="text-xs font-bold text-[#2D3732] truncate font-fraunces">
                            {trip.tour_title}
                          </h3>
                          <span className="text-[10px] text-[#6B7A72] shrink-0 font-medium">
                            {trip.last_message?.time_formatted || trip.date_formatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[10px] font-medium text-[#6B7A72] flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-[#4A6B5D]" />
                            {trip.date_formatted}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[10px] text-[#6B7A72] flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#4A6B5D]" />
                            {trip.participants_count} thành viên
                          </span>
                        </div>

                        {/* Last message preview */}
                        <p className="text-[11px] text-[#6B7A72] truncate font-be-vietnam">
                          {trip.last_message ? (
                            <>
                              <span className="font-semibold text-[#2D3732]">
                                {trip.last_message.sender_name}:
                              </span>{' '}
                              {trip.last_message.content}
                            </>
                          ) : (
                            <span className="italic text-gray-400">Chưa có tin nhắn nào...</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Left Column Footer Notice */}
            <div className="p-3 bg-[#F7F5F0] border-t border-[#E2E8E4] text-[11px] text-[#6B7A72] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Trực thính BQL Sơn Trà 24/7
              </span>
              <span className="text-[10px] text-[#4A6B5D] font-bold">Kênh bảo tồn</span>
            </div>
          </section>

          {/* ================= COLUMN 2: GROUP CHAT & COORDINATION (Flex-1) ================= */}
          <main className="flex-1 flex flex-col bg-[#F7F5F0]/30 h-[calc(100vh-70px)] overflow-hidden">
            
            {selectedTrip ? (
              <>
                {/* 1. Chat Room Header */}
                <div className="px-6 py-3.5 bg-white border-b border-[#E9EFEC] flex items-center justify-between shrink-0 shadow-xs z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center font-bold text-sm shrink-0 border border-[#DCE5DF]">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-[#2D3732] truncate font-fraunces">
                          {selectedTrip.tour_title}
                        </h2>
                        {selectedTrip.is_today && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Đang diễn ra hôm nay
                          </span>
                        )}
                      </div>
                      
                      {/* Active participant role badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          BQL Kiểm Lâm (Trực ban)
                        </span>
                        <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Compass className="w-3 h-3 text-teal-600" />
                          HDV Trưởng Đoàn
                        </span>
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {tripDetail?.total_members || selectedTrip.participants_count} Thành viên đoàn
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRosterOpen(!rosterOpen)}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8E4] bg-[#F7F5F0] hover:bg-white text-xs font-semibold text-[#2D3732] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-[#4A6B5D]" />
                      <span className="hidden sm:inline">Danh sách đoàn</span>
                    </button>
                  </div>
                </div>

                {/* 2. Pinned Safety Notice Banner */}
                <div className="px-6 py-2 bg-[#E9EFEC]/90 border-b border-[#DCE5DF] flex items-center justify-between text-xs text-[#2D3732] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-[#4A6B5D] shrink-0" />
                    <span className="font-semibold text-[#4A6B5D] text-[11px] truncate">
                      Lưu ý an toàn thực địa:
                    </span>
                    <span className="text-[11px] text-[#2D3732] truncate">
                      Hotline Kiểm Lâm Sơn Trà: <strong>0236.3.844.567</strong> | Khẩn cấp: <strong>114 / 0905.123.456</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6B7A72] hidden md:inline">
                    Tuyệt đối không tách đoàn & không xả rác
                  </span>
                </div>

                {/* 3. Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-xs text-[#6B7A72]">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#4A6B5D]" />
                      Đang đồng bộ tin nhắn...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center text-[#4A6B5D] shadow-xs border border-[#E2E8E4]">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-[#2D3732] font-fraunces">
                        Phòng chat điều phối chuyến đi {selectedTrip.date_formatted}
                      </h4>
                      <p className="text-xs text-[#6B7A72] max-w-sm mx-auto">
                        Chưa có tin nhắn nào. Hướng Dẫn Viên hoặc BQL Kiểm Lâm có thể gửi hướng dẫn xuất phát đầu tiên tại đây.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isBQL = msg.sender_role === 'bql';
                      const isGuide = msg.sender_role === 'guide';
                      const isAlert = msg.message_type === 'bql_alert';
                      const isGuideNote = msg.message_type === 'guide_note';

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-3xl ${msg.is_me ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          {/* Avatar */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 font-fraunces border ${
                              isBQL
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isGuide
                                ? 'bg-[#E9EFEC] text-[#4A6B5D] border-[#DCE5DF]'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isBQL ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            ) : isGuide ? (
                              <Compass className="w-4 h-4 text-[#4A6B5D]" />
                            ) : (
                              msg.sender_name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          {/* Message Content Bubble */}
                          <div className={`flex flex-col min-w-0 ${msg.is_me ? 'items-end' : 'items-start'}`}>
                            
                            {/* Sender Info Line */}
                            <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                              <span className="font-bold text-[#2D3732]">
                                {msg.sender_name}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded-md font-medium text-[9px] ${
                                  isBQL
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isGuide
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {msg.sender_role_label}
                              </span>
                              <span className="text-[#6B7A72] text-[10px]">
                                {msg.time_formatted}
                              </span>
                            </div>

                            {/* Bubble Card */}
                            <div
                              className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                                isAlert
                                  ? 'bg-amber-50/90 border-2 border-amber-300 text-amber-950'
                                  : isGuideNote
                                  ? 'bg-[#E9EFEC] border border-[#C5D5CC] text-[#1E332A]'
                                  : msg.is_me
                                  ? 'bg-[#4A6B5D] text-white rounded-tr-none'
                                  : 'bg-white border border-[#E2E8E4] text-[#2D3732] rounded-tl-none'
                              }`}
                            >
                              {/* Special Badge Header inside bubble */}
                              {isAlert && (
                                <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[10px] uppercase mb-1.5 pb-1 border-b border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Thông Báo Chính Thức Từ BQL Bán Đảo Sơn Trà
                                </div>
                              )}
                              {isGuideNote && (
                                <div className="flex items-center gap-1.5 font-bold text-[#4A6B5D] text-[10px] uppercase mb-1.5 pb-1 border-b border-[#C5D5CC]">
                                  <Compass className="w-3.5 h-3.5 text-[#4A6B5D]" />
                                  Chỉ Dẫn Từ Hướng Dẫn Viên Trưởng Đoàn
                                </div>
                              )}

                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 4. Quick Action Chips for Expeditions */}
                <div className="px-6 py-2 bg-white/70 border-t border-[#E9EFEC] flex items-center gap-2 overflow-x-auto shrink-0">
                  <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider shrink-0 font-be-vietnam">
                    Gợi ý nhanh:
                  </span>
                  {[
                    { label: 'Điểm danh: Đoàn đã tập trung đủ', type: 'guide_note' },
                    { label: 'Đoàn đang dừng chân nghỉ tại Trạm quan sát', type: 'text' },
                    { label: 'Cập nhật thời tiết cung đường khô ráo', type: 'guide_note' },
                    { label: 'Đoàn đã hoàn thành hành trình an toàn', type: 'guide_note' }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickSend(chip.label, chip.type)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4] text-[11px] text-[#2D3732] hover:bg-[#E9EFEC] hover:border-[#4A6B5D] transition-all shrink-0 cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* 5. Message Input Bar */}
                <div className="p-4 bg-white border-t border-[#E9EFEC] shrink-0">
                  <form onSubmit={handleSendMessage} className="space-y-2.5">
                    
                    {/* Message Type Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-[#6B7A72]">Loại tin nhắn:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMessageType('text')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                              messageType === 'text'
                                ? 'bg-[#4A6B5D] text-white border-[#4A6B5D]'
                                : 'bg-[#F7F5F0] text-[#6B7A72] border-[#E2E8E4]'
                            }`}
                          >
                            Tin nhắn thường
                          </button>
                          <button
                            type="button"
                            onClick={() => setMessageType('guide_note')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                              messageType === 'guide_note'
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-[#F7F5F0] text-[#6B7A72] border-[#E2E8E4]'
                            }`}
                          >
                            Chỉ dẫn HDV
                          </button>
                          <button
                            type="button"
                            onClick={() => setMessageType('bql_alert')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                              messageType === 'bql_alert'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-[#F7F5F0] text-[#6B7A72] border-[#E2E8E4]'
                            }`}
                          >
                            Thông báo BQL / An toàn
                          </button>
                        </div>
                      </div>

                      <span className="text-[10px] text-[#6B7A72] hidden sm:inline">
                        Nhấn <strong>Enter</strong> để gửi
                      </span>
                    </div>

                    {/* Input Field & Submit Button */}
                    <div className="flex items-end gap-2.5">
                      <div className="flex-1 bg-[#F7F5F0] rounded-2xl border border-[#E2E8E4] focus-within:border-[#4A6B5D] focus-within:bg-white transition-all p-2">
                        <textarea
                          rows={2}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={
                            messageType === 'guide_note'
                              ? 'Nhập chỉ dẫn cho toàn đoàn (tập trung, trang thiết bị, thời gian)...'
                              : messageType === 'bql_alert'
                              ? 'Nhập thông báo an toàn, cảnh báo thời tiết hoặc động vật hoang dã...'
                              : 'Nhập tin nhắn trao đổi với khách trekking và BQL Kiểm Lâm...'
                          }
                          className="w-full bg-transparent border-0 resize-none text-xs text-[#2D3732] placeholder-[#6B7A72] focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || sending}
                        className={`h-11 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-xs ${
                          inputMessage.trim() && !sending
                            ? 'bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white'
                            : 'bg-[#E2E8E4] text-[#6B7A72] cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4 !text-white" />
                        <span className="!text-white hidden sm:inline">Gửi</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-[#4A6B5D] shadow-sm border border-[#E2E8E4] mb-3">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#2D3732] font-fraunces">
                  Chọn chuyến đi để mở phòng điều phối
                </h3>
                <p className="text-xs text-[#6B7A72] max-w-sm mt-1 font-be-vietnam">
                  Mỗi chuyến trekking có một phòng trao đổi độc lập giữa hướng dẫn viên, toàn bộ khách tham gia và kiểm lâm phụ trách địa bàn.
                </p>
              </div>
            )}
          </main>

          {/* ================= COLUMN 3: ROSTER DRAWER (Optional slide-over) ================= */}
          {rosterOpen && selectedTrip && (
            <aside className="w-80 bg-white border-l border-[#E2E8E4] flex flex-col shrink-0 h-[calc(100vh-70px)] z-20">
              <div className="p-4 border-b border-[#E9EFEC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4A6B5D]" />
                  <h3 className="text-xs font-bold text-[#2D3732] font-fraunces">
                    Danh Sách Đoàn Thực Địa
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRosterOpen(false)}
                  className="p-1 text-[#6B7A72] hover:text-[#2D3732] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. Ban Quản Lý */}
                <div>
                  <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider block mb-2 font-be-vietnam">
                    Ban Quản Lý & Kiểm Lâm
                  </span>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        {tripDetail?.bql?.name || 'BQL Bán Đảo Sơn Trà'}
                      </span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        Trực ban
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-700" />
                      Hotline: {tripDetail?.bql?.hotline || '0236.3.844.567'}
                    </div>
                  </div>
                </div>

                {/* 2. Hướng Dẫn Viên */}
                <div>
                  <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider block mb-2 font-be-vietnam">
                    Hướng Dẫn Viên Đoàn
                  </span>
                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900">
                        {tripDetail?.guide?.name || 'HDV Trưởng Đoàn'}
                      </span>
                      <span className="text-[9px] bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                        Phụ trách
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-800 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-teal-700" />
                      SĐT: {tripDetail?.guide?.phone || '0905.789.999'}
                    </div>
                  </div>
                </div>

                {/* 3. Khách tham gia */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                      Du Khách Tham Gia ({tripDetail?.customers?.length || 0})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {tripDetail?.customers && tripDetail.customers.length > 0 ? (
                      tripDetail.customers.map((cust) => (
                        <div
                          key={cust.id}
                          className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E2E8E4] flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-[#2D3732] block">
                              {cust.name}
                            </span>
                            <span className="text-[10px] text-[#6B7A72]">
                              Mã đơn: #{cust.order_code}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Đã xác nhận
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B7A72] italic">
                        Khách đoàn đặt trực tiếp tại quầy hoặc chưa đồng bộ danh sách.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

        </div>
      </div>
    </div>
  );
};

export default VendorInboxPage;

