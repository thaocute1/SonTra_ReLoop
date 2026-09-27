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
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

// Section 1: Header Section for Staff Account Management
const StaffAccountHeaderSection = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-full bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
          <Shield className="w-4 h-4" />
          <span>Quản lý Nhân sự & Cấp tài khoản</span>
        </div>
        <h1 className="text-2xl font-bold text-[#18211c]">Quản lý Nhân sự Ban Quản Lý (BQL)</h1>
        <p className="text-xs text-[#5d6861] mt-1">Cấp tài khoản nội bộ và phân quyền tác nghiệp cho Nhân viên BQL thực địa.</p>
      </div>

      <div className="flex items-center gap-2 bg-[#f4f7f4] p-1.5 rounded-xl border border-[#e8ece9]">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-[#24563d] text-white shadow-xs'
              : 'text-[#556057] hover:text-[#18211c]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Tạo tài khoản Staff</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'list'
              ? 'bg-[#24563d] text-white shadow-xs'
              : 'text-[#556057] hover:text-[#18211c]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách Nhân viên</span>
        </button>
      </div>
    </div>
  );
};

// Section 2: Heading & Overview for Creating Staff Account
const StaffAccountCreationHeadingSection = () => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#eaf2eb] text-[#27533b] flex items-center justify-center">
          <BadgeCheck className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-[#18211c]">Tạo mới Tài khoản Nhân viên BQL (Staff)</h2>
      </div>
      <p className="text-xs text-[#5d6861] pl-9">
        Điền thông tin định danh nhân sự, mã nhân viên và thiết lập danh mục quyền truy cập hệ thống.
      </p>
    </div>
  );
};

