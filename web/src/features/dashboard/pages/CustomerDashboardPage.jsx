import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ChartNoAxesColumnIncreasing, Gift, MapPin, Star, Sun, TentTree } from 'lucide-react'
import { getCustomerDashboard } from '../api/dashboardService'
import { getFeaturedTours } from '../../tours/api/tourService'

const routePlaceholders = [
  { name: 'Đỉnh Bàn Cờ', detail: '4.2 km · Trung bình' },
  { name: 'Bãi Bấc - Cây Đa Di Sản', detail: '3.1 km · Dễ' },
  { name: 'Mũi Nghê', detail: '5.6 km · Thử thách' },
]

const actions = [
  ['Trekking An Toàn', ChartNoAxesColumnIncreasing], ['Nhiệm vụ Xanh', Star], ['Đổi Phần Thưởng', Gift], ['Bản Đồ GPS', MapPin],
]

export default function CustomerDashboardPage() {
  const { account } = useOutletContext() || {}
  const [dashboard, setDashboard] = useState(null)
  const [tours, setTours] = useState([])
  useEffect(() => { getCustomerDashboard().then(setDashboard); getFeaturedTours().then(setTours).catch(() => setTours([])) }, [])
  const routes = tours.length ? tours.slice(0, 3).map((tour, index) => ({ name: tour.name || tour.title || routePlaceholders[index].name, detail: tour.distance ? `${tour.distance} km` : routePlaceholders[index].detail, image: tour.cover_image_url })) : routePlaceholders

  return <div className="customer-dashboard customer-dashboard--figma"><section className="customer-weather"><div><h2>Thời tiết &amp; An toàn — Sơn Trà hôm nay</h2><p>Trời quang, nắng nhẹ. Tuyến Ghềnh Bàng đang mở cửa.</p></div><span><Sun size={28} /></span></section><div className="customer-actions">{actions.map(([label, Icon]) => <button key={label}><span><Icon size={20} /></span><strong>{label}</strong></button>)}</div><section className="customer-routes"><div className="customer-section-heading"><h1>Tuyến đường gợi ý hôm nay</h1><a href="/tours">Xem tất cả</a></div><div className="customer-route-grid">{routes.map((route) => <article className="customer-route-card" key={route.name}><div className="customer-route-image">{route.image ? <img src={route.image} alt="" /> : <span>Ảnh tuyến đường</span>}</div><h3>{route.name}</h3><p>{route.detail}</p></article>)}</div></section><small className="customer-placeholder-note">{dashboard?.isPlaceholder ? `${account?.name || 'Tài khoản'} đang dùng dữ liệu dashboard placeholder.` : ''}</small></div>
}
