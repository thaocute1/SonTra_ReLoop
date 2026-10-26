import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Home,
  ShieldCheck,
  Leaf,
  Users,
  Menu,
  X,
  MessageSquare,
  Search,
  Award,
  Gift,
  Zap
} from "lucide-react";
import logoImg from "../assets/logo.jpg";
import IncidentReportModal from "../features/dashboard/components/IncidentReportModal";
import { SidebarItem } from "../components/ui/SidebarItem";
import { UserEcoProvider, useUserEco } from "../context/UserEcoContext";

export default function UserDashboardLayout() {
  return (
    <UserEcoProvider>
      <UserDashboardContent />
    </UserEcoProvider>
  );
}

function UserDashboardContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const { user, points, updatePoints, setUser, refreshEcoData } = useUserEco();
  const userName = user?.name || user?.email?.split("@")[0] || "Du khách Sơn Trà";
  const userInitials = user?.avatarText || "ST";
  const userAvatar = user?.avatarUrl;

  const navItems = [
    { id: "home", label: "Trang chủ", icon: Home, path: "/dashboard/home" },
    { id: "trekking", label: "Trekking an toàn", icon: ShieldCheck, path: "/dashboard/trekking" },
    { id: "green_tasks", label: "Nhiệm vụ xanh", icon: Leaf, path: "/dashboard/tasks" },
    { id: "marketplace", label: "Marketplace", icon: Gift, path: "/dashboard/marketplace" },
    { id: "community", label: "Cộng đồng", icon: Users, path: "/dashboard/community" },
    { id: "flash_sale", label: "Flash sale", icon: Zap, path: "/dashboard/trekking?flash=1", badge: true },
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === "/dashboard/tasks" && location.pathname === "/dashboard/missions") return true;
    if (itemPath === "/dashboard/home" && location.pathname === "/dashboard") return true;
    return location.pathname.startsWith(itemPath);
  };

  const getPageTitle = (pathname) => {
    if (pathname.startsWith("/dashboard/trekking")) return "Trekking an toàn";
    if (pathname.startsWith("/dashboard/inbox")) return "Hộp thư điều phối chuyến đi";
    if (pathname.startsWith("/dashboard/tasks") || pathname.startsWith("/dashboard/missions")) return "Nhiệm vụ xanh";
    if (pathname.startsWith("/dashboard/marketplace")) return "Đổi thưởng & sản phẩm xanh";
    if (pathname.startsWith("/dashboard/community")) return "Cộng đồng xanh";
    if (pathname.startsWith("/dashboard/profile")) return "Hồ sơ & chỉ số tác động";
    return "Trang chủ";
  };

  const isHomePage = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/home");
  const isTrekkingPage = location.pathname.startsWith("/dashboard/trekking");
  const isInboxPage = location.pathname.startsWith("/dashboard/inbox");

  return (
    <div className="figma-user-shell m3-app-page m3-portal-shell flex min-h-[100dvh] min-w-0 bg-white text-[#2D3732] relative overflow-x-clip">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden motion-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* FIXED LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`figma-user-sidebar fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[248px] bg-[#F7F5F0] px-5 py-7 flex flex-col justify-between border-r border-[#E2E8E4] transition-transform duration-300 shrink-0 ${
          sidebarOpen ? "translate-x-0 motion-drawer-enter" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-10">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/dashboard/home" className="flex items-center gap-2.5 no-underline">
              <img
                src={logoImg}
                alt="Logo Sơn Trà REloop"
                className="w-10 h-10 rounded-xl object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <span className="text-[#2D3732] text-base font-semibold tracking-tight">
                Sơn Trà REloop
              </span>
            </Link>
            <button
              type="button"
              aria-label="Đóng menu điều hướng"
              className="lg:hidden min-w-12 min-h-12 inline-flex items-center justify-center rounded-full text-[#4A514C] hover:text-[#191C1A] hover:bg-[#F2F5F1] border-0 bg-transparent cursor-pointer motion-press"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isItemActive(item.path);
              return (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={active}
                  badge={item.badge ? "•" : undefined}
                  className="figma-sidebar-item"
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                />
              );
            })}
          </nav>
        </div>

        {/* User Profile Card at Bottom of Sidebar */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Mở hồ sơ của bạn"
          onClick={() => {
            navigate("/dashboard/profile");
            setSidebarOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate("/dashboard/profile");
              setSidebarOpen(false);
            }
          }}
          className={`figma-user-profile-card flex min-h-14 items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 motion-press ${
            location.pathname === "/dashboard/profile"
              ? "bg-[#E9EFEC] border-[#D4DFD9]"
              : "bg-transparent border-transparent hover:bg-[#E9EFEC]"
          }`}
        >
          <div className="w-10 h-10 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-semibold truncate">
              {userName}
            </span>
            <span className="text-[#6B7A72] text-[11px]">
              Eco-Explorer · {points} điểm
            </span>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-white min-h-[100dvh]">

        {/* ================= HEADER CHUẨN DUY NHẤT CỦA TOÀN BỘ PHÂN HỆ (FIXED HEIGHT 72PX, MAX-W-6XL THẲNG HÀNG) ================= */}
        <header className="figma-user-header min-h-[84px] shrink-0 border-b border-[#E2E8E4] bg-white sticky top-0 z-30 flex items-center">
          <div className="flex justify-between items-center w-full px-4 sm:px-10 py-4 gap-3 sm:gap-6 min-w-0">

            {/* Left: Hamburger (mobile) + Dynamic Page Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                aria-label="Mở menu điều hướng"
                className="lg:hidden min-w-12 min-h-12 inline-flex items-center justify-center bg-[#F2F5F1] text-[#191C1A] rounded-full border border-[#C5CCC7] cursor-pointer shrink-0 motion-press"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              {isHomePage ? (
                <div className="figma-home-greeting min-w-0">
                  <p className="m-0 text-xs text-[#6B7A72]">Xin chào,</p>
                  <h1 className="m-0 text-[22px] leading-[1.3] font-bold text-[#2D3732] truncate">{userName}!</h1>
                </div>
              ) : (
                <h1 className="text-[#2D3732] text-lg sm:text-[22px] leading-[1.3] font-bold tracking-tight m-0 truncate">
                  {getPageTitle(location.pathname)}
                </h1>
              )}
            </div>

            {/* Center: Global Search Input */}
            {isTrekkingPage && <div className="figma-global-search hidden md:flex items-center bg-white py-2.5 px-4 gap-2.5 rounded-full border border-[#E2E8E4] w-full max-w-[390px] focus-within:border-[#4A6B5D] transition-all ml-auto">
              <Search className="w-4 h-4 text-[#4A514C] shrink-0" />
              <input
                type="text"
                aria-label="Tìm kiếm trong ứng dụng"
                placeholder="Tìm tuyến trekking, bài viết, nhiệm vụ..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full text-sm text-[#191C1A] placeholder-[#4A514C] bg-transparent border-0 outline-none font-be-vietnam"
              />
            </div>}

            {/* Right: Actions (Báo cáo sự cố + RE-Points + Avatar) */}
            {(isHomePage || isInboxPage) && <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center bg-[#E9EFEC] py-2 px-3.5 gap-2 rounded-full border-0">
                <Award className="w-4 h-4 text-[#4A6B5D]" />
                <span className="text-[#4A6B5D] text-[13px] font-semibold">
                  {points} RE-Points
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard/profile")}
                title="Hồ sơ của bạn"
                aria-label="Mở hồ sơ của bạn"
                className="flex items-center justify-center bg-[#E9EFEC] hover:bg-[#DCE7E1] text-[#4A6B5D] w-10 h-10 rounded-full font-bold text-sm cursor-pointer transition-colors overflow-hidden border-0 motion-press"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </button>
            </div>}

          </div>
        </header>

        {/* Page Content Rendered via Outlet */}
        <main key={location.pathname} className={`figma-user-main flex-1 min-w-0 motion-page-enter ${location.pathname.startsWith('/dashboard/inbox') ? 'pb-0' : 'pb-20 md:pb-0'}`}>
          <Outlet
            context={{
              openSidebar: () => setSidebarOpen(true),
              openIncidentModal: () => setIsIncidentModalOpen(true),
              globalSearch,
              userPoints: points,
              updateUserPoints: updatePoints,
              currentUser: user,
              setCurrentUser: setUser,
              refreshEcoData
            }}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#C5CCC7] px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const IconComp = item.icon;
          const active = isItemActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(item.path)}
              className={`flex min-h-14 min-w-12 flex-col items-center justify-center gap-1 py-1 px-2 rounded-2xl transition-colors border-0 bg-transparent cursor-pointer motion-press ${
                active ? "text-forest-700 font-bold" : "text-[#4A514C] hover:text-[#191C1A]"
              }`}
            >
              <IconComp className={`w-5 h-5 ${active ? "text-forest-700 stroke-[2.5]" : "text-[#4A514C]"}`} />
              <span className="text-xs font-be-vietnam tracking-tight leading-none max-w-16 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Action Button for Trip Chat */}
      {!location.pathname.startsWith('/dashboard/inbox') && (
        <button
          type="button"
          title="Mở hộp thư chuyến đi"
          aria-label="Mở hộp thư chuyến đi"
          onClick={() => navigate("/dashboard/inbox")}
          className="figma-chat-fab fixed bottom-20 md:bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-[#4A6B5D] hover:bg-[#3D5B4F] text-white rounded-full shadow-[0px_8px_24px_rgba(74,107,93,0.28)] border-0 cursor-pointer motion-press"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#C6472F] ring-2 ring-white" aria-hidden="true" />
        </button>
      )}

      {/* Global Incident Report Modal (Khả Dụng Ở Mọi Trang) */}
      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSuccess={(inc) => {
          alert(`Đã tiếp nhận báo cáo sự cố #${inc.id}! Cảm ơn bạn đã chung tay bảo vệ bán đảo Sơn Trà.`);
        }}
      />
    </div>
  );
}
