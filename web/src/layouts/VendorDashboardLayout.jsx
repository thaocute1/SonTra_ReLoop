import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mountain,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/axios";
import NotificationBell from "../components/notifications/NotificationBell";
import { VendorCompanyProfile } from "../pages/vendor/VendorCompanyProfile";
import { VENDOR_LABELS } from "../constants/labels";

function readCachedProfile() {
  try {
    return JSON.parse(localStorage.getItem("current_vendor_profile") || "null") || {};
  } catch {
    return {};
  }
}

export default function VendorDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [vendorInfo, setVendorInfo] = useState(() => ({
    brand_name: localStorage.getItem("user_name")?.trim() || VENDOR_LABELS.BRAND_DEFAULT,
    status_label: VENDOR_LABELS.ROLE_LABEL,
    avatar_text: "ST",
    ...readCachedProfile(),
  }));

  const profileOpen = searchParams.get("profile") === "1";
  const currentTab = searchParams.get("tab");

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/vendors/dashboard/", {
        params: { period: "3m" },
        signal: controller.signal,
        timeout: 15000,
      })
      .then((res) => {
        const info = res.data?.data?.vendor_info;
        if (info && !controller.signal.aborted) {
          setVendorInfo((prev) => ({ ...prev, ...info }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const closeProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("profile");
    setSearchParams(next, { replace: true });
  };

  const openProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.set("profile", "1");
    setSearchParams(next);
  };

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi Cổng đối tác?")) return;
    [
      "access_token",
      "refresh_token",
      "user_info",
      "user_role",
      "user_name",
      "current_vendor_profile",
    ].forEach((key) => localStorage.removeItem(key));
    navigate("/partner/login", { replace: true });
  };

  const pathname = location.pathname;
  const isDashboardRoot =
    pathname.endsWith("/dashboard") || pathname === "/vendor" || pathname === "/partner";

  const activeKey = profileOpen
    ? "profile"
    : isDashboardRoot
      ? currentTab === "guides"
        ? "guides"
        : currentTab === "revenue"
          ? "revenue"
          : "dashboard"
      : pathname.includes("/experiences") || pathname.includes("/routes")
        ? "experiences"
        : pathname.includes("/bookings")
          ? "bookings"
          : pathname.includes("/inbox")
            ? "inbox"
            : pathname.includes("/assistant")
              ? "assistant"
              : "dashboard";

  const navItems = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, path: "/vendor/dashboard" },
    { id: "experiences", label: "Trải nghiệm & GPS", icon: Compass, path: "/vendor/experiences" },
    { id: "guides", label: "Hướng dẫn viên", icon: Users, path: "/vendor/dashboard?tab=guides" },
    { id: "bookings", label: "Lịch & Đơn đặt", icon: CalendarDays, path: "/vendor/bookings" },
    { id: "revenue", label: "Doanh thu & Đối soát", icon: TrendingUp, path: "/vendor/dashboard?tab=revenue" },
    { id: "inbox", label: "Hộp thư điều hành", icon: MessageSquare, path: "/vendor/inbox" },
    { id: "assistant", label: "REloop Assistant", icon: Sparkles, path: "/vendor/assistant" },
    { id: "profile", label: "Hồ sơ doanh nghiệp", icon: Settings, path: `${pathname}?profile=1` },
  ];

  const mobileTabs = [
    {
      id: "dashboard",
      label: "Tổng quan",
      icon: LayoutDashboard,
      active: activeKey === "dashboard",
      onClick: () => navigate("/vendor/dashboard"),
    },
    {
      id: "experiences",
      label: "Trải nghiệm",
      icon: Compass,
      active: activeKey === "experiences",
      onClick: () => navigate("/vendor/experiences"),
    },
    {
      id: "bookings",
      label: "Đơn đặt",
      icon: CalendarDays,
      active: activeKey === "bookings",
      onClick: () => navigate("/vendor/bookings"),
    },
    {
      id: "inbox",
      label: "Hộp thư",
      icon: MessageSquare,
      active: activeKey === "inbox",
      onClick: () => navigate("/vendor/inbox"),
    },
    {
      id: "revenue",
      label: "Đối soát",
      icon: TrendingUp,
      active: activeKey === "revenue",
      onClick: () => navigate("/vendor/dashboard?tab=revenue"),
    },
  ];

  const getContextTitle = () => {
    if (activeKey === "experiences") return "Trải nghiệm & Tuyến GPS";
    if (activeKey === "guides") return "Đội ngũ hướng dẫn viên & Pháp lý";
    if (activeKey === "bookings") return "Lịch & Đơn đặt";
    if (activeKey === "revenue") return "Doanh thu & Đối soát";
    if (activeKey === "inbox") return "Hộp thư điều hành chuyến đi";
    if (activeKey === "assistant") return "REloop Assistant cho Đối tác";
    return "Tổng quan vận hành";
  };

  const isFlushPage = activeKey === "inbox" || activeKey === "assistant";
  const initials =
    vendorInfo.avatar_text ||
    (vendorInfo.brand_name || "ST")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return (
    <div className="sr-shell">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh điều hướng đối tác"
          className="sr-drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Điều hướng cổng đối tác"
        className={`sr-sidebar ${sidebarOpen ? "is-open" : ""}`}
      >
        <div className="sr-sidebar-top">
          <div className="sr-brand-row">
            <Link
              to="/vendor/dashboard"
              className="sr-brand-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-brand-mark" aria-hidden="true">
                <Mountain size={16} strokeWidth={2} />
              </span>
              <span className="sr-brand-copy">
                <span className="sr-brand-name">Sơn Trà REloop</span>
                <span className="sr-brand-sub">{VENDOR_LABELS.PORTAL_TITLE}</span>
              </span>
            </Link>

            <button
              type="button"
              aria-label="Đóng menu đối tác"
              className="sr-drawer-close"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="sr-nav-list" aria-label="Danh mục điều hành đối tác">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const active = activeKey === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (item.id === "profile") {
                      openProfile();
                    } else {
                      navigate(item.path);
                    }
                    setSidebarOpen(false);
                  }}
                  className={`sr-nav-item ${active ? "is-selected" : ""}`}
                >
                  <IconComp size={15} className="sr-nav-icon" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="sr-btn sr-btn-sm sr-btn-destructive-ghost justify-start"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>

          <button
            type="button"
            aria-haspopup="dialog"
            aria-label="Mở hồ sơ doanh nghiệp"
            onClick={() => {
              openProfile();
              setSidebarOpen(false);
            }}
            className="sr-sidebar-user"
          >
            <span className="sr-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="sr-user-meta">
              <span className="sr-user-name">{vendorInfo.brand_name}</span>
              <span className="sr-user-pts">
                {vendorInfo.status_label || VENDOR_LABELS.ROLE_LABEL}
              </span>
            </span>
          </button>
        </div>
      </aside>

      <div className="sr-workspace">
        <header className="sr-topbar">
          <div className="sr-topbar-left">
            <button
              type="button"
              aria-label="Mở menu đối tác"
              className="sr-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <span className="sr-topbar-title">{getContextTitle()}</span>

            <span className="sr-badge sr-badge-moss hidden sm:inline-flex">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>{VENDOR_LABELS.ROLE_LABEL}</span>
            </span>
          </div>

          <div className="sr-topbar-right">
            {!isFlushPage && (
              <div className="sr-search-box">
                <Search size={14} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Tìm mã đơn, tuyến tour"
                  placeholder="Tìm mã đơn, tuyến tour..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>
            )}

            <NotificationBell role="vendor" />

            <button
              type="button"
              onClick={() => navigate("/vendor/experiences")}
              className="sr-btn sr-btn-sm sr-btn-primary hidden md:inline-flex"
            >
              <Plus size={14} aria-hidden="true" />
              <span>{VENDOR_LABELS.CREATE_EXPERIENCE}</span>
            </button>
          </div>
        </header>

        <main key={location.pathname + location.search} className={`sr-main ${isFlushPage ? "is-flush" : ""}`}>
          <Outlet
            context={{
              vendorInfo,
              globalSearch,
              setGlobalSearch,
              openProfile,
              openSidebar: () => setSidebarOpen(true),
            }}
          />
        </main>
      </div>

      <nav className="sr-mobile-dock" aria-label="Điều hướng nhanh đối tác">
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

      {profileOpen && <VendorCompanyProfile onClose={closeProfile} />}
    </div>
  );
}
