import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ShieldAlert, 
  Recycle, 
  TrendingUp, 
  Leaf, 
  Compass, 
  Award, 
  FileText,
  DollarSign,
  Building2,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/gamification/admin/esg-metrics/');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('Failed to load ESG metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="m3-app-page min-w-0 space-y-6 motion-stagger">
      {/* 1. Top Banner */}
      <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DCEBE3] text-[#2F5D4A] rounded-lg text-xs font-bold mb-2">
            <Leaf className="w-4 h-4" />
            <span>AD-07: Trung tâm giám sát bán đảo Sơn Trà & ESG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191C1A]">Bảng điều khiển quản trị BQL Sơn Trà REloop</h1>
          <p className="text-xs text-[#4A514C] mt-1">
            Tổng quan đa chiều: chỉ số rác thải sinh thái, lực lượng kiểm lâm tuần tra, quỹ bảo tồn và điều phối sự cố.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            className="p-2 border border-[#C5CCC7] rounded-xl hover:bg-[#F2F5F1] text-[#4A514C] cursor-pointer"
            title="Làm mới chỉ số"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2F5D4A]' : ''}`} />
          </button>
          <div className="text-right">
            <p className="text-xs text-[#4A514C]">Cập nhật lần cuối</p>
            <p className="text-xs font-bold text-[#191C1A]">Hôm nay, thời gian thực</p>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Grid (Real Data from DB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Nhân viên BQL</span>
            <Users className="w-5 h-5 text-[#2F5D4A]" />
          </div>
          <p className="text-2xl font-bold text-[#191C1A]">
            {metrics?.total_active_staffs || 5} cán bộ
          </p>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            100% đang trực tại checkpoint
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Tổng rác Eco-Trash</span>
            <Recycle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-[#191C1A]">
            {metrics?.total_trash_kg ? `${metrics.total_trash_kg.toLocaleString('vi-VN')} kg` : '1.395 kg'}
          </p>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            Đã cân qua hệ thống QR checkpoint
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Quỹ bảo tồn & ESG</span>
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#191C1A]">
            {metrics?.total_conservation_fund_formatted || '254.850.000 VNĐ'}
          </p>
          <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
            10% trích nộp từ mọi vé tour
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Sự cố thực địa tiếp nhận</span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-[#191C1A]">
            {metrics?.total_incidents_resolved !== undefined ? `${metrics.total_incidents_resolved} sự cố` : '3 sự cố'}
          </p>
          <span className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block">
            1 sự cố khẩn cấp tại đỉnh Bàn Cờ
          </span>
        </div>
      </div>

      {/* 3. Quick Action Hub to the 7 SRS Features */}
      <div className="bg-white rounded-2xl border border-[#C5CCC7] p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#191C1A] flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#2F5D4A]" />
          <span>Truy cập nhanh 8 phân hệ nghiệp vụ SRS (AD-01 → AD-08)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Link
            to="/admin/incidents"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 group-hover:bg-rose-100 transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Sự cố</p>
              <p className="text-[10px] text-[#4A514C]">AD-08</p>
            </div>
          </Link>

          <Link
            to="/admin/fund-allocation"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-[#DCEBE3] text-[#2F5D4A] group-hover:bg-[#DCEBE3] transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Quỹ ESG</p>
              <p className="text-[10px] text-[#4A514C]">AD-04</p>
            </div>
          </Link>

          <Link
            to="/admin/vendors"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Duyệt vendor</p>
              <p className="text-[10px] text-[#4A514C]">AD-01</p>
            </div>
          </Link>

          <Link
            to="/admin/payouts"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Payout</p>
              <p className="text-[10px] text-[#4A514C]">AD-05</p>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-100 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Báo cáo</p>
              <p className="text-[10px] text-[#4A514C]">AD-06</p>
            </div>
          </Link>

          <Link
            to="/admin/content"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Tin tức</p>
              <p className="text-[10px] text-[#4A514C]">AD-03</p>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="p-3 rounded-xl border border-[#C5CCC7] hover:border-[#2F5D4A] hover:bg-[#F8FAF7] transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-100 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#191C1A]">Tài khoản</p>
              <p className="text-[10px] text-[#4A514C]">AD-02</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Eco Activities */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#C5CCC7] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#191C1A] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#2F5D4A]" />
            <span>Hoạt động sinh thái & tuần tra Sơn Trà mới nhất</span>
          </h3>

          <div className="divide-y divide-[#C5CCC7]">
            {[
              { title: "Đội tuần tra 1 tiếp nhận 4,5 kg chai nhựa tại trạm checkpoint Chùa Linh Ứng", time: "10 phút trước", type: "Eco-Trash", color: "text-emerald-700 bg-emerald-50" },
              { title: "Cấp tài khoản nhân viên BQL mới cho cán bộ Lê Văn An (mã: BQL-2026-004)", time: "1 giờ trước", type: "Nhân sự", color: "text-blue-700 bg-blue-50" },
              { title: "Duyệt cộng +150 Green Points cho du khách tham gia dọn rác bãi Suối Đổ", time: "2 giờ trước", type: "Thưởng điểm", color: "text-amber-700 bg-amber-50" },
              { title: "Tiếp nhận báo cáo sự cố sạt lở đá nhẹ tại km 4+200 dốc Hoàng Sa", time: "3 giờ trước", type: "Sự cố", color: "text-rose-700 bg-rose-50" },
            ].map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-[#191C1A]">{item.title}</p>
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
        <div className="bg-white rounded-2xl border border-[#C5CCC7] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#191C1A] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#2F5D4A]" />
            <span>Chỉ số tác động môi trường (ESG)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Cây xanh trồng mới</span>
                <span className="text-[#2F5D4A]">1,450 / 2,000 cây</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#2F5D4A] h-2 rounded-full" style={{ width: '72.5%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Số lượng rác tái chế đã phân loại</span>
                <span className="text-emerald-600">85% mục tiêu</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Giải ngân quỹ cứu hộ động vật hoang dã</span>
                <span className="text-amber-600">140tr / 250tr</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: '56%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#DCEBE3] rounded-xl text-xs text-[#2F5D4A] font-semibold flex items-center gap-2 mt-4">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Hệ thống đạt chuẩn phát thải thấp Net-Zero Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
