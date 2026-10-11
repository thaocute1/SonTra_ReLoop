export default function TourCard({ tour }) {
  const image = tour.cover_image_url || tour.image || ''
  return <article className="tour-card">{image ? <img src={image} alt="" /> : <div className="tour-card__fallback">Sơn Trà</div>}<div className="tour-card__body"><h3>{tour.name || tour.title || 'Tour chưa có tên'}</h3><p>{tour.description || 'Trải nghiệm xanh tại Sơn Trà'}</p><div className="tour-card__meta"><span>{tour.price ? `${Number(tour.price).toLocaleString('vi-VN')} ₫` : '--'}</span><span>★ {tour.rating || '--'}</span></div></div></article>
}
