import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { paypalService, openPayPalCheckout, paypalError } from '../../services/paypalService';

export default function PayPalReturnPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const orderId = Number(params.get('order_id'));
  const providerId = params.get('token');
  const cancelledReturn = location.pathname.endsWith('/cancel');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(Boolean(localStorage.getItem('access_token')));
  const pendingRequest = useRef(false);
  const sequence = useRef(0);
  const validOrder = Number.isSafeInteger(orderId) && orderId > 0;
  const check = useCallback(async (capture = false) => {
    if (pendingRequest.current) return;
    if (!validOrder) { setError('Đường dẫn thiếu mã đơn đặt tour hợp lệ.'); return; }
    if (!localStorage.getItem('access_token')) { setSignedIn(false); return; }
    setSignedIn(true);
    pendingRequest.current = true;
    const version = sequence.current;
    setBusy(true); setError('');
    try {
      const result = capture && providerId ? await paypalService.capture(providerId) : await paypalService.status(orderId);
      if (version === sequence.current) setData(result);
    } catch (err) {
      if (version === sequence.current) setError(paypalError(err));
    } finally {
      if (version === sequence.current) { pendingRequest.current = false; setBusy(false); }
    }
  }, [orderId, providerId, validOrder]);
  useEffect(() => {
    pendingRequest.current = false;
    // Avoid duplicate initial captures during React StrictMode's mount/cleanup probe.
    const timer = setTimeout(() => check(!cancelledReturn), 0);
    return () => { clearTimeout(timer); sequence.current += 1; };
  }, [check, cancelledReturn]);
  useEffect(() => {
    if (!data || data.payment_status === 'paid' || data.cancelled || cancelledReturn || error) return;
    const timer = setInterval(() => check(false), 5000);
    return () => clearInterval(timer);
  }, [check, data, cancelledReturn, error]);
  async function resume() {
    if (pendingRequest.current) return;
    pendingRequest.current = true; setBusy(true); setError('');
    try { openPayPalCheckout(await paypalService.create(orderId)); }
    catch (err) { setError(paypalError(err)); }
    finally { pendingRequest.current = false; setBusy(false); }
  }
  async function cancelOrder() {
    if (pendingRequest.current || !window.confirm('Hủy đơn chờ thanh toán và trả lại số chỗ đã giữ?')) return;
    pendingRequest.current = true; setBusy(true); setError('');
    try { setData(await paypalService.cancel(orderId)); }
    catch (err) { setError(paypalError(err)); }
    finally { pendingRequest.current = false; setBusy(false); }
  }
  const paid = data?.payment_status === 'paid' && !data?.needs_review;
  const expired = data?.expires_at && new Date(data.expires_at).getTime() <= Date.now();
  const heading = data?.needs_review ? 'Giao dịch cần đối soát' : paid ? 'Thanh toán Sandbox thành công' : data?.cancelled ? 'Đã hủy đơn và trả chỗ' : cancelledReturn ? 'Bạn chưa hoàn tất thanh toán' : 'Xác nhận thanh toán PayPal';
  return <main className="min-h-screen bg-[#F2F5F1] p-4 sm:p-8 flex items-center justify-center text-[#191C1A]">
    <section className="w-full max-w-xl rounded-3xl border border-[#C5CCC7] bg-white p-6 sm:p-8 shadow-sm space-y-5" aria-busy={busy}>
      <p className="flex items-center gap-2 text-xs font-semibold text-[#2F5D4A]"><ShieldCheck size={18} />Sơn Trà REloop · PayPal Sandbox</p>
      <div className="flex gap-3 items-center">{busy ? <LoaderCircle className="animate-spin text-[#2F5D4A] shrink-0" /> : paid ? <CheckCircle2 className="text-[#2F5D4A] shrink-0" /> : <CircleAlert className="text-amber-700 shrink-0" />}<h1 className="text-xl font-bold">{heading}</h1></div>
      <p className="text-sm text-[#4A514C]">Đây là giao dịch thử nghiệm, không sử dụng tiền thật.</p>
      {!signedIn && <div className="rounded-xl bg-amber-50 p-4 text-sm">Đăng nhập trong tab mới, sau đó quay lại trang này và bấm kiểm tra kết quả.<br /><Link to="/login" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 font-bold underline">Đăng nhập</Link></div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 text-sm">{error}</p>}
      {data && <dl className="rounded-2xl bg-[#F2F5F1] p-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3"><dt>Đơn đặt tour</dt><dd className="font-bold">{data.order_code}</dd></div>
        <div className="flex justify-between gap-3"><dt>Giá trị đơn</dt><dd>{Number(data.amount_vnd).toLocaleString('vi-VN')} VND</dd></div>
        <div className="flex justify-between gap-3"><dt>Số tiền PayPal</dt><dd className="font-bold">{data.amount_usd} USD</dd></div>
        <div className="flex justify-between gap-3"><dt>Tỷ giá demo</dt><dd>1 USD = {Number(data.fx_vnd_per_usd).toLocaleString('vi-VN')} VND</dd></div>
        {data.capture_id && <div className="flex justify-between gap-3"><dt>Mã giao dịch</dt><dd className="break-all text-right">{data.capture_id}</dd></div>}
      </dl>}
      {data?.needs_review && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.needs_review} Vui lòng cung cấp mã đơn cho BQL.</p>}
      {expired && !paid && !data?.cancelled && <p className="text-sm text-amber-800">Đã hết hạn giữ chỗ. Hãy kiểm tra kết quả và hủy đơn chờ để trả chỗ trước khi đặt lại.</p>}
      <div className="flex flex-wrap gap-3">
        {!paid && !data?.cancelled && <button disabled={busy || !validOrder} onClick={() => check(!cancelledReturn)} className="rounded-xl border border-[#C5CCC7] px-4 py-3 text-sm font-semibold disabled:opacity-40 inline-flex gap-2 items-center"><RefreshCw size={16} />Kiểm tra kết quả</button>}
        {signedIn && data && !paid && !data.cancelled && !data.needs_review && <>
          <button disabled={busy || expired} onClick={resume} className="bg-[#2F5D4A] text-white px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40">Tiếp tục thanh toán</button>
          <button disabled={busy} onClick={cancelOrder} className="border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">Hủy đơn và trả chỗ</button>
        </>}
        <Link to={paid ? '/dashboard/profile' : '/dashboard/trekking'} className="bg-[#2F5D4A] text-white px-4 py-3 rounded-xl text-sm font-semibold">{paid ? 'Xem chuyến đi của tôi' : 'Về danh sách tour'}</Link>
        {paid && <button onClick={() => window.print()} className="border border-[#C5CCC7] px-4 py-3 rounded-xl text-sm">In biên nhận</button>}
      </div>
    </section>
  </main>;
}
