import React from 'react';
import { DollarSign, Shield, ArrowUpRight, CheckCircle2, PieChart } from 'lucide-react';

export const FundAllocationPage = () => {
  const funds = [
    { title: "Dự án Cứu hộ Động vật hoang dã Sơn Trà", allocated: "120.000.000 VNĐ", percent: 45, status: "Đã giải ngân" },
    { title: "Chương trình Thu gom & Cân Rác Eco-Trash", allocated: "65.000.000 VNĐ", percent: 25, status: "Đã giải ngân" },
    { title: "Trang bị Thiết bị Cứu hộ Trạm Tuần tra", allocated: "40.000.000 VNĐ", percent: 15, status: "Đang giải ngân" },
    { title: "Trồng rừng & Phủ xanh bãi Suối Đổ", allocated: "20.000.000 VNĐ", percent: 15, status: "Dự kiến" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <DollarSign className="w-4 h-4" />
            <span>Tài chính & Bảo tồn ESG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c]">Quản lý Phân bổ Quỹ Bảo Tồn Bán Đảo</h1>
          <p className="text-xs text-[#5d6861] mt-1">Minh bạch ngân sách giải ngân từ trích phần trăm vé Tour và hoạt động quyên góp.</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#24563d] text-white text-xs font-bold rounded-xl hover:bg-[#1d4833] transition-colors cursor-pointer">
          <ArrowUpRight className="w-4 h-4" />
          <span>Tạo Đề xuất Giải ngân</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#24563d]" />
            <span>Danh mục Phân bổ Quỹ Hiện tại</span>
          </h3>

          <div className="space-y-4">
            {funds.map((f, i) => (
              <div key={i} className="p-4 rounded-xl border border-[#e8ece9] bg-[#fcfdfc] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#18211c]">{f.title}</span>
                  <span className="font-bold text-[#24563d]">{f.allocated}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-[#24563d] h-2 rounded-full" style={{ width: `${f.percent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Tỷ trọng: {f.percent}%</span>
                  <span className="text-emerald-700 font-semibold">{f.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#24563d]" />
            <span>Tiêu chuẩn Bảo đảm ESG (Báo cáo Minh bạch)</span>
          </h3>

          <div className="p-4 bg-[#f4f8f5] rounded-xl border border-[#c8dcd0] text-xs text-[#24563d] space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Chứng nhận Kiểm toán Độc lập 2026</span>
            </div>
            <p className="text-[11px] text-[#5d6861] leading-relaxed">
              100% dòng tiền tài trợ Quỹ Bảo Tồn ESG được tự động đối soát và công khai báo cáo tác động sinh thái theo định kỳ hàng quý.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundAllocationPage;
