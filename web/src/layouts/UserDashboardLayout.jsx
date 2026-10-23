import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Home, 
  ShieldCheck, 
  Leaf, 
  Users, 
  LogOut, 
  Menu, 
  X,
  MessageSquare,
  Search,
  Award,
  Gift,
  AlertTriangle
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
  const userName = user?.name || user?.email?.split("@")[0] || "Du Khách Sơn Trà";
  const userInitials = user?.avatarText || "ST";
  const userAvatar = user?.avatarUrl;

  const navItems = [
    { id: "home", label: "Trang chủ", icon: Home, path: "/dashboard/home" },
    { id: "trekking", label: "Trekking An Toàn", icon: ShieldCheck, path: "/dashboard/trekking" },
    { id: "green_tasks", label: "Nhiệm vụ Xanh", icon: Leaf, path: "/dashboard/tasks" },
    { id: "marketplace", label: "Đổi Thưởng Xanh", icon: Gift, path: "/dashboard/marketplace" },
    { id: "community", label: "Cộng đồng", icon: Users, path: "/dashboard/community" },
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === "/dashboard/tasks" && location.pathname === "/dashboard/missions") return true;
    if (itemPath === "/dashboard/home" && location.pathname === "/dashboard") return true;
    return location.pathname.startsWith(itemPath);
  };

  const getPageTitle = (pathname) => {
    if (pathname.startsWith("/dashboard/trekking")) return "Trekking An Toàn";
    if (pathname.startsWith("/dashboard/tasks") || pathname.startsWith("/dashboard/missions")) return "Nhiệm Vụ Xanh";
    if (pathname.startsWith("/dashboard/marketplace")) return "Đổi Thưởng Xanh Sơn Trà";
    if (pathname.startsWith("/dashboard/community")) return "Cộng Đồng Xanh Sơn Trà";
    if (pathname.startsWith("/dashboard/profile")) return "Hồ Sơ Của Bạn";
    return "Trang Chủ Sinh Thái";
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_eco_stats");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#1E293B] relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* FIXED LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[248px] bg-[#F8FAFC] p-5 flex flex-col justify-between border-r border-[#E2E8F0] transition-transform duration-300 shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-8">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/dashboard/home" className="flex items-center gap-2.5 no-underline">
              <img
                src={logoImg}
                alt="Sơn Trà REloop Logo"
                className="w-10 h-10 rounded-xl object-cover border border-[#E2E8F0]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <span className="text-[#1E293B] text-base font-bold tracking-tight font-fraunces">
                Sơn Trà REloop
              </span>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1 text-[#64748B] hover:text-[#1E293B] border-0 bg-transparent cursor-pointer"
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
          onClick={() => {
            navigate("/dashboard/profile");
            setSidebarOpen(false);
          }}
          className={`flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 ${
            location.pathname === "/dashboard/profile"
              ? "bg-emerald-50 border-emerald-300"
              : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-2xs"
          }`}
        >
          <div className="w-9 h-9 bg-emerald-100 group-hover:bg-[#2F5244] group-hover:text-white text-emerald-900 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors overflow-hidden border border-emerald-200">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#1E293B] text-xs font-bold truncate font-fraunces">
              {userName}
            </span>
            <span className="text-[#64748B] text-[11px] font-be-vietnam">
              Hồ sơ của bạn
            </span>
          </div>
          <button
            type="button"
            title="Đăng xuất"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="text-[#94A3B8] hover:text-[#DC2626] p-1 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
        
        {/* ================= HEADER CHUẨN DUY NHẤT CỦA TOÀN BỘ PHÂN HỆ (FIXED HEIGHT 72PX, MAX-W-6XL THẲNG HÀNG) ================= */}
        <header className="h-[72px] shrink-0 border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-2xs flex items-center">
          <div className="flex justify-between items-center w-full max-w-6xl mx-auto px-6 gap-4">
            
            {/* Left: Hamburger (mobile) + Dynamic Page Title */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="lg:hidden p-2 bg-[#F8FAFC] text-[#1E293B] rounded-xl border border-[#E2E8F0] cursor-pointer"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-[#1E293B] text-xl font-bold tracking-tight font-fraunces m-0">
                {getPageTitle(location.pathname)}
              </h1>
            </div>

            {/* Center: Global Search Input */}
            <div className="hidden md:flex items-center bg-[#F8FAFC] py-2 px-4 gap-2.5 rounded-2xl border border-[#E2E8F0] w-full max-w-md shadow-2xs focus-within:border-[#2F5244] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#64748B] shrink-0" />
              <input
                type="text"
                placeholder="Tìm tuyến trekking, bài viết, nhiệm vụ..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full text-xs text-[#1E293B] placeholder-[#94A3B8] bg-transparent border-0 outline-none font-be-vietnam"
              />
            </div>

            {/* Right: Actions (Báo cáo sự cố + RE-Points + Avatar) */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Nút Báo Cáo Sự Cố Môi Trường */}
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold font-be-vietnam transition-all shadow-2xs flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="hidden sm:inline">Báo Cáo Sự Cố</span>
              </button>

              {/* RE-Points Badge (Sync directly with Database) */}
              <div className="hidden sm:flex items-center bg-emerald-50 py-2 px-3.5 gap-2 rounded-full border border-emerald-200">
                <Award className="w-4 h-4 text-emerald-800" />
                <span className="text-emerald-900 text-xs font-bold font-be-vietnam">
                  {points} RE-Points
                </span>
              </div>

              {/* User Avatar */}
              <div 
                onClick={() => navigate("/dashboard/profile")}
                title="Hồ sơ của bạn"
                className="flex items-center justify-center bg-[#2F5244] hover:bg-[#243E33] text-white w-9 h-9 rounded-2xl font-bold text-xs shadow-xs font-fraunces cursor-pointer transition-colors overflow-hidden border border-emerald-300"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
            </div>

          </div>
        </header>

        {/* Page Content Rendered via Outlet */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const active = isItemActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors border-0 bg-transparent cursor-pointer ${
                active ? "text-forest-700 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <IconComp className={`w-5 h-5 ${active ? "text-forest-700 stroke-[2.5]" : "text-slate-500"}`} />
              <span className="text-[10px] font-be-vietnam tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Action Button for Community Chat */}
      <button
        type="button"
        title="Hỗ trợ & Cộng đồng"
        onClick={() => navigate("/dashboard/community")}
        className="fixed bottom-20 md:bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-forest-700 hover:bg-forest-800 text-white rounded-full shadow-[0px_8px_24px_rgba(47,82,68,0.35)] transition-transform hover:scale-105 border-0 cursor-pointer"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Global Incident Report Modal (Khả Dụng Ở Mọi Trang) */}
      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSuccess={(inc) => {
          alert(`Đã tiếp nhận báo cáo sự cố #${inc.id}! Cảm ơn bạn đã chung tay bảo vệ Bán Đảo Sơn Trà.`);
        }}
      />
    </div>
  );
}
