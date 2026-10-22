import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Home, 
  ShieldCheck, 
  Leaf, 
  ShoppingBag, 
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

export default function UserDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user_info") || "null");
  });

  React.useEffect(() => {
    const handleProfileUpdate = (e) => {
      const updated = e.detail || JSON.parse(localStorage.getItem("user_info") || "null");
      setCurrentUser(updated);
    };
    window.addEventListener("user_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("user_profile_updated", handleProfileUpdate);
  }, []);

  const userName = currentUser?.name || currentUser?.email?.split("@")[0] || "Eco-Explorer";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = currentUser?.avatar_url;

  const [userPoints, setUserPoints] = useState(() => {
    const saved = localStorage.getItem("user_eco_points");
    if (saved !== null) return parseInt(saved, 10);
    return currentUser?.total_eco_points || currentUser?.points || 0;
  });

  const updateUserPoints = (newPoints) => {
    setUserPoints(newPoints);
    localStorage.setItem("user_eco_points", newPoints.toString());
  };


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
    localStorage.removeItem("user_info");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#2D3732] relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* FIXED LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[248px] bg-[#F7F5F0] p-5 flex flex-col justify-between border-r border-[#E2E8E4] transition-transform duration-300 shrink-0 ${
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
                className="w-10 h-10 rounded-xl object-cover border border-[#E2E8E4]"
                className="w-10 h-10 rounded-xl object-cover border border-[#E2E8F0]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <span className="text-[#2D3732] text-base font-bold tracking-tight font-fraunces">
              <span className="text-[#1E293B] text-base font-bold tracking-tight font-fraunces">
                Sơn Trà REloop
              </span>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
              className="lg:hidden p-1 text-[#64748B] hover:text-[#1E293B] border-0 bg-transparent cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const active = isItemActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full py-3 px-3.5 gap-3 rounded-2xl text-sm font-bold transition-all border-0 text-left cursor-pointer ${
                    active
                      ? "bg-[#E9EFEC] text-[#4A6B5D]"
                      : "text-[#6B7A72] hover:bg-[#E9EFEC]/50 hover:text-[#2D3732]"
                      ? "bg-[#EFF6F2] text-[#2F5244] shadow-xs"
                      : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${active ? "text-[#4A6B5D]" : "text-[#6B7A72]"}`} />
                  <IconComp className={`w-4 h-4 ${active ? "text-[#2F5244]" : "text-[#64748B]"}`} />
                  <span className="flex-1 font-be-vietnam font-semibold">{item.label}</span>
                </button>
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
          className={`flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group ${
            location.pathname === "/dashboard/profile"
              ? "bg-[#E9EFEC] border-[#4A6B5D]"
              : "bg-white border-[#E2E8E4] hover:bg-[#E9EFEC]/40 shadow-sm"
              ? "bg-[#EFF6F2] border-[#2F5244]/40"
              : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-2xs"
          }`}
        >
          <div className="w-9 h-9 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors overflow-hidden border border-[#E2E8E4]">
          <div className="w-9 h-9 bg-[#EFF6F2] group-hover:bg-[#2F5244] group-hover:text-white text-[#2F5244] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors overflow-hidden border border-[#D4E2D9]">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-bold truncate font-fraunces">
            <span className="text-[#1E293B] text-xs font-bold truncate font-fraunces">
              {userName}
            </span>
            <span className="text-[#6B7A72] text-[11px] font-be-vietnam">
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
            className="text-[#6B7A72] hover:text-[#B8442C] p-1 transition-colors border-0 bg-transparent cursor-pointer"
            className="text-[#94A3B8] hover:text-[#DC2626] p-1 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
        
        {/* ================= HEADER CHUẨN DUY NHẤT CỦA TOÀN BỘ PHÂN HỆ (FIXED HEIGHT 72PX) ================= */}
        <header className="h-[72px] shrink-0 border-b border-[#E2E8E4] bg-white sticky top-0 z-30 shadow-xs flex items-center px-6 sm:px-10">
        <header className="h-[72px] shrink-0 border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-2xs flex items-center px-6 sm:px-10">
          <div className="flex justify-between items-center w-full max-w-7xl mx-auto gap-4">
            
            {/* Left: Hamburger (mobile) + Dynamic Page Title */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="lg:hidden p-2 bg-[#F7F5F0] text-[#2D3732] rounded-xl border border-[#E2E8E4] cursor-pointer"
                className="lg:hidden p-2 bg-[#F8FAFC] text-[#1E293B] rounded-xl border border-[#E2E8F0] cursor-pointer"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-[#2D3732] text-xl font-bold tracking-tight font-fraunces m-0">
              <h1 className="text-[#1E293B] text-xl font-bold tracking-tight font-fraunces m-0">
                {getPageTitle(location.pathname)}
              </h1>
            </div>

            {/* Center: Global Search Input */}
            <div className="hidden md:flex items-center bg-[#F7F5F0] py-2 px-4 gap-2.5 rounded-2xl border border-[#E2E8E4] w-full max-w-sm shadow-xs focus-within:border-[#4A6B5D] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#6B7A72] shrink-0" />
            <div className="hidden md:flex items-center bg-[#F8FAFC] py-2 px-4 gap-2.5 rounded-2xl border border-[#E2E8F0] w-full max-w-sm shadow-2xs focus-within:border-[#2F5244] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#64748B] shrink-0" />
              <input
                type="text"
                placeholder="Tìm tuyến trekking, bài viết, nhiệm vụ..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full text-xs text-[#2D3732] placeholder-[#6B7A72] bg-transparent border-0 outline-none font-be-vietnam"
                className="w-full text-xs text-[#1E293B] placeholder-[#94A3B8] bg-transparent border-0 outline-none font-be-vietnam"
              />
            </div>

            {/* Right: Actions (Báo cáo sự cố + RE-Points + Avatar) */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Nút Đỏ Báo Cáo Sự Cố Môi Trường Toàn Hệ Thống */}
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-[#B8442C] hover:bg-[#963723] !text-white text-xs font-bold font-be-vietnam transition-all shadow-xs flex items-center gap-2 cursor-pointer border-0"
                className="px-3.5 py-2 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] !text-white text-xs font-bold font-be-vietnam transition-all shadow-xs flex items-center gap-2 cursor-pointer border-0"
              >
                <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                <span className="!text-white hidden sm:inline">🚨 Báo Cáo Sự Cố</span>
              </button>

              {/* RE-Points Badge */}
              <div className="hidden sm:flex items-center bg-[#E9EFEC] py-2 px-3.5 gap-2 rounded-full border border-[#DCE5DF]">
                <Award className="w-4 h-4 text-[#4A6B5D]" />
                <span className="text-[#4A6B5D] text-xs font-bold font-be-vietnam">
              <div className="hidden sm:flex items-center bg-[#EFF6F2] py-2 px-3.5 gap-2 rounded-full border border-[#D4E2D9]">
                <Award className="w-4 h-4 text-[#2F5244]" />
                <span className="text-[#2F5244] text-xs font-bold font-be-vietnam">
                  {userPoints} RE-Points
                </span>
              </div>

              {/* User Avatar */}
              <div 
                onClick={() => navigate("/dashboard/profile")}
                title="Hồ sơ của bạn"
                className="flex items-center justify-center bg-[#4A6B5D] hover:bg-[#3B5A45] text-white w-9 h-9 rounded-2xl font-bold text-xs shadow-xs font-fraunces cursor-pointer transition-colors overflow-hidden border border-[#DCE5DF]"
                className="flex items-center justify-center bg-[#2F5244] hover:bg-[#243E33] text-white w-9 h-9 rounded-2xl font-bold text-xs shadow-xs font-fraunces cursor-pointer transition-colors overflow-hidden border border-[#D4E2D9]"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
            </div>

          </div>
        </header>


        {/* Page Content Rendered via Outlet */}
        <main className="flex-1 min-w-0">
          <Outlet 
            context={{ 
              openSidebar: () => setSidebarOpen(true),
              openIncidentModal: () => setIsIncidentModalOpen(true),
              globalSearch,
              userPoints,
              updateUserPoints,
              currentUser,
              setCurrentUser
            }} 
          />
        </main>
      </div>

      {/* Floating Action Button for Community Chat */}
      <button
        type="button"
        title="Hỗ trợ & Cộng đồng"
        onClick={() => navigate("/dashboard/community")}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-[#3B5A45] hover:bg-[#2e4736] text-white rounded-full shadow-[0px_8px_24px_#3B5A4557] transition-transform hover:scale-105 border-0 cursor-pointer"
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
