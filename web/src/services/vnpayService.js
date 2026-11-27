import { api } from '../lib/axios';
import { extractErrorMessage } from '../utils/apiError';

export const vnpayService = {
  config: () => api.get('/payments/vnpay/config/').then((response) => response.data),
  create: (orderId) =>
    api
      .post('/payments/vnpay/create-payment/', { order_id: orderId }, { timeout: 30000 })
      .then((response) => response.data.data),
  verifyReturn: (params) =>
    api
      .post('/payments/vnpay/return/', params, { timeout: 30000 })
      .then((response) => response.data.data),
  status: (orderId, signal) =>
    api
      .get(`/payments/vnpay/status/${orderId}/`, { signal, timeout: 30000 })
      .then((response) => response.data.data),
  cancel: (orderId) =>
    api
      .post('/payments/vnpay/cancel/', { order_id: orderId }, { timeout: 30000 })
      .then((response) => response.data.data),
};

export function openVNPayCheckout(data) {
  const url = new URL(data.payment_url);
  if (
    url.protocol !== 'https:' ||
    !['sandbox.vnpaytest.vn', 'sandbox.vnpayment.vn'].includes(url.hostname)
  ) {
    throw new Error('Liên kết thanh toán VNPAY Sandbox không hợp lệ.');
  }
  window.location.assign(url.href);
}

export function vnpayError(error) {
  if ([401, 403].includes(error.response?.status)) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra đơn.';
  }
  return extractErrorMessage(
    error.response?.data || {},
    error.message === 'Liên kết thanh toán VNPAY Sandbox không hợp lệ.'
      ? error.message
      : 'Chưa xác nhận được kết quả từ máy chủ VNPAY. Vui lòng kiểm tra lại.'
  );
}
