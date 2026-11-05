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
    const name = localStorage.getItem('user_name') || 'Lê Văn An (đội tuần tra)';
    setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/bql-portal/login');
  };

  return (
    <div className="m3-app-page m3-portal-shell min-h-[100dvh] min-w-0 bg-[#F2F5F1] flex flex-col font-sans overflow-x-clip">
      {/* Top Header Staff */}
      <header className="bg-[#254B3C] text-white px-6 sm:px-12 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#2F5D4A] p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-[#7ee3ab]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Cổng nhân viên — bán đảo Sơn Trà</h1>
            <p className="text-xs text-[#a3d9bc]">Phân hệ nhân viên BQL thực địa & trạm tuần tra</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm">{userName}</p>
            <span className="inline-block px-2.5 py-0.5 bg-[#2F5D4A] text-[#7ee3ab] text-xs font-semibold rounded-full border border-[#7ee3ab]/30">
              Vai trò: nhân viên BQL
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex min-h-12 items-center gap-1.5 px-4 py-2 bg-[#2F5D4A] hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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
        <div className="bg-white rounded-2xl p-6 border border-[#C5CCC7] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold mb-2">
              <UserCheck className="w-4 h-4" />
              <span>Đội tuần tra & tiếp nhận thực địa</span>
            </div>
            <h2 className="text-2xl font-bold text-[#191C1A]">
              Trạm công tác nhân viên — {userName}
            </h2>
            <p className="text-[#4A514C] text-sm mt-1">
              Tiếp nhận cân rác thải tái chế du khách mang về trạm, duyệt điểm Green Points và xử lý sự cố môi trường tại khu vực Sơn Trà.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#F2F5F1] px-4 py-2 rounded-xl text-xs text-[#2F5D4A] font-semibold border border-[#C5CCC7]">
            <Clock className="w-4 h-4" />
            <span>Đang trực ca</span>
          </div>
        </div>

        {/* Quick Task Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Rác Eco-Trash chờ duyệt</span>
              <Scale className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-[#191C1A]">12 lượt nộp</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Ước tính 28.5 kg rác nhựa</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Báo cáo sự cố mới</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-[#191C1A]">2 sự cố</p>
              <span className="text-[11px] text-amber-600 font-medium mt-1 inline-block">Cần kiểm tra tuyến đỉnh Bàn Cờ</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span className="text-xs font-medium">Đã xử lý hôm nay</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-[#191C1A]">18 hồ sơ</p>
            <span className="text-[11px] text-blue-600 font-medium mt-1 inline-block">Đã cộng +1.800 Green Points</span>
          </div>
        </div>

        {/* Staff Work Modules Grid */}
        <h3 className="text-lg font-bold text-[#191C1A] mt-2">Nghiệp vụ nhân viên BQL</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Module 1: Weigh Eco-Trash & Approve Points */}
          <div className="bg-white rounded-2xl p-6 border border-[#C5CCC7] shadow-xs hover:border-[#2F5D4A] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mb-4">
                <Recycle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-[#191C1A]">Duyệt rác Eco-Trash & cộng điểm xanh</h4>
              <p className="text-sm text-[#4A514C] mt-2 leading-relaxed">
                Nhập trọng lượng rác thực tế khách hàng mang về trạm, đối soát ảnh chụp bằng chứng và bấm duyệt cộng Green Points trực tiếp vào tài khoản du khách.
              </p>
            </div>
            <button className="mt-6 flex items-center justify-between text-sm font-bold text-white bg-[#2F5D4A] hover:bg-[#254B3C] px-5 py-3 rounded-xl transition-colors cursor-pointer">
              <span>Mở giao diện duyệt rác tại trạm</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Module 2: Field Incident Response */}
          <div className="bg-white rounded-2xl p-6 border border-[#C5CCC7] shadow-sm hover:border-[#2F5D4A] transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-[#191C1A]">Tiếp nhận & xử lý sự cố thực địa</h4>
              <p className="text-sm text-[#4A514C] mt-2 leading-relaxed">
                Xem bản đồ GPS vị trí các sự cố do du khách báo về (như xả rác trái phép, tai nạn, sạt lở), cập nhật trạng thái đang xử lý hoặc hoàn thành.
              </p>
            </div>
            <button className="mt-6 flex items-center justify-between text-sm font-bold text-white bg-[#2F5D4A] hover:bg-[#254B3C] px-5 py-3 rounded-xl transition-colors cursor-pointer">
              <span>Mở danh sách sự cố Sơn Trà</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
