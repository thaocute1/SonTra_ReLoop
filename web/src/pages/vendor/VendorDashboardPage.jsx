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
import NotificationBell from '../../components/notifications/NotificationBell';

export const VendorDashboardPage = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activePeriod, setActivePeriod] = useState('3 tháng');

  // Load cached dashboard data immediately on mount so stats appear with 0ms delay!
  const getInitialDashboardData = () => {
    try {
      const cached = localStorage.getItem('vendor_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.metrics && parsed.experience_performance?.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading vendor_dashboard_cache', e);
    }
    return null;
  };

  const initialData = getInitialDashboardData();
  const [dashboardData, setDashboardData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  // Dữ liệu ban đầu rỗng (100% nạp từ CSDL PostgreSQL)
  const defaultDashboardData = {
    vendor_info: {
      brand_name: 'Đối tác Sơn Trà',
      status: 'verified',
      status_label: 'Đối tác đã xác minh',
      avatar_text: 'ST'
    },
    metrics: {
      total_revenue: '0 đ',
      total_revenue_growth: '0%',
      monthly_revenue: '0 đ',
      monthly_revenue_growth: '0%',
      total_bookings: '0',
      monthly_bookings_diff: '0 tháng này',
      avg_rating: '5.0 / 5',
      total_reviews: '0 đánh giá'
    },
    revenue_chart: [],
    booking_overview: {
      confirmed: 0,
      completed: 0,
      cancelled: 0
    },
    experience_performance: [],
    recent_bookings: []
  };

  const fetchDashboard = async (isSilent = false) => {
    if (!isSilent && !dashboardData) {
      setLoading(true);
    }
    try {
      // Robust 15s timeout for querying Supabase PostgreSQL without premature abort
      const res = await api.get('/vendors/dashboard/', { timeout: 15000 });
      if (res.data && res.data.status === 'success' && res.data.data) {
        const d = res.data.data;
        const formatted = {
          vendor_info: d.vendor_info,
          metrics: {
            total_revenue: d.metrics?.total_revenue_formatted || '0 đ',
            total_revenue_growth: `${d.metrics?.total_revenue_growth || 0}%`,
            monthly_revenue: d.metrics?.monthly_revenue_formatted || '0 đ',
            monthly_revenue_growth: `${d.metrics?.monthly_revenue_growth || 0}%`,
            total_bookings: String(d.metrics?.total_bookings || 0),
            monthly_bookings_diff: `${d.metrics?.monthly_bookings_diff || 0} tháng này`,
            avg_rating: `${d.metrics?.avg_rating || 5.0} / 5`,
            total_reviews: `${d.metrics?.total_reviews || 0} đánh giá`
          },
          revenue_chart: d.revenue_chart?.data || defaultDashboardData.revenue_chart,
          booking_overview: d.booking_overview || defaultDashboardData.booking_overview,
          experience_performance: d.experience_performance || defaultDashboardData.experience_performance,
          recent_bookings: d.recent_bookings || defaultDashboardData.recent_bookings
        };

        setDashboardData(formatted);
        try {
          localStorage.setItem('vendor_dashboard_cache', JSON.stringify(formatted));
        } catch (e) {
          console.warn('Could not cache vendor dashboard data:', e);
        }
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend dashboard API error:', err);
    }

    // Do NOT wipe out existing stats on network/timeout error
    setDashboardData(prev => {
      if (prev && prev.experience_performance?.length > 0) {
        return prev;
      }
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
      return {
        ...defaultDashboardData,
        vendor_info: {
          ...defaultDashboardData.vendor_info,
          brand_name: brandName
        }
      };
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard(!!dashboardData);

    // Auto-refresh when returning to tab or navigating
    const onFocus = () => fetchDashboard(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('vendor-bookings-updated', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('vendor-bookings-updated', onFocus);
    };
  }, [activeMenu]);

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
      title: 'Quản lý vận hành',
      items: [
        { id: 'experiences', label: 'Tour & tuyến GPS', icon: Compass },
        { id: 'bookings', label: 'Đơn đặt', icon: CalendarDays },
        { id: 'rewards', label: 'Ưu đãi Green Points', icon: Gift },
        { id: 'revenue', label: 'Doanh thu & đối soát', icon: TrendingUp }
      ]
    },
    {
      title: 'Tương tác & thiết lập',
      items: [
        { id: 'inbox', label: 'Hộp thư', icon: MessageSquare },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings }
      ]
    }
  ];

  return (
    <div className="m3-app-page m3-portal-shell flex min-h-[100dvh] min-w-0 bg-white font-sans text-[#191C1A] relative overflow-x-clip motion-page-enter">
      
      {/* Mobile Sidebar Overlay (Y chang UserDashboardLayout) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden motion-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= FIXED LEFT SIDEBAR (CHUẨN LAYOUT BÊN USER) ================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[248px] bg-[#F2F5F1] p-5 flex flex-col justify-between border-r border-[#C5CCC7] transition-transform duration-300 shrink-0 select-none ${
          sidebarOpen ? "translate-x-0 motion-drawer-enter" : "-translate-x-full lg:translate-x-0"
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

          {/* Navigation Items (Cách đặt và màu sắc y chang User) */}
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
                        } else if (item.id === 'inbox') {
                          navigate('/vendor/inbox');
                        } else {
                          setActiveMenu(item.id);
                        }
                        setSidebarOpen(false);
                      }}
                      className={`flex min-h-12 items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-sm font-bold transition-all border-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press ${
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
                className="flex min-h-12 items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-sm font-bold text-[#BA1A1A] hover:bg-rose-50 transition-all border-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 motion-press"
              >
                <LogOut className="w-4 h-4 shrink-0 text-[#BA1A1A]" />
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
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#C5CCC7] hover:bg-[#DCEBE3]/40 shadow-xs mt-4 motion-hover-lift motion-press"
        >
          <div className="w-9 h-9 bg-[#DCEBE3] group-hover:bg-[#2F5D4A] group-hover:text-white text-[#2F5D4A] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            {data.vendor_info.avatar_text || 'ST'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#191C1A] text-xs font-bold truncate font-fraunces">
              {data.vendor_info.brand_name}
            </span>
            <span className="text-[#4A514C] text-[11px] font-be-vietnam truncate">
              {data.vendor_info.status_label || 'Đối tác chính thức'}
            </span>
          </div>
          
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F2F5F1]/40 min-h-[100dvh]">
        
        {/* Mobile Header Bar with Hamburger Menu (Y chang User) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#C5CCC7] bg-[#F2F5F1] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Mở menu đối tác"
              className="min-w-12 min-h-12 inline-flex items-center justify-center bg-white text-[#191C1A] rounded-full border border-[#C5CCC7] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[#191C1A] text-base font-bold font-fraunces">
              Sơn Trà REloop
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#2F5D4A] text-white flex items-center justify-center font-bold text-xs font-fraunces">
            {data.vendor_info.avatar_text || 'ST'}
          </div>
        </div>

        {/* Top Header Bar (Desktop & Tablet) */}
        <header className="hidden lg:flex h-[70px] bg-white border-b border-[#DCEBE3] px-6 sm:px-10 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-[#191C1A] text-lg sm:text-[20px] font-bold tracking-tight font-fraunces">
              Thống kê kinh doanh
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#DCEBE3] text-[#2F5D4A] text-xs font-bold px-3 py-1 rounded-full border border-[#C5CCC7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F5D4A]" />
              {data.vendor_info.status_label || 'Đối tác chính thức'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-40 sm:w-60">
              <input
                type="text"
                aria-label="Tìm kiếm trong cổng đối tác"
                placeholder="Tìm kiếm..."
                className="w-full pl-4 pr-9 py-2 rounded-2xl border border-[#C5CCC7] bg-white text-xs text-[#191C1A] placeholder-[#4A514C] focus:outline-hidden focus:border-[#2F5D4A] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#4A514C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Notification Button */}
            <NotificationBell role="vendor" />

            {/* Info Button */}
            <button
              type="button"
              aria-label="Xem thông tin hỗ trợ"
                className="w-12 h-12 rounded-full border border-[#C5CCC7] bg-white flex items-center justify-center text-[#4A514C] hover:text-[#191C1A] hover:bg-[#DCEBE3]/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* User Initials Avatar with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="Mở menu tài khoản đối tác"
                aria-expanded={userMenuOpen}
                className="w-12 h-12 rounded-full bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-sm font-bold font-fraunces flex items-center justify-center transition-colors cursor-pointer shadow-xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
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
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#C5CCC7] py-2 z-50 motion-popover-enter">
                    <div className="px-4 py-2.5 border-b border-[#C5CCC7]">
                      <p className="text-xs font-bold text-[#191C1A] truncate font-fraunces">
                        {data.vendor_info.brand_name}
                      </p>
                      <p className="text-[11px] text-[#4A514C] font-be-vietnam truncate">
                        {data.vendor_info.status_label || 'Đối tác đã xác minh'}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveMenu('profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#191C1A] hover:bg-[#DCEBE3]/50 flex items-center gap-2.5 cursor-pointer transition-colors font-be-vietnam"
                    >
                      <Settings className="w-4 h-4 text-[#4A514C]" />
                      <span>Hồ sơ & Cài đặt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#BA1A1A] hover:bg-rose-50 flex items-center gap-2.5 font-bold cursor-pointer transition-colors font-be-vietnam"
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
        <main className="p-6 sm:p-10 space-y-8 max-w-7xl w-full mx-auto motion-stagger">
          
          {/* Greeting Section (Font Fraunces & Be Vietnam) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[#4A514C] text-xs font-medium font-be-vietnam">Xin chào,</span>
              <h2 className="text-2xl sm:text-[28px] font-bold font-fraunces text-[#191C1A] tracking-tight">
                {data.vendor_info.brand_name}!
              </h2>
              <p className="text-xs sm:text-sm text-[#4A514C] font-be-vietnam mt-0.5">
                Đây là tình hình hoạt động kinh doanh và hiệu suất tour trekking hôm nay.
              </p>
            </div>

            {/* Quick action button in header */}
            <button
              type="button"
              onClick={() => navigate('/vendor/experiences')}
              className="bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer border-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="!text-white">Tạo tour mới</span>
            </button>
          </div>

          {/* 4 Metric Cards (Theo style thẻ User Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Tổng doanh thu */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                  Tổng doanh thu
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#191C1A]">
                {data.metrics.total_revenue}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#DCEBE3] text-[#2F5D4A] border border-[#C5CCC7]">
                  ↑ {data.metrics.total_revenue_growth}
                </span>
                <span className="text-[#4A514C] font-be-vietnam text-[11px]">so với tháng trước</span>
              </div>
            </div>

            {/* Card 2: Doanh thu tháng này */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                  Doanh thu tháng này
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#191C1A]">
                {data.metrics.monthly_revenue}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#DCEBE3] text-[#2F5D4A] border border-[#C5CCC7]">
                  ↑ {data.metrics.monthly_revenue_growth}
                </span>
                <span className="text-[#4A514C] font-be-vietnam text-[11px]">so với tháng trước</span>
              </div>
            </div>

            {/* Card 3: Tổng Booking */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                  Tổng đơn đặt
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#191C1A]">
                {data.metrics.total_bookings}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#DCEBE3] text-[#2F5D4A] border border-[#C5CCC7]">
                  {data.metrics.monthly_bookings_diff}
                </span>
              </div>
            </div>

            {/* Card 4: Đánh giá trung bình */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A514C] tracking-wider font-be-vietnam">
                  Đánh giá trung bình
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-[26px] font-bold font-fraunces text-[#191C1A]">
                {data.metrics.avg_rating}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#4A514C] font-be-vietnam text-[11px]">
                  Dựa trên {data.metrics.total_reviews}
                </span>
              </div>
            </div>
          </div>

          {/* 2 Charts Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Doanh thu (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                    Biểu đồ doanh thu
                  </h3>
                  <p className="text-xs text-[#4A514C] font-be-vietnam">
                    Xu hướng tăng trưởng qua các chu kỳ
                  </p>
                </div>

                {/* Period tabs */}
                <div className="flex items-center gap-1 bg-[#F2F5F1] p-1 rounded-2xl border border-[#C5CCC7]">
                  {['7 ngày', '30 ngày', '3 tháng', '12 tháng'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setActivePeriod(period)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activePeriod === period
                          ? 'bg-[#2F5D4A] !text-white font-bold shadow-xs'
                          : 'text-[#4A514C] hover:text-[#191C1A]'
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
                    <div className="border-b border-[#C5CCC7] w-full" />
                    <div className="border-b border-[#C5CCC7] w-full" />
                    <div className="border-b border-[#C5CCC7] w-full" />
                    <div className="border-b border-[#C5CCC7] w-full" />
                  </div>

                  {/* SVG Trendline */}
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 120">
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2F5D4A" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2F5D4A" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20,95 Q 120,65 150,55 T 280,48 T 380,18 L 380,120 L 20,120 Z"
                      fill="url(#revenueGrad)"
                    />
                    <path
                      d="M 20,95 Q 120,65 150,55 T 280,48 T 380,18"
                      fill="none"
                      stroke="#2F5D4A"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* 4 Data Points */}
                    <circle cx="20" cy="95" r="5" fill="#2F5D4A" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="150" cy="55" r="5" fill="#2F5D4A" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="280" cy="48" r="5" fill="#2F5D4A" stroke="#ffffff" strokeWidth="2.5" />
                    <circle cx="380" cy="18" r="5" fill="#2F5D4A" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between pt-4 border-t border-[#C5CCC7] text-xs text-[#4A514C] font-be-vietnam font-medium">
                  {data.revenue_chart.map((pt, idx) => (
                    <div key={idx} className="text-center">
                      <span className="font-bold text-[#191C1A]">{pt.month}</span>
                      <span className="block text-[11px] text-[#4A514C] mt-0.5">{pt.value}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 2: Tổng quan đơn đặt (Right - 5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                    Tổng quan đơn đặt
                  </h3>
                  <p className="text-xs text-[#4A514C] font-be-vietnam">
                    Tỷ lệ hoàn thành tour
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2.5 text-[11px] text-[#4A514C]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2F5D4A]" />
                    <span>Xác nhận</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#191C1A]" />
                    <span>Hoàn thành</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]" />
                    <span>Hủy</span>
                  </span>
                </div>
              </div>

              {/* Bar Chart Columns */}
              <div className="h-48 flex items-end justify-around px-4 pb-2 border-b border-[#C5CCC7]">
                {/* Bar 1: Xác nhận */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#191C1A]">{data.booking_overview.confirmed}</span>
                  <div className="w-12 bg-[#2F5D4A] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '75px' }} />
                  <span className="text-[11px] text-[#4A514C] font-be-vietnam mt-1">Xác nhận</span>
                </div>

                {/* Bar 2: Hoàn thành */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#191C1A]">{data.booking_overview.completed}</span>
                  <div className="w-12 bg-[#191C1A] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '135px' }} />
                  <span className="text-[11px] text-[#4A514C] font-be-vietnam mt-1">Hoàn thành</span>
                </div>

                {/* Bar 3: Hủy đơn */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold font-fraunces text-[#191C1A]">{data.booking_overview.cancelled}</span>
                  <div className="w-12 bg-[#BA1A1A] rounded-t-xl transition-all hover:opacity-90 shadow-xs" style={{ height: '32px' }} />
                  <span className="text-[11px] text-[#4A514C] font-be-vietnam mt-1">Hủy đơn</span>
                </div>
              </div>
            </div>

          </div>

          {/* Table 1: Hiệu suất trải nghiệm */}
          <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                  Hiệu suất tour trekking
                </h3>
                <p className="text-xs text-[#4A514C] font-be-vietnam">
                  Số lượt đặt và đánh giá theo từng tuyến
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveMenu('experiences')}
                className="text-xs font-bold text-[#2F5D4A] hover:underline cursor-pointer font-be-vietnam"
              >
                Xem tất cả tour →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold text-[#4A514C] font-be-vietnam tracking-wider border-b border-[#C5CCC7]">
                  <tr>
                    <th className="pb-3">Tour trekking</th>
                    <th className="pb-3">Đơn đặt</th>
                    <th className="pb-3">Doanh thu</th>
                    <th className="pb-3">Đánh giá</th>
                    <th className="pb-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5CCC7]/60">
                  {loading && (!data.experience_performance || data.experience_performance.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#4A514C]">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#2F5D4A] animate-ping" />
                          <span>Đang nạp số liệu hiệu suất tour từ cơ sở dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !data.experience_performance || data.experience_performance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#4A514C]">
                        Chưa có dữ liệu hiệu suất tour trekking.
                      </td>
                    </tr>
                  ) : (
                    data.experience_performance.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F2F5F1]/60 transition-colors">
                        <td className="py-4 font-bold font-fraunces text-[#191C1A]">{item.name}</td>
                        <td className="py-4 text-[#4A514C] font-be-vietnam">{item.bookings_count} đơn</td>
                        <td className="py-4 font-bold text-[#191C1A]">{item.revenue_formatted || (item.revenue ? `${Number(item.revenue).toLocaleString('vi-VN')} đ` : '0 đ')}</td>
                        <td className="py-4 text-[#4A514C] font-be-vietnam">{item.rating}</td>
                        <td className="py-4 text-right">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#DCEBE3] text-[#2F5D4A] border border-[#C5CCC7]">
                            {item.status_label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Tour đặt gần đây */}
          <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                  Đơn đặt tour gần đây
                </h3>
                <p className="text-xs text-[#4A514C] font-be-vietnam">
                  Khách hàng vừa đặt các tour trekking Sơn Trà
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/vendor/bookings')}
                className="text-xs font-bold text-[#2F5D4A] hover:underline cursor-pointer font-be-vietnam"
              >
                Xem tất cả đơn đặt →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold text-[#4A514C] font-be-vietnam tracking-wider border-b border-[#C5CCC7]">
                  <tr>
                    <th className="pb-3">Mã đơn</th>
                    <th className="pb-3">Khách hàng</th>
                    <th className="pb-3">Tour trekking</th>
                    <th className="pb-3">Ngày đặt</th>
                    <th className="pb-3">Số lượng</th>
                    <th className="pb-3">Tổng tiền</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pb-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5CCC7]/60">
                  {loading && (!data.recent_bookings || data.recent_bookings.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#4A514C]">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#2F5D4A] animate-ping" />
                          <span>Đang nạp các đơn đặt tour gần đây từ cơ sở dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !data.recent_bookings || data.recent_bookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#4A514C]">
                        Chưa có đơn đặt tour gần đây.
                      </td>
                    </tr>
                  ) : (
                    data.recent_bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F2F5F1]/60 transition-colors">
                        <td className="py-4 font-mono font-bold text-[#2F5D4A]">{b.tour_id}</td>
                        <td className="py-4 font-bold text-[#191C1A] font-fraunces">{b.customer_name}</td>
                        <td className="py-4 text-[#191C1A]">{b.experience_name}</td>
                        <td className="py-4 text-[#4A514C] font-be-vietnam">{b.booking_date}</td>
                        <td className="py-4 text-[#4A514C] font-be-vietnam">{b.guests_label}</td>
                        <td className="py-4 font-bold text-[#191C1A]">{b.total_price_formatted || (b.total_price ? `${Number(b.total_price).toLocaleString('vi-VN')} đ` : '0 đ')}</td>
                        <td className="py-4">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#DCEBE3] text-[#2F5D4A] border border-[#C5CCC7]">
                            {b.status_label}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            type="button"
                            onClick={() => navigate('/vendor/bookings')}
                            className="font-bold text-xs text-[#2F5D4A] hover:underline cursor-pointer"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Thao tác nhanh */}
          <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base font-fraunces text-[#191C1A]">
                Thao tác nhanh
              </h3>
              <p className="text-xs text-[#4A514C] font-be-vietnam">
                Các tác vụ thông dụng dành cho đối tác
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Nút chính xanh - Chữ trắng */}
              <button
                type="button"
                onClick={() => navigate('/vendor/experiences')}
                className="px-5 py-3 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 border-0"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="!text-white">Tạo tour mới</span>
              </button>

              {/* Nút phụ xanh nhạt - Chữ xanh đậm */}
              <button
                type="button"
                onClick={() => navigate('/vendor/experiences')}
                className="px-5 py-3 rounded-2xl bg-[#DCEBE3] hover:bg-[#C5CCC7] text-[#2F5D4A] text-xs font-bold transition-all cursor-pointer border border-[#C5CCC7] flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#2F5D4A]" />
                <span>Quản lý tuyến và lịch khởi hành</span>
              </button>

              {/* Nút trắng - Chữ tối */}
              <button
                type="button"
                onClick={() => navigate('/vendor/bookings')}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F2F5F1] text-[#191C1A] text-xs font-bold transition-all cursor-pointer border border-[#C5CCC7] shadow-xs flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4 text-[#4A514C]" />
                <span>Xem lịch & Booking</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Mở đề xuất Reward điểm xanh đối tác')}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-[#F2F5F1] text-[#191C1A] text-xs font-bold transition-all cursor-pointer border border-[#C5CCC7] shadow-xs flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-[#4A514C]" />
                <span>Đề xuất phần thưởng xanh</span>
              </button>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
};

export default VendorDashboardPage;
