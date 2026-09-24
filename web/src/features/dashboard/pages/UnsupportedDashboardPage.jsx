export default function UnsupportedDashboardPage({ role = 'UNKNOWN' }) {
  const title = role === 'GUIDE' ? 'Guide Dashboard' : role === 'STAFF' ? 'Staff Dashboard' : 'Dashboard chưa được hỗ trợ'
  const message = role === 'GUIDE' ? 'Khu vực quản lý tour và lịch dẫn sẽ được kết nối ở giai đoạn tiếp theo.' : role === 'STAFF' ? 'Khu vực công việc vận hành và xử lý booking sẽ được kết nối ở giai đoạn tiếp theo.' : 'Tài khoản của bạn chưa có dashboard tương ứng.'
  return <div className="state-card role-placeholder"><span className="role-placeholder__badge">{role}</span><h1>{title}</h1><p>{message}</p><small>Dữ liệu placeholder — chưa gọi API.</small></div>
}
