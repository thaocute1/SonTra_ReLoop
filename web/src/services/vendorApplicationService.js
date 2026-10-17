// Service quản lý hồ sơ đăng ký đối tác (Vendor Applications)
// Hỗ trợ kết nối trực tiếp Django Backend API (DRF) và tự động fallback sang localStorage

import api from '../lib/axios';

const STORAGE_KEY = 'sontra_vendor_applications';

// Helper chuẩn hóa mã hồ sơ duy nhất, không bao giờ bị lặp VAPP-2026-VAPP-2026-...
export function formatDisplayId(rawId) {
  if (!rawId) return 'VAPP-2026-001';
  const str = String(rawId).trim();
  const cleanNumber = str.replace(/VAPP-2026-/gi, '');
  return `VAPP-2026-${cleanNumber.padStart(3, '0')}`;
}

const INITIAL_APPLICATIONS = [
  {
    id: 1,
    display_id: 'VAPP-2026-001',
    brand_name: 'Sơn Trà Trekking Adventure',
    legal_representative: 'Nguyễn Văn Hùng (Giám đốc điều hành)',
    tax_code: '0402198829',
    issued_by: 'Sở Kế hoạch & Đầu tư TP. Đà Nẵng',
    issued_date: '15/03/2021',
    scope_of_business: 'Lữ hành nội địa, Tour khám phá sinh thái & Trekking rừng mạo hiểm',
    description: 'Đơn vị tiên phong tổ chức các tour trekking trải nghiệm bảo tồn Đỉnh Bàn Cờ, Cây Đa Ngàn Năm và các cung đường rừng nguyên sinh Sơn Trà.',
    vendor_type: 'tour_operator',
    service_type: 'Trekking & Khám phá Rừng',
    operating_area: 'Bán đảo Sơn Trà (Đỉnh Bàn Cờ - Bãi Bắc)',
    hotline: '0905 123 789',
    email: 'contact@sontratrekking.vn',
    business_license_code: 'GPKD-DN-040219882',
    license_file_name: 'GPKD_SonTraTrekking_2026.pdf',
    logo_file_name: 'logo_sontra_trekking.png',
    experience_years: 5,
    guides_count: 6,
    commission_rate: 0.10, // 10% Quỹ bảo tồn ESG
    safety_commitment: true,
    esg_fund_commitment: true,
    status: 'pending_approval', // pending_approval | approved | need_info | rejected
    submitted_at: '2026-10-15T09:30:00.000Z',
    rejection_reason: '',
    verified_by_admin: null,
    verified_at: null,
  },
  {
    id: 2,
    display_id: 'VAPP-2026-002',
    brand_name: 'CLB Lặn Biển San Hô Bãi Nam',
    legal_representative: 'Trần Minh Tuấn (Chủ nhiệm CLB)',
    tax_code: '0401872341',
    issued_by: 'Sở Văn hóa Thể thao & Du lịch Đà Nẵng',
    issued_date: '20/06/2019',
    scope_of_business: 'Dịch vụ lặn biển thể thao, cứu hộ bờ biển và chèo thuyền SUP sinh thái',
    description: 'Tổ chức tour lặn ngắm san hô thân thiện môi trường, kết hợp thu gom rác đáy biển cùng du khách.',
    vendor_type: 'tour_operator',
    service_type: 'Lặn ngắm san hô & Chèo SUP',
    operating_area: 'Bãi Nam - Bãi Bụt (Khu vực bảo tồn rạn san hô)',
    hotline: '0914 987 654',
    email: 'bainam.diving@danangeco.vn',
    business_license_code: 'GPKD-DN-040187234',
    license_file_name: 'GiayPhep_BaiNamDiving.pdf',
    logo_file_name: 'bainam_logo.png',
    experience_years: 7,
    guides_count: 8,
    commission_rate: 0.10,
    safety_commitment: true,
    esg_fund_commitment: true,
    status: 'approved',
    submitted_at: '2026-10-10T14:15:00.000Z',
    rejection_reason: '',
    verified_by_admin: 'Nguyễn Tuấn Phong (BQL)',
    verified_at: '2026-10-12T10:00:00.000Z',
  },
  {
    id: 3,
    display_id: 'VAPP-2026-003',
    brand_name: 'Hợp Tác Xã Eco-Trails Đà Nẵng',
    legal_representative: 'Lê Thị Thu Thảo (Đại diện HTX)',
    tax_code: '0403321990',
    issued_by: 'UBND Quận Sơn Trà, TP. Đà Nẵng',
    issued_date: '05/01/2023',
    scope_of_business: 'Hướng dẫn viên du lịch sinh thái cộng đồng, giáo dục trải nghiệm tự nhiên',
    description: 'Cung cấp hướng dẫn viên bản địa, tour giáo dục thiên nhiên và quan sát loài Voọc Chà vá chân nâu.',
    vendor_type: 'tour_operator',
    service_type: 'Tour Giáo dục & Quan sát Voọc',
    operating_area: 'Tuyến Suối Đổ - Bãi Bắc',
    hotline: '0903 555 222',
    email: 'ecotrails.danang@gmail.com',
    business_license_code: 'GPKD-DN-040332199',
    license_file_name: 'HopDong_HTX_EcoTrails.pdf',
    logo_file_name: 'ecotrails_logo.png',
    experience_years: 3,
    guides_count: 4,
    commission_rate: 0.10,
    safety_commitment: true,
    esg_fund_commitment: true,
    status: 'need_info',
    submitted_at: '2026-10-14T11:00:00.000Z',
    rejection_reason: 'Cần bổ sung chứng chỉ sơ cấp cứu quốc tế (First Aid & CPR) của đội ngũ Hướng dẫn viên dẫn đoàn.',
    verified_by_admin: 'Nguyễn Tuấn Phong (BQL)',
    verified_at: '2026-10-14T16:20:00.000Z',
  }
];

