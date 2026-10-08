import React from 'react';
import { Megaphone, Plus, Search, Filter, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';

export const CampaignListPage = () => {
  const campaigns = [
    { id: 1, name: "Chiến dịch Xanh Hóa Sơn Trà 2026", budget: "50.000.000 VNĐ", status: "Đang diễn ra", date: "01/09/2026 - 30/10/2026", partners: 12 },
    { id: 2, name: "Thách thức Nhặt Rác Bãi Suối Đổ", budget: "20.000.000 VNĐ", status: "Đang diễn ra", date: "15/09/2026 - 15/10/2026", partners: 5 },
    { id: 3, name: "Trồng 1000 Cây Thơ Mộng Bán Đảo", budget: "120.000.000 VNĐ", status: "Sắp diễn ra", date: "01/11/2026 - 31/12/2026", partners: 20 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <Megaphone className="w-4 h-4" />
            <span>Quản lý Tiếp thị & Truyền thông</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c]">Danh sách Campaign Sinh Thái</h1>
          <p className="text-xs text-[#5d6861] mt-1">Quản lý các chương trình tài trợ, thử thách nhặt rác và hoạt động trồng cây.</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#24563d] text-white text-xs font-bold rounded-xl hover:bg-[#1d4833] transition-colors cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Tạo Campaign Mới</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-[#e2e8e4]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl w-72">
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm campaign..." className="bg-transparent text-xs text-[#18211c] focus:outline-none w-full" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl text-xs font-semibold text-[#5d6861] hover:text-[#18211c]">
            <Filter className="w-4 h-4" />
            <span>Lọc trạng thái</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {campaigns.map((camp) => (
            <div key={camp.id} className="border border-[#e2e8e4] rounded-2xl p-5 hover:border-[#24563d] transition-all bg-[#fcfdfc]">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                {camp.status}
              </span>
              <h3 className="font-bold text-sm text-[#18211c] mt-3">{camp.name}</h3>
              
              <div className="mt-4 space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#24563d]" />
                  <span>{camp.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#24563d]" />
                  <span>Ngân sách: <b>{camp.budget}</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#24563d]" />
                  <span>{camp.partners} Đối tác tài trợ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignListPage;
