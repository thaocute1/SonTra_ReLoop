import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { vnpayService, openVNPayCheckout, vnpayError } from '../../services/vnpayService';

export default function VNPayReturnPage() {
  const [params] = useSearchParams();
  const orderId = Number(params.get('order_id'));
  const txnRef = params.get('vnp_TxnRef');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(Boolean(localStorage.getItem('access_token')));
  const pendingRequest = useRef(false);
  const sequence = useRef(0);
  const validOrder = Number.isSafeInteger(orderId) && orderId > 0;

  const verify = useCallback(async () => {
    if (pendingRequest.current) return;
    if (!validOrder && !txnRef) {
      setError('Đường dẫn thiếu mã đơn hàng hợp lệ.');
      return;
    }
    if (!localStorage.getItem('access_token')) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    pendingRequest.current = true;
    const version = sequence.current;
    setBusy(true);
    setError('');
    try {
      let result;
      if (txnRef && params.get('vnp_SecureHash')) {
        const payload = {};
        params.forEach((value, key) => {
          if (key.startsWith('vnp_')) payload[key] = value;
        });
        result = await vnpayService.verifyReturn(payload);
      } else {
        result = await vnpayService.status(orderId);
      }
      if (version === sequence.current) setData(result);
    } catch (err) {
      if (version === sequence.current) setError(vnpayError(err));
    } finally {
      if (version === sequence.current) {
        pendingRequest.current = false;
        setBusy(false);
      }
    }
  }, [orderId, txnRef, params, validOrder]);

  useEffect(() => {
    pendingRequest.current = false;
    const timer = setTimeout(() => verify(), 0);
    return () => {
      clearTimeout(timer);
      sequence.current += 1;
    };
  }, [verify]);

  async function retryCheckout() {
    if (pendingRequest.current || !validOrder) return;
    pendingRequest.current = true;
    setBusy(true);
    setError('');
    try {
      openVNPayCheckout(await vnpayService.create(orderId));
    } catch (err) {
      setError(vnpayError(err));
    } finally {
      pendingRequest.current = false;
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (
      pendingRequest.current ||
      !validOrder ||
      !window.confirm('Hủy đơn chờ thanh toán và trả lại số chỗ đã giữ?')
    ) {
      return;
    }
    pendingRequest.current = true;
    setBusy(true);
    setError('');
    try {
      setData(await vnpayService.cancel(orderId));
    } catch (err) {
      setError(vnpayError(err));
    } finally {
      pendingRequest.current = false;
      setBusy(false);
    }
  }

  const paid = data?.payment_status === 'paid' && !data?.needs_review;
  const expired = data?.expires_at && new Date(data.expires_at).getTime() <= Date.now();
  const responseCode = data?.vnp_response_code || params.get('vnp_ResponseCode');
  const heading = data?.needs_review
    ? 'Giao dịch cần đối soát'
    : paid
      ? 'Thanh toán VNPAY Sandbox thành công'
      : data?.cancelled
        ? 'Đã hủy đơn và trả chỗ'
        : responseCode && responseCode !== '00'
          ? 'Thanh toán VNPAY chưa hoàn tất'
          : 'Xác nhận thanh toán VNPAY';

  return (
    <main className="min-h-screen bg-[#F2F5F1] p-4 sm:p-8 flex items-center justify-center text-[#191C1A]">
      <section
        className="w-full max-w-xl rounded-3xl border border-[#C5CCC7] bg-white p-6 sm:p-8 shadow-sm space-y-5"
        aria-busy={busy}
      >
        <p className="flex items-center gap-2 text-xs font-semibold text-[#2F5D4A]">
          <ShieldCheck size={18} />
          Sơn Trà REloop · VNPAY Sandbox
        </p>

        <div className="flex gap-3 items-center">
          {busy ? (
            <LoaderCircle className="animate-spin text-[#2F5D4A] shrink-0" />
          ) : paid ? (
            <CheckCircle2 className="text-[#2F5D4A] shrink-0" />
          ) : (
            <CircleAlert className="text-amber-700 shrink-0" />
          )}
          <h1 className="text-xl font-bold">{heading}</h1>
        </div>

        <p className="text-sm text-[#4A514C]">
          Đây là giao dịch thử nghiệm VNPAY Sandbox, không sử dụng tiền thật.
        </p>

        {!signedIn && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm">
            Đăng nhập trong tab mới, sau đó quay lại trang này và bấm kiểm tra kết quả.
            <br />
            <Link to="/login" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 font-bold underline">
              Đăng nhập
            </Link>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 text-sm">
            {error}
          </p>
        )}

        {data && (
          <dl className="rounded-2xl bg-[#F2F5F1] p-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Đơn đặt tour</dt>
              <dd className="font-bold">{data.order_code}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Số tiền</dt>
              <dd className="font-bold">{Number(data.amount_vnd || 0).toLocaleString('vi-VN')} VND</dd>
            </div>
            {data.txn_ref && (
              <div className="flex justify-between gap-3">
                <dt>Mã tham chiếu</dt>
                <dd className="font-mono text-xs">{data.txn_ref}</dd>
              </div>
            )}
            {data.vnp_transaction_no && (
              <div className="flex justify-between gap-3">
                <dt>Mã GD VNPAY</dt>
                <dd className="font-mono text-xs">{data.vnp_transaction_no}</dd>
              </div>
            )}
            {data.vnp_bank_code && (
              <div className="flex justify-between gap-3">
                <dt>Ngân hàng</dt>
                <dd className="font-semibold">{data.vnp_bank_code}</dd>
              </div>
            )}
            {data.vnp_pay_date && (
              <div className="flex justify-between gap-3">
                <dt>Thời gian thanh toán</dt>
                <dd className="font-mono text-xs">{data.vnp_pay_date}</dd>
              </div>
            )}
          </dl>
        )}

        {data?.needs_review && (
          <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            {data.needs_review} Vui lòng cung cấp mã đơn cho BQL.
          </p>
        )}

        {expired && !paid && !data?.cancelled && (
          <p className="text-sm text-amber-800">
            Đã hết hạn giữ chỗ. Hãy hủy đơn chờ để trả chỗ trước khi đặt lại.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {!paid && !data?.cancelled && (
            <button
              type="button"
              disabled={busy || (!validOrder && !txnRef)}
              onClick={verify}
              className="rounded-xl border border-[#C5CCC7] px-4 py-3 text-sm font-semibold disabled:opacity-40 inline-flex gap-2 items-center cursor-pointer"
            >
              <RefreshCw size={16} />
              Kiểm tra kết quả
            </button>
          )}
          {signedIn && data && !paid && !data.cancelled && !data.needs_review && validOrder && (
            <>
              <button
                type="button"
                disabled={busy || expired}
                onClick={retryCheckout}
                className="bg-[#2F5D4A] text-white px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 cursor-pointer"
              >
                Thử thanh toán lại
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={cancelOrder}
                className="border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm cursor-pointer"
              >
                Hủy đơn và trả chỗ
              </button>
            </>
          )}
          <Link
            to={paid ? '/dashboard/bookings' : '/dashboard/trekking'}
            className="bg-[#2F5D4A] text-white px-4 py-3 rounded-xl text-sm font-semibold"
          >
            {paid ? 'Xem đơn đặt của tôi' : 'Về danh sách tour'}
          </Link>
          {paid && (
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-[#C5CCC7] px-4 py-3 rounded-xl text-sm cursor-pointer"
            >
              In biên nhận
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
