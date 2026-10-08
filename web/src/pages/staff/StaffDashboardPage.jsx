import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Recycle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  ChevronRight,
  UserCheck,
  Scale
} from 'lucide-react';

export const StaffDashboardPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Nhân viên BQL');

  useEffect(() => {
    const name = localStorage.getItem('user_name') || 'Lê Văn An (Đội Tuần tra)';
    setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col font-sans">
      {/* Top Header Staff */}
      <header className="bg-[#1b3d2b] text-white px-6 sm:px-12 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#24563d] p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-[#7ee3ab]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">STAFF PORTAL — BẢN ĐẢO SƠN TRÀ</h1>
            <p className="text-xs text-[#a3d9bc]">Phân hệ Nhân viên BQL Thực địa & Trạm Tuần tra</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm">{userName}</p>
            <span className="inline-block px-2.5 py-0.5 bg-[#24563d] text-[#7ee3ab] text-xs font-semibold rounded-full border border-[#7ee3ab]/30">
              ROLE: BQL STAFF
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24563d] hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6">
        
        {/* Staff Header Banner */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold mb-2">
              <UserCheck className="w-4 h-4" />
              <span>Đội Tuần tra & Tiếp nhận Thực địa</span>
            </div>
            <h2 className="text-2xl font-bold text-[#18211c]">
              Trạm công tác Staff — {userName}
            </h2>
            <p className="text-[#5d6861] text-sm mt-1">
              Tiếp nhận cân rác thải tái chế du khách mang về trạm, duyệt điểm Green Points và xử lý sự cố môi trường tại khu vực Sơn Trà.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#f2f6f3] px-4 py-2 rounded-xl text-xs text-[#24563d] font-semibold border border-[#d2e0d7]">
            <Clock className="w-4 h-4" />
            <span>Đang trực ca</span>
          </div>
        </div>

        {/* Quick Task Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Rác Eco-Trash chờ duyệt</span>
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">12 Lượt nộp</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Ước tính 28.5 kg rác nhựa</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Báo cáo sự cố mới</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">2 Sự cố</p>
            <span className="text-[11px] text-amber-600 font-medium mt-1 inline-block">Cần kiểm tra tuyến Đỉnh Bàn Cờ</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Đã xử lý hôm nay</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-[#18211c]">18 Hồ sơ</p>
            <span className="text-[11px] text-blue-600 font-medium mt-1 inline-block">Đã cộng +1.800 Green Points</span>
          </div>
        </div>

        {/* Staff Work Modules Grid */}
        <h3 className="text-lg font-bold text-[#18211c] mt-2">Nghiệp vụ Nhân viên BQL (Staff Field Modules)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Module 1: Weigh Eco-Trash & Approve Points */}
          <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-xs hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mb-4">
                <Recycle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-[#18211c]">Duyệt rác Eco-Trash & Cộng điểm xanh</h4>
              <p className="text-sm text-[#5d6861] mt-2 leading-relaxed">
                Nhập trọng lượng rác thực tế khách hàng mang về trạm, đối soát ảnh chụp bằng chứng và bấm duyệt cộng Green Points trực tiếp vào tài khoản du khách.
              </p>
            </div>
            <button className="mt-6 flex items-center justify-between text-sm font-bold text-white bg-[#24563d] hover:bg-[#1d4833] px-5 py-3 rounded-xl transition-colors cursor-pointer">
              <span>Mở giao diện Duyệt Rác tại Trạm</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Module 2: Field Incident Response */}
          <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-sm hover:border-[#24563d] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-[#18211c]">Tiếp nhận & Xử lý Sự cố Thực địa</h4>
              <p className="text-sm text-[#5d6861] mt-2 leading-relaxed">
                Xem bản đồ GPS vị trí các sự cố do du khách báo về (như xả rác trái phép, tai nạn, sạt lở), cập nhật trạng thái đang xử lý hoặc hoàn thành.
              </p>
            </div>
            <button className="mt-6 flex items-center justify-between text-sm font-bold text-white bg-[#24563d] hover:bg-[#1d4833] px-5 py-3 rounded-xl transition-colors cursor-pointer">
              <span>Mở danh sách Sự cố Sơn Trà</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
