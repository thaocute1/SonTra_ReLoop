import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  Recycle, 
  AlertTriangle, 
  Building2, 
  DollarSign, 
  Trees, 
  LogOut, 
  Bell,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export const BqlDashboardPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('system_admin');
  const [userName, setUserName] = useState('Cán bộ BQL');

  useEffect(() => {
    const role = localStorage.getItem('user_role') || 'system_admin';
    const name = localStorage.getItem('user_name') || 'Nguyễn Tuấn Phong';
    setUserRole(role);
    setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  const isAdmin = userRole === 'system_admin';

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#1e4531] text-white px-6 sm:px-12 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#2a5d43] p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-[#7ee3ab]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">BQL PORTAL — BÁN ĐẢO SƠN TRÀ</h1>
            <p className="text-xs text-[#a3d9bc]">Hệ thống Quản trị & Giám sát Du lịch Sinh thái</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm">{userName}</p>
            <span className="inline-block px-2 py-0.5 bg-[#2a5d43] text-[#7ee3ab] text-xs font-medium rounded-full">
              {isAdmin ? 'Quản trị viên Hệ thống (Admin)' : 'Nhân viên BQL (Staff)'}
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a5d43] hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6">
        
        {/* Banner Welcome */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#18211c]">
              Xin chào, {userName} 👋
            </h2>
            <p className="text-[#5d6861] text-sm mt-1">
              {isAdmin 
                ? 'Bạn đang truy cập với quyền Administrator. Bạn có thể kiểm duyệt Vendor, theo dõi Payout và phân bổ Quỹ Bảo tồn.' 
                : 'Bạn đang truy cập với quyền Staff. Bạn có thể thực hiện kiểm duyệt rác Eco-Trash và xử lý sự cố thực địa.'}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#f2f6f3] px-4 py-2 rounded-xl text-xs text-[#24563d] font-semibold border border-[#d2e0d7]">
            <Clock className="w-4 h-4" />
            <span>Phiên làm việc bảo mật</span>
          </div>
        </div>

        {/* Feature Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Module 1: Eco Trash (Common for Staff & Admin) */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mb-3">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#18211c]">Kiểm duyệt Rác Eco-Trash</h3>
              <p className="text-xs text-[#5d6861] mt-1">
                Cân rác thu gom thực địa, kiểm tra ảnh chụp và duyệt cộng điểm Green Points cho du khách.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Truy cập quản lý rác</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 2: Incident Reports (Common for Staff & Admin) */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#18211c]">Xử lý Báo cáo Sự cố</h3>
              <p className="text-xs text-[#5d6861] mt-1">
                Tiếp nhận báo cáo sạt lở, xả rác, vi phạm môi trường tại bán đảo và cập nhật trạng thái xử lý.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Danh sách sự cố cần xử lý</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module 3: ESG Dashboard (Common for Staff & Admin) */}
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center mb-3">
                <Trees className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#18211c]">Báo cáo & ESG Dashboard</h3>
              <p className="text-xs text-[#5d6861] mt-1">
                Xem thống kê tổng lượt check-in xanh, khối lượng rác thu gom và tác động du lịch sinh thái.
              </p>
            </div>
            <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-100 hover:underline">
              <span>Xem báo cáo tác động</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ADMIN ONLY MODULES */}
          {isAdmin ? (
            <>
              {/* Module 4: Vendor Approval (Admin Only) */}
              <div className="bg-white rounded-2xl p-5 border-2 border-[#24563d]/20 bg-gradient-to-br from-white to-[#f4f9f6] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Dành riêng Admin</span>
                  </div>
                  <h3 className="font-bold text-base text-[#18211c]">Duyệt Vendor Tour & Checkpoint</h3>
                  <p className="text-xs text-[#5d6861] mt-1">
                    Xét duyệt hồ sơ pháp lý doanh nghiệp lữ hành mới, kiểm duyệt các tuyến tour & GPS checkpoint.
                  </p>
                </div>
                <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-200 hover:underline">
                  <span>Duyệt hồ sơ đối tác</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Module 5: Split-Payment & Payout (Admin Only) */}
              <div className="bg-white rounded-2xl p-5 border-2 border-[#24563d]/20 bg-gradient-to-br from-white to-[#f4f9f6] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Dành riêng Admin</span>
                  </div>
                  <h3 className="font-bold text-base text-[#18211c]">Đối soát & Payout Doanh thu</h3>
                  <p className="text-xs text-[#5d6861] mt-1">
                    Theo dõi sổ cái thu chi, ra lệnh Payout tự động cho các Vendor Tour qua API VNPay/Stripe.
                  </p>
                </div>
                <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-200 hover:underline">
                  <span>Quản lý Payout</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Module 6: Staff Management (Admin Only) */}
              <div className="bg-white rounded-2xl p-5 border-2 border-[#24563d]/20 bg-gradient-to-br from-white to-[#f4f9f6] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Dành riêng Admin</span>
                  </div>
                  <h3 className="font-bold text-base text-[#18211c]">Quản lý Tài khoản Staff</h3>
                  <p className="text-xs text-[#5d6861] mt-1">
                    Tạo tài khoản mới cho nhân viên tuần tra BQL, phân quyền xử lý công việc và quản lý trạng thái.
                  </p>
                </div>
                <button className="mt-4 flex items-center justify-between text-xs font-semibold text-[#24563d] pt-3 border-t border-gray-200 hover:underline">
                  <span>Tạo tài khoản Staff mới</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="bg-[#f2f6f3] rounded-2xl p-5 border border-[#d2e0d7] flex flex-col justify-center items-center text-center col-span-full sm:col-span-1">
              <ShieldCheck className="w-8 h-8 text-[#24563d] mb-2" />
              <h4 className="font-bold text-sm text-[#18211c]">Bạn đang sử dụng quyền Staff</h4>
              <p className="text-xs text-[#5d6861] mt-1 max-w-xs">
                Các tính năng Quản lý Payout tài chính, Duyệt Vendor và Tạo Staff được dành riêng cho Admin BQL.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BqlDashboardPage;
