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
  CheckCircle2
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import { api } from '../../lib/axios';

export const VendorDashboardPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activePeriod, setActivePeriod] = useState('3 tháng');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Đối Tác?')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('current_vendor_profile');
      navigate('/partner/login', { replace: true });
    }
  };

  // Dữ liệu mẫu chuẩn 100% theo bản vẽ Figma
  const defaultDashboardData = {
    vendor_info: {
      brand_name: 'Sơn Trà Trekking',
      status: 'verified',
      status_label: 'Đối tác đã xác minh',
      avatar_text: 'ST'
    },
    metrics: {
      total_revenue: '18.500.000 đ',
      total_revenue_growth: '12.5%',
      monthly_revenue: '7.250.000 đ',
      monthly_revenue_growth: '8.2%',
      total_bookings: '128',
      monthly_bookings_diff: '+18 tháng này',
      avg_rating: '4.8 / 5',
      total_reviews: '112 đánh giá'
    },
    revenue_chart: [
      { month: 'Th06', value: 3.2 },
      { month: 'Th07', value: 4.8 },
      { month: 'Th08', value: 5.4 },
      { month: 'Th09', value: 7.25 }
    ],
    booking_overview: {
      confirmed: 42,
      completed: 112,
      cancelled: 8
    },
    experience_performance: [
      {
        id: 1,
        name: 'Trekking Đỉnh Bàn Cờ - Ngắm hoàng hôn',
        bookings_count: 58,
        revenue: '8.700.000 đ',
        rating: '4.9 ★ (48)',
        status_label: 'Đang mở'
      },
      {
        id: 2,
        name: 'Khám phá Rừng Cây Đa ngàn năm Sơn Trà',
        bookings_count: 42,
        revenue: '5.460.000 đ',
        rating: '4.8 ★ (35)',
        status_label: 'Đang mở'
      },
      {
        id: 3,
        name: 'Chinh phục Mũi Nghê - Đón bình minh sớm',
        bookings_count: 28,
        revenue: '4.340.000 đ',
        rating: '4.7 ★ (29)',
        status_label: 'Đang mở'
      }
    ],
    recent_bookings: [
      {
        id: 'BK1024',
        tour_id: '#BK1024',
        customer_name: 'Nguyễn Minh',
        experience_name: 'Bãi Bắc - Cây Đa',
        booking_date: '18/09/2026',
        guests_label: '2 khách',
        total_price: '450.000 đ',
        status_label: 'Xác nhận'
      },
      {
        id: 'BK1023',
        tour_id: '#BK1023',
        customer_name: 'Lê Hoàng Nam',
        experience_name: 'Đỉnh Bàn Cờ Hoàng Hôn',
        booking_date: '17/09/2026',
        guests_label: '4 khách',
        total_price: '1.200.000 đ',
        status_label: 'Hoàn thành'
      },
      {
        id: 'BK1022',
        tour_id: '#BK1022',
        customer_name: 'Trần Thu Thảo',
        experience_name: 'Mũi Nghê Đón Bình Minh',
        booking_date: '17/09/2026',
        guests_label: '1 khách',
        total_price: '350.000 đ',
        status_label: 'Xác nhận'
      }
    ]
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/vendors/dashboard/', { timeout: 2500 });
        if (res.data && res.data.status === 'success' && res.data.data) {
          const d = res.data.data;
          setDashboardData({
            vendor_info: d.vendor_info,
            metrics: {
              total_revenue: d.metrics?.total_revenue_formatted || '18.500.000 đ',
              total_revenue_growth: `${d.metrics?.total_revenue_growth || 12.5}%`,
              monthly_revenue: d.metrics?.monthly_revenue_formatted || '7.250.000 đ',
              monthly_revenue_growth: `${d.metrics?.monthly_revenue_growth || 8.2}%`,
              total_bookings: String(d.metrics?.total_bookings || 128),
              monthly_bookings_diff: `+${d.metrics?.monthly_bookings_diff || 18} tháng này`,
              avg_rating: `${d.metrics?.avg_rating || 4.8} / 5`,
              total_reviews: `${d.metrics?.total_reviews || 112} đánh giá`
            },
            revenue_chart: d.revenue_chart?.data || defaultDashboardData.revenue_chart,
            booking_overview: d.booking_overview || defaultDashboardData.booking_overview,
            experience_performance: d.experience_performance || defaultDashboardData.experience_performance,
            recent_bookings: d.recent_bookings || defaultDashboardData.recent_bookings
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Backend dashboard API fallback to local mock data:', err);
      }

      // Đọc thông tin tên đối tác từ profile lưu tại local (nếu vừa đăng nhập)
      const cached = localStorage.getItem('current_vendor_profile');
      let brandName = 'Sơn Trà Trekking';
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.brand_name) brandName = parsed.brand_name;
        } catch (e) {
          console.warn(e);
        }
      }

      setDashboardData({
        ...defaultDashboardData,
        vendor_info: {
          ...defaultDashboardData.vendor_info,
          brand_name: brandName
        }
      });
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const data = dashboardData || defaultDashboardData;

  // Cấu trúc Sidebar Menu chuẩn theo layout Sơn Trà REloop
  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard }
      ]
    },
    {
      title: 'KINH DOANH',
      items: [
        { id: 'experiences', label: 'Trải nghiệm', icon: Compass },
        { id: 'routes', label: 'Tuyến & GPS', icon: MapPin },
        { id: 'bookings', label: 'Lịch & Đơn đặt', icon: CalendarDays },
        { id: 'customers', label: 'Khách hàng', icon: Users },
        { id: 'rewards', label: 'Ưu đãi & Đổi rác', icon: Gift }
      ]
    },
    {
      title: 'PHÂN TÍCH',
      items: [
        { id: 'revenue', label: 'Báo cáo doanh thu', icon: TrendingUp }
      ]
    },
    {
      title: 'GIAO TIẾP & TÀI KHOẢN',
      items: [
        { id: 'chat', label: 'Trò chuyện & Hỗ trợ', icon: MessageSquare },
        { id: 'notifications', label: 'Thông báo', icon: Bell },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#2D3732] relative">
      
      {/* Mobile Sidebar Overlay (Y chang UserDashboardLayout) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= FIXED LEFT SIDEBAR (CHUẨN LAYOUT BÊN USER) ================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[248px] bg-[#F7F5F0] p-5 flex flex-col justify-between border-r border-[#E2E8E4] transition-transform duration-300 shrink-0 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/vendor/dashboard" className="flex items-center gap-2.5 no-underline">
              <img
                src={logoImg}
                alt="Sơn Trà REloop Logo"
                className="w-10 h-10 rounded-xl object-cover border border-[#E2E8E4]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <div className="flex flex-col">
                <span className="text-[#2D3732] text-base font-bold tracking-tight font-fraunces leading-tight">
                  Sơn Trà REloop
                </span>
                <span className="text-[10px] text-[#6B7A72] font-semibold tracking-wide uppercase font-be-vietnam mt-0.5">
                  Vendor Portal
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items (Cách đặt và màu sắc y chang User) */}
          <nav className="flex flex-col gap-3">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.title && (
                  <p className="px-3.5 text-[10px] uppercase font-bold text-[#86928b] tracking-wider mb-1 mt-2 font-be-vietnam">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'bookings') {
                          navigate('/vendor/bookings');
                        } else if (item.id === 'experiences') {
                          navigate('/vendor/experiences');
                        } else {
                          setActiveMenu(item.id);
                        }
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

            {/* Logout item in sidebar */}
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

        {/* User Profile Card at Bottom of Sidebar (Y chang UserDashboardLayout) */}
        <div 
          onClick={() => {
            setActiveMenu('profile');
            setSidebarOpen(false);
          }}
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#E2E8E4] hover:bg-[#E9EFEC]/40 shadow-xs mt-4"
        >
          <div className="w-9 h-9 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            {data.vendor_info.avatar_text || 'ST'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-bold truncate font-fraunces">
              {data.vendor_info.brand_name}
            </span>
            <span className="text-[#6B7A72] text-[11px] font-be-vietnam truncate">
              {data.vendor_info.status_label || 'Đối tác chính thức'}
            </span>
          </div>
          <button
            type="button"
            title="Đăng xuất khỏi Cổng Đối Tác"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="text-[#6B7A72] hover:text-[#B8442C] p-1.5 transition-colors border-0 bg-transparent cursor-pointer rounded-lg hover:bg-rose-50 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f7f5f0]/40 min-h-screen">
        
        {/* Mobile Header Bar with Hamburger Menu (Y chang User) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#E2E8E4] bg-[#F7F5F0] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-2 bg-white text-[#2D3732] rounded-xl border border-[#E2E8E4] cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[#2D3732] text-base font-bold font-fraunces">
              Sơn Trà REloop
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#4A6B5D] text-white flex items-center justify-center font-bold text-xs font-fraunces">
            {data.vendor_info.avatar_text || 'ST'}
          </div>
        </div>

        {/* Top Header Bar (Desktop & Tablet) */}
        <header className="h-[70px] bg-white border-b border-[#E9EFEC] px-6 sm:px-10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-[#2D3732] text-lg sm:text-[20px] font-bold tracking-tight font-fraunces">
              Thống Kê Kinh Doanh
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#E9EFEC] text-[#4A6B5D] text-xs font-bold px-3 py-1 rounded-full border border-[#DCE5DF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B5D]" />
              {data.vendor_info.status_label || 'Đối tác chính thức'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-40 sm:w-60">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="w-full pl-4 pr-9 py-2 rounded-2xl border border-[#E2E8E4] bg-white text-xs text-[#2D3732] placeholder-[#6B7A72] focus:outline-hidden focus:border-[#4A6B5D] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#6B7A72] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Notification Button */}
            <button
              type="button"
              className="w-9 h-9 rounded-2xl border border-[#E2E8E4] bg-white flex items-center justify-center text-[#6B7A72] hover:text-[#2D3732] hover:bg-[#E9EFEC]/50 transition-colors cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#B8442C] absolute top-2 right-2 ring-2 ring-white" />
            </button>

            {/* Info Button */}
            <button
              type="button"
              className="w-9 h-9 rounded-2xl border border-[#E2E8E4] bg-white flex items-center justify-center text-[#6B7A72] hover:text-[#2D3732] hover:bg-[#E9EFEC]/50 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* User Initials Avatar with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold font-fraunces flex items-center justify-center transition-colors cursor-pointer shadow-xs select-none"
                title="Tài khoản đối tác"
              >
                {data.vendor_info.avatar_text || 'ST'}
              </button>

              {userMenuOpen && (
                <>
                  {/* Backdrop to close */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E2E8E4] py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-[#E2E8E4]">
                      <p className="text-xs font-bold text-[#2D3732] truncate font-fraunces">
                        {data.vendor_info.brand_name}
                      </p>
                      <p className="text-[11px] text-[#6B7A72] font-be-vietnam truncate">
                        {data.vendor_info.status_label || 'Đối tác đã xác minh'}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveMenu('profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#2D3732] hover:bg-[#E9EFEC]/50 flex items-center gap-2.5 cursor-pointer transition-colors font-be-vietnam"
                    >
                      <Settings className="w-4 h-4 text-[#6B7A72]" />
                      <span>Hồ sơ & Cài đặt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#B8442C] hover:bg-rose-50 flex items-center gap-2.5 font-bold cursor-pointer transition-colors font-be-vietnam"
                    >
                      <LogOut className="w-4 h-4 text-[#B8442C]" />
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
          
          {/* Greeting Section (Font Fraunces & Be Vietnam) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[#6B7A72] text-xs font-medium font-be-vietnam">Xin chào,</span>
              <h2 className="text-2xl sm:text-[28px] font-bold font-fraunces text-[#2D3732] tracking-tight">
                {data.vendor_info.brand_name}! 👋
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7A72] font-be-vietnam mt-0.5">
                Đây là tình hình hoạt động kinh doanh và hiệu suất trải nghiệm hôm nay.
              </p>
            </div>

            {/* Quick action button in header */}
            <button
              type="button"
              onClick={() => navigate('/vendor/experiences')}
              className="bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer border-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="!text-white">+ Tạo trải nghiệm mới</span>
            </button>
          </div>

          {/* 4 Metric Cards (Theo style thẻ User Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Tổng doanh thu */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                  Tổng doanh thu
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#2D3732]">
                {data.metrics.total_revenue}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#E9EFEC] text-[#4A6B5D] border border-[#DCE5DF]">
                  ↑ {data.metrics.total_revenue_growth}
                </span>
                <span className="text-[#6B7A72] font-be-vietnam text-[11px]">so với tháng trước</span>
              </div>
            </div>

            {/* Card 2: Doanh thu tháng này */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                  Doanh thu tháng này
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#2D3732]">
                {data.metrics.monthly_revenue}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#E9EFEC] text-[#4A6B5D] border border-[#DCE5DF]">
                  ↑ {data.metrics.monthly_revenue_growth}
                </span>
                <span className="text-[#6B7A72] font-be-vietnam text-[11px]">so với tháng trước</span>
              </div>
            </div>

            {/* Card 3: Tổng Booking */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                  Tổng Booking
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#2D3732]">
                {data.metrics.total_bookings}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#E9EFEC] text-[#4A6B5D] border border-[#DCE5DF]">
                  {data.metrics.monthly_bookings_diff}
                </span>
              </div>
            </div>

            {/* Card 4: Đánh giá trung bình */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam">
                  Đánh giá trung bình
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#2D3732]">
                {data.metrics.avg_rating}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#6B7A72] font-be-vietnam text-[11px]">
                  Dựa trên {data.metrics.total_reviews}
                </span>
              </div>
            </div>
          </div>

          {/* 2 Charts Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Doanh thu (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8E4] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-base font-fraunces text-[#2D3732]">
                    Biểu đồ Doanh Thu
                  </h3>
                  <p className="text-xs text-[#6B7A72] font-be-vietnam">
                    Xu hướng tăng trưởng qua các chu kỳ
                  </p>
                </div>

                {/* Period tabs */}
                <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-2xl border border-[#E2E8E4]">
                  {['7 ngày', '30 ngày', '3 tháng', '12 tháng'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setActivePeriod(period)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activePeriod === period
                          ? 'bg-[#4A6B5D] !text-white font-bold shadow-xs'
                          : 'text-[#6B7A72] hover:text-[#2D3732]'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Chart Representation (SVG Canvas) */}
              <div className="h-48 w-full flex flex-col justify-between pt-2">
                <div className="relative flex-1 w-full flex items-end">
                  {/* Horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-[#E2E8E4] w-full" />
                    <div className="border-b border-[#E2E8E4] w-full" />
                    <div className="border-b border-[#E2E8E4] w-full" />
                    <div className="border-b border-[#E2E8E4] w-full" />
                  </div>

                  {/* SVG Trendline */}
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 120">
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A6B5D" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4A6B5D" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20,95 Q 120,65 150,55 T 280,48 T 380,18 L 380,120 L 20,120 Z"
                      fill="url(#revenueGrad)"
                    />
                    <path
                      d="M 20,95 Q 120,65 150,55 T 280,48 T 380,18"
                      fill="none"
                      stroke="#4A6B5D"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* 4 Data Points */}
                    <circle cx="20" cy="95" r="5" fill="#4A6B5D" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="150" cy="55" r="5" fill="#4A6B5D" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="280" cy="48" r="5" fill="#4A6B5D" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="380" cy="18" r="5" fill="#4A6B5D" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between pt-4 border-t border-[#E2E8E4] text-xs text-[#6B7A72] font-be-vietnam font-medium">
                  {data.revenue_chart.map((pt, idx) => (
                    <div key={idx} className="text-center">
                      <span className="font-bold text-[#2D3732]">{pt.month}</span>
                      <span className="block text-[11px] text-[#86928b] mt-0.5">{pt.value}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 2: Tổng quan đơn đặt (Right - 5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8E4] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-base font-fraunces text-[#2D3732]">
                    Tổng Quan Đơn Đặt
                  </h3>
                  <p className="text-xs text-[#6B7A72] font-be-vietnam">
                    Tỷ lệ hoàn thành tour
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2.5 text-[11px] text-[#6B7A72]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4A6B5D]" />
                    <span>Xác nhận</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D3732]" />
                    <span>Hoàn thành</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B8442C]" />
                    <span>Hủy</span>
                  </span>
                </div>
              </div>

              {/* Bar Chart Columns */}
              <div className="h-48 flex items-end justify-around px-4 pb-2 border-b border-[#E2E8E4]">
                {/* Bar 1: Xác nhận */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#2D3732]">{data.booking_overview.confirmed}</span>
                  <div className="w-12 bg-[#4A6B5D] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '75px' }} />
                  <span className="text-[11px] text-[#6B7A72] font-be-vietnam mt-1">Xác nhận</span>
                </div>

                {/* Bar 2: Hoàn thành */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#2D3732]">{data.booking_overview.completed}</span>
                  <div className="w-12 bg-[#2D3732] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '135px' }} />
                  <span className="text-[11px] text-[#6B7A72] font-be-vietnam mt-1">Hoàn thành</span>
                </div>

                {/* Bar 3: Hủy đơn */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#2D3732]">{data.booking_overview.cancelled}</span>
                  <div className="w-12 bg-[#B8442C] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '32px' }} />
                  <span className="text-[11px] text-[#6B7A72] font-be-vietnam mt-1">Hủy đơn</span>
                </div>
              </div>
            </div>

          </div>

          {/* Table 1: Hiệu suất trải nghiệm */}
          <div className="bg-white border border-[#E2E8E4] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-fraunces text-[#2D3732]">
                  Hiệu Suất Trải Nghiệm Trekking
                </h3>
                <p className="text-xs text-[#6B7A72] font-be-vietnam">
                  Số lượt đặt và đánh giá theo từng tuyến
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveMenu('experiences')}
                className="text-xs font-bold text-[#4A6B5D] hover:underline cursor-pointer font-be-vietnam"
              >
                Xem tất cả trải nghiệm →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-[#6B7A72] font-be-vietnam tracking-wider border-b border-[#E2E8E4]">
                  <tr>
                    <th className="pb-3">TRẢI NGHIỆM</th>
                    <th className="pb-3">ĐƠN ĐẶT</th>
                    <th className="pb-3">DOANH THU</th>
                    <th className="pb-3">ĐÁNH GIÁ</th>
                    <th className="pb-3 text-right">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E4]/60">
                  {data.experience_performance.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                      <td className="py-4 font-bold font-fraunces text-[#2D3732]">{item.name}</td>
                      <td className="py-4 text-[#6B7A72] font-be-vietnam">{item.bookings_count} đơn</td>
                      <td className="py-4 font-bold text-[#2D3732]">{item.revenue}</td>
                      <td className="py-4 text-[#6B7A72] font-be-vietnam">{item.rating}</td>
                      <td className="py-4 text-right">
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#E9EFEC] text-[#4A6B5D] border border-[#DCE5DF]">
                          {item.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Tour đặt gần đây */}
          <div className="bg-white border border-[#E2E8E4] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-fraunces text-[#2D3732]">
                  Đơn Đặt Tour Gần Đây
                </h3>
                <p className="text-xs text-[#6B7A72] font-be-vietnam">
                  Khách hàng vừa đặt các chuyến trải nghiệm Sơn Trà
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/vendor/bookings')}
                className="text-xs font-bold text-[#4A6B5D] hover:underline cursor-pointer font-be-vietnam"
              >
                Xem tất cả đơn đặt →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-[#6B7A72] font-be-vietnam tracking-wider border-b border-[#E2E8E4]">
                  <tr>
                    <th className="pb-3">MÃ ĐƠN</th>
                    <th className="pb-3">KHÁCH HÀNG</th>
                    <th className="pb-3">TRẢI NGHIỆM</th>
                    <th className="pb-3">NGÀY ĐẶT</th>
                    <th className="pb-3">SỐ LƯỢNG</th>
                    <th className="pb-3">TỔNG TIỀN</th>
                    <th className="pb-3">TRẠNG THÁI</th>
                    <th className="pb-3 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8E4]/60">
                  {data.recent_bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                      <td className="py-4 font-mono font-bold text-[#4A6B5D]">{b.tour_id}</td>
                      <td className="py-4 font-bold text-[#2D3732] font-fraunces">{b.customer_name}</td>
                      <td className="py-4 text-[#2D3732]">{b.experience_name}</td>
                      <td className="py-4 text-[#6B7A72] font-be-vietnam">{b.booking_date}</td>
                      <td className="py-4 text-[#6B7A72] font-be-vietnam">{b.guests_label}</td>
                      <td className="py-4 font-bold text-[#2D3732]">{b.total_price}</td>
                      <td className="py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#E9EFEC] text-[#4A6B5D] border border-[#DCE5DF]">
                          {b.status_label}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          type="button"
                          onClick={() => alert(`Xem chi tiết đơn ${b.tour_id}`)}
                          className="font-bold text-xs text-[#4A6B5D] hover:underline cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Thao tác nhanh */}
          <div className="bg-white border border-[#E2E8E4] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base font-fraunces text-[#2D3732]">
                Thao Tác Nhanh
              </h3>
              <p className="text-xs text-[#6B7A72] font-be-vietnam">
                Các tác vụ thông dụng dành cho đối tác
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Nút chính xanh - Chữ trắng */}
              <button
                type="button"
                onClick={() => navigate('/vendor/experiences')}
                className="px-5 py-3 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 border-0"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="!text-white">+ Tạo trải nghiệm mới</span>
              </button>

              {/* Nút phụ xanh nhạt - Chữ xanh đậm */}
              <button
                type="button"
                onClick={() => navigate('/vendor/experiences')}
                className="px-5 py-3 rounded-2xl bg-[#E9EFEC] hover:bg-[#DCE5DF] text-[#4A6B5D] text-xs font-bold transition-all cursor-pointer border border-[#DCE5DF] flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#4A6B5D]" />
                <span>+ Quản lý Tuyến & Lịch Khởi Hành</span>
              </button>

              {/* Nút trắng - Chữ tối */}
              <button
                type="button"
                onClick={() => navigate('/vendor/bookings')}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F7F5F0] text-[#2D3732] text-xs font-bold transition-all cursor-pointer border border-[#E2E8E4] shadow-xs flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4 text-[#6B7A72]" />
                <span>Xem lịch & Booking</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Mở đề xuất Reward điểm xanh đối tác')}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F7F5F0] text-[#2D3732] text-xs font-bold transition-all cursor-pointer border border-[#E2E8E4] shadow-xs flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-[#6B7A72]" />
                <span>Đề xuất Reward Xanh</span>
              </button>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
};

export default VendorDashboardPage;
