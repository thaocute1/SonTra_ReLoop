import React from 'react';
import { 
  Users, 
  ShieldAlert, 
  Recycle, 
  TrendingUp, 
  Leaf, 
  Compass, 
  Award, 
  FileText,
  DollarSign
} from 'lucide-react';

export const AdminDashboardPage = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <Leaf className="w-4 h-4" />
            <span>Tổng quan Bán đảo Sơn Trà</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c]">Dashboard Quản trị BQL Sơn Trà REloop</h1>
          <p className="text-xs text-[#5d6861] mt-1">Giám sát các hoạt động tuần tra, rác thải tái chế, đăng ký tour và phân bổ Quỹ Bảo Tồn ESG.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-[#5d6861]">Cập nhật lần cuối</p>
            <p className="text-xs font-bold text-[#18211c]">Hôm nay, 16:30</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Nhân viên BQL (Staff)</span>
            <Users className="w-5 h-5 text-[#24563d]" />
          </div>
          <p className="text-2xl font-bold text-[#18211c]">24 Cán bộ</p>
          <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">100% Đang trực ca</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Tổng rác Eco-Trash</span>
            <Recycle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-[#18211c]">1,280 kg</p>
          <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">+18.5% so với tháng trước</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Quỹ Bảo tồn & ESG</span>
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#18211c]">245,000,000 đ</p>
          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">Đã giải ngân 4 dự án</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Sự cố thực địa Sơn Trà</span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-[#18211c]">3 Sự cố</p>
          <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block">Đang xử lý tại Đỉnh Bàn Cờ</span>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Eco Activities */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#24563d]" />
            <span>Hoạt động sinh thái & Tuần tra Sơn Trà mới nhất</span>
          </h3>

          <div className="divide-y divide-[#e8ece9]">
            {[
              { title: "Đội Tuần tra 1 tiếp nhận 4.5kg chai nhựa tại Trạm Checkpoint Chùa Linh Ứng", time: "10 phút trước", type: "Eco-Trash", color: "text-emerald-700 bg-emerald-50" },
              { title: "Cấp tài khoản BQL Staff mới cho Cán bộ Lê Văn An (Mã: BQL-2026-004)", time: "1 giờ trước", type: "Nhân sự", color: "text-blue-700 bg-blue-50" },
              { title: "Duyệt cộng +150 Green Points cho Du khách Trekker tham gia dọn rác bãi Suối Đổ", time: "2 giờ trước", type: "Thưởng Points", color: "text-amber-700 bg-amber-50" },
              { title: "Tiếp nhận báo cáo sự cố cây đổ chắn đường tuyến Đỉnh Bàn Cờ", time: "3 giờ trước", type: "Sự cố", color: "text-rose-700 bg-rose-50" },
            ].map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-[#18211c]">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.time}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 ${item.color}`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Status & ESG Summary */}
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#24563d]" />
            <span>Chỉ số Tác động Môi trường (ESG)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Cây xanh trồng mới</span>
                <span className="text-[#24563d]">1,450 / 2,000 cây</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#24563d] h-2 rounded-full" style={{ width: '72.5%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Số lượng rác tái chế đã phân loại</span>
                <span className="text-emerald-600">85% Mục tiêu</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Giải ngân Quỹ Cứu hộ Động vật hoang dã</span>
                <span className="text-amber-600">120tr / 150tr</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
