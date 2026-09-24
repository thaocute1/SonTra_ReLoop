export const navigationByRole = {
  CUSTOMER: [
    { label: 'Trang chủ', path: '/dashboard/customer', icon: 'house' },
    { label: 'Trekking An Toàn', path: '/tours', icon: 'chart-no-axes-column-increasing' },
    { label: 'Nhiệm vụ Xanh', path: '/dashboard/customer/points', icon: 'star' },
    { label: 'Marketplace', path: '/marketplace', icon: 'store' },
    { label: 'Cộng đồng', path: '/community', icon: 'users' },
  ],
  VENDOR: [
    { label: 'Tổng quan', path: '/dashboard/vendor', icon: 'layout-dashboard' },
    { label: 'Trải nghiệm', path: '/dashboard/vendor/tours', icon: 'map' },
    { label: 'Routes & GPS', path: '/dashboard/vendor/routes', icon: 'map-pin' },
    { label: 'Tour đặt', path: '/dashboard/vendor/orders', icon: 'calendar' },
    { label: 'Khách hàng & Đánh giá', path: '/dashboard/vendor/customers', icon: 'users' },
    { label: 'Phần thưởng', path: '/dashboard/vendor/rewards', icon: 'gift' },
    { label: 'Doanh thu & Báo cáo', path: '/dashboard/vendor/revenue', icon: 'chart-no-axes-combined', section: 'Phân tích' },
    { label: 'Trò chuyện & Hỗ trợ', path: '/dashboard/vendor/support', icon: 'message-square', section: 'Giao tiếp' },
    { label: 'Thông báo', path: '/dashboard/vendor/notifications', icon: 'bell', section: 'Tài khoản' },
    { label: 'Hồ sơ', path: '/dashboard/vendor/profile', icon: 'settings' },
  ],
  ADMIN: [
    { label: 'Tổng quan', path: '/dashboard/admin', icon: 'layout-dashboard' },
    { label: 'Duyệt Vendor', path: '/dashboard/admin/vendors', icon: 'users' },
    { label: 'Duyệt tour', path: '/dashboard/admin/tours', icon: 'map' },
    { label: 'Báo cáo', path: '/dashboard/admin/reports', icon: 'chart-no-axes-combined' },
    { label: 'ESG Dashboard', path: '/dashboard/admin/esg', icon: 'leaf' },
  ],
}

export const roleLabels = { CUSTOMER: '', VENDOR: 'Vendor Portal', ADMIN: 'Admin Portal' }
