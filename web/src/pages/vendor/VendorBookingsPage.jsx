import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar as CalendarIcon,
  Filter,
  Phone,
  Mail,
  Clock,
  CreditCard,
  AlertCircle,
  ShoppingBag,
  ListFilter,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import { api } from '../../lib/axios';
import NotificationBell from '../../components/notifications/NotificationBell';

export const VendorBookingsPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create_order'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Selected Booking Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Danh sách trải nghiệm có sẵn của Vendor để chọn khi đặt hàng
  const availableExperiences = [
    {
      id: 1,
      name: 'Trekking đỉnh Bàn Cờ - ngắm hoàng hôn',
      price: 450000,
      duration: '4.5 giờ',
      level: 'Trung bình',
      location: 'Bán đảo Sơn Trà',
      timeSlots: ['06:00 - 10:30', '14:30 - 18:30'],
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 2,
      name: 'Khám phá rừng cây đa ngàn năm Sơn Trà',
      price: 400000,
      duration: '3.5 giờ',
      level: 'Dễ',
      location: 'Rừng nguyên sinh Bãi Bắc',
      timeSlots: ['07:30 - 11:00', '13:30 - 17:00'],
      image: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 3,
      name: 'Chinh phục Mũi Nghê - đón bình minh sớm',
      price: 550000,
      duration: '5 giờ',
      level: 'Thử thách',
      location: 'Mũi Nghê - Ghềnh đá',
      timeSlots: ['05:00 - 09:30'],
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 4,
      name: 'Ghềnh Bàng - lặn biển ngắm san hô & nhặt rác',
      price: 350000,
      duration: '4 giờ',
      level: 'Trung bình',
      location: 'Bãi Ghềnh Bàng',
      timeSlots: ['08:00 - 12:00'],
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'
    }
  ];

  // Danh sách đơn đặt lấy trực tiếp từ Database
  const [bookings, setBookings] = useState([]);

  // Form State cho Đặt Hàng / Tạo Đơn Mới
  const [newOrder, setNewOrder] = useState({
    experience_id: 1,
    booking_date: '2026-09-21',
    time_slot: '06:00 - 10:30',
    adults_count: 2,
    children_count: 0,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pickup_location: '',
    payment_method: 'Chuyển khoản QR',
    payment_status: 'paid',
    special_notes: ''
  });

  // Tên thương hiệu đối tác
  const [brandName, setBrandName] = useState('Sơn Trà Trekking');

  useEffect(() => {
    const cached = localStorage.getItem('current_vendor_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.brand_name) setBrandName(parsed.brand_name);
      } catch (e) {
        console.warn(e);
      }
    }

    // Tải danh sách đơn từ PostgreSQL backend API
    const fetchBookings = async () => {
      try {
        const res = await api.get('/vendors/bookings/');
        if (res.data && res.data.status === 'success' && res.data.data?.bookings) {
          setBookings(res.data.data.bookings);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách đặt tour từ database:', err);
      }
    };
    fetchBookings();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng đối tác?')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('current_vendor_profile');
      navigate('/partner/login', { replace: true });
    }
  };

  // Cập nhật trạng thái đơn
  const handleUpdateStatus = async (bookingId, newStatus) => {
    const statusLabels = {
      confirmed: 'Đã xác nhận',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy'
    };

    try {
      await api.patch(`/vendors/bookings/${bookingId}/status/`, { status: newStatus });
    } catch (e) {
      console.log('Local status update fallback');
    }

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId || b.order_code === bookingId) {
          return {
            ...b,
            status: newStatus,
            status_label: statusLabels[newStatus] || newStatus,
            payment_status: newStatus === 'completed' ? 'paid' : b.payment_status,
            payment_status_label: newStatus === 'completed' ? 'Đã thanh toán' : b.payment_status_label
          };
        }
        return b;
      })
    );

    if (selectedBooking && (selectedBooking.id === bookingId || selectedBooking.order_code === bookingId)) {
      setSelectedBooking((prev) => ({
        ...prev,
        status: newStatus,
        status_label: statusLabels[newStatus] || newStatus
      }));
    }

    showToast(`Đã cập nhật đơn #${bookingId} thành "${statusLabels[newStatus]}"!`);
  };

  // Tính toán đơn giá và tổng tiền cho Form Tạo Đơn
  const selectedExp = availableExperiences.find((e) => e.id === Number(newOrder.experience_id)) || availableExperiences[0];
  const calculatedTotal = (newOrder.adults_count * selectedExp.price) + Math.round(newOrder.children_count * selectedExp.price * 0.7);

  // Xử lý nộp Form Đặt Hàng / Tạo Đơn Mới
  const handleCreateOrderSubmit = (e) => {
    e.preventDefault();
    if (!newOrder.customer_name.trim() || !newOrder.customer_phone.trim()) {
      alert('Vui lòng nhập họ tên và số điện thoại của khách hàng!');
      return;
    }

    const newCode = `BK${Math.floor(1025 + Math.random() * 8970)}`;
    const statusLabelMap = {
      waiting_confirmation: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      completed: 'Hoàn thành'
    };
    const paymentLabelMap = {
      paid: 'Đã thanh toán',
      deposit: 'Đã cọc 50%',
      unpaid: 'Chờ thanh toán'
    };

    const createdBooking = {
      id: newCode,
      order_code: newCode,
      customer_name: newOrder.customer_name,
      customer_phone: newOrder.customer_phone,
      customer_email: newOrder.customer_email || 'chua_cap_nhat@gmail.com',
      pickup_location: newOrder.pickup_location || 'Trung tâm Đà Nẵng',
      experience_name: selectedExp.name,
      booking_date: newOrder.booking_date,
      booking_date_formatted: newOrder.booking_date.split('-').reverse().join('/'),
      time_slot: newOrder.time_slot,
      adults_count: newOrder.adults_count,
      children_count: newOrder.children_count,
      guests_label: `${newOrder.adults_count} người lớn${newOrder.children_count > 0 ? `, ${newOrder.children_count} trẻ em` : ''}`,
      total_price: calculatedTotal,
      total_price_formatted: `${calculatedTotal.toLocaleString('vi-VN')} đ`,
      status: 'confirmed',
      status_label: 'Đã xác nhận',
      payment_status: newOrder.payment_status,
      payment_status_label: paymentLabelMap[newOrder.payment_status] || 'Đã thanh toán',
      payment_method: newOrder.payment_method,
      special_notes: newOrder.special_notes || 'Không có ghi chú thêm.',
      created_at: 'Vừa xong'
    };

    setBookings([createdBooking, ...bookings]);

    // Gửi lên backend API nếu backend sẵn sàng
    api.post('/vendors/bookings/create/', createdBooking).catch((err) => console.log('Backend sync skipped:', err));

    showToast(`Tạo đơn đặt tour #${newCode} cho khách ${newOrder.customer_name} thành công!`);
    
    // Reset form và chuyển về tab Danh Sách Đơn
    setNewOrder({
      experience_id: 1,
      booking_date: '2026-09-21',
      time_slot: '06:00 - 10:30',
      adults_count: 2,
      children_count: 0,
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      pickup_location: '',
      payment_method: 'Chuyển khoản QR',
      payment_status: 'paid',
      special_notes: ''
    });

    setActiveTab('list');
  };

  // Lọc danh sách đơn đặt theo Filter
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCode = b.order_code?.toLowerCase().includes(term);
      const matchName = b.customer_name?.toLowerCase().includes(term);
      const matchPhone = b.customer_phone?.toLowerCase().includes(term);
      const matchExp = b.experience_name?.toLowerCase().includes(term);
      if (!matchCode && !matchName && !matchPhone && !matchExp) return false;
    }
    if (selectedDate && b.booking_date !== selectedDate) return false;
    return true;
  });

  // Thống kê nhanh
  const stats = {
    total: bookings.length,
    waiting: bookings.filter((b) => b.status === 'waiting_confirmation').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    revenue: bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0)
  };

  // Cấu trúc Sidebar Menu chuẩn đồng bộ User
  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'Quản lý vận hành',
      items: [
        { id: 'experiences', label: 'Tour & tuyến GPS', icon: Compass, path: '/vendor/experiences' },
        { id: 'bookings', label: 'Đơn đặt', icon: CalendarDays, path: '/vendor/bookings' },
        { id: 'rewards', label: 'Ưu đãi Green Points', icon: Gift, path: '/vendor/dashboard' },
        { id: 'revenue', label: 'Doanh thu & đối soát', icon: TrendingUp, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'Tương tác & thiết lập',
      items: [
        { id: 'inbox', label: 'Hộp thư', icon: MessageSquare, path: '/vendor/inbox' },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings, path: '/vendor/dashboard' }
      ]
    }
  ];

  return (
    <div className="m3-app-page m3-portal-shell flex min-h-[100dvh] min-w-0 bg-white font-sans text-[#191C1A] relative overflow-x-clip">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#191C1A] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#2F5D4A] animate-fade-in font-be-vietnam text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= FIXED LEFT SIDEBAR (ĐỒNG BỘ 100% USER) ================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[248px] bg-[#F2F5F1] p-5 flex flex-col justify-between border-r border-[#C5CCC7] transition-transform duration-300 shrink-0 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/vendor/dashboard" className="flex items-center gap-2.5 no-underline">
              <img
                src={logoImg}
                alt="Logo Sơn Trà REloop"
                className="w-10 h-10 rounded-xl object-cover border border-[#C5CCC7]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <div className="flex flex-col">
                <span className="text-[#191C1A] text-base font-bold tracking-tight font-fraunces leading-tight">
                  Sơn Trà REloop
                </span>
                <span className="text-[10px] text-[#4A514C] font-semibold tracking-wide font-be-vietnam mt-0.5">
                  Cổng đối tác
                </span>
              </div>
            </Link>
            <button
              type="button"
              aria-label="Đóng menu đối tác"
              className="lg:hidden min-w-12 min-h-12 inline-flex items-center justify-center rounded-full text-[#4A514C] hover:text-[#191C1A] hover:bg-[#DCEBE3] border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-3">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.title && (
                  <p className="px-3.5 text-[10px] font-bold text-[#4A514C] tracking-wider mb-1 mt-2 font-be-vietnam">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const active = item.id === 'bookings'; // Trang hiện tại
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex min-h-12 items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-sm font-bold transition-all border-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 ${
                        active
                          ? "bg-[#DCEBE3] text-[#2F5D4A]"
                          : "text-[#4A514C] hover:bg-[#DCEBE3]/50 hover:text-[#191C1A]"
                      }`}
                    >
                      <IconComp className={`w-4 h-4 shrink-0 ${active ? "text-[#2F5D4A]" : "text-[#4A514C]"}`} />
                      <span className="flex-1 font-be-vietnam font-semibold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Logout item in sidebar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-12 items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-sm font-bold text-[#BA1A1A] hover:bg-rose-50 transition-all border-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
              >
                <LogOut className="w-4 h-4 shrink-0 text-[#BA1A1A]" />
                <span className="flex-1 font-be-vietnam font-semibold">Đăng xuất</span>
              </button>
            </div>
          </nav>
        </div>

        {/* User Profile Card at Bottom of Sidebar */}
        <div 
          onClick={() => {
            navigate('/vendor/dashboard');
            setSidebarOpen(false);
          }}
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#C5CCC7] hover:bg-[#DCEBE3]/40 shadow-xs mt-4"
        >
          <div className="w-9 h-9 bg-[#DCEBE3] group-hover:bg-[#2F5D4A] group-hover:text-white text-[#2F5D4A] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            {brandName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#191C1A] text-xs font-bold truncate font-fraunces">
              {brandName}
            </span>
            <span className="text-[#4A514C] text-[11px] font-be-vietnam truncate">
              Đối tác chính thức
            </span>
          </div>
          
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F2F5F1]/40 min-h-[100dvh]">
        
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#C5CCC7] bg-[#F2F5F1] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Mở menu đối tác"
              className="min-w-12 min-h-12 inline-flex items-center justify-center bg-white text-[#191C1A] rounded-full border border-[#C5CCC7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[#191C1A] text-base font-bold font-fraunces">
              Sơn Trà REloop
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#2F5D4A] text-white flex items-center justify-center font-bold text-xs font-fraunces">
            {brandName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Top Header Bar (Desktop & Tablet) */}
        <header className="hidden lg:flex h-[70px] bg-white border-b border-[#DCEBE3] px-6 sm:px-10 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-[#191C1A] text-lg sm:text-[20px] font-bold tracking-tight font-fraunces">
              Lịch và đơn đặt tour
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#DCEBE3] text-[#2F5D4A] text-xs font-bold px-3 py-1 rounded-full border border-[#C5CCC7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F5D4A]" />
              {stats.waiting > 0 ? `${stats.waiting} đơn chờ xác nhận` : 'Tất cả đã xử lý'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-40 sm:w-60">
              <input
                type="text"
                aria-label="Tìm đơn đặt tour"
                placeholder="Tìm mã đơn, tên, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-9 py-2 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] placeholder-[#4A514C] focus:outline-hidden focus:border-[#2F5D4A] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#4A514C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Notification Button */}
            <NotificationBell role="vendor" />

            {/* User Initials Avatar with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="Mở menu tài khoản đối tác"
                aria-expanded={userMenuOpen}
                className="w-12 h-12 rounded-full bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-sm font-bold font-fraunces flex items-center justify-center transition-colors cursor-pointer shadow-xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                title="Tài khoản đối tác"
              >
                {brandName.substring(0, 2).toUpperCase()}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#C5CCC7] py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-[#C5CCC7]">
                      <p className="text-xs font-bold text-[#191C1A] truncate font-fraunces">{brandName}</p>
                      <p className="text-[11px] text-[#4A514C] font-be-vietnam truncate">Đối tác chính thức</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/vendor/dashboard');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#191C1A] hover:bg-[#DCEBE3]/50 flex items-center gap-2.5 cursor-pointer font-be-vietnam"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#4A514C]" />
                      <span>Xem bảng điều khiển</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#BA1A1A] hover:bg-rose-50 flex items-center gap-2.5 font-bold cursor-pointer font-be-vietnam"
                    >
                      <LogOut className="w-4 h-4 text-[#BA1A1A]" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 sm:p-10 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* Header Switcher: 2 Chế độ chính */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-[#C5CCC7] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2F5D4A]" />
                <span className="text-xs font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                  Quản lý kinh doanh đối tác
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-fraunces text-[#191C1A] tracking-tight mt-1">
                Lịch khởi hành và đơn đặt tour
              </h2>
            </div>

            {/* TAB SELECTOR: Danh Sách Đơn vs Giao Diện Đặt Hàng */}
            <div className="flex items-center gap-2 bg-[#F2F5F1] p-1.5 rounded-2xl border border-[#C5CCC7] w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-[#2F5D4A] !text-white shadow-xs'
                    : 'text-[#4A514C] hover:text-[#191C1A]'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Xem đơn &amp; lịch trình ({bookings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create_order')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'create_order'
                    ? 'bg-[#2F5D4A] !text-white shadow-xs'
                    : 'text-[#4A514C] hover:text-[#191C1A]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Tạo đơn hàng mới</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DANH SÁCH ĐƠN ĐẶT & LỊCH TRÌNH                                     */}
          {/* ========================================================================= */}
          {activeTab === 'list' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 4 Thẻ KPI tóm tắt */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                    Tổng số đơn
                  </span>
                  <p className="text-2xl font-bold font-fraunces text-[#191C1A]">{stats.total}</p>
                  <p className="text-xs text-[#4A514C] font-be-vietnam">Tất cả lịch đặt tour</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 tracking-wider font-be-vietnam">
                    Chờ xác nhận
                  </span>
                  <p className="text-2xl font-bold font-fraunces text-amber-700">{stats.waiting}</p>
                  <p className="text-xs text-[#4A514C] font-be-vietnam">Cần xử lý phê duyệt</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-[#2F5D4A] tracking-wider font-be-vietnam">
                    Đã xác nhận
                  </span>
                  <p className="text-2xl font-bold font-fraunces text-[#2F5D4A]">{stats.confirmed}</p>
                  <p className="text-xs text-[#4A514C] font-be-vietnam">Sẵn sàng khởi hành</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                    Doanh thu ước tính
                  </span>
                  <p className="text-2xl font-bold font-fraunces text-[#191C1A]">
                    {stats.revenue.toLocaleString('vi-VN')} đ
                  </p>
                  <p className="text-xs text-emerald-600 font-be-vietnam">Từ các đơn hiệu lực</p>
                </div>
              </div>

              {/* Bộ lọc thanh công cụ */}
              <div className="bg-white p-5 rounded-3xl border border-[#C5CCC7] shadow-xs flex flex-wrap items-center justify-between gap-4">
                
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-xs font-bold text-[#4A514C] mr-1 flex items-center gap-1 font-be-vietnam">
                    <Filter className="w-3.5 h-3.5" /> Lọc:
                  </span>
                  {[
                    { id: 'all', label: `Tất cả (${bookings.length})` },
                    { id: 'waiting_confirmation', label: `Chờ duyệt (${stats.waiting})` },
                    { id: 'confirmed', label: `Đã xác nhận (${stats.confirmed})` },
                    { id: 'completed', label: `Hoàn thành (${stats.completed})` },
                    { id: 'cancelled', label: 'Đã hủy' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-[#2F5D4A] !text-white font-bold shadow-xs'
                          : 'bg-[#F2F5F1] text-[#4A514C] hover:bg-[#DCEBE3] hover:text-[#191C1A]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filter by Date & View switch */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-[#F2F5F1] px-3 py-1.5 rounded-xl border border-[#C5CCC7] text-xs">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#4A514C]" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs text-[#191C1A] focus:outline-hidden cursor-pointer"
                    />
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate('')}
                        aria-label="Xóa bộ lọc ngày"
                        className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-sm ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Nút View Switcher: Bảng / Lịch Timeline */}
                  <div className="flex items-center bg-[#F2F5F1] p-1 rounded-xl border border-[#C5CCC7] text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        viewMode === 'table' ? 'bg-white shadow-xs text-[#2F5D4A]' : 'text-[#4A514C]'
                      }`}
                    >
                      Dạng bảng
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        viewMode === 'calendar' ? 'bg-white shadow-xs text-[#2F5D4A]' : 'text-[#4A514C]'
                      }`}
                    >
                      Lịch khởi hành
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: DẠNG BẢNG DANH SÁCH ĐƠN ĐẶT */}
              {viewMode === 'table' ? (
                <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                        Danh sách đơn đặt ({filteredBookings.length})
                      </h3>
                      <p className="text-xs text-[#4A514C] font-be-vietnam">
                        Nhấn vào từng đơn để xem chi tiết hoặc thay đổi trạng thái
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('create_order')}
                      className="bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-0"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Đặt tour mới</span>
                    </button>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <CalendarDays className="w-12 h-12 text-gray-300 mx-auto" />
                      <p className="text-sm font-bold text-[#191C1A] font-fraunces">Không tìm thấy đơn đặt nào phù hợp</p>
                      <p className="text-xs text-[#4A514C]">Thử điều chỉnh lại bộ lọc hoặc tạo đơn đặt mới.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] font-bold text-[#4A514C] font-be-vietnam tracking-wider border-b border-[#C5CCC7]">
                          <tr>
                            <th className="pb-3.5">Mã đơn</th>
                            <th className="pb-3.5">Khách hàng</th>
                            <th className="pb-3.5">Trải nghiệm trekking</th>
                            <th className="pb-3.5">Ngày &amp; giờ khởi hành</th>
                            <th className="pb-3.5">Số khách</th>
                            <th className="pb-3.5">Tổng tiền</th>
                            <th className="pb-3.5">Trạng thái</th>
                            <th className="pb-3.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#C5CCC7]/60 font-be-vietnam">
                          {filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-[#F2F5F1]/60 transition-colors">
                              <td className="py-4 font-mono font-bold text-[#2F5D4A]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{b.order_code}</span>
                                  {b.is_flash_sale && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200">
                                      Flash sale
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#191C1A] font-fraunces text-[13px]">
                                    {b.customer_name}
                                  </span>
                                  <span className="text-[11px] text-[#4A514C] flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-[#2F5D4A]" /> {b.customer_phone}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className="text-[#191C1A] font-semibold block line-clamp-1 max-w-[200px]">
                                  {b.experience_name}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#191C1A]">{b.booking_date_formatted || b.booking_date}</span>
                                  <span className="text-[11px] text-[#4A514C]">{b.time_slot}</span>
                                </div>
                              </td>
                              <td className="py-4 text-[#4A514C]">
                                {b.guests_label}
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#191C1A] text-sm">
                                    {b.total_price_formatted}
                                  </span>
                                  <span className={`text-[10px] font-semibold ${
                                    b.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                  }`}>
                                    {b.payment_status_label}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${
                                  b.status === 'confirmed'
                                    ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#C5CCC7]'
                                    : b.status === 'completed'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : b.status === 'waiting_confirmation'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {b.status_label}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Xem chi tiết */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBooking(b)}
                                    className="p-1.5 rounded-xl border border-[#C5CCC7] bg-white text-[#191C1A] hover:bg-[#F2F5F1] transition-colors cursor-pointer"
                                    title="Xem chi tiết đơn"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#2F5D4A]" />
                                  </button>

                                  {/* Xác nhận nhanh cho đơn chờ duyệt */}
                                  {b.status === 'waiting_confirmation' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                                      className="px-2.5 py-1 rounded-xl bg-[#2F5D4A] text-white hover:bg-[#254B3C] font-bold text-[11px] transition-colors cursor-pointer"
                                    >
                                      Xác nhận
                                    </button>
                                  )}

                                  {/* Hoàn thành nhanh cho đơn đã xác nhận */}
                                  {b.status === 'confirmed' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(b.id, 'completed')}
                                      className="px-2.5 py-1 rounded-xl bg-[#DCEBE3] text-[#2F5D4A] hover:bg-[#C5CCC7] font-bold text-[11px] transition-colors cursor-pointer border border-[#C5CCC7]"
                                    >
                                      Hoàn thành
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* View 2: DẠNG LỊCH KHỞI HÀNH (TIMELINE / CALENDAR) */
                <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
                  <div>
                    <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                      Lịch trình khởi hành các chuyến trekking
                    </h3>
                    <p className="text-xs text-[#4A514C] font-be-vietnam">
                      Theo dõi lịch trình các đoàn khách trekking Sơn Trà theo từng ngày
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="p-5 rounded-3xl border border-[#C5CCC7] bg-[#F2F5F1]/50 hover:bg-white hover:shadow-md transition-all cursor-pointer space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-[#2F5D4A]">
                              {b.order_code}
                            </span>
                            {b.is_flash_sale && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200">
                                Flash sale
                              </span>
                            )}
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === 'confirmed'
                              ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#C5CCC7]'
                              : b.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {b.status_label}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold font-fraunces text-sm text-[#191C1A] line-clamp-1">
                            {b.experience_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#4A514C] mt-1 font-be-vietnam">
                            <Clock className="w-3.5 h-3.5 text-[#2F5D4A]" />
                            <span>{b.booking_date_formatted || b.booking_date} ({b.time_slot})</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#C5CCC7] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[#4A514C] block text-[10px]">Đoàn khách:</span>
                            <span className="font-bold text-[#191C1A]">{b.customer_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#4A514C] block text-[10px]">Quy mô:</span>
                            <span className="font-bold text-[#2F5D4A]">{b.guests_label}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GIAO DIỆN ĐẶT HÀNG / TẠO ĐƠN MỚI CHO VENDOR                        */}
          {/* ========================================================================= */}
          {activeTab === 'create_order' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#C5CCC7] shadow-xs">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C5CCC7]">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold font-fraunces text-[#191C1A]">
                      Giao diện đặt tour mới cho khách
                    </h3>
                    <p className="text-xs text-[#4A514C] font-be-vietnam mt-0.5">
                      Dành cho nhân viên đối tác tạo đơn đặt chỗ trực tiếp khi khách gọi hotline, nhắn tin fanpage hoặc đặt tại quầy.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="text-xs font-bold text-[#4A514C] hover:text-[#191C1A] flex items-center gap-1 cursor-pointer"
                  >
                    ← Quay lại danh sách đơn
                  </button>
                </div>

                <form onSubmit={handleCreateOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* CỘT TRÁI: FORM NHẬP THÔNG TIN (8 CỘT) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* BƯỚC 1: CHỌN TRẢI NGHIỆM TREKKING */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-[#2F5D4A]" /> 1. Chọn trải nghiệm trekking
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableExperiences.map((exp) => (
                          <div
                            key={exp.id}
                            onClick={() => {
                              setNewOrder({
                                ...newOrder,
                                experience_id: exp.id,
                                time_slot: exp.timeSlots[0]
                              });
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              Number(newOrder.experience_id) === exp.id
                                ? 'bg-[#DCEBE3] border-[#2F5D4A] ring-2 ring-[#2F5D4A]/20 shadow-xs'
                                : 'bg-[#F2F5F1]/60 border-[#C5CCC7] hover:bg-[#F2F5F1]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold font-fraunces text-xs text-[#191C1A] leading-tight">
                                {exp.name}
                              </span>
                              {Number(newOrder.experience_id) === exp.id && (
                                <CheckCircle className="w-4 h-4 text-[#2F5D4A] shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#4A514C]">
                              <span>{exp.duration} • {exp.level}</span>
                              <span className="font-bold text-[#2F5D4A]">{exp.price.toLocaleString('vi-VN')} đ/khách</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BƯỚC 2: CHỌN NGÀY & KHUNG GIỜ KHỞI HÀNH */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-[#2F5D4A]" /> 2. Ngày khởi hành
                        </label>
                        <input
                          type="date"
                          required
                          value={newOrder.booking_date}
                          onChange={(e) => setNewOrder({ ...newOrder, booking_date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#2F5D4A]" /> Khung giờ đón khách
                        </label>
                        <select
                          value={newOrder.time_slot}
                          onChange={(e) => setNewOrder({ ...newOrder, time_slot: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                        >
                          {selectedExp.timeSlots.map((slot, idx) => (
                            <option key={idx} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* BƯỚC 3: SỐ LƯỢNG KHÁCH */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#2F5D4A]" /> 3. Số lượng khách tham gia
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-2xl border border-[#C5CCC7] bg-[#F2F5F1]/60 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#191C1A] block font-be-vietnam">Người lớn</span>
                            <span className="text-[11px] text-[#4A514C]">Từ 12 tuổi trở lên</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, adults_count: Math.max(1, newOrder.adults_count - 1) })}
                            aria-label="Giảm số người lớn"
                            className="w-11 h-11 rounded-full bg-white border border-[#C5CCC7] text-[#191C1A] font-bold text-base flex items-center justify-center cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm text-[#191C1A] w-4 text-center">{newOrder.adults_count}</span>
                            <button
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, adults_count: newOrder.adults_count + 1 })}
                            aria-label="Tăng số người lớn"
                            className="w-11 h-11 rounded-full bg-white border border-[#C5CCC7] text-[#191C1A] font-bold text-base flex items-center justify-center cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl border border-[#C5CCC7] bg-[#F2F5F1]/60 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#191C1A] block font-be-vietnam">Trẻ em</span>
                            <span className="text-[11px] text-[#4A514C]">Giảm 30% vé</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, children_count: Math.max(0, newOrder.children_count - 1) })}
                            aria-label="Giảm số trẻ em"
                            className="w-11 h-11 rounded-full bg-white border border-[#C5CCC7] text-[#191C1A] font-bold text-base flex items-center justify-center cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm text-[#191C1A] w-4 text-center">{newOrder.children_count}</span>
                            <button
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, children_count: newOrder.children_count + 1 })}
                            aria-label="Tăng số trẻ em"
                            className="w-11 h-11 rounded-full bg-white border border-[#C5CCC7] text-[#191C1A] font-bold text-base flex items-center justify-center cursor-pointer hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BƯỚC 4: THÔNG TIN KHÁCH HÀNG */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-[#2F5D4A]" /> 4. Thông tin liên hệ khách hàng
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Họ và tên khách đại diện *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: Nguyễn Văn An"
                            value={newOrder.customer_name}
                            onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Số điện thoại liên hệ *</label>
                          <input
                            type="tel"
                            required
                            placeholder="09xx xxx xxx"
                            value={newOrder.customer_phone}
                            onChange={(e) => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Địa chỉ / Điểm hẹn đón</label>
                          <input
                            type="text"
                            placeholder="Khách sạn hoặc điểm đón tại Đà Nẵng"
                            value={newOrder.pickup_location}
                            onChange={(e) => setNewOrder({ ...newOrder, pickup_location: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Email gửi hóa đơn &amp; vé</label>
                          <input
                            type="email"
                            placeholder="khachhang@gmail.com"
                            value={newOrder.customer_email}
                            onChange={(e) => setNewOrder({ ...newOrder, customer_email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#4A514C] block mb-1">Yêu cầu đặc biệt / Ghi chú</label>
                        <textarea
                          rows={2}
                          placeholder="Ví dụ: Có người ăn chay, người say xe, mượn gậy trekking..."
                          value={newOrder.special_notes}
                          onChange={(e) => setNewOrder({ ...newOrder, special_notes: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                        />
                      </div>
                    </div>

                    {/* BƯỚC 5: PHƯƠNG THỨC THANH TOÁN */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[#191C1A] tracking-wider font-be-vietnam flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#2F5D4A]" /> 5. Hình thức thanh toán
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Phương thức</label>
                          <select
                            value={newOrder.payment_method}
                            onChange={(e) => setNewOrder({ ...newOrder, payment_method: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          >
                            <option value="Chuyển khoản QR">Chuyển khoản QR ngân hàng</option>
                            <option value="Tiền mặt tại quầy">Tiền mặt tại quầy đối tác</option>
                            <option value="Tiền mặt khi đón">Thu tiền mặt khi đón khách</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-[#4A514C] block mb-1">Tình trạng thanh toán</label>
                          <select
                            value={newOrder.payment_status}
                            onChange={(e) => setNewOrder({ ...newOrder, payment_status: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] focus:outline-hidden focus:border-[#2F5D4A]"
                          >
                            <option value="paid">Đã thanh toán đủ 100%</option>
                            <option value="deposit">Đã đặt cọc trước 50%</option>
                            <option value="unpaid">Chưa thanh toán (Thu sau)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* CỘT PHẢI: TÓM TẮT ĐƠN ĐẶT HÀNG (4 CỘT) */}
                  <div className="lg:col-span-5">
                    <div className="sticky top-24 p-6 rounded-3xl bg-[#F2F5F1] border border-[#C5CCC7] space-y-5">
                      <h4 className="font-bold font-fraunces text-base text-[#191C1A] pb-3 border-b border-[#C5CCC7]">
                        Tóm tắt đơn đặt tour
                      </h4>

                      {/* Chi tiết tour */}
                      <div className="space-y-3 text-xs font-be-vietnam">
                        <div>
                          <span className="text-[11px] text-[#4A514C] block">Trải nghiệm:</span>
                          <span className="font-bold text-[#191C1A] font-fraunces text-sm">
                            {selectedExp.name}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#4A514C]">Ngày khởi hành:</span>
                          <span className="font-bold text-[#191C1A]">{newOrder.booking_date}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#4A514C]">Khung giờ:</span>
                          <span className="font-bold text-[#191C1A]">{newOrder.time_slot}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-[#4A514C]">Số lượng khách:</span>
                          <span className="font-bold text-[#2F5D4A]">
                            {newOrder.adults_count} lớn{newOrder.children_count > 0 ? `, ${newOrder.children_count} trẻ em` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Bảng chiết tính giá tiền */}
                      <div className="pt-3 border-t border-[#C5CCC7] space-y-2 text-xs font-be-vietnam">
                        <div className="flex justify-between text-[#4A514C]">
                          <span>Vé người lớn ({newOrder.adults_count} x {selectedExp.price.toLocaleString('vi-VN')}đ):</span>
                          <span>{(newOrder.adults_count * selectedExp.price).toLocaleString('vi-VN')} đ</span>
                        </div>

                        {newOrder.children_count > 0 && (
                          <div className="flex justify-between text-[#4A514C]">
                            <span>Vé trẻ em ({newOrder.children_count} x {Math.round(selectedExp.price * 0.7).toLocaleString('vi-VN')}đ):</span>
                            <span>{(Math.round(newOrder.children_count * selectedExp.price * 0.7)).toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}

                        <div className="flex justify-between text-[#4A514C]">
                          <span>Bảo hiểm &amp; Phí môi trường:</span>
                          <span className="text-emerald-700 font-semibold">Đã bao gồm</span>
                        </div>

                        <div className="pt-3 border-t border-[#C5CCC7] flex justify-between items-baseline">
                          <span className="font-bold text-[#191C1A] text-sm font-fraunces">Tổng cộng:</span>
                          <span className="font-bold text-xl text-[#2F5D4A] font-fraunces">
                            {calculatedTotal.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {/* Nút xác nhận đặt hàng */}
                      <button
                        type="submit"
                        className="w-full py-3.5 px-4 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                      >
                        <Check className="w-5 h-5 text-white" />
                        <span className="!text-white">Xác nhận và tạo đơn đặt</span>
                      </button>

                      <p className="text-[11px] text-center text-[#4A514C] font-be-vietnam">
                        Đơn đặt sẽ được kích hoạt ngay và thêm vào danh sách quản lý tour.
                      </p>
                    </div>
                  </div>

                </form>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POPUP CHI TIẾT ĐƠN ĐẶT                                              */}
      {/* ========================================================================= */}
      {selectedBooking && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt tour" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#C5CCC7] space-y-6 max-h-[90vh] overflow-y-auto font-be-vietnam motion-modal-enter">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#C5CCC7]">
              <div>
                <span className="text-[10px] font-bold text-[#4A514C] tracking-wider">
                  Chi tiết đơn đặt tour
                </span>
                <h3 className="text-xl font-bold font-fraunces text-[#191C1A] mt-0.5">
                  Đơn #{selectedBooking.order_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label="Đóng chi tiết đơn đặt tour"
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
              >
                ✕
              </button>
            </div>

            {/* Thông tin chuyến đi */}
            <div className="p-4 rounded-2xl bg-[#F2F5F1] space-y-2 text-xs">
              <span className="text-[10px] font-bold text-[#2F5D4A] tracking-wider block">
                Trải nghiệm trekking
              </span>
              <p className="font-bold font-fraunces text-base text-[#191C1A]">
                {selectedBooking.experience_name}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C5CCC7] text-[#4A514C]">
                <div>
                  <span className="block text-[10px]">Ngày khởi hành:</span>
                  <span className="font-bold text-[#191C1A]">{selectedBooking.booking_date_formatted || selectedBooking.booking_date}</span>
                </div>
                <div>
                  <span className="block text-[10px]">Khung giờ đón:</span>
                  <span className="font-bold text-[#191C1A]">{selectedBooking.time_slot}</span>
                </div>
              </div>
            </div>

            {/* Thông tin khách hàng & Điểm đón */}
            <div className="space-y-3 text-xs">
              <span className="text-[11px] font-bold text-[#191C1A] tracking-wider block font-be-vietnam">
                Thông tin khách hàng
              </span>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl border border-[#C5CCC7]">
                <div>
                  <span className="text-[#4A514C] block text-[10px]">Tên khách:</span>
                  <span className="font-bold text-[#191C1A] text-sm font-fraunces">{selectedBooking.customer_name}</span>
                </div>
                <div>
                  <span className="text-[#4A514C] block text-[10px]">Số điện thoại:</span>
                  <span className="font-bold text-[#2F5D4A]">{selectedBooking.customer_phone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#4A514C] block text-[10px]">Điểm đón tại Đà Nẵng:</span>
                  <span className="font-semibold text-[#191C1A]">{selectedBooking.pickup_location}</span>
                </div>
                {selectedBooking.special_notes && (
                  <div className="col-span-2 pt-2 border-t border-[#C5CCC7]">
                    <span className="text-[#4A514C] block text-[10px]">Ghi chú của khách:</span>
                    <span className="italic text-[#191C1A]">{selectedBooking.special_notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thanh toán & Tổng tiền */}
            <div className="p-4 rounded-2xl border border-[#C5CCC7] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs text-[#4A514C] block">Tổng thanh toán:</span>
                <span className="text-xl font-bold font-fraunces text-[#2F5D4A]">
                  {selectedBooking.total_price_formatted}
                </span>
                <span className="text-[11px] text-[#4A514C] block mt-0.5">
                  {selectedBooking.payment_method} • {selectedBooking.payment_status_label}
                </span>
              </div>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedBooking.status === 'confirmed'
                    ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#C5CCC7]'
                    : selectedBooking.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedBooking.status_label}
                </span>
              </div>
            </div>

            {/* Hành động đổi trạng thái */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {selectedBooking.status === 'waiting_confirmation' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                  className="px-4 py-2.5 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Xác nhận đơn ngay
                </button>
              )}

              {selectedBooking.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                  className="px-4 py-2.5 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] hover:bg-[#C5CCC7] font-bold text-xs transition-colors cursor-pointer border border-[#C5CCC7]"
                >
                  Đánh dấu hoàn thành tour
                </button>
              )}

              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn hủy đơn #${selectedBooking.order_code}?`)) {
                      handleUpdateStatus(selectedBooking.id, 'cancelled');
                    }
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy đơn này
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default VendorBookingsPage;

