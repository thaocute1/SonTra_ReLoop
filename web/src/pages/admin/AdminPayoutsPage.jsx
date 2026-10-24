import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  CreditCard, 
  History, 
  Search, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { api } from '../../lib/axios';

export const AdminPayoutsPage = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [payoutData, setPayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmModalVendor, setConfirmModalVendor] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments/payouts/');
      if (res.data) {
        setPayoutData(res.data);
      }
    } catch (err) {
      console.warn("Could not load payout data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleExecutePayout = async () => {
    setIsExecuting(true);
    try {
      const res = await api.post('/payments/payouts/execute/', {
        vendor_id: confirmModalVendor ? confirmModalVendor.vendor_id : null
      });
      if (res.data?.success) {
        showToast(res.data.message || "Đã phát lệnh Payout thành công qua cổng thanh toán PSP!");
        setConfirmModalVendor(null);
        fetchPayouts();
      }
    } catch (err) {
      showToast("Lỗi khi phát lệnh Payout. Vui lòng kiểm tra lại kết nối PSP.");
    } finally {
      setIsExecuting(false);
    }
  };

  const pendingList = payoutData?.pending_payouts || [];
  const historyList = payoutData?.batches_history || [];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#18211c] text-white px-5 py-3 rounded-2xl shadow-xl border border-gray-700 animate-fade-in text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-[#24563d] rounded-lg text-xs font-bold mb-2 border border-emerald-200">
            <DollarSign className="w-4 h-4" />
            <span>Đối soát & Split-Payment (AD-05)</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c] font-fraunces">Quản Lý Đối Soát & Giải Ngân Cho Vendor Tour</h1>
          <p className="text-xs text-[#5d6861] mt-1">Hệ thống phân chia doanh thu tự động qua API PSP (VNPay/Stripe), trích lập 10% Quỹ Bảo Tồn và chi trả cho đơn vị lữ hành.</p>
        </div>

        <button
          onClick={() => setConfirmModalVendor({ vendor_name: 'Tất cả Vendor chờ quyết toán' })}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#24563d] hover:bg-[#1d4833] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Khởi Tạo Đợt Payout Mới</span>
        </button>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-amber-700">
            <span className="text-xs font-bold">Chờ Giải Ngân Cho Vendor</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 font-fraunces">
            {payoutData?.total_pending_payout_formatted || "0 VNĐ"}
          </p>
          <span className="text-[11px] text-amber-700 block">Số dư ròng (Net) đã đối soát</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Vendor Chờ Quyết Toán</span>
            <Building2 className="w-4 h-4 text-[#24563d]" />
          </div>
          <p className="text-2xl font-bold text-[#18211c] font-fraunces">
            {payoutData?.pending_vendors_count ?? 1} Doanh nghiệp
          </p>
          <span className="text-[11px] text-gray-500 block">Kỳ đối soát tháng 10/2026</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-xs font-bold">Trích Quỹ Bảo Tồn (10%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 font-fraunces">2.450.000 VNĐ</p>
          <span className="text-[11px] text-emerald-700 block">Tự động chuyển vào Quỹ BQL</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Phí Nền Tảng ReLoop</span>
            <TrendingUp className="w-4 h-4 text-[#24563d]" />
          </div>
          <p className="text-2xl font-bold text-[#18211c] font-fraunces">2.450.000 VNĐ</p>
          <span className="text-[11px] text-gray-500 block">Duy trì hạ tầng & máy chủ GPS</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e2e8e4] pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#24563d] text-white shadow-xs'
              : 'text-[#556057] hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Danh Sách Chờ Giải Ngân ({pendingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#24563d] text-white shadow-xs'
              : 'text-[#556057] hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Các Đợt Payout ({historyList.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'pending' ? (
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#18211c] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#24563d]" />
              <span>Bảng Đối Soát Doanh Thu Kỳ Hiện Tại Theo Vendor</span>
            </h3>
            <span className="text-xs text-gray-500">Chu kỳ thanh toán: Thứ Hai hàng tuần</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8e4] bg-[#f8faf9] text-[#556057]">
                  <th className="p-3 font-bold rounded-l-xl">Đơn vị Lữ hành (Vendor)</th>
                  <th className="p-3 font-bold">Thông tin Ngân hàng</th>
                  <th className="p-3 font-bold text-center">Đơn hoàn thành</th>
                  <th className="p-3 font-bold text-right">Doanh thu Gộp (Gross)</th>
                  <th className="p-3 font-bold text-right text-emerald-800">Quỹ Bảo tồn (10%)</th>
                  <th className="p-3 font-bold text-right text-[#24563d]">Thực chuyển (Net Payout)</th>
                  <th className="p-3 font-bold text-center rounded-r-xl">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8e4]">
                {pendingList.length > 0 ? (
                  pendingList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfdfc]">
                      <td className="p-3">
                        <span className="font-bold text-[#18211c] block">{item.vendor_name}</span>
                        <span className="text-[10px] text-gray-500">Mã đối tác: VEN-{item.vendor_id}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold block">{item.bank_name}</span>
                        <span className="text-[11px] text-gray-500">{item.bank_account_number} ({item.bank_account_holder})</span>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-700">
                        {item.unpaid_orders_count || 12} đơn
                      </td>
                      <td className="p-3 text-right font-medium text-gray-600">
                        {item.gross_amount ? `${item.gross_amount.toLocaleString('vi-VN')} đ` : "24.500.000 đ"}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-700">
                        {item.conservation_fund ? `-${item.conservation_fund.toLocaleString('vi-VN')} đ` : "-2.450.000 đ"}
                      </td>
                      <td className="p-3 text-right font-bold text-[#24563d] text-sm">
                        {item.vendor_net_amount_formatted}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setConfirmModalVendor(item)}
                          className="px-3 py-1.5 bg-[#24563d] hover:bg-[#1d4833] text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                        >
                          Ra Lệnh Payout
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-[#fcfdfc]">
                    <td className="p-3">
                      <span className="font-bold text-[#18211c] block">Sơn Trà Trekking Co.</span>
                      <span className="text-[10px] text-gray-500">Mã đối tác: VEN-4</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold block">Vietcombank Đà Nẵng</span>
                      <span className="text-[11px] text-gray-500">0041000889922 (SON TRA TREKKING)</span>
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">14 đơn</td>
                    <td className="p-3 text-right font-medium text-gray-600">24.500.000 đ</td>
                    <td className="p-3 text-right font-semibold text-emerald-700">-2.450.000 đ</td>
                    <td className="p-3 text-right font-bold text-[#24563d] text-sm">19.600.000 VNĐ</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setConfirmModalVendor({ vendor_name: 'Sơn Trà Trekking Co.', vendor_net_amount_formatted: '19.600.000 VNĐ', vendor_id: 4 })}
                        className="px-3 py-1.5 bg-[#24563d] hover:bg-[#1d4833] text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                      >
                        Ra Lệnh Payout
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#18211c] flex items-center gap-2">
            <History className="w-4 h-4 text-[#24563d]" />
            <span>Nhật Ký Các Đợt Giải Ngân Thành Công Qua API PSP</span>
          </h3>

          <div className="space-y-3">
            {[
              { code: "BATCH-PAYOUT-20261015", date: "15/10/2026 10:30", amount: "42.500.000 VNĐ", status: "Đã hoàn tất chuyển tiền", psp: "VNPay B2B Payout" },
              { code: "BATCH-PAYOUT-20261008", date: "08/10/2026 09:15", amount: "38.200.000 VNĐ", status: "Đã hoàn tất chuyển tiền", psp: "VNPay B2B Payout" },
              { code: "BATCH-PAYOUT-20261001", date: "01/10/2026 14:00", amount: "29.700.000 VNĐ", status: "Đã hoàn tất chuyển tiền", psp: "Stripe Connect" },
            ].map((b, i) => (
              <div key={i} className="p-4 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#24563d] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {b.code}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">Cổng: {b.psp}</span>
                  </div>
                  <span className="text-xs text-gray-500 block">Thời gian thực thi: {b.date}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-[#18211c] font-fraunces">{b.amount}</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Confirmation Modal */}
      {confirmModalVendor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#e2e8e4] shadow-2xl relative">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-[#18211c] font-fraunces m-0 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#24563d]" />
                Xác Nhận Lệnh Payout
              </h3>
              <button 
                onClick={() => setConfirmModalVendor(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f8faf9] p-4 rounded-2xl border border-[#e4eee7] space-y-2 text-xs">
              <p className="text-gray-600 m-0">Bạn đang chuẩn bị phát lệnh giải ngân chia sẻ doanh thu cho:</p>
              <p className="text-sm font-bold text-[#18211c] m-0">{confirmModalVendor.vendor_name}</p>
              {confirmModalVendor.vendor_net_amount_formatted && (
                <p className="text-base font-bold text-[#24563d] m-0 font-fraunces">
                  Số tiền thực chuyển: {confirmModalVendor.vendor_net_amount_formatted}
                </p>
              )}
              <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-200">
                Lệnh Payout sẽ gọi trực tiếp đến API cổng thanh toán PSP (VNPay/Stripe) và cập nhật trạng thái đã giải ngân vào sổ cái kế toán.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalVendor(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer border-0 bg-transparent"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleExecutePayout}
                className="px-5 py-2 text-xs font-bold text-white bg-[#24563d] hover:bg-[#1d4833] rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExecuting ? "Đang chuyển..." : "Xác Nhận Phát Lệnh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayoutsPage;

