import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Compass, LayoutDashboard, LogOut, MessageSquare, Settings, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import { api } from '../../lib/axios';

function cachedProfile() {
  try {
    return JSON.parse(localStorage.getItem('current_vendor_profile') || 'null') || {};
  } catch {
    return {};
  }
}

export default function VendorSidebar({ open, onClose, vendorInfo, activeMenu: selectedMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadedProfile, setLoadedProfile] = useState(cachedProfile);
  const params = new URLSearchParams(location.search);
  const page = location.pathname.split('/').pop();
  const activeMenu = selectedMenu || (page === 'dashboard'
    ? params.get('profile') === '1' ? 'profile' : params.get('tab') || 'dashboard'
    : page);
  const profile = {
    brand_name: 'Đối tác Sơn Trà',
    status_label: 'Cổng đối tác',
    avatar_text: 'ST',
    ...(vendorInfo || loadedProfile),
  };

  useEffect(() => {
    if (vendorInfo) return;
    const controller = new AbortController();
    api.get('/vendors/dashboard/', { params: { period: '3m' }, signal: controller.signal, timeout: 15000 })
      .then(response => {
        if (response.data.data?.vendor_info) setLoadedProfile(response.data.data.vendor_info);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [vendorInfo]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng đối tác?')) return;
    ['access_token', 'refresh_token', 'user_info', 'user_role', 'user_name', 'current_vendor_profile']
      .forEach(key => localStorage.removeItem(key));
    navigate('/partner/login', { replace: true });
  };

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
        { id: 'guides', label: 'Hướng dẫn viên', icon: Users, path: '/vendor/dashboard?tab=guides' },
        { id: 'bookings', label: 'Đơn đặt', icon: CalendarDays, path: '/vendor/bookings' },
        { id: 'revenue', label: 'Doanh thu & đối soát', icon: TrendingUp, path: '/vendor/dashboard?tab=revenue' }
      ]
    },
    {
      title: 'Tương tác & thiết lập',
      items: [
        { id: 'inbox', label: 'Hộp thư', icon: MessageSquare, path: '/vendor/inbox' },
        { id: 'assistant', label: 'REloop Assistant', icon: Sparkles, path: '/vendor/assistant' },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings, path: '/vendor/dashboard?profile=1' }
      ]
    }
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden motion-fade-in" onClick={onClose} />
      )}
      <aside
        aria-label="Điều hướng đối tác"
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[248px] bg-[#F2F5F1] p-5 flex flex-col justify-between border-r border-[#C5CCC7] transition-transform duration-300 shrink-0 select-none ${
          open ? "translate-x-0 motion-drawer-enter" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6 min-h-0 overflow-y-auto pr-1">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/vendor/dashboard" onClick={onClose} className="flex items-center gap-2.5 no-underline">
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
                <span className="text-[#191C1A] text-base font-bold tracking-tight font-be-vietnam leading-tight">
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
              onClick={() => onClose()}
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
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
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
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            navigate('/vendor/dashboard?profile=1');
            onClose();
          }}
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#C5CCC7] hover:bg-[#DCEBE3]/40 shadow-xs mt-4 text-left motion-hover-lift motion-press"
        >
          <div className="w-9 h-9 bg-[#DCEBE3] group-hover:bg-[#2F5D4A] group-hover:text-white text-[#2F5D4A] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-be-vietnam transition-colors">
            {profile.avatar_text || 'ST'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#191C1A] text-xs font-bold truncate font-be-vietnam">
              {profile.brand_name}
            </span>
            <span className="text-[#4A514C] text-[11px] font-be-vietnam truncate">
              {profile.status_label || 'Đối tác chính thức'}
            </span>
          </div>
        </button>
      </aside>
    </>
  );
}
