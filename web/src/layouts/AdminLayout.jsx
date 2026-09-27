import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { 
  LayoutGrid, 
  User, 
  Building2, 
  CheckSquare, 
  FileText, 
  Circle, 
  Megaphone, 
  ShoppingCart, 
  Square, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  ChevronDown,
  Menu
} from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Administrator';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  // Grouped Navigation Items matching exact screenshot design
  const navGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { label: 'Tổng quan', path: '/admin/dashboard', icon: LayoutGrid }
      ]
    },
    {
      title: 'NHÂN SỰ',
      items: [
        { label: 'Người dùng', path: '/admin/users', icon: User }
      ]
    },
    {
      title: 'VẬN HÀNH',
      items: [
        { label: 'Vendor / Đối tác', path: '/admin/vendors', icon: Building2 },
        { label: 'Kiểm duyệt', path: '/admin/approvals', icon: CheckSquare },
        { label: 'Tour', path: '/admin/tours', icon: CheckSquare },
        { label: 'Quản lý Booking', path: '/admin/bookings', icon: FileText },
        { label: 'Quản lý Đơn hàng', path: '/admin/orders', icon: Circle }
      ]
    },
    {
      title: 'TIẾP THỊ & NỘI DUNG',
      items: [
        { label: 'Tạo campaign', path: '/admin/campaigns', icon: Megaphone },
        { label: 'Marketplace', path: '/admin/marketplace', icon: ShoppingCart },
        { label: 'Tin tức & Nội dung', path: '/admin/cms', icon: Square },
        { label: 'Phản hồi', path: '/admin/feedbacks', icon: Square },
        { label: 'Kiểm duyệt đánh giá', path: '/admin/reviews', icon: Square }
      ]
    },
    {
      title: 'TÀI CHÍNH & BẢO TỒN',
      items: [
        { label: 'Thanh toán & Sổ cái', path: '/admin/ledger', icon: Square },
        { label: 'Quỹ bảo tồn & ESG', path: '/admin/fund-allocation', icon: Square },
        { label: 'Gamification', path: '/admin/gamification', icon: Square }
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { label: 'Báo cáo & Thống kê', path: '/admin/reports', icon: TrendingUp },
        { label: 'Cài đặt', path: '/admin/settings', icon: Settings }
      ]
    }
  ];

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#f7f5f0] text-[#18211c] font-sans">
      
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. SIDEBAR (REDESIGNED MATCHING FIGMA SCREENSHOT) */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 bg-white border-r border-[#e8ece9] flex flex-col justify-between transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Header Branding */}
          <div className="p-5 flex items-center gap-3 shrink-0">
            <img 
              src={logoImg} 
              alt="Sơn Trà REloop" 
              className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-amber-200 shrink-0"
            />
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <h1 className="font-extrabold text-base text-[#1c2820] leading-tight truncate">
                  Sơn Trà REloop
                </h1>
                <span className="text-[10px] font-bold text-[#869288] tracking-widest uppercase mt-0.5">
                  ADMIN CONSOLE
                </span>
              </div>
            )}
          </div>

          {/* User Profile Card (Matching Screenshot) */}
          {sidebarOpen && (
            <div className="mx-4 mb-4 p-3 bg-[#f2f7f4] rounded-2xl border border-[#e4eee7] flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#dbe8df] text-[#27533b] font-bold text-xs flex items-center justify-center shrink-0 border border-[#c8dcd0]">
                  AD
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-[#1c2820] truncate">{userName}</p>
                  <p className="text-[11px] text-[#718075] truncate">Quản trị hệ thống</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white shrink-0" title="Active" />
            </div>
          )}

          {/* Grouped Navigation List */}
          <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-4 pb-6">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {sidebarOpen && (
                  <p className="text-[10px] font-extrabold tracking-wider text-[#9aa39c] uppercase px-3 py-1">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#eaf2eb] text-[#27533b] font-bold'
                            : 'text-[#556057] hover:text-[#18211c] hover:bg-[#f4f7f4]'
                        }`
                      }
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom Quick Logout */}
        <div className="p-3 border-t border-[#e8ece9] bg-white shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Đăng xuất phiên</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN VIEW CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e8ece9] px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#718075]">
              <span>Hệ thống</span>
              <span>/</span>
              <span className="text-[#1c2820] font-semibold">Trang Quản trị Admin</span>
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#f4f7f4] rounded-xl border border-[#e4eee7] w-64 focus-within:border-[#27533b] transition-all">
              <Search className="w-4 h-4 text-[#9aa39c]" />
              <input 
                type="text" 
                placeholder="Tìm kiếm thông tin..." 
                className="bg-transparent border-none text-xs text-[#1c2820] focus:outline-none w-full placeholder-[#9aa39c]"
              />
            </div>

            <button className="relative p-2 text-gray-500 hover:text-[#27533b] hover:bg-[#f4f7f4] rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="h-5 w-px bg-[#e8ece9]" />

            {/* Profile Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#f4f7f4] transition-colors cursor-pointer focus:outline-none select-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#dbe8df] text-[#27533b] font-bold text-xs flex items-center justify-center border border-[#c8dcd0] shrink-0">
                  AP
                </div>
                <span className="text-xs font-bold text-[#1c2820] hidden xl:inline">Admin Nền Tảng</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 hidden xl:inline transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e8ece9] py-2 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-[#e8ece9] bg-[#f8faf9] rounded-t-2xl">
                      <p className="text-xs font-bold text-[#1c2820] truncate">{userName}</p>
                      <p className="text-[11px] text-[#718075] truncate mt-0.5">admin@sontra.gov.vn</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-[#eaf2eb] text-[#27533b] text-[10px] font-bold rounded-md uppercase">
                        SUPER ADMIN
                      </span>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      <button 
                        onClick={() => { setProfileDropdownOpen(false); navigate('/admin/settings'); }}
                        className="w-full px-4 py-2 text-xs text-[#556057] hover:text-[#1c2820] hover:bg-[#f4f7f4] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#869288]" />
                        <span>Hồ sơ cá nhân</span>
                      </button>
                      
                      <button 
                        onClick={() => { setProfileDropdownOpen(false); navigate('/admin/settings'); }}
                        className="w-full px-4 py-2 text-xs text-[#556057] hover:text-[#1c2820] hover:bg-[#f4f7f4] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#869288]" />
                        <span>Cài đặt hệ thống</span>
                      </button>
                    </div>

                    {/* Logout Option */}
                    <div className="border-t border-[#e8ece9] pt-1 mt-1">
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
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-8 border-t border-[#e8ece9] bg-white text-center text-xs text-[#869288]">
          © 2026 Sơn Trà REloop · Nền Tảng Du Lịch Sinh Thái Bán Đảo Sơn Trà (PBL6 Admin System)
        </footer>
      </div>
    </div>
  );
}
