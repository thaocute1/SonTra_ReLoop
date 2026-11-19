import { api } from '../lib/axios';

export const paypalService = {
  config: () => api.get('/payments/paypal/config/').then(response => response.data),
  create: orderId => api.post('/payments/paypal/create-order/', { order_id: orderId }, { timeout: 40000 }).then(response => response.data.data),
  capture: providerId => api.post('/payments/paypal/capture/', { paypal_order_id: providerId }, { timeout: 90000 }).then(response => response.data.data),
  status: (orderId, signal) => api.get(`/payments/paypal/status/${orderId}/`, { signal, timeout: 40000 }).then(response => response.data.data),
  cancel: orderId => api.post('/payments/paypal/cancel/', { order_id: orderId }, { timeout: 40000 }).then(response => response.data.data),
};

export function openPayPalCheckout(data) {
  const url = new URL(data.approval_url);
  if (url.protocol !== 'https:' || !['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(url.hostname)) {
    throw new Error('Liên kết PayPal Sandbox không hợp lệ.');
  }
  window.location.assign(url.href);
}

export function paypalError(error) {
  if ([401, 403].includes(error.response?.status)) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra đơn.';
  const body = error.response?.data;
  const detail = body?.error || body?.message || body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.join(' ');
  if (detail && typeof detail === 'object') return Object.values(detail).flat().join(' ');
  return error.message === 'Liên kết PayPal Sandbox không hợp lệ.' ? error.message : 'Chưa xác nhận được kết quả từ máy chủ. Hãy kiểm tra lại trước khi tạo giao dịch mới.';
}
