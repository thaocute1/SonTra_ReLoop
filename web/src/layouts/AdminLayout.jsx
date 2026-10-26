import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { 
  LayoutGrid, 
  Building2, 
  AlertTriangle,
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Users,
  Zap,
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  ChevronDown,
  Menu,
  User
} from 'lucide-react';
import { api } from '../lib/axios';
import { vendorApplicationService } from '../services/vendorApplicationService';

import NotificationBell from '../components/notifications/NotificationBell';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Nguyễn Tuấn Phong';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  const location = useLocation();
  const [hasUnreadIncidents, setHasUnreadIncidents] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const fetchLiveCounts = async () => {
    try {
      // 1. Fetch live incidents from DB
      const incRes = await api.get('/cms-chatbot/incidents/admin/');
      const incData = incRes.data;
      const pendingCount = incData?.pending_count || 0;
      const totalCount = incData?.total_incidents ?? (incData?.results?.length || 0);
      const latestIncident = incData?.results?.[0];

      if (totalCount === 0 || pendingCount === 0) {
        setHasUnreadIncidents(false);
      } else {
        if (location.pathname === '/admin/incidents') {
          setHasUnreadIncidents(false);
          if (latestIncident) {
            localStorage.setItem('admin_last_read_incident_id', String(latestIncident.id));
          }
        } else {
          const lastReadId = localStorage.getItem('admin_last_read_incident_id');
          if (latestIncident && lastReadId !== String(latestIncident.id)) {
            setHasUnreadIncidents(true);
          } else {
            setHasUnreadIncidents(false);
          }
        }
      }

      // 2. Fetch live vendor applications pending
      const vStats = await vendorApplicationService.getStats();
      if (vStats && typeof vStats.pending === 'number') {
        setPendingApprovalsCount(vStats.pending);
      }
    } catch (err) {
      console.warn("Could not fetch live counts for Admin sidebar:", err);
    }
  };

  const markIncidentsAsRead = () => {
    setHasUnreadIncidents(false);
    api.get('/cms-chatbot/incidents/admin/').then(res => {
      const latest = res.data?.results?.[0];
      if (latest) {
        localStorage.setItem('admin_last_read_incident_id', String(latest.id));
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 15000);

    const handleUpdate = () => fetchLiveCounts();
    window.addEventListener('incidents-updated', handleUpdate);
    window.addEventListener('vendor-applications-updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('incidents-updated', handleUpdate);
      window.removeEventListener('vendor-applications-updated', handleUpdate);
    };
  }, [location.pathname]);

  // 8 Core Navigation Items matching 100% SRS requirements (AD-01 to AD-08)
  const navGroups = [
    {
      title: 'Tổng quan & bảo tồn',
      items: [
        { label: 'Tổng quan & ESG', path: '/admin/dashboard', icon: LayoutGrid },
        { label: 'Báo cáo sự cố', path: '/admin/incidents', icon: AlertTriangle, hasDot: hasUnreadIncidents },
        { label: 'Quỹ bảo tồn & ESG', path: '/admin/fund-allocation', icon: ShieldCheck }
      ]
    },
    {
      title: 'Đối tác & doanh thu',
      items: [
        { label: 'Kiểm duyệt vendor', path: '/admin/vendors', icon: Building2, badge: pendingApprovalsCount },
        { label: 'Đối soát & payout', path: '/admin/payouts', icon: DollarSign },
        { label: 'Báo cáo & thống kê', path: '/admin/reports', icon: TrendingUp }
      ]
    },
    {
      title: 'Nội dung & tài khoản',
      items: [
        { label: 'Tin tức & sự kiện', path: '/admin/content', icon: FileText },
        { label: 'Chiến dịch & giờ vàng', path: '/admin/campaigns', icon: Zap },
        { label: 'Quản lý tài khoản', path: '/admin/users', icon: Users }
      ]
    }
  ];

  return (
    <div className="m3-app-page m3-portal-shell min-h-[100dvh] flex bg-[#F2F5F1] text-[#191C1A] font-sans overflow-x-clip">
      
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden motion-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. SIDEBAR */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-[100dvh] z-50 bg-white border-r border-[#C5CCC7] flex flex-col justify-between transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0 motion-drawer-enter' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Header Branding */}
          <div className="p-5 flex items-center gap-3 shrink-0">
            {logoImg ? (
              <img 
                src={logoImg} 
                alt="Sơn Trà REloop" 
                className="w-11 h-11 rounded-2xl object-cover shadow-xs border border-amber-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[#2F5D4A] text-white flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#7ee3ab]" />
              </div>
            )}
            
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <h1 className="font-extrabold text-base text-[#191C1A] leading-tight truncate">
                  Sơn Trà REloop
                </h1>
                <span className="text-[10px] font-bold text-[#4A514C] tracking-widest mt-0.5">
                  Cổng quản trị BQL
                </span>
              </div>
            )}
          </div>

          {/* User Profile Card */}
          {sidebarOpen && (
            <div className="mx-4 mb-4 p-3 bg-[#F2F5F1] rounded-2xl border border-[#C5CCC7] flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#DCEBE3] text-[#2F5D4A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C5CCC7]">
                  AD
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-[#191C1A] truncate">{userName}</p>
                  <p className="text-[11px] text-[#4A514C] truncate">Quản trị hệ thống BQL</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shrink-0" title="Đang hoạt động" />
            </div>
          )}

          {/* Grouped Navigation List */}
          <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-4 pb-6">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {sidebarOpen && (
                  <p className="text-[10px] font-extrabold tracking-wider text-[#4A514C] px-3 py-1">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (item.path === '/admin/incidents') {
                          markIncidentsAsRead();
                        }
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all motion-press ${
                          isActive
                            ? 'bg-[#DCEBE3] text-[#2F5D4A] font-bold shadow-xs'
                            : 'text-[#4A514C] hover:text-[#191C1A] hover:bg-[#F2F5F1]'
                        }`
                      }
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                        {!sidebarOpen && item.hasDot && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                        )}
                      </div>
                      {sidebarOpen && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                          {item.hasDot ? (
                            <span className="flex items-center ml-2" title="Có báo cáo sự cố mới chưa đọc">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white shadow-xs"></span>
                              </span>
                            </span>
                          ) : item.badge > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white ml-1">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom Quick Logout */}
        <div className="p-3 border-t border-[#C5CCC7] bg-white shrink-0">
          <button
            onClick={handleLogout}
            className="w-full min-h-12 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Đăng xuất phiên</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN VIEW CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#C5CCC7] px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu quản trị"
              className="lg:hidden min-w-12 min-h-12 inline-flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 motion-press"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#4A514C]">
              <span>Hệ thống BQL</span>
              <span>/</span>
              <span className="text-[#191C1A] font-semibold">Bảng điều khiển quản trị BQL</span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F2F5F1] rounded-xl border border-[#C5CCC7] w-64 focus-within:border-[#2F5D4A] transition-all">
              <Search className="w-4 h-4 text-[#4A514C]" />
              <input 
                type="text" 
                aria-label="Tìm kiếm trong trang quản trị"
                placeholder="Tìm kiếm đối tác, sự cố, hồ sơ..." 
                className="bg-transparent border-none text-xs text-[#191C1A] focus:outline-none w-full placeholder-[#4A514C]"
              />
            </div>

            {/* Chuông Thông báo Admin BQL */}
            <NotificationBell role="admin" />

            <div className="h-5 w-px bg-[#C5CCC7]" />

            {/* Profile Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="Mở menu tài khoản quản trị"
                aria-expanded={profileDropdownOpen}
                className="flex min-h-12 items-center gap-2.5 px-2.5 py-1.5 rounded-full hover:bg-[#F2F5F1] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40 select-none motion-press"
              >
                <div className="w-8 h-8 rounded-full bg-[#DCEBE3] text-[#2F5D4A] font-bold text-xs flex items-center justify-center border border-[#C5CCC7] shrink-0">
                  AD
                </div>
                <span className="text-xs font-bold text-[#191C1A] hidden xl:inline">{userName}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 hidden xl:inline transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#C5CCC7] py-2 z-50 text-left motion-popover-enter">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-[#C5CCC7] bg-[#F8FAF7] rounded-t-2xl">
                      <p className="text-xs font-bold text-[#191C1A] truncate">{userName}</p>
                      <p className="text-[11px] text-[#4A514C] truncate mt-0.5">admin@sontra.gov.vn</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-[#DCEBE3] text-[#2F5D4A] text-[10px] font-bold rounded-md">
                        Quản trị viên cấp cao
                      </span>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      <button 
                        onClick={() => { setProfileDropdownOpen(false); navigate('/admin/users'); }}
                        className="w-full px-4 py-2 text-xs text-[#4A514C] hover:text-[#191C1A] hover:bg-[#F2F5F1] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#4A514C]" />
                        <span>Quản lý tài khoản</span>
                      </button>
                    </div>

                    {/* Logout Option */}
                    <div className="border-t border-[#C5CCC7] pt-1 mt-1">
                      <button 
                        onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                        className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>Đăng xuất phiên</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main key={location.pathname} className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-clip motion-page-enter">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-8 border-t border-[#C5CCC7] bg-white text-center text-xs text-[#4A514C]">
          © 2026 Sơn Trà REloop · Nền tảng du lịch sinh thái bán đảo Sơn Trà (hệ thống quản trị PBL6)
        </footer>
      </div>
    </div>
  );
}
