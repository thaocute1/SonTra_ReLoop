import React, { useEffect, useState } from 'react'
import { Download, TrendingUp, Wallet, ShoppingBag, Building2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './reports.css'
import './reports-compact.css'
import './reports-recharts.css'

const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const date = value => new Date(value).toLocaleDateString('vi-VN')
const toInputDate = value => {
  const local = new Date(value)
  const year = local.getFullYear()
  const month = String(local.getMonth() + 1).padStart(2, '0')
  const day = String(local.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export default function BusinessReportsPage() {
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    return { start: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: toInputDate(now) }
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    api.get('/payments/reports/revenue/', { params: { start_date: dateRange.start, end_date: dateRange.end }, signal: controller.signal })
      .then(response => setData(response.data))
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.detail || 'Không tải được báo cáo. Vui lòng thử lại.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [dateRange.start, dateRange.end, refresh])
  const business = data?.business || {}
  const tours = (data?.tours_breakdown || []).filter(row => row.tour_name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  const ratio = value => data?.gross_total ? `${(Number(value || 0) * 100 / data.gross_total).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%` : '—'
  const deductions = Number(data?.platform_fee || 0) + Number(data?.bql_fund || 0)
  const allocationData = data ? [
    { name: 'Đối tác nhận', value: Number(data.net_vendor || 0), color: '#496b5b' },
    { name: 'Quỹ bảo tồn', value: Number(data.bql_fund || 0), color: '#98b7a6' },
    { name: 'Phí nền tảng', value: Number(data.platform_fee || 0), color: '#d6b76c' },
  ].filter(row => row.value > 0) : []
  const feeRows = [
    ['Doanh thu gộp ghi nhận', data?.gross_total, 'Cơ sở phân bổ theo sổ cái.'],
    ['Phí nền tảng', data?.platform_fee, 'Khoản phí nền tảng được hưởng; chưa trừ chi phí vận hành.'],
    ['Khoản trích quỹ bảo tồn', data?.bql_fund, 'Khoản phân bổ cho bảo tồn, không phải doanh thu phí của nền tảng.'],
    ['Tổng khấu trừ / phân bổ', deductions, 'Phí nền tảng + quỹ bảo tồn; không cộng thêm lần nữa vào tổng doanh thu.'],
    ['Đối tác nhận theo sổ cái', data?.net_vendor, 'Quyền lợi đối tác được ghi nhận, chưa khẳng định đã giải ngân.'],
  ]
  function exportCSV() {
    const rows = [['Báo cáo kinh doanh', `${date(data.range.start)} - ${date(data.range.end)}`], ['Doanh thu ghi nhận', data.gross_total], ['Đơn đã thanh toán', business.paid_orders], ['Giá trị đơn trung bình', business.average_order_value], ['Phí nền tảng', data.platform_fee], ['Quỹ bảo tồn', data.bql_fund], ['Đối tác nhận', data.net_vendor], [], ['Tour', 'Số đơn đối tác', 'Doanh thu', 'Tỷ trọng (%)'], ...tours.map(row => [row.tour_name, row.bookings_count, row.revenue, row.pct])]
    rows.push([], ['Chi tiết phí và phân bổ', 'Số tiền (VND)', 'Tỷ lệ doanh thu gộp', 'Diễn giải'], ...feeRows.map(([label, amount, note]) => [label, amount, ratio(amount), note]), ['Phí cổng thanh toán / PayOS', 'Chưa theo dõi riêng'], ['Phí ngân hàng / chuyển tiền', 'Chưa theo dõi riêng'], ['Thuế / VAT', 'Chưa theo dõi riêng'], ['Chi phí vận hành', 'Chưa theo dõi riêng'])
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `bao-cao-kinh-doanh-${dateRange.start}_${dateRange.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const metrics = [
    ['Doanh thu đã ghi nhận', money(data?.gross_total), 'Giá trị gộp trong sổ cái', TrendingUp],
    ['Đơn đã thanh toán', business.paid_orders ?? 0, 'Đếm theo đơn hàng duy nhất', ShoppingBag],
    ['Giá trị đơn trung bình', money(business.average_order_value), 'Doanh thu / đơn đã thanh toán', Wallet],
    ['Đối tác có doanh thu', business.active_vendors ?? 0, 'Phát sinh trong kỳ báo cáo', Building2],
  ]
  const change = business.revenue_change_pct
  return <div className="business-report" aria-busy={loading}>
    <div className="br-compact-actions"><label>Từ<input type="date" value={dateRange.start} max={dateRange.end} onChange={event => setDateRange(current => ({ ...current, start: event.target.value }))} /></label><label>Đến<input type="date" value={dateRange.end} min={dateRange.start} max={toInputDate(new Date())} onChange={event => setDateRange(current => ({ ...current, end: event.target.value }))} /></label><button onClick={exportCSV} disabled={!data || loading}><Download size={15} /> CSV</button></div>
    {error && <div role="alert" className="br-error">{error} <button onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>}
    {loading && <div className="br-loading" role="status">Đang tổng hợp dữ liệu kinh doanh…</div>}
    {!loading && data && <>
      <section className="br-kpis">{metrics.map(([label, value, note, Icon]) => <article key={label}><div className="br-kpi-label">{label}<Icon size={19} /></div><strong>{value}</strong><small>{note}</small></article>)}</section>
      <section className="br-insight"><TrendingUp /><div><h2>{change == null ? 'Chưa đủ cơ sở so sánh tăng trưởng' : `Doanh thu ${change >= 0 ? 'tăng' : 'giảm'} ${Math.abs(change)}%`}</h2><p>So với khoảng thời gian liền trước có cùng độ dài: {money(business.previous_revenue)}. Đơn chờ thanh toán chưa tính vào doanh thu.</p></div></section>
      <div className="br-main-grid"><section className="br-panel"><h2>Xu hướng doanh thu</h2><p>Doanh thu theo tháng trong kỳ được chọn, lấy từ sổ cái đơn đã thanh toán.</p>{data.timeline_chart?.length ? <div className="br-recharts" role="img" aria-label="Biểu đồ doanh thu thực tế theo tháng"><ResponsiveContainer width="100%" height={280}><BarChart data={data.timeline_chart} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}><CartesianGrid stroke="#e8eee9" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" tickFormatter={label => label.replace('Tháng ', 'T')} tick={{ fill: '#637269', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={value => `${(value / 1_000_000).toLocaleString('vi-VN')}tr`} tick={{ fill: '#637269', fontSize: 10 }} axisLine={false} tickLine={false} width={48} /><Tooltip formatter={value => [money(value), 'Doanh thu']} labelFormatter={label => label} contentStyle={{ borderRadius: 10, borderColor: '#dce3dd', fontSize: 12 }} /><Bar dataKey="revenue" name="Doanh thu" fill="#496b5b" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div> : <div className="br-empty">Chưa có dữ liệu doanh thu trong khoảng thời gian này.</div>}</section>
      <section className="br-panel"><h2>Phân bổ doanh thu</h2><p>Theo bút toán thực tế, không áp tỷ lệ cố định.</p>{allocationData.length ? <><div className="br-recharts br-allocation-chart" role="img" aria-label="Biểu đồ phân bổ doanh thu"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="none">{allocationData.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={value => [money(value), '']} contentStyle={{ borderRadius: 10, borderColor: '#dce3dd', fontSize: 12 }} /></PieChart></ResponsiveContainer></div><div className="br-allocation">{allocationData.map(item => <div key={item.name}><div><span><i className="br-legend-dot" style={{ backgroundColor: item.color }} />{item.name}</span><b>{money(item.value)}</b></div><small>{ratio(item.value)} doanh thu gộp</small></div>)}</div></> : <div className="br-empty">Chưa có số liệu phân bổ trong khoảng thời gian này.</div>}<small>Phí nền tảng chưa trừ chi phí vận hành, không phải lợi nhuận.</small></section></div>
      <section className="br-panel"><h2>Chi tiết phí & phân bổ doanh thu</h2><p>Số tiền và tỷ lệ thực tế trong kỳ báo cáo được chọn.</p><div className="br-table-wrap"><table><thead><tr><th>Khoản mục</th><th>Số tiền</th><th>Tỷ lệ trên doanh thu gộp</th><th>Diễn giải</th></tr></thead><tbody>{feeRows.map(([label, amount, note]) => <tr key={label}><td><b>{label}</b></td><td>{money(amount)}</td><td>{ratio(amount)}</td><td>{note}</td></tr>)}{['Phí cổng thanh toán / PayOS', 'Phí ngân hàng / chuyển tiền', 'Thuế / VAT', 'Chi phí vận hành'].map(label => <tr key={label}><td>{label}</td><td>Chưa theo dõi riêng</td><td>—</td><td>Chưa có số liệu tách riêng trong sổ cái; không đồng nghĩa không phát sinh.</td></tr>)}</tbody></table></div><p>Đối chiếu: {money(data.gross_total)} = {money(data.net_vendor)} đối tác + {money(data.bql_fund)} quỹ bảo tồn + {money(data.platform_fee)} phí nền tảng.</p><small>Báo cáo chưa đủ dữ liệu để tính lợi nhuận ròng hoặc kết luận doanh thu đã bao gồm / chưa bao gồm VAT.</small></section>
      <section className="br-panel"><div className="br-section-heading"><div><h2>Hiệu quả từng tour</h2><p>Xác định tuyến đóng góp doanh thu để ưu tiên kinh doanh.</p></div><input aria-label="Tìm tour trong báo cáo" placeholder="Tìm tên tour…" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="br-table-wrap"><table><thead><tr><th>Tour / trải nghiệm</th><th>Đơn đối tác</th><th>Doanh thu</th><th>Đóng góp</th></tr></thead><tbody>{tours.map((row, index) => <tr key={index}><td>{row.tour_name}</td><td>{row.bookings_count}</td><td>{money(row.revenue)}</td><td>{row.pct}%</td></tr>)}{!tours.length && <tr><td colSpan={4} className="br-empty">{search ? 'Không tìm thấy tour phù hợp.' : 'Chưa có doanh thu trong kỳ này.'}</td></tr>}</tbody></table></div></section>
      <section className="br-panel"><h2>Đóng góp của đối tác</h2><div className="br-table-wrap"><table><thead><tr><th>Đối tác</th><th>Đơn đối tác</th><th>Doanh thu gộp</th><th>Đối tác nhận</th></tr></thead><tbody>{(data.vendors || []).map(row => <tr key={row.id}><td>{row.name}</td><td>{row.orders}</td><td>{money(row.revenue)}</td><td>{money(row.net)}</td></tr>)}{!data.vendors?.length && <tr><td colSpan={4} className="br-empty">Chưa có đối tác phát sinh doanh thu trong kỳ.</td></tr>}</tbody></table></div></section>
      <footer className="br-footnote">Nguồn: sổ cái của đơn đã thanh toán, loại trừ đơn đối tác đã hủy. Kỳ báo cáo theo thời điểm ghi sổ. Một đơn hàng có thể gồm nhiều đơn đối tác. Cập nhật: {new Date(data.generated_at).toLocaleString('vi-VN')}.</footer>
    </>}
  </div>
}