// Khởi tạo storage nếu chưa có
function getStoredApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPLICATIONS));
      return INITIAL_APPLICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Chuẩn hóa display_id cho từng item trong storage
      return parsed.map((item) => ({
        ...item,
        display_id: formatDisplayId(item.display_id || item.id),
      }));
    }
    return INITIAL_APPLICATIONS;
  } catch {
    return INITIAL_APPLICATIONS;
  }
}

function saveStoredApplications(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Không thể lưu hồ sơ đối tác vào localStorage:', err);
  }
}

export const vendorApplicationService = {
  // Lấy toàn bộ danh sách hồ sơ (Ưu tiên gọi Backend, tự động fallback nếu offline)
  async getAll(filter = {}) {
    const { status, search } = filter;

    try {
      const res = await api.get('/vendors/applications/', {
        params: {
          status: status || 'all',
          search: search || ''
        },
        timeout: 2500
      });

      if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
        const backendList = res.data.data.map(item => ({
          ...item,
          display_id: formatDisplayId(item.id),
          legal_representative: item.user_name || item.brand_name,
          tax_code: item.business_license_code || '0408892101',
          issued_by: 'Sở Kế hoạch & Đầu tư TP. Đà Nẵng',
          issued_date: '01/01/2022',
          scope_of_business: 'Kinh doanh dịch vụ lữ hành & Du lịch sinh thái Sơn Trà',
          service_type: item.vendor_type === 'tour_operator' ? 'Trekking & Trải nghiệm' : item.vendor_type,
          operating_area: 'Bán đảo Sơn Trà',
          hotline: item.phone,
          submitted_at: item.created_at || new Date().toISOString(),
          license_file_name: item.business_license_code ? `${item.business_license_code}.pdf` : 'GPKD_Scan.pdf',
          logo_file_name: item.logo_url || 'brand_logo.png',
        }));

        if (backendList.length > 0) {
          return backendList;
        }
      }
    } catch {
      // Backend offline -> Fallback localStorage
    }

    // Fallback Local Storage
    let list = getStoredApplications();
    if (status && status !== 'all') {
      list = list.filter((app) => app.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (app) =>
          app.brand_name.toLowerCase().includes(q) ||
          (app.business_license_code && app.business_license_code.toLowerCase().includes(q)) ||
          (app.email && app.email.toLowerCase().includes(q)) ||
          (app.hotline && app.hotline.includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  },

  // Lấy chi tiết một hồ sơ theo id
  async getById(id) {
    try {
      const res = await api.get(`/vendors/applications/${id}/`, { timeout: 2500 });
      if (res.data && res.data.status === 'success') {
        const item = res.data.data;
        return {
          ...item,
          display_id: formatDisplayId(item.id),
          legal_representative: item.user_name || item.brand_name,
          tax_code: item.business_license_code || '0408892101',
          issued_by: 'Sở Kế hoạch & Đầu tư TP. Đà Nẵng',
          issued_date: '01/01/2022',
          scope_of_business: 'Kinh doanh dịch vụ lữ hành & Du lịch sinh thái Sơn Trà',
          service_type: 'Trekking & Trải nghiệm',
          operating_area: 'Bán đảo Sơn Trà',
          hotline: item.phone,
          submitted_at: item.created_at || new Date().toISOString(),
          license_file_name: item.business_license_code ? `${item.business_license_code}.pdf` : 'GPKD_Scan.pdf',
          logo_file_name: item.logo_url || 'brand_logo.png',
        };
      }
    } catch {
      // fallback
    }

    const list = getStoredApplications();
    return list.find((app) => String(app.id) === String(id)) || null;
  },

  // Nộp hồ sơ mới từ form đối tác (ĐÃ BỎ WEBSITE)
  async submit(formData) {
    const payload = {
      brand_name: formData.businessName || 'Doanh nghiệp Mới',
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
      const res = await api.post('/vendors/register/', payload, { timeout: 3000 });
      if (res.data && res.data.status === 'success') {
        const backendItem = res.data.data;
        const normalized = {
          ...backendItem,
          display_id: formatDisplayId(backendItem.id),
          legal_representative: payload.brand_name,
          tax_code: backendItem.business_license_code,
          issued_by: 'Sở Kế hoạch & Đầu tư TP. Đà Nẵng',
          issued_date: new Date().toLocaleDateString('vi-VN'),
          scope_of_business: `Dịch vụ lữ hành ${payload.service_type}`,
          service_type: payload.service_type,
          operating_area: payload.operating_area,
          hotline: backendItem.phone,
          submitted_at: backendItem.created_at || new Date().toISOString(),
          license_file_name: `${backendItem.business_license_code}.pdf`,
          logo_file_name: 'logo_asset.png',
          is_new: true,
        };

        const list = getStoredApplications();
        saveStoredApplications([normalized, ...list]);
        return normalized;
      }
    } catch {
      // Backend offline -> Lưu vào LocalStorage
    }

    const list = getStoredApplications();
    const newNumericId = Math.floor(10 + Math.random() * 90);
    const newApp = {
      id: newNumericId,
      display_id: formatDisplayId(newNumericId),
      brand_name: payload.brand_name,
      legal_representative: payload.brand_name,
      tax_code: payload.business_license_code,
      issued_by: 'Sở Kế hoạch & Đầu tư TP. Đà Nẵng',
      issued_date: new Date().toLocaleDateString('vi-VN'),
      scope_of_business: `Dịch vụ lữ hành sinh thái (${payload.service_type})`,
      description: payload.description,
      vendor_type: payload.vendor_type,
      service_type: payload.service_type,
      operating_area: payload.operating_area,
      hotline: payload.phone,
      email: payload.email,
      business_license_code: payload.business_license_code,
      license_file_name: formData.licenseFile?.name || 'GiayPhepKinhDoanh_Scan.pdf',
      logo_file_name: formData.logoFile?.name || 'logo_asset.png',
      experience_years: 3,
      guides_count: 2,
      commission_rate: 0.10,
      safety_commitment: payload.safety_commitment,
      esg_fund_commitment: payload.esg_fund_commitment,
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
      rejection_reason: '',
      verified_by_admin: null,
      verified_at: null,
      is_new: true,
    };

    saveStoredApplications([newApp, ...list]);
    return newApp;
  },

  // Cập nhật trạng thái hồ sơ (Phê duyệt, Yêu cầu bổ sung, Từ chối)
  async updateStatus(id, newStatus, reason = '', adminName = 'Ban Quản Lý Sơn Trà') {
    let backendData = null;
    try {
      const res = await api.patch(`/vendors/applications/${id}/review/`, {
        status: newStatus,
        rejection_reason: reason || ''
      }, { timeout: 3000 });
      if (res.data && res.data.status === 'success') {
        backendData = res.data.data;
      }
    } catch {
      // Backend offline -> cập nhật local
    }

    const list = getStoredApplications();
    const updated = list.map((app) => {
      if (String(app.id) === String(id)) {
        return {
          ...app,
          status: newStatus,
          rejection_reason: reason || '',
          verified_by_admin: adminName,
          verified_at: new Date().toISOString(),
          initial_password: newStatus === 'approved' ? (backendData?.initial_password || 'Vendor@2026') : null,
          is_new: false,
        };
      }
      return app;
    });

    saveStoredApplications(updated);
    const target = updated.find((app) => String(app.id) === String(id));
    if (newStatus === 'approved' && target && !target.initial_password) {
      target.initial_password = 'Vendor@2026';
    }
    return target;
  },

  // Lấy thống kê số lượng theo trạng thái
  async getStats() {
    try {
      const res = await api.get('/vendors/applications/stats/', { timeout: 2000 });
      if (res.data && res.data.status === 'success') {
        const s = res.data.data;
        if (s.total > 0) return s;
      }
    } catch {
      // fallback
    }

    const list = getStoredApplications();
    return {
      total: list.length,
      pending: list.filter((a) => a.status === 'pending_approval').length,
      approved: list.filter((a) => a.status === 'approved').length,
      need_info: list.filter((a) => a.status === 'need_info').length,
      rejected: list.filter((a) => a.status === 'rejected').length,
    };
  },

  // Khôi phục danh sách mẫu ban đầu và xóa cache cũ
  resetToDefault() {
    saveStoredApplications(INITIAL_APPLICATIONS);
    return INITIAL_APPLICATIONS;
  }
};

export default vendorApplicationService;
