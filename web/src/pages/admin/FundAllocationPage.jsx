import React, { useState } from 'react';
import { Trees, FileText, Send, CheckCircle2 } from 'lucide-react';

export const FundAllocationPage = () => {
  const [amount, setAmount] = useState('552500000');
  const [projectName, setProjectName] = useState('Dự án Trồng Rừng & Bảo tồn Động vật Hoang dã Sơn Trà');
  const [category, setCategory] = useState('reforestation');
  const [notes, setNotes] = useState('Chi phí mua cây giống bản địa và thiết bị giám sát tuần tra.');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Đã gửi yêu cầu phân bổ ngân sách thành công!');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Top Banner Allocation Budget */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e2e8e4] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg w-fit mb-2">
            <Trees className="w-4 h-4" />
            <span>Quỹ Bảo tồn Sơn Trà</span>
          </div>
          <h1 className="text-xl font-bold text-[#18211c]">Ngân sách Quỹ sẵn sàng phân bổ</h1>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold text-[#24563d]">552,500,000 đ</span>
          <p className="text-[11px] text-gray-500 mt-0.5">Tích lũy từ 10% doanh thu tour & đóng góp</p>
        </div>
      </div>

      {/* Form Request Allocation (Matching Screen 2 in Figma) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e2e8e4] shadow-xs">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-[#e2e8e4]">
          <div className="w-10 h-10 rounded-xl bg-[#eaf1ed] text-[#24563d] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#18211c]">Phiếu yêu cầu phân bổ ngân sách Bảo tồn Sơn Trà</h2>
            <p className="text-xs text-[#5d6861]">Lập phiếu giải ngân cho các đơn vị thực hiện dự án sinh thái.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#18211c] mb-2">Tên dự án / Chương trình</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus:outline-none focus:border-[#24563d]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18211c] mb-2">Hạng mục phân bổ</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus:outline-none focus:border-[#24563d]"
              >
                <option value="reforestation">Trồng rừng bản địa (Reforestation)</option>
                <option value="wildlife_protection">Bảo vệ động vật hoang dã (Wildlife)</option>
                <option value="eco_trash_program">Chương trình Eco-Trash Rác thải</option>
                <option value="rescue_equipment">Trang thiết bị cứu hộ & tuần tra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#18211c] mb-2">Số tiền đề xuất giải ngân (VNĐ)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 text-xs font-bold text-[#24563d] bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus:outline-none focus:border-[#24563d]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18211c] mb-2">Đơn vị thụ hưởng / Đối tác</label>
              <input 
                type="text" 
                placeholder="Nhập tên đơn vị hoặc đại diện tiếp nhận"
                defaultValue="Hạt Kiểm lâm Bán đảo Sơn Trà & Ban Quản Lý"
                className="w-full px-4 py-3 text-xs bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus:outline-none focus:border-[#24563d]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18211c] mb-2">Ghi chú & Căn cứ phê duyệt</label>
            <textarea 
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-[#fcfdfc] border border-[#c2cdc5] rounded-xl focus:outline-none focus:border-[#24563d]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e2e8e4]">
            <button 
              type="button" 
              className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-[#24563d] hover:bg-[#1d4833] text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Gửi yêu cầu phân bổ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FundAllocationPage;
