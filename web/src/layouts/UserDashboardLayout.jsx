import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  CalendarCheck,
  Compass,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Mountain,
  Search,
  Sparkles,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import IncidentReportModal from "../features/dashboard/components/IncidentReportModal";
import NotificationBell from "../components/notifications/NotificationBell";
import { UserEcoProvider, useUserEco } from "../context/UserEcoContext";
import weatherService from "../services/weatherService";

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
  const [weather, setWeather] = useState(null);
  const [loginBubble, setLoginBubble] = useState(() => {
    try {
      if (sessionStorage.getItem("sr_login_bubble") === "1") {
        sessionStorage.removeItem("sr_login_bubble");
        return true;
      }
    } catch {
      // Ignore storage access errors
    }
    return false;
  });

  useEffect(() => {
    if (!loginBubble) return undefined;
    const timer = window.setTimeout(() => setLoginBubble(false), 600);
    return () => window.clearTimeout(timer);
  }, [loginBubble]);

  const { user, points, updatePoints, setUser, refreshEcoData } = useUserEco();
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const userInitials = user?.avatarText || "ST";
  const userAvatar = user?.avatarUrl;

  useEffect(() => {
    let mounted = true;
    weatherService
      .getSonTraWeather()
      .then((data) => {
        if (mounted) setWeather(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { id: "home", label: "Tổng quan", icon: Compass, path: "/dashboard/home" },
    { id: "trekking", label: "Khám phá tour", icon: MapIcon, path: "/dashboard/trekking" },
    { id: "bookings", label: "Đơn đặt của tôi", icon: CalendarCheck, path: "/dashboard/bookings" },
    { id: "flash_sale", label: "Flash sale", icon: Zap, path: "/dashboard/flash-sale", dot: true },
    { id: "vouchers", label: "Điểm và voucher", icon: Ticket, path: "/dashboard/marketplace" },
    { id: "inbox", label: "Phòng chat cộng đồng", icon: MessageSquare, path: "/dashboard/inbox" },
    { id: "assistant", label: "Trợ lý AI", icon: Sparkles, path: "/dashboard/assistant" },
  ];

  const isItemActive = (itemPath) => {
    if (itemPath === "/dashboard/home" && location.pathname === "/dashboard") return true;
    return location.pathname.startsWith(itemPath);
  };

  const getPageTitle = (pathname) => {
    if (pathname.startsWith("/dashboard/assistant")) return "Trợ lý AI REloop";
    if (pathname.startsWith("/dashboard/trekking")) return "Khám phá tour";
    if (pathname.startsWith("/dashboard/bookings")) return "Quản lý đơn đặt tour";
    if (pathname.startsWith("/dashboard/flash-sale")) return "Flash sale suất khởi hành";
    if (pathname.startsWith("/dashboard/inbox")) return "Phòng chat cộng đồng & Chuyến đi";
    if (pathname.startsWith("/dashboard/marketplace")) return "Điểm thưởng & Voucher";
    if (pathname.startsWith("/dashboard/tasks") || pathname.startsWith("/dashboard/missions")) {
      return "Nhiệm vụ Xanh";
    }
    if (pathname.startsWith("/dashboard/community")) return "Cộng đồng";
    if (pathname.startsWith("/dashboard/profile")) return "Hồ sơ cá nhân";
    return "Tổng quan";
  };

  const isHomePage =
    location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/home");
  const isTrekkingPage = location.pathname.startsWith("/dashboard/trekking");
  const isFlashSalePage = location.pathname.startsWith("/dashboard/flash-sale");
  const isFlushPage =
    location.pathname.startsWith("/dashboard/inbox") ||
    location.pathname.startsWith("/dashboard/assistant");
  const isProfilePage = location.pathname.startsWith("/dashboard/profile");

  const mobileTabs = [
    {
      id: "home",
      label: "Tổng quan",
      icon: Compass,
      active: isHomePage,
      onClick: () => navigate("/dashboard/home"),
    },
    {
      id: "tours",
      label: "Tour",
      icon: MapIcon,
      active: isTrekkingPage || location.pathname.startsWith("/dashboard/bookings"),
      onClick: () => navigate("/dashboard/trekking"),
    },
    {
      id: "flash",
      label: "Flash sale",
      icon: Zap,
      active: isFlashSalePage,
      onClick: () => navigate("/dashboard/flash-sale"),
    },
    {
      id: "vouchers",
      label: "Voucher",
      icon: Ticket,
      active: location.pathname.startsWith("/dashboard/marketplace"),
      onClick: () => navigate("/dashboard/marketplace"),
    },
    {
      id: "chat",
      label: "AI & Chat",
      icon: Sparkles,
      active:
        location.pathname.startsWith("/dashboard/inbox") ||
        location.pathname.startsWith("/dashboard/assistant"),
      onClick: () => navigate("/dashboard/assistant"),
    },
  ];

  const weatherLine = weather
    ? `Sơn Trà ${weather.temperature}°C · Độ ẩm ${weather.humidity}% · Tuyến mở an toàn`
    : "Sơn Trà 26°C · Tuyến mở an toàn";

  return (
    <div className={`sr-shell ${loginBubble ? "is-login-bubble" : ""}`}>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh điều hướng"
          className="sr-drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Điều hướng cổng du khách"
        className={`sr-sidebar ${sidebarOpen ? "is-open" : ""}`}
      >
        <div className="sr-sidebar-top">
          <div className="sr-brand-row">
            <Link
              to="/dashboard/home"
              className="sr-brand-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-brand-mark" aria-hidden="true">
                <Mountain size={16} strokeWidth={2} />
              </span>
              <span className="sr-brand-copy">
                <span className="sr-brand-name">Sơn Trà ReLoop</span>
                <span className="sr-brand-sub">Cổng du khách</span>
              </span>
            </Link>

            <button
              type="button"
              aria-label="Đóng menu điều hướng"
              className="sr-drawer-close"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="sr-nav-list" aria-label="Danh mục chính">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const active = isItemActive(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`sr-nav-item ${active ? "is-selected" : ""}`}
                >
                  <IconComp size={15} className="sr-nav-icon" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.dot && <span className="sr-nav-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          aria-label="Mở hồ sơ của bạn"
          aria-current={isProfilePage ? "page" : undefined}
          onClick={() => {
            navigate("/dashboard/profile");
            setSidebarOpen(false);
          }}
          className="sr-sidebar-user"
        >
          <span className="sr-avatar" aria-hidden="true">
            {userAvatar ? <img src={userAvatar} alt="" /> : userInitials}
          </span>
          <span className="sr-user-meta">
            <span className="sr-user-name">{userName}</span>
            <span className="sr-user-pts sr-tabular">{Number(points || 0).toLocaleString("vi-VN")} RE-Points</span>
          </span>
        </button>
      </aside>

      <div className="sr-workspace">
        <header className="sr-topbar">
          <div className="sr-topbar-left">
            <button
              type="button"
              aria-label="Mở menu điều hướng"
              className="sr-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <span className="sr-topbar-title">{getPageTitle(location.pathname)}</span>

            {isHomePage && (
              <span className="sr-weather-inline" role="status">
                <span className="sr-weather-dot" aria-hidden="true" />
                <span>{weatherLine}</span>
              </span>
            )}
          </div>

          <div className="sr-topbar-right">
            {(isHomePage || isTrekkingPage || isFlashSalePage) && (
              <div className="sr-search-box">
                <Search size={14} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Tìm kiếm tuyến trekking hoặc voucher"
                  placeholder="Tìm tuyến, voucher"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>
            )}

            <button
              type="button"
              className="sr-pts-link sr-tabular"
              aria-label={`Điểm thưởng hiện tại: ${points} RE-Points`}
              onClick={() => navigate("/dashboard/marketplace")}
            >
              {Number(points || 0).toLocaleString("vi-VN")} RE-Points
            </button>

            <NotificationBell role="customer" />
          </div>
        </header>

        <main key={location.pathname} className={`sr-main ${isFlushPage ? "is-flush" : ""}`}>
          <Outlet
            context={{
              openSidebar: () => setSidebarOpen(true),
              openIncidentModal: () => setIsIncidentModalOpen(true),
              globalSearch,
              userPoints: points,
              updateUserPoints: updatePoints,
              currentUser: user,
              setCurrentUser: setUser,
              refreshEcoData,
            }}
          />
        </main>
      </div>

      <nav className="sr-mobile-dock" aria-label="Điều hướng nhanh trên di động">
        {mobileTabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={tab.active ? "page" : undefined}
              onClick={tab.onClick}
              className={`sr-mobile-tab ${tab.active ? "is-selected" : ""}`}
            >
              <TabIcon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSuccess={(inc) => {
          alert(
            `Đã tiếp nhận báo cáo sự cố #${inc.id}. Cảm ơn bạn đã chung tay bảo vệ bán đảo Sơn Trà.`
          );
        }}
      />
    </div>
  );
}
