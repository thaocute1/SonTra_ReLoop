import React, { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Compass, RefreshCw, Search, X, XCircle } from 'lucide-react'
import RouteMapPreview from '../../components/common/RouteMapPreview'
import { adminTourService } from '../../services/adminTourService'
import { extractErrorMessage } from '../../utils/apiError'
import { realtimeBus } from '../../lib/realtimeBus'

const TABS = [
  ['pending_approval', 'Chờ duyệt'], ['published', 'Đã xuất bản'], ['rejected', 'Đã từ chối'], ['all', 'Tất cả'],
]
const STATUS_LABELS = {
  pending_approval: 'Chờ BQL phê duyệt', published: 'Đã xuất bản', rejected: 'Đã từ chối',
  draft: 'Bản nháp', need_info: 'Cần bổ sung', approved: 'Đã duyệt', suspended: 'Tạm ngưng', closed: 'Đã đóng',
}
const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—'
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'

export default function TourReviewPage() {
  const [filter, setFilter] = useState('pending_approval')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [items, setItems] = useState([])
  const [metrics, setMetrics] = useState({ pending_approval: 0, published: 0, rejected: 0, all: 0 })
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    adminTourService.list({ status: filter, search, page }, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        setItems(data.results)
        setMetrics(data.metrics)
        setTotalPages(data.total_pages)
        setCount(data.count)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        setItems([])
        setError(extractErrorMessage(err, 'Không thể tải danh sách tour. Vui lòng thử lại.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filter, search, page, reload])

  useEffect(() => {
    if (selectedId === null) return
    const controller = new AbortController()
    setDetail(null)
    setReason('')
    setDetailError('')
    setDetailLoading(true)
    adminTourService.detail(selectedId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetail(data) })
      .catch(err => { if (!controller.signal.aborted) setDetailError(extractErrorMessage(err, 'Không thể tải chi tiết tour.')) })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    if (selectedId === null) return
    const handleKeyDown = event => { if (event.key === 'Escape' && !submitting) setSelectedId(null) }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, submitting])

  const review = async action => {
    if (submitting || !detail || detail.status !== 'pending_approval') return
    if (action === 'reject' && !reason.trim()) {
      setDetailError('Vui lòng nhập lý do từ chối tour.')
      return
    }
    setSubmitting(true)
    setDetailError('')
    try {
      const result = await adminTourService.review(detail.id, action, action === 'reject' ? reason.trim() : '')
      setNotice(result.message)
      setSelectedId(null)
      setReload(value => value + 1)
      realtimeBus.emit('TOUR_REVIEWED', { tourId: detail.id, status: result.data.status })
      window.dispatchEvent(new Event('tour-reviews-updated'))
    } catch (err) {
      setDetailError(extractErrorMessage(err, 'Không thể xử lý tour. Vui lòng thử lại.'))
      if (err.response?.status === 409) {
        setDetail(null)
        setReload(value => value + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-[#191C1A]">
    <header className="flex flex-wrap justify-between items-start gap-4">
      <div><div className="flex items-center gap-2 text-[#2F5D4A] text-sm font-semibold"><Compass size={18} />Quản lý trải nghiệm</div><h1 className="text-2xl sm:text-3xl font-bold font-fraunces mt-2">Duyệt & xuất bản tour</h1><p className="text-sm text-[#4A514C] mt-2">Kiểm tra thông tin, tuyến GPS và lịch khởi hành trước khi đưa tour đến du khách.</p></div>
      <button className={`${buttonClass} border-[#C5CCC7] bg-white`} disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} />Tải lại</button>
    </header>

    <section className="grid sm:grid-cols-3 gap-4" aria-label="Thống kê duyệt tour">
      {[[Clock, 'pending_approval', 'Chờ BQL duyệt'], [CheckCircle2, 'published', 'Đã xuất bản'], [XCircle, 'rejected', 'Đã từ chối']].map(([Icon, key, label]) => <div key={key} className="bg-white rounded-2xl border border-[#C5CCC7] p-5"><div className="flex items-center gap-2 text-sm text-[#4A514C]"><Icon size={18} />{label}</div><p className="text-3xl font-bold mt-3">{metrics[key]}</p></div>)}
    </section>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">{error}</p>}

    <section className="bg-white rounded-2xl border border-[#C5CCC7] overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#C5CCC7]">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái tour">{TABS.map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1) }} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-[#2F5D4A] text-white' : 'bg-[#F2F5F1] text-[#4A514C]'}`}>{label} ({metrics[value]})</button>)}</div>
        <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1) }}><input type="search" aria-label="Tìm tour hoặc đối tác" placeholder="Tên tour hoặc đối tác" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={150} className="border border-[#C5CCC7] rounded-xl px-3 py-2 text-sm min-w-0" /><button className={`${buttonClass} border-[#C5CCC7]`} type="submit" aria-label="Tìm kiếm"><Search size={16} /></button></form>
      </div>
      {loading ? <p role="status" className="p-8 text-center text-[#4A514C]">Đang tải danh sách tour...</p> : !items.length ? <p className="p-8 text-center text-[#4A514C]">{error ? 'Chưa tải được dữ liệu tour.' : 'Không có tour phù hợp với bộ lọc.'}</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-[#F8FAF7] text-[#4A514C]"><tr>{['Tour / đối tác', 'Giá vé', 'Ngày gửi', 'Trạng thái', 'Thao tác'].map(label => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#E4E9E5]">{items.map(tour => <tr key={tour.id}><td className="px-5 py-4"><p className="font-semibold">{tour.title}</p><p className="text-xs text-[#4A514C] mt-1">{tour.vendor_name} · #{tour.id}</p></td><td className="px-5 py-4 whitespace-nowrap">{money(tour.price)}</td><td className="px-5 py-4 whitespace-nowrap text-xs">{date(tour.created_at)}</td><td className="px-5 py-4"><StatusBadge status={tour.status} /></td><td className="px-5 py-4"><button className={`${buttonClass} border-[#C5CCC7] text-[#2F5D4A] whitespace-nowrap`} onClick={() => setSelectedId(tour.id)}>{tour.status === 'pending_approval' ? 'Xem & duyệt' : 'Xem chi tiết'}</button></td></tr>)}</tbody></table></div>}
      <footer className="p-4 flex flex-wrap justify-between items-center gap-3 border-t border-[#C5CCC7] text-sm text-[#4A514C]"><span>{count} tour · Trang {page}/{totalPages}</span><div className="flex gap-2"><button className={`${buttonClass} border-[#C5CCC7]`} disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button><button className={`${buttonClass} border-[#C5CCC7]`} disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></div></footer>
    </section>

    {selectedId !== null && <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="tour-review-title"><section className="bg-white rounded-3xl w-full max-w-4xl max-h-[90dvh] overflow-y-auto border border-[#C5CCC7] shadow-xl">
      <header className="sticky top-0 bg-white border-b border-[#C5CCC7] p-5 flex justify-between items-center gap-4 z-10"><h2 id="tour-review-title" className="text-lg font-bold">Chi tiết & kiểm duyệt tour</h2><button aria-label="Đóng chi tiết tour" disabled={submitting} onClick={() => setSelectedId(null)} className="p-2 rounded-full bg-[#F2F5F1]"><X size={20} /></button></header>
      <div className="p-5 sm:p-6 space-y-5">
        {detailLoading && <p role="status">Đang tải chi tiết tour...</p>}
        {detailError && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">{detailError}</p>}
        {detail && <>
          <div className="grid sm:grid-cols-[200px_1fr] gap-5"><img src={detail.cover_image_url} alt={detail.title} className="w-full h-40 object-cover rounded-2xl" /><div><StatusBadge status={detail.status} /><h3 className="text-xl font-bold mt-3">{detail.title}</h3><p className="text-sm text-[#4A514C] mt-2">Đối tác: {detail.vendor_name} · {detail.vendor_status === 'approved' ? 'Đã được duyệt' : 'Chưa đủ điều kiện xuất bản'}</p><p className="text-xs text-[#4A514C] mt-2">Gửi ngày {date(detail.created_at)}</p></div></div>
          <p className="text-sm text-[#4A514C] whitespace-pre-wrap">{detail.description || 'Chưa có mô tả.'}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAF7] rounded-2xl p-4">{[['Giá vé', money(detail.price)], ['Thời lượng', `${detail.duration_hours} giờ`], ['Độ khó', detail.difficulty_label], ['Sức chứa', `${detail.max_capacity} khách`]].map(([label, value]) => <div key={label}><dt className="text-xs text-[#4A514C]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl>
          <section><h4 className="font-semibold mb-2">Tuyến GPS & điểm kiểm tra</h4>{detail.route?.coordinates?.length > 1 ? <><p className="text-sm text-[#4A514C] mb-3">{detail.route.start_point} → {detail.route.end_point} · {detail.route.total_distance_km} km</p><RouteMapPreview coordinates={detail.route.coordinates} checkpoints={detail.checkpoints || []} tourTitle={detail.title} height="260px" scrollWheelZoom={false} /></> : <p className="text-sm text-[#4A514C]">Chưa có dữ liệu tuyến GPS.</p>}{(detail.checkpoints || []).length > 0 && <ol className="mt-3 text-sm space-y-1">{detail.checkpoints.map((checkpoint, index) => <li key={checkpoint.id || index}>{index + 1}. {checkpoint.name}</li>)}</ol>}</section>
          <section><h4 className="font-semibold mb-2">Lịch khởi hành sắp tới</h4>{!(detail.schedules || []).length ? <p className="text-sm text-[#4A514C]">Chưa có lịch khởi hành sắp tới.</p> : <ul className="text-sm space-y-2">{detail.schedules.map(schedule => <li key={schedule.id} className="rounded-xl bg-[#F8FAF7] p-3">{schedule.formatted_date} · {schedule.time_slot} · {schedule.max_capacity} chỗ · {money(schedule.price)}{schedule.guide_name && ` · HDV: ${schedule.guide_name}`}</li>)}</ul>}</section>
          {detail.status === 'published' && <p className="text-sm rounded-xl bg-emerald-50 p-3 text-emerald-800">Đã xuất bản bởi {detail.approved_by_name || 'BQL'} · {date(detail.approved_at)}</p>}
          {detail.rejection_reason && <p className="text-sm rounded-xl bg-rose-50 p-3 text-rose-800">Lý do từ chối: {detail.rejection_reason}</p>}
          {detail.status === 'pending_approval' && <section className="border-t border-[#C5CCC7] pt-5 space-y-3"><p className="text-sm text-[#4A514C]">Phê duyệt sẽ xuất bản tour cho du khách và cho phép đối tác đăng ký Flash Sale. Đối tác phải có hồ sơ đã được duyệt và tài khoản đang hoạt động.</p><label className="block text-sm font-semibold" htmlFor="tour-rejection-reason">Lý do từ chối (bắt buộc khi từ chối)</label><textarea id="tour-rejection-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={submitting} rows={3} maxLength={2000} className="w-full border border-[#C5CCC7] rounded-xl p-3 text-sm" placeholder="Nội dung cần đối tác điều chỉnh..." /><div className="flex flex-wrap justify-end gap-3"><button disabled={submitting || !reason.trim()} onClick={() => review('reject')} className={`${buttonClass} border-rose-200 text-rose-700`}><XCircle size={16} />Từ chối tour</button><button disabled={submitting || detail.vendor_status !== 'approved'} onClick={() => review('approve')} className={`${buttonClass} border-[#2F5D4A] bg-[#2F5D4A] text-white`}><CheckCircle2 size={16} />{submitting ? 'Đang xử lý...' : 'Phê duyệt & xuất bản'}</button></div></section>}
        </>}
      </div>
    </section></div>}
  </main>
}

function StatusBadge({ status }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status === 'published' ? 'bg-emerald-50 text-emerald-700' : status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{STATUS_LABELS[status] || status}</span>
}
