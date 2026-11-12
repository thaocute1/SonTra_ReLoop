import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, Building2, CheckCircle2, Clock3, History, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { api } from '../../lib/axios';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

export const AdminPayoutsPage = () => {
  const [payoutData, setPayoutData] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/payments/payouts/');
      setPayoutData(response.data);
    } catch (error) {
      setLoadError(error.response?.status === 403
        ? 'Chỉ quản trị viên hệ thống được xem dữ liệu giải ngân.'
        : 'Không tải được dữ liệu đối soát. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await api.post('/payments/payouts/execute/', {});
      setSimulation(response.data);
      setShowConfirm(false);
      setToast(response.data.message || 'Đã tạo bảng kê mô phỏng. Chưa có tiền được chuyển.');
      window.setTimeout(() => setToast(''), 4500);
    } catch (error) {
      setToast(error.response?.status === 403
        ? 'Bạn không có quyền tạo bảng kê payout.'
        : 'Không tạo được bảng kê mô phỏng. Vui lòng kiểm tra kết nối.');
      window.setTimeout(() => setToast(''), 4500);
    } finally {
      setIsSimulating(false);
    }
  };

  const exportSimulation = () => {
    if (!simulation?.payouts?.length) return;
    const columns = ['Vendor', 'Ngân hàng', 'Số tài khoản', 'Chủ tài khoản', 'Số tiền (VND)', 'Số đơn'];
    const rows = simulation.payouts.map((item) => [
      item.vendor_name, item.bank_name, item.bank_account_number,
      item.bank_account_holder, item.amount, item.order_count,
    ]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${simulation.batch_reference}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pending = payoutData?.pending_payouts || [];
  const history = payoutData?.batches_history || [];

  return (
    <div className="m3-app-page min-w-0 space-y-6">
      {toast && (
        <div role="status" className="fixed top-5 right-5 z-50 rounded-2xl bg-[#191C1A] px-5 py-3 text-xs font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <header className="admin-page-header flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-xs">
        <div>
          <h1 className="m-0 text-xl font-bold text-[#191C1A]">Đối soát và bảng kê Vendor</h1>
          <p className="mb-0 mt-2 text-xs text-gray-500">Mô phỏng chỉ tạo bảng kê để chuyển thủ công, không gọi PayOS.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetchPayouts} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#C5CCC7] bg-white px-4 py-2.5 text-xs font-bold text-[#2F5D4A] disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
          <button type="button" onClick={() => setShowConfirm(true)} disabled={loading || !pending.length} className="inline-flex items-center gap-2 rounded-xl bg-[#2F5D4A] px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-50">
            <Building2 className="h-4 w-4" /> Mô phỏng lô chi tất cả Vendor
          </button>
        </div>
      </header>

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>}
      {loading && <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">Đang tải dữ liệu đối soát…</div>}

      {!loading && payoutData && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800"><Clock3 className="h-4 w-4" /> Tổng đang chờ chi</div>
              <p className="mb-0 mt-3 text-2xl font-bold text-[#191C1A]">{payoutData.total_pending_payout_formatted || money(payoutData.total_pending_payout)}</p>
            </div>
            <div className="rounded-2xl border border-[#C5CCC7] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600"><Building2 className="h-4 w-4" /> Vendor đang chờ</div>
              <p className="mb-0 mt-3 text-2xl font-bold text-[#191C1A]">{payoutData.pending_vendors_count || 0}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Đủ thông tin để lập bảng kê</div>
              <p className="mb-0 mt-3 text-2xl font-bold text-[#191C1A]">{payoutData.eligible_vendors_count || 0}</p>
            </div>
          </section>

          {simulation && (
            <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-900"><CheckCircle2 className="h-5 w-5" /> Bảng kê mô phỏng: {simulation.batch_reference}</div>
                  <p className="mb-0 mt-2 text-xs text-blue-800">Chưa có giao dịch chuyển tiền nào được thực hiện. Hãy kiểm tra thông tin trước khi chuyển khoản ngoài hệ thống.</p>
                </div>
                <button type="button" onClick={exportSimulation} disabled={!simulation.payouts?.length} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-4 py-2 text-xs font-bold text-blue-900 disabled:opacity-50">
                  <ArrowDownToLine className="h-4 w-4" /> Xuất CSV
                </button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm">
                <span><b>{simulation.vendor_count}</b> Vendor trong bảng kê</span>
                <span><b>{money(simulation.total_amount)}</b> tổng cần chuyển</span>
                <span><b>{simulation.skipped_vendor_count}</b> Vendor bị bỏ qua</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                  <thead><tr className="border-b bg-[#F8FAF7] text-gray-600"><th className="p-3">Vendor</th><th className="p-3">Ngân hàng</th><th className="p-3">Số tài khoản</th><th className="p-3">Chủ tài khoản</th><th className="p-3 text-right">Số đơn</th><th className="p-3 text-right">Số tiền</th></tr></thead>
                  <tbody>{simulation.payouts?.map((item) => <tr key={item.vendor_id} className="border-b"><td className="p-3 font-semibold">{item.vendor_name}</td><td className="p-3">{item.bank_name}</td><td className="p-3">{item.bank_account_number}</td><td className="p-3">{item.bank_account_holder}</td><td className="p-3 text-right">{item.order_count}</td><td className="p-3 text-right font-bold">{money(item.amount)}</td></tr>)}</tbody>
                </table>
                {!simulation.payouts?.length && <p className="mb-0 p-4 text-sm text-gray-500">Không có Vendor nào đủ điều kiện lập bảng kê.</p>}
              </div>
              {!!simulation.skipped_vendors?.length && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="m-0 flex items-center gap-2 text-sm font-bold text-amber-900"><AlertCircle className="h-4 w-4" /> Vendor bị bỏ qua do thiếu thông tin ngân hàng</h3>
                  <ul className="mb-0 mt-2 space-y-1 pl-5 text-xs text-amber-900">{simulation.skipped_vendors.map((item) => <li key={item.vendor_id}>{item.vendor_name}: thiếu {item.missing_bank_fields.join(', ')} ({money(item.vendor_net_amount)})</li>)}</ul>
                </div>
              )}
            </section>
          )}

          <section className="space-y-4 rounded-2xl border border-[#C5CCC7] bg-white p-5 shadow-xs">
            <h2 className="m-0 text-sm font-bold text-[#191C1A]">Các khoản đủ điều kiện đối soát</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs">
                <thead><tr className="border-b bg-[#F8FAF7] text-gray-600"><th className="p-3">Vendor</th><th className="p-3">Thông tin ngân hàng</th><th className="p-3 text-right">Số đơn</th><th className="p-3 text-right">Gross</th><th className="p-3 text-right">Phí sàn</th><th className="p-3 text-right">Quỹ bảo tồn</th><th className="p-3 text-right">Vendor nhận</th></tr></thead>
                <tbody>{pending.map((item) => <tr key={item.vendor_id} className="border-b align-top"><td className="p-3 font-semibold">{item.vendor_name}<div className="mt-1 text-[10px] text-gray-500">VEN-{item.vendor_id}</div></td><td className="p-3">{item.bank_details_complete ? <>{item.bank_name}<div>{item.bank_account_number} · {item.bank_account_holder}</div></> : <span className="text-amber-800">Thiếu: {item.missing_bank_fields.join(', ')}</span>}</td><td className="p-3 text-right">{item.unpaid_orders_count}</td><td className="p-3 text-right">{money(item.gross_amount)}</td><td className="p-3 text-right">{money(item.platform_fee)}</td><td className="p-3 text-right">{money(item.conservation_fund)}</td><td className="p-3 text-right font-bold">{money(item.vendor_net_amount)}</td></tr>)}
                  {!pending.length && <tr><td colSpan="7" className="p-6 text-center text-gray-500">Không có khoản nào đang chờ chi.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#C5CCC7] bg-white p-5 shadow-xs">
            <h2 className="m-0 flex items-center gap-2 text-sm font-bold text-[#191C1A]"><History className="h-4 w-4" /> Lịch sử payout đã ghi nhận</h2>
            {history.length ? history.map((batch) => (
              <article key={batch.id} className="rounded-xl border border-[#C5CCC7] p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs"><b>{batch.batch_code}</b><span>{new Date(batch.created_at).toLocaleString('vi-VN')}</span><b>{money(batch.total_amount)}</b><span>{batch.status_label}</span></div>
                <p className="mb-0 mt-2 text-[11px] text-gray-500">Lịch sử payout đã lưu trong hệ thống; không bao gồm các lần mô phỏng.</p>
              </article>
            )) : <p className="mb-0 text-sm text-gray-500">Chưa có payout thật được ghi nhận. Bảng kê mô phỏng không lưu vào lịch sử.</p>}
          </section>
        </>
      )}

      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-label="Xác nhận mô phỏng lô chi" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="m-0 text-base font-bold">Mô phỏng lô chi tất cả Vendor</h2><button type="button" aria-label="Đóng" onClick={() => setShowConfirm(false)} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">Hệ thống chỉ tạo bảng kê từ các khoản đã thanh toán. Không gọi PayOS, không chuyển tiền và không lưu batch payout. Admin sẽ tự chuyển khoản thủ công sau khi kiểm tra.</div>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowConfirm(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100">Hủy</button><button type="button" disabled={isSimulating} onClick={runSimulation} className="rounded-xl bg-[#2F5D4A] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{isSimulating ? 'Đang tạo bảng kê…' : 'Tạo bảng kê mô phỏng'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayoutsPage;
