import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  DollarSign, 
  UserCheck, 
  Trees, 
  LogOut, 
  Clock, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  PieChart
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Nguyễn Tuấn Phong');

  useEffect(() => {
    const name = localStorage.getItem('user_name') || 'Nguyễn Tuấn Phong';
    setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Admin Header Banner */}
        
        {/* Admin Header Banner */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Quyền Quản Trị Cấp Cao</span>
            </div>
            <h2 className="text-2xl font-bold text-[#18211c]">
              Bảng điều khiển Admin — {userName}
            </h2>
            <p className="text-[#5d6861] text-sm mt-1">
              Quản lý toàn bộ hồ sơ Vendor, xét duyệt Tour, phê duyệt Payout tài chính và phân bổ Quỹ Bảo tồn Sơn Trà.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#f2f6f3] px-4 py-2 rounded-xl text-xs text-[#24563d] font-semibold border border-[#d2e0d7]">
            <Clock className="w-4 h-4" />
            <span>Phiên làm việc Admin</span>
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-sm">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Vendor chờ duyệt</span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">3 Hồ sơ</p>
            <span className="text-[11px] text-purple-600 font-medium mt-1 inline-block">Cần xem xét GPKD</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-sm">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Tour chờ cấp duyệt</span>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">5 Tour mới</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Check-in GPX sẵn sàng</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-sm">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Tổng Payout kỳ này</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">145.800.000đ</p>
            <span className="text-[11px] text-blue-600 font-medium mt-1 inline-block">Đối soát qua VNPay/Stripe</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-sm">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Quỹ Bảo Tồn Tích Lũy</span>
              <Trees className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">52.400.000đ</p>
            <span className="text-[11px] text-green-600 font-medium mt-1 inline-block">10% Trích từ tour & đóng góp</span>
          </div>
        </div>

        {/* Admin Modules Grid */}
        <h3 className="text-lg font-bold text-[#18211c] mt-2">Nghiệp vụ Quản trị viên (Admin Only)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Module 1: Vendor Approval */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#18211c]">Xét duyệt Hồ sơ Vendor</h4>
              <p className="text-xs text-[#5d6861] mt-1">
                Duyệt hoặc từ chối thông tin đăng ký doanh nghiệp lữ hành, giấy phép kinh doanh tour trekking.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Vào trang duyệt Vendor</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 2: Payout Financial Ledger */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#18211c]">Đối soát Sổ cái & Payout</h4>
              <p className="text-xs text-[#5d6861] mt-1">
                Quản lý các đợt chia tiền (Split-payment), phí hoa hồng nền tảng và trích quỹ bảo tồn.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Vào trang quản lý Payout</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 3: Staff Management */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#18211c]">Quản lý Tài khoản Staff</h4>
              <p className="text-xs text-[#5d6861] mt-1">
                Tạo tài khoản Nhân viên BQL thực địa, cấp mã nhân viên (`employee_code`) và phân quyền.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Cấp tài khoản Staff</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 4: Conservation Fund Allocation */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-green-100 text-green-800 rounded-xl flex items-center justify-center mb-3">
                <Trees className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#18211c]">Phân bổ Quỹ Bảo tồn</h4>
              <p className="text-xs text-[#5d6861] mt-1">
                Phê duyệt giải ngân tiền quỹ cho các dự án trồng rừng, bảo vệ động vật hoang dã Sơn Trà.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Quản lý dự án bảo tồn</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 5: ESG Analytics */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center mb-3">
                <PieChart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-[#18211c]">ESG Analytics Dashboard</h4>
              <p className="text-xs text-[#5d6861] mt-1">
                Báo cáo chỉ số tác động sinh thái tổng thể trên bán đảo phục vụ báo cáo Ban Quản Lý.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Xem báo cáo ESG</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
    </div>
  );
};

export default AdminDashboardPage;
