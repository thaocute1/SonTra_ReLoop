import { api } from '../lib/axios';

const flashSaleService = {
  // Lấy phiên Flash Sale đang chạy hoặc sắp mở phục vụ Du khách
  getActiveSession: async () => {
    const res = await api.get('/flash-sales/active-session/');
    return res.data?.data || null;
  },

  // BQL xem toàn bộ chiến dịch, phiên và chỉ số tổng quan
  getAdminCampaigns: async () => {
    const res = await api.get('/flash-sales/admin/campaigns/');
    return res.data?.data || null;
  },

  // BQL tạo chiến dịch mới
  createCampaign: async (payload) => {
    const res = await api.post('/flash-sales/admin/campaigns/', payload);
    return res.data;
  },

  // BQL tạo phiên giờ vàng mới
  createSession: async (payload) => {
    const res = await api.post('/flash-sales/admin/sessions/', payload);
    return res.data;
  },

  // Vendor / BQL nộp tour tham gia phiên giờ vàng
  registerTourItem: async (payload) => {
    const res = await api.post('/flash-sales/vendor/register-item/', payload);
    return res.data;
  },

  // BQL duyệt hoặc từ chối tour tham gia
  reviewItem: async (itemId, action) => {
    const res = await api.patch(`/flash-sales/admin/items/${itemId}/review/`, { action });
    return res.data;
  }
};

export default flashSaleService;

