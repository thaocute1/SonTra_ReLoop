import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { api } from "../lib/axios";
import { vendorApplicationService } from "../services/vendorApplicationService";
import NotificationBell from "../components/notifications/NotificationBell";
import AdminProfileModal from "../components/admin/AdminProfileModal";
import { useSidebarCollapse } from "../hooks/useSidebarCollapse";
import { SidebarRailTooltip } from "../components/ui/SaasPrimitives";

const PAGE_TITLES = {
  "/admin/dashboard": "Tổng quan",
  "/admin/incidents": "Báo cáo sự cố thực địa",
  "/admin/fund-allocation": "Quỹ bảo tồn",
  "/admin/vendors": "Kiểm duyệt đối tác",
  "/admin/tours": "Duyệt & xuất bản tour",
  "/admin/payouts": "Đối soát & payout",
  "/admin/reports": "Báo cáo & thống kê",
  "/admin/content": "Tin tức & sự kiện",
  "/admin/campaigns": "Chiến dịch & giờ vàng",
  "/admin/users": "Quản lý tài khoản",
  "/admin/missions/review": "Duyệt nhiệm vụ xanh",
  "/admin/assistant": "REloop Assistant",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed, toggleCollapsed, tooltip, showTooltip, hideTooltip } = useSidebarCollapse(
    "sr_admin_sidebar_collapsed"
  );
  const [globalSearch, setGlobalSearch] = useState("");
  const [hasUnreadIncidents, setHasUnreadIncidents] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingToursCount, setPendingToursCount] = useState(0);

  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();
  const isSystemAdmin = userRole === "system_admin";
  const [userName, setUserName] = useState(
    () => localStorage.getItem("user_name") || "Nguyễn Tuấn Phong"
  );
  const [profileOpen, setProfileOpen] = useState(false);

  const handleProfileUpdated = (updatedUser) => {
    const nextName = updatedUser?.name || updatedUser?.email;
    if (nextName) setUserName(nextName);
  };
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "AD";

  const pageTitle = PAGE_TITLES[location.pathname] || "Cổng quản trị BQL";

  const fetchLiveCounts = async () => {
    try {
      const [incResult, vStatsResult, toursResult] = await Promise.allSettled([
        api.get("/cms-chatbot/incidents/admin/"),
        vendorApplicationService.getStats(),
        api.get("/tours/admin/review-queue/", { params: { page_size: 1 } }),
      ]);

      if (incResult.status === "fulfilled") {
        const incData = incResult.value.data;
        const pendingCount = incData?.pending_count || 0;
        const totalCount = incData?.total_incidents ?? (incData?.results?.length || 0);
        const latestIncident = incData?.results?.[0];

        if (totalCount === 0 || pendingCount === 0) {
          setHasUnreadIncidents(false);
        } else if (location.pathname === "/admin/incidents") {
          setHasUnreadIncidents(false);
          if (latestIncident) {
            localStorage.setItem("admin_last_read_incident_id", String(latestIncident.id));
          }
        } else {
          const lastReadId = localStorage.getItem("admin_last_read_incident_id");
          setHasUnreadIncidents(Boolean(latestIncident && lastReadId !== String(latestIncident.id)));
        }
      }

      if (vStatsResult.status === "fulfilled") {
        const vStats = vStatsResult.value;
        if (vStats && typeof vStats.pending === "number") {
          setPendingApprovalsCount(vStats.pending);
        }
      }

      if (toursResult.status === "fulfilled") {
        setPendingToursCount(toursResult.value.data?.metrics?.pending_approval || 0);
      }
    } catch {
      /* Ignore background count polling errors */
    }
  };

  const markIncidentsAsRead = () => {
    setHasUnreadIncidents(false);
    api
      .get("/cms-chatbot/incidents/admin/")
      .then((res) => {
        const latest = res.data?.results?.[0];
        if (latest) {
          localStorage.setItem("admin_last_read_incident_id", String(latest.id));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 15000);
    const handleUpdate = () => fetchLiveCounts();
    window.addEventListener("incidents-updated", handleUpdate);
    window.addEventListener("vendor-applications-updated", handleUpdate);
    window.addEventListener("tour-reviews-updated", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("incidents-updated", handleUpdate);
      window.removeEventListener("vendor-applications-updated", handleUpdate);
      window.removeEventListener("tour-reviews-updated", handleUpdate);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi Cổng quản trị BQL?")) return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_eco_stats");
    navigate("/bql-portal/login", { replace: true });
  };

  const navGroups = [
    {
      title: "Tổng quan & Bảo tồn",
      items: [
        ...(userRole === "staff"
          ? [{ label: "Trạm kiểm lâm (Staff)", path: "/staff/dashboard", icon: LayoutDashboard }]
          : []),
        { label: "Tổng quan", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Báo cáo sự cố", path: "/admin/incidents", icon: AlertTriangle, hasDot: hasUnreadIncidents },
        { label: "Quỹ bảo tồn", path: "/admin/fund-allocation", icon: ShieldCheck },
      ],
    },
    {
      title: "Đối tác & Doanh thu",
      items: [
        { label: "Kiểm duyệt vendor", path: "/admin/vendors", icon: Building2, badge: pendingApprovalsCount },
        { label: "Duyệt tour", path: "/admin/tours", icon: Compass, badge: pendingToursCount },
        ...(isSystemAdmin ? [{ label: "Đối soát & Payout", path: "/admin/payouts", icon: Wallet }] : []),
        { label: "Báo cáo & Thống kê", path: "/admin/reports", icon: TrendingUp },
      ],
    },
    {
      title: "Nội dung & Hệ thống",
      items: [
        { label: "Duyệt nhiệm vụ xanh", path: "/admin/missions/review", icon: ShieldCheck },
        { label: "Tin tức & Sự kiện", path: "/admin/content", icon: FileText },
        { label: "Chiến dịch & Giờ vàng", path: "/admin/campaigns", icon: Zap },
        ...(isSystemAdmin ? [{ label: "Quản lý tài khoản", path: "/admin/users", icon: Users }] : []),
        { label: "REloop Assistant", path: "/admin/assistant", icon: Sparkles },
      ],
    },
  ];

  const mobileTabs = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, path: userRole === "staff" ? "/staff/dashboard" : "/admin/dashboard" },
    { id: "incidents", label: "Sự cố", icon: AlertTriangle, path: "/admin/incidents" },
    { id: "tours", label: "Duyệt tour", icon: Compass, path: "/admin/tours" },
    ...(isSystemAdmin ? [{ id: "payouts", label: "Đối soát", icon: Wallet, path: "/admin/payouts" }] : []),
    { id: "reports", label: "Báo cáo", icon: TrendingUp, path: "/admin/reports" },
  ];

  const isFlushPage = location.pathname === "/admin/assistant";

  return (
    <div className="sr-shell">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh điều hướng quản trị"
          className="sr-drawer-backdrop motion-backdrop-enter"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Điều hướng cổng quản trị BQL"
        className={`sr-sidebar ${sidebarOpen ? "is-open motion-drawer-enter" : ""} ${collapsed ? "is-collapsed" : ""}`}
      >
        <div className="sr-sidebar-top">
          <div className="sr-brand-row">
            <Link
              to="/admin/dashboard"
              className="sr-brand-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-brand-mark" aria-hidden="true">
                <ShieldCheck size={16} strokeWidth={2} />
              </span>
              <span className="sr-brand-copy">
                <span className="sr-brand-name">Sơn Trà REloop</span>
                <span className="sr-brand-sub">Cổng quản trị BQL</span>
              </span>
            </Link>

            <button
              type="button"
              aria-label="Đóng menu quản trị"
              className="sr-drawer-close"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="sr-nav-groups" aria-label="Danh mục nghiệp vụ BQL">
            {navGroups.map((group) => (
              <div key={group.title} className="sr-nav-group">
                <p className="sr-nav-group-title">{group.title}</p>
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      aria-label={collapsed ? item.label : undefined}
                      onMouseEnter={(e) => showTooltip(item.label, e.currentTarget)}
                      onMouseLeave={hideTooltip}
                      onFocus={(e) => showTooltip(item.label, e.currentTarget)}
                      onBlur={hideTooltip}
                      onClick={() => {
                        setSidebarOpen(false);
                        if (item.path === "/admin/incidents") {
                          markIncidentsAsRead();
                        }
                      }}
                      className={({ isActive }) =>
                        `sr-nav-item ${isActive ? "is-selected" : ""}`
                      }
                    >
                      <IconComp size={15} className="sr-nav-icon" aria-hidden="true" />
                      <span className="sr-nav-label flex-1 truncate">{item.label}</span>
                      {item.hasDot ? (
                        <span
                          className="sr-nav-badge-dot"
                          title="Có báo cáo sự cố mới chưa đọc"
                          aria-label="Có sự cố mới"
                        />
                      ) : item.badge > 0 ? (
                        <span className="sr-nav-badge-count">{item.badge}</span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={collapsed ? `${userName} · ${isSystemAdmin ? "Quản trị viên BQL" : "Nhân viên BQL"}` : "Mở hồ sơ cá nhân BQL"}
            onMouseEnter={(e) => showTooltip(`${userName} · ${isSystemAdmin ? "Quản trị viên BQL" : "Nhân viên BQL"}`, e.currentTarget)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip(`${userName} · ${isSystemAdmin ? "Quản trị viên BQL" : "Nhân viên BQL"}`, e.currentTarget)}
            onBlur={hideTooltip}
            onClick={() => {
              setProfileOpen(true);
              setSidebarOpen(false);
            }}
            className="sr-sidebar-user"
          >
            <span className="sr-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="sr-user-meta">
              <span className="sr-user-name">{userName}</span>
              <span className="sr-user-pts">{isSystemAdmin ? "Quản trị viên BQL" : "Nhân viên BQL"}</span>
            </span>
          </button>

          <button
            type="button"
            aria-label={collapsed ? "Đăng xuất" : undefined}
            onMouseEnter={(e) => showTooltip("Đăng xuất", e.currentTarget)}
            onMouseLeave={hideTooltip}
            onFocus={(e) => showTooltip("Đăng xuất", e.currentTarget)}
            onBlur={hideTooltip}
            onClick={handleLogout}
            className="sr-btn sr-btn-sm sr-btn-destructive-ghost justify-start sr-sidebar-logout"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="sr-workspace">
        <header className="sr-topbar">
          <div className="sr-topbar-left">
            <button
              type="button"
              aria-label="Mở menu quản trị"
              className="sr-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Mở rộng sidebar (Ctrl+B)" : "Thu gọn sidebar (Ctrl+B)"}
              className="sr-collapse-btn"
              onClick={toggleCollapsed}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <span className="sr-topbar-title">{pageTitle}</span>

            <span className="sr-badge sr-badge-moss hidden sm:inline-flex">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>Ban Quản lý Sơn Trà</span>
            </span>
          </div>

          <div className="sr-topbar-right">
            {!isFlushPage && (
              <div className="sr-search-box">
                <Search size={14} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Tìm đối tác, sự cố, hồ sơ"
                  placeholder="Tìm đối tác, sự cố, hồ sơ..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>
            )}

            <NotificationBell role={userRole === "staff" ? "staff" : "admin"} />
          </div>
        </header>

        <main key={location.pathname} className={`sr-main motion-page-enter ${isFlushPage ? "is-flush" : ""}`}>
          <Outlet context={{ globalSearch, setGlobalSearch }} />
        </main>
      </div>

      <nav className="sr-mobile-dock" aria-label="Điều hướng nhanh quản trị">
        {mobileTabs.map((tab) => {
          const TabIcon = tab.icon;
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(tab.path)}
              className={`sr-mobile-tab ${active ? "is-selected" : ""}`}
            >
              <TabIcon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {profileOpen && (
        <AdminProfileModal
          onClose={() => setProfileOpen(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
      <SidebarRailTooltip tooltip={tooltip} />
    </div>
  );
}
