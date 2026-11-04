import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight, 
  CheckCircle2, 
  PieChart, 
  RefreshCw,
  Plus,
  TreeDeciduous,
  HeartHandshake,
  Trash2,
  Activity,
  FileCheck2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function FundAllocationPage() {
  const [loading, setLoading] = useState(false);
  const [fundData, setFundData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating new allocation
  const [form, setForm] = useState({
    project_name: '',
    category: 'wildlife_protection',
    allocated_amount: '',
    description: '',
  });

  const fetchFundData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/payments/conservation-funds/');
      const data = await res.json();
      setFundData(data);
    } catch (err) {
      console.error('Failed to load conservation fund data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundData();
  }, []);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!form.project_name || !form.allocated_amount) {
      alert('Vui lòng nhập tên hạng mục và số tiền giải ngân!');
      return;
    }

    const amountNum = parseFloat(form.allocated_amount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) {
      alert('Số tiền giải ngân không hợp lệ!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/payments/conservation-funds/allocate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: form.project_name,
          category: form.category,
          allocated_amount: amountNum,
          description: form.description,
        })
      });

      const resData = await res.json();
      if (res.ok && resData.status === 'success') {
        alert(`ĐÃ DUYỆT GIẢI NGÂN QUỸ ESG THÀNH CÔNG!\n\n${resData.message}`);
        setShowModal(false);
        setForm({
          project_name: '',
          category: 'wildlife_protection',
          allocated_amount: '',
          description: '',
        });
        fetchFundData();
      } else {
        alert(`Lỗi giải ngân: ${resData.message || 'Không thể thực hiện'}`);
      }
    } catch (err) {
      console.error('Error allocating fund:', err);
      alert('Không thể kết nối tới Backend API!');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'wildlife_protection':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'reforestation':
        return <TreeDeciduous className="w-4 h-4 text-green-700" />;
      case 'eco_trash_program':
        return <Trash2 className="w-4 h-4 text-teal-600" />;
      default:
        return <HeartHandshake className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>AD-04: Quản Lý Phân Bổ Quỹ Bảo Tồn & ESG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c]">Quỹ Bảo Tồn & Phát Triển Bền Vững Bán Đảo Sơn Trà</h1>
          <p className="text-xs text-[#5d6861] mt-1">
            Minh bạch dòng tiền tài trợ ESG: 10% trích từ vé tour sinh thái + Quỹ tài trợ bảo tồn đa dạng sinh học.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFundData}
            className="p-2 border border-[#e8ece9] rounded-xl hover:bg-[#f7f5f0] text-[#5d6861] cursor-pointer"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#24563d]' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#24563d] text-white text-xs font-bold rounded-xl hover:bg-[#1d4833] transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Tạo Đề Xuất Giải Ngân</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-gray-500">Tổng Quỹ Tích Lũy</span>
          <p className="text-xl font-bold text-[#18211c]">
            {fundData ? fundData.total_fund_accumulated_formatted : '254.850.000 VNĐ'}
          </p>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            Tích lũy từ đầu năm 2026
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-gray-500">10% Trích Nộp Từ Tour</span>
          <p className="text-xl font-bold text-[#24563d]">
            {fundData ? fundData.total_from_tours_formatted : '4.850.000 VNĐ'}
          </p>
          <span className="text-[11px] text-[#24563d] font-bold bg-[#eaf2eb] px-2 py-0.5 rounded-md inline-block">
            Tự động trích qua Split Payment
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-gray-500">Đã Phân Bổ / Giải Ngân</span>
          <p className="text-xl font-bold text-amber-700">
            {fundData ? fundData.total_disbursed_formatted : '140.000.000 VNĐ'}
          </p>
          <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
            {fundData ? fundData.allocations_count : 3} Dự án bảo tồn thực địa
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-gray-500">Số Dư Quỹ Khả Dụng</span>
          <p className="text-xl font-bold text-emerald-600">
            {fundData ? fundData.remaining_fund_formatted : '114.850.000 VNĐ'}
          </p>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            Sẵn sàng giải ngân quý tới
          </span>
        </div>
      </div>

      {/* 3. Allocations Breakdown & ESG Audit Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Project Allocations List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#e8ece9]">
            <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#24563d]" />
              <span>Các Hạng Mục Đã Giải Ngân Từ Quỹ ({fundData?.allocations?.length || 0})</span>
            </h3>
            <span className="text-xs text-[#5d6861]">Đồng bộ thời gian thực từ Database</span>
          </div>

          <div className="space-y-3">
            {fundData?.allocations?.map((alloc) => (
              <div 
                key={alloc.id} 
                className="p-4 rounded-xl border border-[#e8ece9] bg-[#fcfdfc] hover:border-[#24563d] transition-all space-y-2"
              >
                <div className="flex justify-between items-start text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-white rounded-lg border border-[#e2e8e4] shrink-0">
                      {getCategoryIcon(alloc.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#18211c] text-sm">{alloc.project_name}</h4>
                      <p className="text-[11px] text-[#5d6861] mt-0.5">{alloc.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-[#24563d]">{alloc.allocated_amount_formatted}</span>
                    <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                      Đã giải ngân
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#f0f4f1] text-[11px] text-[#5d6861]">
                  <span className="font-medium text-[#24563d]">Danh mục: {alloc.category_label}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ngày duyệt: {alloc.disbursed_at}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 Col): Transparency & ESG Standard */}
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#24563d]" />
            <span>Tiêu Chuẩn Minh Bạch ESG & Kiểm Toán</span>
          </h3>

          <div className="p-4 bg-[#f4f8f5] rounded-xl border border-[#c8dcd0] text-xs text-[#24563d] space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Chứng nhận Tuân thủ ESG Quốc tế 2026</span>
            </div>
            <p className="text-[11px] text-[#5d6861] leading-relaxed">
              Mọi giao dịch đặt tour đều được chia sẻ trực tiếp 10% doanh thu thông qua cơ chế Split Payment tự động vào tài khoản bảo tồn chuyên dụng. Không có sự can thiệp thủ công làm sai lệch quỹ.
            </p>
            <div className="pt-2 border-t border-[#dce8e0] text-[11px] text-[#24563d] font-bold">
              Kiểm toán độc lập: BQL Bán đảo Sơn Trà & Sở Du Lịch Đà Nẵng
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-[#18211c]">Quy định mục đích sử dụng Quỹ:</h4>
            <ul className="text-xs text-[#5d6861] space-y-2 list-disc list-inside">
              <li>Tuần tra & Bảo vệ đàn Voọc Chà Vá Chân Nâu</li>
              <li>Trang bị máy cân rác và camera IoT tại Checkpoint</li>
              <li>Duy trì chiến dịch Chủ Nhật Xanh dọn rác bãi đá</li>
              <li>Cứu hộ động vật và phủ xanh các tuyến sạt lở</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Modal Tạo Đề Xuất Giải Ngân */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#e8ece9]">
              <h2 className="text-base font-bold text-[#18211c]">Tạo Đề Xuất Giải Ngân Quỹ ESG</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18211c] block mb-1">Tên Dự Án / Hạng Mục Giải Ngân *</label>
                <input
                  type="text"
                  required
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  placeholder="VD: Mua sắm máy định vị tuần tra kiểm lâm..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ece9] focus:outline-none focus:border-[#24563d]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Danh Mục Bảo Tồn *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ece9] focus:outline-none focus:border-[#24563d]"
                >
                  <option value="wildlife_protection">Cứu hộ & Bảo vệ Voọc Chà Vá Chân Nâu</option>
                  <option value="reforestation">Trồng Rừng & Phục Hồi Sinh Thái</option>
                  <option value="rescue_equipment">Trang Thiết Bị Cứu Hộ & Tuần Tra</option>
                  <option value="eco_trash_program">Thu Gom & Tái Chế Rác Thải Eco-Trash</option>
                  <option value="community_support">Hỗ Trợ Cộng Đồng Địa Phương & Tình Nguyện</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Số Tiền Giải Ngân (VNĐ) *</label>
                <input
                  type="text"
                  required
                  value={form.allocated_amount}
                  onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                  placeholder="VD: 35000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ece9] focus:outline-none focus:border-[#24563d]"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Số dư khả dụng hiện tại: {fundData?.remaining_fund_formatted || '114.850.000 VNĐ'}
                </span>
              </div>

              <div>
                <label className="font-bold text-[#18211c] block mb-1">Thuyết Minh / Mô Tả Mục Đích Chi Tiết</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Thuyết minh giải trình mục đích và kế hoạch nghiệm thu thực địa..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ece9] focus:outline-none focus:border-[#24563d]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e8ece9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#e8ece9] text-[#5d6861] rounded-xl font-bold hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#24563d] text-white rounded-xl font-bold hover:bg-[#1d4833] flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Đang duyệt...' : 'Phê Duyệt & Giải Ngân'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