// Section 3: Main Form Section for Staff Account Details
const StaffAccountFormSection = ({ 
  formData, 
  handleChange, 
  permissions, 
  togglePermission,
  showPassword,
  setShowPassword,
  generateNewPassword 
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-[#e2e8e4] p-6 sm:p-8 shadow-xs flex flex-col gap-6">
      
      {/* Group 1: Basic Employee Identification */}
      <div>
        <h3 className="text-xs font-bold text-[#24563d] uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          <span>Thông tin Cá nhân & Định danh Nhân viên</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Mã nhân viên (Employee Code) *</label>
            <div className="flex items-center gap-2 px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
              <Key className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                placeholder="BQL-2026-001"
                className="w-full bg-transparent border-none text-xs font-bold text-[#18211c] focus:outline-none placeholder-[#849087]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Họ và tên Nhân viên *</label>
            <div className="flex items-center gap-2 px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
              <UserCheck className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn An"
                className="w-full bg-transparent border-none text-xs text-[#18211c] focus:outline-none placeholder-[#849087]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Email công vụ *</label>
            <div className="flex items-center gap-2 px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
              <Mail className="w-4 h-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="an.nguyen@sontra.gov.vn"
                className="w-full bg-transparent border-none text-xs text-[#18211c] focus:outline-none placeholder-[#849087]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Số điện thoại liên hệ *</label>
            <div className="flex items-center gap-2 px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
              <Phone className="w-4 h-4 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0905 123 456"
                className="w-full bg-transparent border-none text-xs text-[#18211c] focus:outline-none placeholder-[#849087]"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#e8ece9]" />

      {/* Group 2: Random Initial Password Generation */}
      <div>
        <h3 className="text-xs font-bold text-[#24563d] uppercase tracking-wider mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span>Mật Khẩu Khởi Tạo Ban Đầu (Tự Động Sinh Ngẫu Nhiên)</span>
        </h3>
        <p className="text-xs text-[#5d6861] mb-3">Mật khẩu khởi tạo ngẫu nhiên bảo mật cao. Staff sẽ được yêu cầu tự đổi mật khẩu mới ở lần đăng nhập đầu tiên.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div className="flex items-center gap-2 px-3.5 py-3 bg-[#f8faf9] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
            <Lock className="w-4 h-4 text-[#24563d]" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="tempPassword"
              value={formData.tempPassword}
              readOnly
              className="w-full bg-transparent border-none text-xs font-mono font-bold text-[#24563d] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={generateNewPassword}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#eaf2eb] hover:bg-[#d5e7d9] text-[#27533b] text-xs font-bold rounded-xl border border-[#c8dcd0] transition-colors w-fit"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tạo mật khẩu ngẫu nhiên mới</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#24563d] font-semibold bg-[#eaf2eb] px-3 py-2 rounded-lg border border-[#c8dcd0]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Hệ thống tự động kích hoạt cờ Yêu cầu Đổi Mật Khẩu ở lần đầu đăng nhập.</span>
        </div>
      </div>

      <div className="h-px bg-[#e8ece9]" />

      {/* Group 3: Department & Position */}
      <div>
        <h3 className="text-xs font-bold text-[#24563d] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Building className="w-4 h-4" />
          <span>Phòng Ban & Chức Vụ Công Tác</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Phòng ban công tác *</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl text-xs font-medium text-[#18211c] focus:outline-none focus:border-[#24563d]"
            >
              <option value="Đội Tuần tra & Cứu hộ Bán đảo">Đội Tuần tra & Cứu hộ Bán đảo</option>
              <option value="Bộ phận Kiểm duyệt Rác Eco-Trash">Bộ phận Kiểm duyệt Rác Eco-Trash</option>
              <option value="Ban Quản lý Sinh thái Chung">Ban Quản lý Sinh thái Chung</option>
              <option value="Bộ phận Xử lý Báo cáo Sự cố">Bộ phận Xử lý Báo cáo Sự cố</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18211c] mb-2">Chức danh / Vị trí *</label>
            <div className="flex items-center gap-2 px-3.5 py-3 bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus-within:border-[#24563d]">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Nhân viên Tuần tra Thực địa"
                className="w-full bg-transparent border-none text-xs text-[#18211c] focus:outline-none placeholder-[#849087]"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#e8ece9]" />

      {/* Group 3: Detailed Permissions Checklist */}
      <div>
        <h3 className="text-xs font-bold text-[#24563d] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Phân Quyền Tác Nghiệp Hệ Thống (Permissions)</span>
        </h3>
        <p className="text-xs text-[#5d6861] mb-4">Tích chọn các quyền tác nghiệp cho phép nhân viên thao tác trên Staff Portal:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissions.map((perm) => (
            <div
              key={perm.id}
              onClick={() => togglePermission(perm.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                perm.selected
                  ? 'border-[#24563d] bg-[#f4f8f5]'
                  : 'border-[#e2e8e4] bg-[#fcfdfc] hover:bg-[#f8faf9]'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                perm.selected ? 'bg-[#24563d] text-white' : 'border border-[#c2cdc5] bg-white'
              }`}>
                {perm.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#18211c]">{perm.label}</p>
                <p className="text-[11px] text-[#5d6861] mt-0.5">{perm.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

// Section 4: Action Buttons Section (Cancel & Create)
const StaffAccountActionsSection = ({ handleCancel, handleSubmit, loading }) => {
  return (
    <div className="w-full flex items-center justify-end gap-3 pt-4 border-t border-[#e8ece9]">
      <button
        type="button"
        onClick={handleCancel}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-[#556057] hover:bg-gray-100 transition-colors"
      >
        <X className="w-4 h-4" />
        <span>Hủy bỏ</span>
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#24563d] hover:bg-[#1d4833] transition-colors shadow-xs disabled:opacity-75"
      >
        <Save className="w-4 h-4" />
        <span>{loading ? 'Đang tạo tài khoản...' : 'Khởi tạo tài khoản Staff'}</span>
      </button>
    </div>
  );
};

// Staff list view component fetching real DB data
const StaffListView = ({ staffList, loadingList, fetchStaffs }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaffs = staffList.filter((staff) => {
    const q = searchQuery.toLowerCase();
    return (
      (staff.employee_code && staff.employee_code.toLowerCase().includes(q)) ||
      (staff.name && staff.name.toLowerCase().includes(q)) ||
      (staff.email && staff.email.toLowerCase().includes(q)) ||
      (staff.department && staff.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#e2e8e4] gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#18211c]">Danh sách Nhân viên BQL trong CSDL ({filteredStaffs.length})</h3>
          <p className="text-xs text-[#5d6861] mt-0.5">Dữ liệu nhân viên được đồng bộ trực tiếp từ Supabase Database</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchStaffs}
            className="p-2 text-gray-500 hover:text-[#24563d] bg-[#f4f7f4] rounded-xl border border-[#e2e8e4] text-xs flex items-center gap-1 font-semibold"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã NV, email..." 
              className="bg-transparent text-xs text-[#18211c] focus:outline-none w-full" 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loadingList ? (
          <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#24563d]" />
            <span>Đang tải danh sách Nhân viên từ Database...</span>
          </div>
        ) : filteredStaffs.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            Chưa có nhân viên nào phù hợp hoặc danh sách trống.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8faf9] text-[#556057] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Mã NV</th>
                <th className="p-3">Họ và Tên</th>
                <th className="p-3">Email Công vụ</th>
                <th className="p-3">Số Điện Thoại</th>
                <th className="p-3">Phòng Ban</th>
                <th className="p-3">Chức vụ</th>
                <th className="p-3 text-right">Trạng thái DB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ece9]">
              {filteredStaffs.map((staff) => (
                <tr key={staff.id} className="hover:bg-[#fcfdfc]">
                  <td className="p-3 font-bold text-[#24563d]">{staff.employee_code}</td>
                  <td className="p-3 font-semibold text-[#18211c]">{staff.name || 'N/A'}</td>
                  <td className="p-3 text-gray-600">{staff.email || 'N/A'}</td>
                  <td className="p-3 text-gray-600">{staff.phone || 'Chưa cập nhật'}</td>
                  <td className="p-3 text-gray-600">{staff.department}</td>
                  <td className="p-3 text-gray-600">{staff.position || 'Nhân viên'}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2.5 py-0.5 font-bold text-[10px] rounded-full ${
                      staff.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {staff.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Exporting Main Area combining all section components
export const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const makeRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'St#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '!';
  };

  const getRandomEmployeeCode = () => {
    const num = Math.floor(100 + Math.random() * 900);
    return `BQL-2026-${num}`;
  };

  const [formData, setFormData] = useState({
    employeeCode: getRandomEmployeeCode(),
    fullName: '',
    email: '',
    phone: '',
    department: 'Đội Tuần tra & Cứu hộ Bán đảo',
    position: 'Nhân viên Tuần tra Thực địa',
    tempPassword: makeRandomPassword(),
  });

  const generateNewPassword = () => {
    setFormData((prev) => ({ ...prev, tempPassword: makeRandomPassword() }));
  };

  const [permissions, setPermissions] = useState([
    { id: 'eco_trash', label: 'Duyệt rác Eco-Trash', description: 'Cân rác, kiểm tra bằng chứng và duyệt cộng điểm Green Points', selected: true },
    { id: 'incident', label: 'Xử lý báo cáo sự cố', description: 'Cập nhật tiến độ xử lý sạt lở, xả rác tại thực địa Sơn Trà', selected: true },
    { id: 'esg_view', label: 'Xem ESG Dashboard', description: 'Xem báo cáo thống kê tác động sinh thái BQL', selected: false },
    { id: 'trekker_support', label: 'Xác thực check-in thủ công', description: 'Hỗ trợ duyệt checkpoint GPS cho du khách khi bị lỗi kết nối', selected: true },
  ]);

  // Fetch staff list from Backend API
  const fetchStaffs = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/accounts/staffs/');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setStaffList(json.data);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách staff từ DB:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePermission = (id) => {
    setPermissions(
      permissions.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleCancel = () => {
    setFormData({
      employeeCode: getRandomEmployeeCode(),
      fullName: '',
      email: '',
      phone: '',
      department: 'Đội Tuần tra & Cứu hộ Bán đảo',
      position: 'Nhân viên Tuần tra Thực địa',
      tempPassword: makeRandomPassword(),
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.employeeCode) {
      alert('Vui lòng điền đầy đủ Mã nhân viên, Họ tên và Email công vụ!');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.status === 'success') {
        alert(
          `✅ ĐÃ TẠO VÀ LƯU THÀNH CÔNG VÀO DB!\n\n` +
          `• Mã nhân viên: ${resData.data.employee_code}\n` +
          `• Họ tên: ${resData.data.name}\n` +
          `• Email đăng nhập: ${resData.data.email}\n` +
          `• Mật khẩu khởi tạo: ${formData.tempPassword}\n` +
          `• Phòng ban: ${resData.data.department}\n\n` +
          `Tài khoản đã được lưu vào bảng 'users' và 'staffs' trong Supabase Database. Mật khẩu đã được mã hóa an toàn.`
        );

        // Reset Form & Refetch List
        handleCancel();
        await fetchStaffs();
        setActiveTab('list');
      } else {
        const errorMsg = resData.errors 
          ? Object.entries(resData.errors).map(([k, v]) => `${k}: ${v}`).join('\n')
          : (resData.message || 'Không thể tạo tài khoản');
        alert(`❌ LỖI TẠO TÀI KHOẢN STAFF:\n\n${errorMsg}`);
      }
    } catch (error) {
      console.error("Lỗi khi kết nối Backend:", error);
      alert(`❌ Không thể kết nối tới Backend API tại http://localhost:8000/api/v1/accounts/staffs/.\nVui lòng kiểm tra Server Backend.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex w-full flex-col items-start gap-6 bg-transparent">
      {/* 1. Header Section */}
      <StaffAccountHeaderSection activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'create' ? (
        <div className="flex w-full flex-col items-start gap-6">
          {/* 2. Heading Section */}
          <StaffAccountCreationHeadingSection />

          {/* 3. Form Section */}
          <StaffAccountFormSection
            formData={formData}
            handleChange={handleChange}
            permissions={permissions}
            togglePermission={togglePermission}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            generateNewPassword={generateNewPassword}
          />

          {/* 4. Actions Section */}
          <StaffAccountActionsSection
            handleCancel={handleCancel}
            handleSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      ) : (
        <StaffListView 
          staffList={staffList} 
          loadingList={loadingList} 
          fetchStaffs={fetchStaffs} 
        />
      )}
    </main>
  );
};

export default UserManagementPage;
