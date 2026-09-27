import React from 'react';
import { Zap, Plus, Calendar, Clock, Tag } from 'lucide-react';

export const CampaignListPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e2e8e4] shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-[#18211c]">Quản lý Flash Campaign</h1>
          <p className="text-xs text-[#5d6861] mt-1">Các chiến dịch giảm giá, đổi điểm hoặc Flash Sale tour đang hoạt động.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#24563d] hover:bg-[#1d4833] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors w-fit">
          <Plus className="w-4 h-4" />
          <span>Tạo campaign mới</span>
        </button>
      </div>

      {/* Campaign Cards List (Matching Screen 1 in Figma) */}
      <div className="space-y-4">
        {/* Campaign Item 1 */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" />
                <span>Đang diễn ra</span>
              </span>
              <h2 className="text-lg font-bold text-[#18211c]">Flash Sale Tour Tháng 9</h2>
            </div>
            <p className="text-xs text-[#5d6861]">Lộ trình sử dụng: Trekking Chỉnh Cung Bàn Cờ</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 12/09 - 15/09</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Còn lại: 2 ngày</span>
            </div>
          </div>
          <button className="px-4 py-2 text-xs font-semibold text-[#24563d] bg-[#eaf1ed] hover:bg-[#d8e7de] rounded-xl transition-colors">
            Chi tiết campaign
          </button>
        </div>

        {/* Campaign Item 2 */}
        <div className="bg-white rounded-2xl p-6 border border-[#e2e8e4] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>Hoạt động cộng đồng</span>
              </span>
              <h2 className="text-lg font-bold text-[#18211c]">Sơn Trà Xanh - Tuần lễ Không Rác Thải</h2>
            </div>
            <p className="text-xs text-[#5d6861]">Tăng gấp đôi Eco Points khi du khách nộp rác nhựa tại trạm tuần tra</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 20/09 - 27/09</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Chuẩn bị bắt đầu</span>
            </div>
          </div>
          <button className="px-4 py-2 text-xs font-semibold text-[#24563d] bg-[#eaf1ed] hover:bg-[#d8e7de] rounded-xl transition-colors">
            Chi tiết campaign
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignListPage;
