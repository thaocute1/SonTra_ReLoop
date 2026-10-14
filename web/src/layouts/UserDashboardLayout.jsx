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
  MessageSquare
} from "lucide-react";
import logoImg from "../assets/logo.jpg";

export default function UserDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const userPoints = user?.points || 350;

  const navItems = [
    { id: "home", label: "Trang chủ", icon: Home, path: "/dashboard/home" },
    { id: "trekking", label: "Trekking An Toàn", icon: ShieldCheck, path: "/dashboard/trekking" },
    { id: "green_tasks", label: "Nhiệm vụ Xanh", icon: Leaf, path: "/dashboard/tasks" },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace" },
    { id: "community", label: "Cộng đồng", icon: Users, path: "/dashboard/community" },
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === "/dashboard/tasks" && location.pathname === "/dashboard/missions") return true;
    if (itemPath === "/dashboard/home" && location.pathname === "/dashboard") return true;
    return location.pathname.startsWith(itemPath);
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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <span className="text-[#2D3732] text-base font-bold tracking-tight font-fraunces">
                Sơn Trà REloop
              </span>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
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
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${active ? "text-[#4A6B5D]" : "text-[#6B7A72]"}`} />
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
          }`}
        >
          <div className="w-9 h-9 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-bold truncate font-fraunces">
              {userName}
            </span>
            <span className="text-[#6B7A72] text-[11px] font-be-vietnam">
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
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
        {/* Mobile Header Bar with Hamburger Menu Toggle */}
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
        </div>

        {/* Page Content Rendered via Outlet */}
        <main className="flex-1 min-w-0">
          <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
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
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E74C3C] border-2 border-white rounded-full" />
      </button>
    </div>
  );
}
