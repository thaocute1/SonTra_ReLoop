import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, Wallet, Building2, ShieldCheck, Receipt, ChevronDown, ChevronUp, Search, Info } from 'lucide-react'
import { api } from '../../lib/axios'
import './reports.css'

const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const date = value => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa thực hiện'
const orderStatus = { confirmed: 'Đã xác nhận', completed: 'Đã hoàn thành', ongoing: 'Đang diễn ra', waiting_payment: 'Chờ thanh toán', cancelled: 'Đã hủy' }
export default function BusinessPayoutsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [expanded, setExpanded] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setExpanded(null)
    api.get('/payments/payouts/', { signal: controller.signal })
      .then(response => setData(response.data))
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.detail || 'Không tải được dữ liệu đối soát. Vui lòng thử lại.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  const pending = data?.pending_payouts || []
  const history = data?.batches_history || []
  const needle = search.trim().toLocaleLowerCase('vi')
  const rows = (tab === 'pending' ? pending : history).filter(row => {
    const text = tab === 'pending' ? `${row.vendor_name} ${row.vendor_id} ${row.orders.map(order => order.order_code).join(' ')}` : `${row.batch_code} ${row.transactions.map(tx => tx.vendor_name).join(' ')}`
    return text.toLocaleLowerCase('vi').includes(needle) && (tab === 'pending' || status === 'all' || row.status === status)
  })
  const summary = data?.summary || {}
  const cards = [['Chờ quyết toán cho đối tác', money(summary.vendor_net_amount), 'Doanh thu thuần chưa ghép đợt', Wallet], ['Đối tác chờ quyết toán', data?.pending_vendors_count || 0, `${pending.reduce((count, row) => count + row.unpaid_orders_count, 0)} đơn đối tác trong sổ cái`, Building2], ['Quỹ bảo tồn liên quan', money(summary.conservation_fund), 'Đã trích trên các bút toán đang chờ', ShieldCheck], ['Phí nền tảng liên quan', money(summary.platform_fee), 'Phí ghi nhận, chưa trừ chi phí', Receipt]]
  function exportCSV() {
    const header = tab === 'pending' ? ['Đối tác', 'Số đơn đối tác', 'Doanh thu gộp', 'Phí nền tảng', 'Quỹ bảo tồn', 'Đối tác nhận'] : ['Mã đợt', 'Ngày tạo', 'Ngày thực hiện', 'Tổng tiền', 'Trạng thái']
    const body = rows.map(row => tab === 'pending' ? [row.vendor_name, row.unpaid_orders_count, row.gross_amount, row.platform_fee, row.conservation_fund, row.vendor_net_amount] : [row.batch_code, date(row.created_at), date(row.executed_at), row.total_amount, row.status_label])
    const csv = '\ufeff' + [header, ...body].map(row => row.map(value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `doi-soat-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function changeTab(value) { setTab(value); setExpanded(null); setSearch(''); setStatus('all') }
  return <div className="business-report business-payouts" aria-busy={loading}>
    <header className="br-header"><div><span className="br-eyebrow">QUẢN TRỊ DÒNG TIỀN</span><h1>Đối soát & giải ngân</h1><p>Kiểm tra doanh thu phân bổ và theo dõi các đợt quyết toán cho đối tác.</p></div><div className="br-actions"><button disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Làm mới đối soát"><RefreshCw size={17} /></button><button disabled={!data || loading || !!error || !rows.length} onClick={exportCSV}><Download size={17} /> Xuất CSV</button></div></header>
    {error && <div className="br-error" role="alert">{error} <button onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    {loading && <div className="br-loading" role="status">Đang tổng hợp dữ liệu đối soát…</div>}
    {!loading && !error && data && <>
      <section className="br-kpis">{cards.map(([label, value, note, Icon]) => <article key={label}><div className="br-kpi-label">{label}<Icon size={19} /></div><strong>{value}</strong><small>{note}</small></article>)}</section>
      <section className="br-insight"><Info size={24} /><div><h2>Đối soát trước khi giải ngân</h2><p>{data.capabilities.reason}</p></div><button disabled title={data.capabilities.reason}>Tạo lệnh giải ngân</button></section>
      <section className="br-panel"><div className="br-section-heading"><div className="br-segments"><button aria-pressed={tab === 'pending'} onClick={() => changeTab('pending')}>Chờ quyết toán ({pending.length})</button><button aria-pressed={tab === 'history'} onClick={() => changeTab('history')}>Lịch sử đợt ({history.length})</button></div><div className="br-actions"><label className="bp-search"><Search size={16} /><input aria-label="Tìm đối tác hoặc mã đơn, mã đợt" placeholder="Tìm đối tác, mã đơn, mã đợt…" value={search} onChange={event => setSearch(event.target.value)} /></label>{tab === 'history' && <select aria-label="Lọc trạng thái đợt" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="completed">Đã ghi nhận hoàn tất</option><option value="processing">Đang xử lý</option><option value="failed">Thất bại</option><option value="cancelled">Đã hủy</option></select>}</div></div>
      <p className="bp-result">{rows.length} kết quả · {tab === 'pending' ? 'Tổng tiền chờ quyết toán, không giới hạn theo tháng.' : 'Trạng thái được ghi nhận trong hệ thống; cần đối chiếu chứng từ ngân hàng.'}</p>
      <div className="br-table-wrap"><table><thead><tr>{(tab === 'pending' ? ['Đối tác', 'Số đơn', 'Doanh thu gộp', 'Phí nền tảng', 'Quỹ bảo tồn', 'Đối tác nhận', 'Chi tiết'] : ['Mã đợt', 'Ngày tạo', 'Ngày thực hiện', 'Tổng tiền', 'Trạng thái', 'Chi tiết']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => {
        const key = tab === 'pending' ? row.vendor_id : row.id
        const open = expanded === key
        return <React.Fragment key={key}><tr>{(tab === 'pending' ? [<div><b>{row.vendor_name}</b><small className="bp-sub">Đối tác #{row.vendor_id}</small></div>, row.unpaid_orders_count, money(row.gross_amount), money(row.platform_fee), money(row.conservation_fund), <b>{money(row.vendor_net_amount)}</b>] : [row.batch_code, date(row.created_at), date(row.executed_at), money(row.total_amount), <span className={`bp-status bp-status-${row.status}`}>{row.status_label}</span>]).map((cell, index) => <td key={index}>{cell}</td>)}<td><button aria-expanded={open} aria-controls={`payout-detail-${key}`} onClick={() => setExpanded(open ? null : key)}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {open ? 'Thu gọn' : 'Xem'}</button></td></tr>{open && <tr id={`payout-detail-${key}`}><td colSpan={tab === 'pending' ? 7 : 6} className="bp-detail"><h3>{tab === 'pending' ? 'Các bút toán chờ quyết toán' : 'Giao dịch trong đợt'}</h3><div className="br-table-wrap"><table><thead><tr>{(tab === 'pending' ? ['Mã đơn', 'Ngày ghi sổ', 'Trạng thái tour', 'Gộp', 'Phí', 'Quỹ', 'Thuần'] : ['Đối tác', 'Ngân hàng', 'Tài khoản', 'Số tiền', 'Trạng thái', 'Mã tham chiếu']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{(tab === 'pending' ? row.orders : row.transactions).map(detail => <tr key={detail.id}>{(tab === 'pending' ? [detail.order_code, date(detail.recorded_at), orderStatus[detail.status] || detail.status, money(detail.gross_amount), money(detail.platform_fee), money(detail.conservation_fund), money(detail.vendor_net_amount)] : [detail.vendor_name, detail.bank_name || 'Chưa có', detail.bank_account_number || 'Chưa có', money(detail.amount), detail.status, detail.reference || 'Chưa có']).map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table>{tab === 'history' && !row.transactions.length && <p>Đợt này chưa có bản ghi giao dịch chi tiết. Chưa đủ cơ sở xác nhận tiền đã đến tài khoản đối tác.</p>}</div></td></tr>}</React.Fragment>
      })}{!rows.length && <tr><td colSpan={7} className="br-empty">{search || status !== 'all' ? 'Không có kết quả phù hợp bộ lọc.' : tab === 'pending' ? 'Không có bút toán chờ quyết toán.' : 'Chưa có đợt giải ngân được ghi nhận.'}</td></tr>}</tbody></table></div></section>
      <footer className="br-footnote">Nguồn: sổ cái của đơn đã thanh toán, chưa hủy và có trạng thái chờ quyết toán. Doanh thu gộp = đối tác nhận + phí nền tảng + quỹ bảo tồn. Danh sách này chưa xác nhận điều kiện giải ngân theo hợp đồng hay hoàn thành tour. Cập nhật: {date(data.generated_at)}.</footer>
    </>}
  </div>
}
