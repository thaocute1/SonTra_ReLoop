// Service quản lý hồ sơ đăng ký đối tác (Vendor Applications)
// Kết nối trực tiếp Django Backend API (DRF)

import api from '../lib/axios';

const STORAGE_KEY = 'sontra_vendor_applications';
const REQUEST_TIMEOUT_MS = 15000;

// Helper chuẩn hóa mã hồ sơ duy nhất, không bao giờ bị lặp VAPP-2026-VAPP-2026-...
export function formatDisplayId(rawId) {
  if (!rawId) return 'VAPP-2026-001';
  const str = String(rawId).trim();
  const cleanNumber = str.replace(/VAPP-2026-/gi, '');
  return `VAPP-2026-${cleanNumber.padStart(3, '0')}`;
}

function normalizeVendorApplication(item, overrides = {}) {
  return {
    ...item,
    display_id: formatDisplayId(item.id),
    legal_representative: item.user_name || item.brand_name,
    tax_code: item.business_license_code || '0408892101',
    issued_by: 'Sở Kế hoạch và Đầu tư TP. Đà Nẵng',
    issued_date: '01/01/2022',
    scope_of_business: 'Kinh doanh dịch vụ lữ hành và du lịch sinh thái Sơn Trà',
    service_type: item.vendor_type === 'tour_operator' ? 'Trekking & trải nghiệm' : item.vendor_type,
    operating_area: 'Bán đảo Sơn Trà',
    hotline: item.phone,
    submitted_at: item.created_at || new Date().toISOString(),
    license_file_name: item.business_license_code ? `${item.business_license_code}.pdf` : 'GPKD_Scan.pdf',
    logo_file_name: item.logo_url || 'brand_logo.png',
    ...overrides,
  };
}

function rethrowApiError(err, fallbackMessage) {
  if (err?.response) {
    throw err;
  }
  if (err?.code === 'ECONNABORTED') {
    throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít giây.');
  }
  throw new Error(fallbackMessage);
}

export const vendorApplicationService = {
  // Lấy toàn bộ danh sách hồ sơ từ Backend
  async getAll(filter = {}) {
    const { status, search } = filter;

    try {
      const res = await api.get('/vendors/applications/', {
        params: {
          status: status || 'all',
          search: search || ''
        },
        timeout: REQUEST_TIMEOUT_MS
      });

      if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
        return res.data.data.map((item) => normalizeVendorApplication(item));
      }
      throw new Error('Dữ liệu danh sách hồ sơ không hợp lệ.');
    } catch (err) {
      rethrowApiError(err, 'Không kết nối được máy chủ để tải danh sách hồ sơ đối tác.');
    }
  },

  // Lấy chi tiết một hồ sơ theo id
  async getById(id) {
    try {
      const res = await api.get(`/vendors/applications/${id}/`, { timeout: REQUEST_TIMEOUT_MS });
      if (res.data && res.data.status === 'success' && res.data.data) {
        return normalizeVendorApplication(res.data.data);
      }
      throw new Error('Không tìm thấy dữ liệu hồ sơ đối tác.');
    } catch (err) {
      rethrowApiError(err, 'Không kết nối được máy chủ để tải chi tiết hồ sơ đối tác.');
    }
  },

  // Nộp hồ sơ mới từ form đối tác
  async submit(formData) {
    const payload = {
      brand_name: formData.businessName || 'Doanh nghiệp mới',
      description: formData.description || 'Chưa có mô tả chi tiết.',
      vendor_type: 'tour_operator',
      service_type: formData.serviceType || 'Trekking',
      operating_area: formData.operatingArea || 'Bán đảo Sơn Trà',
      phone: formData.hotline || '',
      email: formData.email || `contact.${Date.now()}@sontra.vn`,
      business_license_code: `GPKD-DN-${Math.floor(10000000 + Math.random() * 90000000)}`,
      commission_rate: 0.1000,
      safety_commitment: !!formData.safetyCommitment,
      esg_fund_commitment: !!formData.esgFundCommitment,
    };

    try {
      const res = await api.post('/vendors/register/', payload, { timeout: REQUEST_TIMEOUT_MS });
      if (res.data && res.data.status === 'success' && res.data.data) {
        return normalizeVendorApplication(res.data.data, {
          legal_representative: payload.brand_name,
          tax_code: res.data.data.business_license_code,
          issued_date: new Date().toLocaleDateString('vi-VN'),
          scope_of_business: `Dịch vụ lữ hành ${payload.service_type}`,
          service_type: payload.service_type,
          operating_area: payload.operating_area,
          logo_file_name: 'logo_asset.png',
          is_new: true,
        });
      }
      throw new Error(res.data?.message || 'Không thể lưu hồ sơ đối tác.');
    } catch (err) {
      rethrowApiError(err, 'Không thể gửi hồ sơ lên máy chủ. Vui lòng kiểm tra backend rồi thử lại.');
    }
  },

  // Cập nhật trạng thái hồ sơ (Phê duyệt, Yêu cầu bổ sung, Từ chối)
  async updateStatus(id, rawStatus, reason = '', adminName = 'Ban quản lý Sơn Trà') {
    const newStatus = rawStatus === 'reject' ? 'rejected' : rawStatus;
    try {
      const res = await api.patch(`/vendors/applications/${id}/review/`, {
        status: newStatus,
        rejection_reason: reason || ''
      }, { timeout: REQUEST_TIMEOUT_MS });
      if (res.data && res.data.status === 'success' && res.data.data) {
        return normalizeVendorApplication(res.data.data, {
          status: res.data.data.status || newStatus,
          rejection_reason: res.data.data.rejection_reason ?? (reason || ''),
          verified_by_admin: res.data.data.verified_by_admin_name || adminName,
          verified_at: res.data.data.verified_at || new Date().toISOString(),
          is_new: false,
        });
      }
      throw new Error(res.data?.message || 'Không thể cập nhật trạng thái hồ sơ.');
    } catch (err) {
      rethrowApiError(err, 'Không kết nối được máy chủ khi thẩm định hồ sơ. Vui lòng thử lại.');
    }
  },

  // Lấy thống kê số lượng theo trạng thái
  async getStats() {
    try {
      const res = await api.get('/vendors/applications/stats/', { timeout: REQUEST_TIMEOUT_MS });
      if (res.data && res.data.status === 'success' && res.data.data) {
        return res.data.data;
      }
      throw new Error('Dữ liệu thống kê hồ sơ không hợp lệ.');
    } catch (err) {
      rethrowApiError(err, 'Không kết nối được máy chủ để tải thống kê hồ sơ.');
    }
  },

  // Xóa cache local cũ nếu có
  resetToDefault() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    return [];
  }
};

export default vendorApplicationService;
