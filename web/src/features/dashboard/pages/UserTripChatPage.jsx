import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Compass, 
  MapPin, 
  CalendarDays, 
  Users, 
  MessageSquare, 
  Search, 
  Info, 
  Plus, 
  Check, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  Phone, 
  Clock, 
  Send,
  AlertTriangle,
  RefreshCw,
  Radio,
  CheckCircle2,
  Ticket,
  ChevronRight,
  ArrowRight,
  X
} from 'lucide-react';
import { api } from '../../../lib/axios';
import { useUserEco } from '../../../context/UserEcoContext';

export const UserTripChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetTourId = searchParams.get('tour_id');
  const targetDate = searchParams.get('date');

  const { user } = useUserEco();
  const currentUserId = user?.id || null;
  const currentUserName = user?.name || user?.email?.split('@')[0] || 'Du Khách';

  // Trips & Messages state
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tripDetail, setTripDetail] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);

  // Search & Tab Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'today' | 'upcoming'

  // Input state
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch User's Booked Trips
  const fetchUserTrips = async (isInitial = false) => {
    if (isInitial) setLoadingTrips(true);
    try {
      const res = await api.get('/tours/inbox/trips/', {
        params: {
          customer_id: currentUserId,
          email: user?.email
        }
      });
      if (res.data && res.data.status === 'success') {
        const list = res.data.data || [];
        setTrips(list);

        if (list.length > 0) {
          // If query params specify tour_id & date, pick that trip
          if (targetTourId) {
            const matched = list.find(
              (t) => String(t.tour_id) === String(targetTourId) && (!targetDate || t.scheduled_date === targetDate)
            );
            if (matched) {
              setSelectedTrip(matched);
              return;
            }
          }
          if (!selectedTrip || isInitial) {
            setSelectedTrip(list[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user trip channels:', err);
    } finally {
      if (isInitial) setLoadingTrips(false);
    }
  };

  // 2. Fetch Messages for selected trip
  const fetchMessages = async (trip, showSpinner = false) => {
    if (!trip) return;
    if (showSpinner) setLoadingMessages(true);
    try {
      const res = await api.get('/tours/inbox/messages/', {
        params: {
          tour_id: trip.tour_id,
          date: trip.scheduled_date
        }
      });
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
    fetchUserTrips(true);
  }, [currentUserId]);

  useEffect(() => {
    if (selectedTrip) {
      fetchMessages(selectedTrip, true);
    }
  }, [selectedTrip]);

  // Polling every 5 seconds for live conversation
  useEffect(() => {
    if (!selectedTrip) return;
    const interval = setInterval(() => {
      fetchMessages(selectedTrip, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTrip]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Send Message from User
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedTrip || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistic UI append
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUserId || 9999,
      sender_name: currentUserName,
      sender_role: 'customer',
      sender_role_label: 'Du Khách',
      content: textToSend,
      message_type: 'text',
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
        message_type: 'text',
        sender_id: currentUserId
      };
      const res = await api.post('/tours/inbox/messages/', payload);
      if (res.data && res.data.status === 'success') {
        fetchMessages(selectedTrip, false);
        fetchUserTrips(false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleQuickSend = (text) => {
    setInputMessage(text);
  };

  const filteredTrips = trips.filter((t) => {
    const matchesSearch = t.tour_title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'today') return t.is_today;
    if (filterTab === 'upcoming') return !t.is_today;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 sm:-m-8 bg-[#F7F5F0]/30 overflow-hidden font-sans">
      
      {/* Top Breadcrumb & Status Bar */}
      <div className="px-6 py-3 bg-white border-b border-[#E2E8E4] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#6B7A72]">
          <Link to="/dashboard/trekking" className="hover:text-[#4A6B5D] transition-colors flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4A6B5D]" />
            Trekking An Toàn
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="font-bold text-[#2D3732] font-be-vietnam">
            Hộp Thư Điều Phối Chuyến Đi Thực Địa
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
            Trực thính BQL Kiểm Lâm & HDV 24/7
          </span>

          <button
            type="button"
            onClick={() => {
              fetchUserTrips(false);
              if (selectedTrip) fetchMessages(selectedTrip, true);
            }}
            title="Làm mới tin nhắn"
            className="p-1.5 rounded-xl border border-[#E2E8E4] hover:bg-[#F7F5F0] text-[#6B7A72] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= COLUMN 1: USER'S BOOKED TRIPS (330px) ================= */}
        <section className="w-full sm:w-[320px] md:w-[350px] bg-white border-r border-[#E2E8E4] flex flex-col shrink-0">
          
          {/* Header & Search */}
          <div className="p-4 border-b border-[#E9EFEC] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#2D3732] uppercase tracking-wider font-be-vietnam flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-[#4A6B5D]" />
                Chuyến Đi Của Bạn ({trips.length})
              </h2>
              <Link 
                to="/dashboard/trekking" 
                className="text-[11px] font-bold text-[#4A6B5D] hover:underline flex items-center gap-0.5"
              >
                Đặt thêm tour
              </Link>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
              <input
                type="text"
                placeholder="Tìm chuyến đi hoặc vé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F7F5F0] rounded-xl text-xs text-[#2D3732] placeholder-[#6B7A72] border border-[#E2E8E4] focus:outline-hidden focus:border-[#4A6B5D] transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-xl">
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

          {/* Trips List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E9EFEC]">
            {loadingTrips ? (
              <div className="p-8 text-center text-xs text-[#6B7A72]">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#4A6B5D]" />
                Đang tải các chuyến đi đã đặt...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center mx-auto">
                  <Ticket className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-[#2D3732]">Bạn chưa có vé chuyến đi nào</h4>
                <p className="text-[11px] text-[#6B7A72] max-w-xs mx-auto">
                  Đặt vé chuyến trekking để tự động tham gia phòng điều phối trực tuyến cùng HDV và Kiểm Lâm Sơn Trà.
                </p>
                <Link
                  to="/dashboard/trekking"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A6B5D] text-white text-xs font-bold rounded-xl hover:bg-[#3B5A45] transition-colors shadow-xs"
                >
                  <span>Khám phá Tour Trekking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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
                    {/* Thumbnail */}
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

                    {/* Info */}
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
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Đã xác nhận vé
                        </span>
                        <span className="text-[10px] font-medium text-[#6B7A72] flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-[#4A6B5D]" />
                          {trip.date_formatted}
                        </span>
                      </div>

                      {/* Last message snippet */}
                      <p className="text-[11px] text-[#6B7A72] truncate font-be-vietnam">
                        {trip.last_message ? (
                          <>
                            <span className="font-semibold text-[#2D3732]">
                              {trip.last_message.sender_name}:
                            </span>{' '}
                            {trip.last_message.content}
                          </>
                        ) : (
                          <span className="italic text-gray-400">Phòng chat đã sẵn sàng...</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ================= COLUMN 2: EXPEDITION CHAT ROOM (Flex-1) ================= */}
        <main className="flex-1 flex flex-col bg-[#F7F5F0]/30 overflow-hidden">
          {selectedTrip ? (
            <>
              {/* 1. Header */}
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
                          Chuyến đi hôm nay
                        </span>
                      )}
                    </div>

                    {/* Participant summary badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        BQL Kiểm Lâm Sơn Trà
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRosterOpen(!rosterOpen)}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8E4] bg-[#F7F5F0] hover:bg-white text-xs font-semibold text-[#2D3732] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    <span className="hidden sm:inline">Thông tin hỗ trợ đoàn</span>
                  </button>
                </div>
              </div>

              {/* 2. Pinned Ranger Advisory Banner */}
              <div className="px-6 py-2.5 bg-[#E9EFEC]/90 border-b border-[#DCE5DF] flex items-center justify-between text-xs text-[#2D3732] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#4A6B5D] shrink-0" />
                  <span className="font-semibold text-[#4A6B5D] text-[11px] truncate">
                    Đường dây nóng Kiểm Lâm & Cứu Hộ:
                  </span>
                  <span className="text-[11px] text-[#2D3732] truncate">
                    Hotline BQL: <strong>0236.3.844.567</strong> | Khẩn cấp: <strong>114 / 0905.123.456</strong>
                  </span>
                </div>
                <span className="text-[10px] text-[#6B7A72] hidden md:inline">
                  Không xả rác & không cho động vật rừng ăn
                </span>
              </div>

              {/* 3. Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-[#6B7A72]">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#4A6B5D]" />
                    Đang đồng bộ tin nhắn đoàn...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center text-[#4A6B5D] shadow-xs border border-[#E2E8E4]">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-[#2D3732] font-fraunces">
                      Phòng chat chuyến đi {selectedTrip.date_formatted}
                    </h4>
                    <p className="text-xs text-[#6B7A72] max-w-sm mx-auto">
                      Chào bạn! Đây là kênh liên lạc chính thức giữa bạn, các du khách cùng đoàn, Hướng Dẫn Viên và Kiểm Lâm Sơn Trà.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isBQL = msg.sender_role === 'bql';
                    const isGuide = msg.sender_role === 'guide';
                    const isAlert = msg.message_type === 'bql_alert';
                    const isGuideNote = msg.message_type === 'guide_note';
                    const isMe = msg.is_me || (currentUserId && msg.sender_id === currentUserId);

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-3xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 font-fraunces border ${
                            isBQL
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isGuide
                              ? 'bg-[#E9EFEC] text-[#4A6B5D] border-[#DCE5DF]'
                              : isMe
                              ? 'bg-[#4A6B5D] text-white border-[#3B5A45]'
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
                        <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                          
                          {/* Sender Info Line */}
                          <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                            <span className="font-bold text-[#2D3732]">
                              {isMe ? 'Bạn' : msg.sender_name}
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
                                : isMe
                                ? 'bg-[#4A6B5D] text-white rounded-tr-none'
                                : 'bg-white border border-[#E2E8E4] text-[#2D3732] rounded-tl-none'
                            }`}
                          >
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

              {/* 4. Quick Suggest Chips for Tourists */}
              <div className="px-6 py-2 bg-white/70 border-t border-[#E9EFEC] flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider shrink-0 font-be-vietnam">
                  Gợi ý nhanh:
                </span>
                {[
                  'Em đã có mặt tại điểm tập trung rồi ạ',
                  'Đoàn mình hiện đang dừng chân ở trạm nào rồi ạ?',
                  'Thời tiết hôm nay leo dốc có trơn không anh HDV?',
                  'Cảm ơn HDV và BQL, chuyến đi rất tuyệt vời!'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSend(chip)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4] text-[11px] text-[#2D3732] hover:bg-[#E9EFEC] hover:border-[#4A6B5D] transition-all shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* 5. Message Input Bar */}
              <div className="p-4 bg-white border-t border-[#E9EFEC] shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-2">
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
                        placeholder="Nhắn tin trao đổi với Hướng Dẫn Viên, Kiểm Lâm và bạn đồng hành... (Enter để gửi)"
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
                Chọn chuyến đi để vào phòng chat
              </h3>
              <p className="text-xs text-[#6B7A72] max-w-sm mt-1 font-be-vietnam">
                Khi bạn đặt chỗ tour trekking, hệ thống sẽ tự động cấp quyền vào phòng điều phối tương ứng với ngày khởi hành của bạn.
              </p>
            </div>
          )}
        </main>

        {/* ================= COLUMN 3: ROSTER / SUPPORT DRAWER ================= */}
        {rosterOpen && selectedTrip && (
          <aside className="w-80 bg-white border-l border-[#E2E8E4] flex flex-col shrink-0 z-20">
            <div className="p-4 border-b border-[#E9EFEC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4A6B5D]" />
                <h3 className="text-xs font-bold text-[#2D3732] font-fraunces">
                  Thông Tin Hỗ Trợ Chuyến Đi
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
              {/* Ban Quản Lý */}
              <div>
                <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider block mb-2 font-be-vietnam">
                  Kiểm Lâm Trực Ban
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

              {/* Hướng Dẫn Viên */}
              <div>
                <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider block mb-2 font-be-vietnam">
                  Hướng Dẫn Viên Phụ Trách
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

              {/* Thành viên đoàn */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                    Du Khách Cùng Đoàn ({tripDetail?.customers?.length || 0})
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
                            {cust.id === currentUserId ? `${cust.name} (Bạn)` : cust.name}
                          </span>
                          <span className="text-[10px] text-[#6B7A72]">
                            Mã vé: #{cust.order_code}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Đã xác nhận
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#6B7A72] italic">
                      Đoàn trekking đang đồng bộ thành viên.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
};

export default UserTripChatPage;
