import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  Phone, 
  Briefcase, 
  BadgeCheck, 
  Check, 
  X, 
  Save, 
  Search, 
  UserCheck, 
  Building,
  Key,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';

// Section 1: Header Section with Navigation Tabs (AD-02)
const UserManagementHeader = ({ activeTab, setActiveTab, counts }) => {
  return (
    <div className="w-full bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DCEBE3] text-[#2F5D4A] rounded-lg text-xs font-bold mb-2">
          <Shield className="w-4 h-4" />
          <span>AD-02: quản lý người dùng và phân quyền vai trò</span>
        </div>
        <h1 className="text-2xl font-bold text-[#191C1A]">Quản trị tài khoản và vai trò hệ thống</h1>
        <p className="text-xs text-[#4A514C] mt-1">
          Giám sát du khách, doanh nghiệp lữ hành (Vendor), cán bộ thực địa và kiểm soát khóa / mở khóa tài khoản.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F5F1] p-1.5 rounded-xl border border-[#C5CCC7] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'customer'
              ? 'bg-[#2F5D4A] text-white shadow-xs'
              : 'text-[#4A514C] hover:text-[#191C1A]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Du khách ({counts.customers})</span>
        </button>

        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'vendor'
              ? 'bg-[#2F5D4A] text-white shadow-xs'
              : 'text-[#4A514C] hover:text-[#191C1A]'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Vendor ({counts.vendors})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-[#2F5D4A] text-white shadow-xs'
              : 'text-[#4A514C] hover:text-[#191C1A]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Cán bộ BQL ({counts.staffs})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-[#2F5D4A] text-white shadow-xs'
              : 'text-[#4A514C] hover:text-[#191C1A]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Cấp tài khoản staff</span>
        </button>
      </div>
    </div>
  );
};

// Section 2: Users Table View (Customer, Vendor, Staff)
const UsersListView = ({ 
  users, 
  loading, 
  onRefresh, 
  onToggleStatus, 
  activeRole 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full bg-white rounded-2xl border border-[#C5CCC7] p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#C5CCC7]">
        <div>
          <h3 className="text-sm font-bold text-[#191C1A]">
            Danh sách tài khoản ({filtered.length})
          </h3>
          <p className="text-xs text-[#4A514C] mt-0.5">
            Dữ liệu đồng bộ trực tiếp từ cơ sở dữ liệu PostgreSQL / Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-[#2F5D4A] bg-[#F2F5F1] rounded-xl border border-[#C5CCC7] text-xs flex items-center gap-1 font-semibold cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F2F5F1] border border-[#C5CCC7] rounded-xl w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="bg-transparent text-xs text-[#191C1A] focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2F5D4A]" />
            <span>Đang tải danh sách tài khoản...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF7] text-[#4A514C] font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Họ và tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Điểm RE-Points</th>
                <th className="p-3">Ngày đăng ký</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CCC7]">
              {filtered.map((user) => {
                const isLocked = user.status === 'locked' || user.status === 'inactive';
                return (
                  <tr key={user.id} className="hover:bg-[#F8FAF7]">
                    <td className="p-3 font-semibold text-[#191C1A] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name ? user.name.charAt(0) : 'U'}
                      </div>
                      <span>{user.name || 'Người dùng ReLoop'}</span>
                    </td>
                    <td className="p-3 text-gray-600">{user.email || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{user.phone || 'Chưa cung cấp'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#F2F5F1] text-[#2F5D4A] border border-[#C5CCC7]">
                        {user.role_label}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {user.total_eco_points?.toLocaleString('vi-VN') || 0} pts
                    </td>
                    <td className="p-3 text-gray-500 text-[11px]">{user.created_at}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 font-bold text-[10px] rounded-full ${
                        !isLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {!isLocked ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onToggleStatus(user.id, user.name || user.email, isLocked)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          !isLocked 
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {!isLocked ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Khóa</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" />
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
        )}
      </div>
    </div>
  );
};

// Section 3: Staff Account Creation Form (Preserved full logic)
const StaffAccountFormSection = ({ 
  formData, 
  handleChange, 
  permissions, 
  togglePermission,
  showPassword,
  setShowPassword,
  generateNewPassword,
  handleSubmit,
  handleCancel,
  loading 
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-[#C5CCC7] p-6 sm:p-8 shadow-xs flex flex-col gap-6">
      <div className="flex items-center gap-2 pb-3 border-b border-[#C5CCC7]">
        <div className="w-8 h-8 rounded-lg bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center">
          <BadgeCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#191C1A]">Tạo mới tài khoản nhân viên BQL thực địa (Staff)</h2>
          <p className="text-xs text-[#4A514C]">
            Cấp quyền kiểm soát trạm cân rác checkpoint, tiếp nhận sự cố hiện trường và dẫn đoàn trekking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Mã nhân viên BQL *</label>
          <input
            type="text"
            name="employeeCode"
            value={formData.employeeCode}
            onChange={handleChange}
            placeholder="VD: BQL-2026-009"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Họ và tên nhân viên *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Ví dụ: Nguyễn Văn Hoàng"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Email công vụ đăng nhập *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="hoangnv.bql@sontra.gov.vn"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Số điện thoại công vụ</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="0912 345 678"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Phòng ban / trạm trực</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          >
            <option value="Đội kiểm lâm Sơn Trà">Đội kiểm lâm Sơn Trà</option>
            <option value="Tổ tuần tra Bãi Nam">Tổ tuần tra Bãi Nam</option>
            <option value="Trạm Checkpoint Chùa Linh Ứng">Trạm checkpoint Chùa Linh Ứng</option>
            <option value="Tổ Cứu Hộ Đỉnh Bàn Cờ">Tổ cứu hộ đỉnh Bàn Cờ</option>
            <option value="Ban Giám Đốc BQL">Ban giám đốc BQL</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-[#191C1A] block mb-1">Chức vụ</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="Kiểm lâm viên / nhân viên trạm cân rác"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#C5CCC7] text-xs focus:outline-none focus:border-[#2F5D4A]"
          />
        </div>
      </div>

      {/* Password Generator */}
      <div className="p-4 bg-[#F2F5F1] rounded-xl border border-[#C5CCC7] space-y-2">
        <label className="text-xs font-bold text-[#191C1A] flex items-center justify-between">
          <span>Mật khẩu khởi tạo ban đầu</span>
          <button
            type="button"
            onClick={generateNewPassword}
            className="text-[11px] text-[#2F5D4A] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Tạo ngẫu nhiên mật khẩu mạnh
          </button>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.tempPassword}
            onChange={(e) => handleChange({ target: { name: 'tempPassword', value: e.target.value } })}
            className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#C5CCC7] text-xs font-mono focus:outline-none focus:border-[#2F5D4A]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Permissions Checkboxes */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#191C1A]">Danh mục phân quyền tác nghiệp:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissions.map((p) => (
            <label
              key={p.id}
              onClick={() => togglePermission(p.id)}
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                p.selected 
                  ? 'bg-[#DCEBE3] border-[#2F5D4A] text-[#2F5D4A] font-bold'
                  : 'bg-white border-[#C5CCC7] text-gray-600'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                p.selected ? 'bg-[#2F5D4A] border-[#2F5D4A] text-white' : 'border-gray-300'
              }`}>
                {p.selected && <Check className="w-3 h-3" />}
              </div>
              <span>{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#C5CCC7]">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 border border-[#C5CCC7] rounded-xl text-xs font-bold text-[#4A514C] hover:bg-gray-50"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-[#2F5D4A] text-white rounded-xl text-xs font-bold hover:bg-[#254B3C] flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{loading ? 'Đang tạo...' : 'Lưu và cấp tài khoản'}</span>
        </button>
      </div>
    </div>
  );
};

// Main Export Component
export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'vendor' | 'staff' | 'create'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    customers: 0,
    vendors: 0,
    staffs: 0,
  });

  // Create Staff Form State
  const [formData, setFormData] = useState({
    employeeCode: 'BQL-2026-005',
    fullName: '',
    email: '',
    phone: '',
    department: 'Đội kiểm lâm Sơn Trà',
    position: 'Kiểm lâm viên tuần tra',
    tempPassword: 'SonTra@ReLoop2026',
  });

  const [permissions, setPermissions] = useState([
    { id: 'scan_waste', label: 'Cân rác & quét QR Eco-Trash checkpoint', selected: true },
    { id: 'view_incidents', label: 'Tiếp nhận và xử lý báo cáo sự cố thực địa', selected: true },
    { id: 'guide_tour', label: 'Dẫn đoàn & xác thực checkpoint du khách', selected: true },
    { id: 'manage_alerts', label: 'Phát cảnh báo khẩn cấp lên ứng dụng', selected: false },
  ]);

  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async (role = activeTab) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/accounts/users/?role=${role}`);
      const data = await res.json();
      if (res.ok && data.results) {
        setUsers(data.results);
        setCounts({
          customers: data.total_customers,
          vendors: data.total_vendors,
          staffs: data.total_staffs,
        });
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'create') {
      fetchUsers(activeTab);
    }
  }, [activeTab]);

  const handleToggleStatus = async (userId, userName, isCurrentlyLocked) => {
    const actionText = isCurrentlyLocked ? 'Mở khóa' : 'Tạm khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của "${userName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/v1/accounts/users/${userId}/toggle-status/`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`${data.message}`);
        fetchUsers(activeTab);
      } else {
        alert(`Lỗi: ${data.error || 'Không thể đổi trạng thái'}`);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Không thể kết nối tới Backend!');
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'ST@';
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, tempPassword: pass }));
  };

  const handleCancel = () => {
    setFormData({
      employeeCode: 'BQL-2026-005',
      fullName: '',
      email: '',
      phone: '',
      department: 'Đội kiểm lâm Sơn Trà',
      position: 'Kiểm lâm viên tuần tra',
      tempPassword: 'SonTra@ReLoop2026',
    });
  };

  const handleSubmitStaff = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.employeeCode) {
      alert('Vui lòng điền đầy đủ mã nhân viên, họ tên và email công vụ!');
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
      const response = await fetch('http://localhost:8000/api/v1/accounts/staffs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (response.ok && resData.status === 'success') {
        alert(
          `Đã cấp tài khoản nhân viên BQL thành công!\n\n` +
          `• Mã nhân viên: ${resData.data.employee_code}\n` +
          `• Họ tên: ${resData.data.name}\n` +
          `• Email đăng nhập: ${resData.data.email}\n` +
          `• Mật khẩu: ${formData.tempPassword}`
        );
        handleCancel();
        setActiveTab('staff');
      } else {
        const errorMsg = resData.errors 
          ? Object.entries(resData.errors).map(([k, v]) => `${k}: ${v}`).join('\n')
          : (resData.message || 'Không thể tạo tài khoản');
        alert(`Lỗi tạo tài khoản:\n\n${errorMsg}`);
      }
    } catch (err) {
      console.error('Error creating staff:', err);
      alert('Không thể kết nối tới API backend!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m3-app-page min-w-0 space-y-6">
      <UserManagementHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        counts={counts} 
      />

      {activeTab === 'create' ? (
        <StaffAccountFormSection
          formData={formData}
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
          activeRole={activeTab}
        />
      )}
    </div>
  );
}
