import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building,
  Check,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";

const DEPARTMENT_OPTIONS = [
  { value: "Đội kiểm lâm Sơn Trà", label: "Đội kiểm lâm Sơn Trà" },
  { value: "Tổ tuần tra Bãi Nam", label: "Tổ tuần tra Bãi Nam" },
  { value: "Trạm Checkpoint Chùa Linh Ứng", label: "Trạm checkpoint Chùa Linh Ứng" },
  { value: "Tổ Cứu Hộ Đỉnh Bàn Cờ", label: "Tổ cứu hộ đỉnh Bàn Cờ" },
  { value: "Ban Giám Đốc BQL", label: "Ban giám đốc BQL" },
];

const UsersListView = ({ users, loading, onRefresh, onToggleStatus }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  return (
    <section className="sr-table-card">
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)]">
        <div className="flex flex-col gap-0.5">
          <h2 className="sr-h2 m-0">Danh sách tài khoản ({filtered.length})</h2>
          <span className="text-xs text-[var(--sr-text-muted)]">
            Dữ liệu đồng bộ trực tiếp từ cơ sở dữ liệu hệ thống
          </span>
        </div>

        <div className="sr-toolbar-group">
          <button
            type="button"
            onClick={onRefresh}
            className="sr-btn sr-btn-sm sr-btn-secondary"
            title="Tải lại danh sách"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            <span>Tải lại</span>
          </button>

          <div className="sr-toolbar-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="text"
              aria-label="Tìm theo tên, email, SĐT"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p role="status" className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
          Đang tải danh sách tài khoản...
        </p>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
          Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
        </p>
      ) : (
        <div className="sr-table-scroll">
          <table className="sr-table">
            <caption className="sr-only">Danh sách tài khoản người dùng hệ thống</caption>
            <thead>
              <tr>
                <th scope="col">Họ và tên</th>
                <th scope="col">Email</th>
                <th scope="col">Số điện thoại</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Điểm RE-Points</th>
                <th scope="col">Ngày đăng ký</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isLocked = user.status === "locked" || user.status === "inactive";
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="sr-avatar" aria-hidden="true">
                          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </span>
                        <span className="font-semibold">{user.name || "Người dùng ReLoop"}</span>
                      </div>
                    </td>
                    <td className="text-xs text-[var(--sr-text-secondary)]">
                      {user.email || "Chưa có"}
                    </td>
                    <td className="text-xs text-[var(--sr-text-secondary)]">
                      {user.phone || "Chưa cung cấp"}
                    </td>
                    <td>
                      <span className="sr-badge sr-badge-neutral">{user.role_label}</span>
                    </td>
                    <td className="font-semibold text-[var(--sr-accent-ink)] sr-tabular">
                      {user.total_eco_points?.toLocaleString("vi-VN") || 0} pts
                    </td>
                    <td className="text-xs text-[var(--sr-text-muted)]">{user.created_at}</td>
                    <td>
                      <span className={`sr-badge ${!isLocked ? "sr-badge-moss" : "sr-badge-urgent"}`}>
                        <span className="sr-badge-dot" aria-hidden="true" />
                        <span>{!isLocked ? "Đang hoạt động" : "Đã khóa"}</span>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(user.id, user.name || user.email, isLocked)}
                        className={`sr-btn sr-btn-sm ${
                          !isLocked ? "sr-btn-destructive" : "sr-btn-secondary"
                        }`}
                      >
                        {!isLocked ? (
                          <>
                            <Lock size={13} aria-hidden="true" />
                            <span>Khóa</span>
                          </>
                        ) : (
                          <>
                            <Unlock size={13} aria-hidden="true" />
                            <span>Mở khóa</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const StaffAccountFormSection = ({
  formData,
  setFormData,
  handleChange,
  permissions,
  togglePermission,
  showPassword,
  setShowPassword,
  generateNewPassword,
  handleSubmit,
  handleCancel,
  loading,
}) => {
  return (
    <section className="sr-card">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--sr-border)]">
        <span className="sr-avatar" aria-hidden="true">
          <BadgeCheck size={18} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="sr-h2 m-0">Tạo mới tài khoản nhân viên BQL thực địa (Staff)</h2>
          <p className="text-xs text-[var(--sr-text-muted)] m-0">
            Cấp quyền kiểm soát trạm cân rác checkpoint, tiếp nhận sự cố hiện trường và dẫn đoàn
            trekking.
          </p>
        </div>
      </div>

      <div className="sr-grid-2">
        <div className="sr-field">
          <label htmlFor="staff-code" className="sr-field-label">
            Mã nhân viên BQL *
          </label>
          <input
            id="staff-code"
            type="text"
            name="employeeCode"
            value={formData.employeeCode}
            onChange={handleChange}
            placeholder="VD: BQL-2026-009"
            className="sr-input"
          />
        </div>

        <div className="sr-field">
          <label htmlFor="staff-name" className="sr-field-label">
            Họ và tên nhân viên *
          </label>
          <input
            id="staff-name"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Ví dụ: Nguyễn Văn Hoàng"
            className="sr-input"
          />
        </div>

        <div className="sr-field">
          <label htmlFor="staff-email" className="sr-field-label">
            Email công vụ đăng nhập *
          </label>
          <input
            id="staff-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="hoangnv.bql@sontra.gov.vn"
            className="sr-input"
          />
        </div>

        <div className="sr-field">
          <label htmlFor="staff-phone" className="sr-field-label">
            Số điện thoại công vụ
          </label>
          <input
            id="staff-phone"
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0912 345 678"
            className="sr-input"
          />
        </div>

        <div className="sr-field">
          <span className="sr-field-label">Phòng ban / trạm trực</span>
          <SaasSelect
            value={formData.department}
            options={DEPARTMENT_OPTIONS}
            onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
            className="w-full"
          />
        </div>

        <div className="sr-field">
          <label htmlFor="staff-pos" className="sr-field-label">
            Chức vụ
          </label>
          <input
            id="staff-pos"
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="Kiểm lâm viên / nhân viên trạm cân rác"
            className="sr-input"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="staff-pass" className="sr-field-label">
            Mật khẩu khởi tạo ban đầu
          </label>
          <button
            type="button"
            onClick={generateNewPassword}
            className="sr-btn sr-btn-sm sr-btn-ghost text-[var(--sr-accent-ink)]"
          >
            <Sparkles size={13} aria-hidden="true" />
            <span>Tạo ngẫu nhiên mật khẩu mạnh</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="staff-pass"
            type={showPassword ? "text" : "password"}
            value={formData.tempPassword}
            onChange={(e) =>
              handleChange({ target: { name: "tempPassword", value: e.target.value } })
            }
            className="sr-input font-mono"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword(!showPassword)}
            className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold m-0">Danh mục phân quyền tác nghiệp:</h3>
        <div className="sr-grid-2">
          {permissions.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.selected}
              onClick={() => togglePermission(p.id)}
              className={`sr-card-item flex-row items-center gap-2.5 text-left cursor-pointer ${
                p.selected ? "is-selected bg-[var(--sr-accent-soft)]" : ""
              }`}
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                  p.selected
                    ? "bg-[var(--sr-accent)] border-[var(--sr-accent)] text-[var(--sr-on-accent)]"
                    : "border-[var(--sr-border-strong)]"
                }`}
              >
                {p.selected && <Check size={12} aria-hidden="true" />}
              </span>
              <span className="text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--sr-border)]">
        <button type="button" onClick={handleCancel} className="sr-btn sr-btn-sm sr-btn-secondary">
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="sr-btn sr-btn-sm sr-btn-primary"
        >
          {loading ? (
            <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
          <span>{loading ? "Đang tạo..." : "Lưu và cấp tài khoản"}</span>
        </button>
      </div>
    </section>
  );
};

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("customer");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    customers: 0,
    vendors: 0,
    staffs: 0,
  });

  const [formData, setFormData] = useState({
    employeeCode: "BQL-2026-005",
    fullName: "",
    email: "",
    phone: "",
    department: "Đội kiểm lâm Sơn Trà",
    position: "Kiểm lâm viên tuần tra",
    tempPassword: "SonTra@ReLoop2026",
  });

  const [permissions, setPermissions] = useState([
    { id: "scan_waste", label: "Cân rác & quét QR Eco-Trash checkpoint", selected: true },
    { id: "view_incidents", label: "Tiếp nhận và xử lý báo cáo sự cố thực địa", selected: true },
    { id: "guide_tour", label: "Dẫn đoàn & xác thực checkpoint du khách", selected: true },
    { id: "manage_alerts", label: "Phát cảnh báo khẩn cấp lên ứng dụng", selected: false },
  ]);

  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async (role = activeTab) => {
    setLoading(true);
    try {
      const res = await api.get("/accounts/users/", { params: { role } });
      const data = res.data;
      if (data?.results) {
        setUsers(data.results);
        setCounts({
          customers: data.total_customers,
          vendors: data.total_vendors,
          staffs: data.total_staffs,
        });
      }
    } catch {
      /* Keep existing state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "create") {
      fetchUsers(activeTab);
    }
  }, [activeTab]);

  const handleToggleStatus = async (userId, userName, isCurrentlyLocked) => {
    const actionText = isCurrentlyLocked ? "Mở khóa" : "Tạm khóa";
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của "${userName}"?`)) {
      return;
    }

    try {
      const res = await api.post(`/accounts/users/${userId}/toggle-status/`);
      const data = res.data;
      if (data?.success) {
        alert(`${data.message}`);
        fetchUsers(activeTab);
      } else {
        alert(`Lỗi: ${data?.error || "Không thể đổi trạng thái"}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message;
      alert(errMsg ? `Lỗi: ${errMsg}` : "Không thể kết nối tới Backend!");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePermission = (id) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const generateNewPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "ST@";
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, tempPassword: pass }));
  };

  const handleCancel = () => {
    setFormData({
      employeeCode: "BQL-2026-005",
      fullName: "",
      email: "",
      phone: "",
      department: "Đội kiểm lâm Sơn Trà",
      position: "Kiểm lâm viên tuần tra",
      tempPassword: "SonTra@ReLoop2026",
    });
  };

  const handleSubmitStaff = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.employeeCode) {
      alert("Vui lòng điền đầy đủ mã nhân viên, họ tên và email công vụ!");
      return;
    }

    setLoading(true);
    const payload = {
      employee_code: formData.employeeCode,
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      password: formData.tempPassword,
      permissions: permissions.filter((p) => p.selected).map((p) => p.id),
    };

    try {
      const response = await api.post("/accounts/staffs/", payload);
      const resData = response.data;
      if (resData?.status === "success") {
        alert(
          `Đã cấp tài khoản nhân viên BQL thành công!\n\n` +
            `Mã nhân viên: ${resData.data.employee_code}\n` +
            `Họ tên: ${resData.data.name}\n` +
            `Email đăng nhập: ${resData.data.email}\n` +
            `Mật khẩu: ${formData.tempPassword}`
        );
        handleCancel();
        setActiveTab("staff");
      } else {
        const errorMsg = resData?.errors
          ? Object.entries(resData.errors)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : resData?.message || "Không thể tạo tài khoản";
        alert(`Lỗi tạo tài khoản:\n\n${errorMsg}`);
      }
    } catch (err) {
      const resData = err.response?.data;
      if (resData) {
        const errorMsg = resData.errors
          ? Object.entries(resData.errors)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : resData.message || resData.error || "Không thể tạo tài khoản";
        alert(`Lỗi tạo tài khoản:\n\n${errorMsg}`);
      } else {
        alert("Không thể kết nối tới API backend!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Quản trị tài khoản & phân quyền"
        subtitle="Kiểm soát phân quyền cán bộ BQL, đơn vị lữ hành và tài khoản du khách trên toàn nền tảng"
        actions={
          <div className="sr-segment-group" role="group" aria-label="Nhóm tài khoản">
            <button
              type="button"
              aria-pressed={activeTab === "customer"}
              onClick={() => setActiveTab("customer")}
              className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                activeTab === "customer" ? "is-selected" : ""
              }`}
            >
              <Users size={13} aria-hidden="true" />
              <span>Du khách ({counts.customers})</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "vendor"}
              onClick={() => setActiveTab("vendor")}
              className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                activeTab === "vendor" ? "is-selected" : ""
              }`}
            >
              <Building size={13} aria-hidden="true" />
              <span>Vendor ({counts.vendors})</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "staff"}
              onClick={() => setActiveTab("staff")}
              className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                activeTab === "staff" ? "is-selected" : ""
              }`}
            >
              <Shield size={13} aria-hidden="true" />
              <span>Cán bộ BQL ({counts.staffs})</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "create"}
              onClick={() => setActiveTab("create")}
              className={`sr-segment-btn inline-flex items-center gap-1.5 ${
                activeTab === "create" ? "is-selected" : ""
              }`}
            >
              <UserPlus size={13} aria-hidden="true" />
              <span>Cấp tài khoản staff</span>
            </button>
          </div>
        }
      />

      {activeTab === "create" ? (
        <StaffAccountFormSection
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          permissions={permissions}
          togglePermission={togglePermission}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          generateNewPassword={generateNewPassword}
          handleSubmit={handleSubmitStaff}
          handleCancel={handleCancel}
          loading={loading}
        />
      ) : (
        <UsersListView
          users={users}
          loading={loading}
          onRefresh={() => fetchUsers(activeTab)}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}
