import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  X,
  RefreshCw,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { api } from '../../../lib/axios';

export const PayOSPaymentModal = ({ isOpen, onClose, paymentData, onPaymentSuccess }) => {
  const payos = paymentData?.payos || {};
  const orderCode = paymentData?.payos_order_code || payos.orderCode;
  const grandTotal = paymentData?.total_price || payos.amount || 0;

  // Countdown timer 15:00 minutes
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [copiedField, setCopiedField] = useState(null);
  const [checking, setChecking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Bank name mapping from BIN
  const getBankName = (bin) => {
    const binStr = String(bin);
    if (binStr === '970422') return 'MBBank (Ngân hàng Quân Đội)';
    if (binStr === '970436') return 'Vietcombank';
    if (binStr === '970407') return 'Techcombank';
    if (binStr === '970415') return 'VietinBank';
    if (binStr === '970418') return 'BIDV';
    if (binStr === '970423') return 'TPBank';
    if (binStr === '970416') return 'ACB';
    return 'Ngân hàng Việt Nam (Napas)';
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // VietQR Image URL generator
  const qrImageUrl = payos.bin && payos.accountNumber
    ? `https://img.vietqr.io/image/${payos.bin}-${payos.accountNumber}-compact2.png?amount=${grandTotal}&addInfo=${encodeURIComponent(payos.description || '')}&accountName=${encodeURIComponent(payos.accountName || '')}`
    : null;

  // Countdown effect
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || isSuccess) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft, isSuccess]);

  const checkStatus = async () => {
    if (!isOpen || !orderCode || isSuccess) return;
    try {
      setChecking(true);
      const res = await api.get(`/payments/payos/check-status/${orderCode}/`);
      if (res.data?.status === 'success' && res.data?.payment_status === 'PAID') {
        setIsSuccess(true);
        setTimeout(() => {
          if (onPaymentSuccess) {
            onPaymentSuccess({
              ...paymentData,
              payment_status: 'paid',
              status: 'confirmed',
              status_label: 'Đã xác nhận',
              payment_status_label: 'Đã thanh toán VietQR'
            });
          }
        }, 1200);
      }
    } catch (err) {
      console.warn('PayOS polling check note:', err?.message);
    } finally {
      setChecking(false);
    }
  };

  // Polling payment status every 2 seconds (Không phụ thuộc vào timeLeft để tránh bị hủy ngắt quãng)
  useEffect(() => {
    if (!isOpen || !orderCode || isSuccess) return;

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [isOpen, orderCode, isSuccess]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(15 * 60);
    setIsSuccess(false);
    setCopiedField(null);
  }, [isOpen, orderCode]);

  const handleCancelAndClose = () => {
    if (orderCode && !isSuccess) {
      api.post('/payments/payos/cancel-link/', {
        order_code: orderCode,
        reason: 'Khách đóng modal hủy đặt tour'
      }).catch((e) => console.warn('Cancel link note:', e?.message));
    }
    onClose();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen || !paymentData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2D3732]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8E4] relative space-y-5">

        {/* Close Button */}
        <button
          type="button"
          onClick={handleCancelAndClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#F7F5F0] hover:bg-[#E2E8E4] text-[#6B7A72] border-0 cursor-pointer transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* ================= SUCCESS STATE ================= */
          <div className="text-center py-8 space-y-4 animate-scale-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl mx-auto flex items-center justify-center shadow-xs border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-fraunces text-[#2D3732]">
                Thanh toán thành công!
              </h3>
              <p className="text-xs text-[#6B7A72] font-be-vietnam mt-1">
                Số tiền <strong>{grandTotal.toLocaleString('vi-VN')} đ</strong> đã được chuyển qua VietQR và hệ thống đã kích hoạt vé E-Ticket cho bạn.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Đã trích 10% quỹ bảo tồn Sơn Trà
            </div>
          </div>
        ) : (
          /* ================= PAYMENT IN PROCESS ================= */
          <>
            {/* Modal Header */}
            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Cổng thanh toán VietQR tự động (PayOS)
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-fraunces text-[#2D3732] m-0">
                Quét mã QR để thanh toán chuyến đi
              </h3>
              <p className="text-xs text-[#6B7A72] font-be-vietnam">
                Mở ứng dụng ngân hàng hoặc MoMo để quét mã VietQR bên dưới
              </p>
            </div>

            {/* Timer and Auto status bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F7F5F0] border border-[#E2E8E4] text-xs">
              <div className="flex items-center gap-2 text-[#6B7A72] font-medium font-be-vietnam">
                <Clock className="w-4 h-4 text-[#4A6B5D]" />
                <span>Giao dịch hết hạn trong:</span>
                <span className={`font-mono font-bold text-sm ${timeLeft < 180 ? 'text-rose-600' : 'text-[#2D3732]'}`}>
                  {formatTimer(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tự động nhận diện</span>
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-dashed border-[#4A6B5D] text-center space-y-2">
              <div className="bg-white p-3 rounded-2xl shadow-xs inline-block mx-auto border border-[#E2E8E4]">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="VietQR PayOS"
                    className="w-56 h-auto mx-auto object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center text-xs text-[#6B7A72]">
                    <QrCode className="w-12 h-12 text-[#4A6B5D] mb-2 animate-pulse" />
                    Đang tạo mã VietQR...
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#6B7A72] font-be-vietnam m-0">
                Hỗ trợ hơn 40+ ứng dụng ngân hàng (Vietcombank, MB, Techcombank, BIDV, MoMo...)
              </p>
            </div>

            {/* Bank Transfer Details Table */}
            <div className="p-4 bg-white rounded-2xl border border-[#E2E8E4] space-y-2.5 text-xs font-be-vietnam">

              {/* Ngân hàng */}
              <div className="flex items-center justify-between py-1 border-b border-[#F7F5F0]">
                <span className="text-[#6B7A72] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#4A6B5D]" />
                  Ngân hàng thụ hưởng:
                </span>
                <span className="font-bold text-[#2D3732] text-right">
                  {getBankName(payos.bin)}
                </span>
              </div>

              {/* Tên chủ tài khoản */}
              <div className="flex items-center justify-between py-1 border-b border-[#F7F5F0]">
                <span className="text-[#6B7A72]">Tên người thụ hưởng:</span>
                <span className="font-bold text-[#2D3732] font-mono">
                  {payos.accountName || 'NGUYEN TUAN PHONG'}
                </span>
              </div>

              {/* Số tài khoản */}
              <div className="flex items-center justify-between py-1 border-b border-[#F7F5F0]">
                <span className="text-[#6B7A72]">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#4A6B5D] text-sm">
                    {payos.accountNumber || '---'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(payos.accountNumber, 'accountNumber')}
                    className="p-1 rounded-md hover:bg-[#F7F5F0] text-[#6B7A72] hover:text-[#2D3732] cursor-pointer border-0 bg-transparent"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'accountNumber' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Số tiền */}
              <div className="flex items-center justify-between py-1 border-b border-[#F7F5F0]">
                <span className="text-[#6B7A72]">Số tiền chính xác:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 text-sm font-fraunces">
                    {grandTotal.toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(grandTotal, 'amount')}
                    className="p-1 rounded-md hover:bg-[#F7F5F0] text-[#6B7A72] hover:text-[#2D3732] cursor-pointer border-0 bg-transparent"
                    title="Sao chép số tiền"
                  >
                    {copiedField === 'amount' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Nội dung chuyển khoản */}
              <div className="flex items-center justify-between py-1 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-800 font-bold block uppercase">
                    Nội dung chuyển khoản (bắt buộc):
                  </span>
                  <span className="font-mono font-bold text-xs text-[#2D3732] tracking-wider">
                    {payos.description || `Tour ${paymentData.tour_id || ''}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(payos.description, 'description')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  {copiedField === 'description' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Note & Actions */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2 text-[11px] text-[#6B7A72] font-be-vietnam">
                <AlertCircle className="w-4 h-4 text-[#4A6B5D] shrink-0 mt-0.5" />
                <span>
                  Sau khi bạn hoàn tất chuyển khoản trên ứng dụng ngân hàng, hệ thống PayOS sẽ tự động nhận diện và kích hoạt vé trong vòng <strong>1 - 3 giây</strong>.
                </span>
              </div>

                            {/* Nút kiểm tra trạng thái thanh toán ngay */}
              <button
                type="button"
                onClick={checkStatus}
                disabled={checking}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4A6B5D] hover:bg-[#3D594C] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Đang kiểm tra giao dịch PayOS...' : 'Tôi đã chuyển tiền xong - Kiểm tra ngay'}</span>
              </button>

              <div className="flex items-center justify-between gap-3 pt-2">
                {payos.checkoutUrl && (
                  <a
                    href={payos.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#4A6B5D] hover:underline flex items-center gap-1"
                  >
                    <span>Mở cổng PayOS Checkout</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleCancelAndClose}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E2E8E4] text-[#6B7A72] text-xs font-bold hover:bg-[#F7F5F0] transition-colors cursor-pointer ml-auto"
                >
                  Hủy / Đóng
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default PayOSPaymentModal;
