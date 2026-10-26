import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness, Map, MapPin, Star, Sun, Zap } from "lucide-react";
import { api } from "../../../lib/axios";
import flashSaleService from "../../../services/flashSaleService";

const FALLBACK_TOURS = [
  { id: "ban-co", title: "Trekking đỉnh Bàn Cờ", price: 530000, promo_price: 450000, discount: 15, rating: 4.8, distance: 4.2, difficulty: "Trung bình", cover_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85" },
  { id: "bai-bac", title: "Bãi Bắc - Cây đa di sản", price: 400000, promo_price: 320000, discount: 20, rating: 4.9, distance: 3.1, difficulty: "Dễ", cover_image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85" },
  { id: "mui-nghe", title: "Mũi Nghê", price: 720000, promo_price: 680000, discount: 12, rating: 4.7, distance: 5.6, difficulty: "Thử thách", cover_image_url: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=85" },
];

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function DashboardFigmaPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [flashData, setFlashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFlash, setLoadingFlash] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/tours/").then((res) => {
      const data = res.data?.status === "success" ? res.data?.data : res.data;
      if (mounted && Array.isArray(data)) setRows(data.slice(0, 3));
    }).catch(() => {
      if (mounted) setRows([]);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    flashSaleService.getActiveSession().then(setFlashData).catch(() => setFlashData(null)).finally(() => setLoadingFlash(false));
  }, []);

  const tours = useMemo(() => rows.map((live, index) => {
    const fallback = FALLBACK_TOURS[index % FALLBACK_TOURS.length];
    const original = Number(live.price) || fallback.price;
    const flashItem = flashData?.session_type === "live" ? flashData.session?.items?.find((item) => Number(item.tour_id) === Number(live.id)) : null;
    return { ...fallback, ...live, title: live.title || fallback.title, cover_image_url: live.cover_image_url || fallback.cover_image_url, price: original, promo_price: flashItem ? Number(flashItem.promo_price) : original, discount: flashItem ? Number(flashItem.discount_percent) : 0, rating: Number(live.avg_rating) || fallback.rating };
  }), [rows, flashData]);

  const shortcuts = [
    ["Trekking an toàn", ArrowUpRight, "/dashboard/trekking"],
    ["Nhiệm vụ xanh", Star, "/dashboard/tasks"],
    ["Đổi phần thưởng", BriefcaseBusiness, "/dashboard/marketplace"],
    ["Bản đồ GPS", MapPin, "/dashboard/trekking?gps=1"],
  ];
  const loadingCards = loading || loadingFlash;

  return (
    <div className="figma-screen figma-home-screen">
      <main className="figma-screen-content">
        <section className="figma-weather">
          <div><h2>Thời tiết & an toàn — Sơn Trà hôm nay</h2><p>Trời quang, nắng nhẹ. Tuyến Ghềnh Bàng đang mở cửa.</p></div>
          <span><Sun /></span>
        </section>

        <section className="figma-shortcuts">
          {shortcuts.map(([label, Icon, path]) => <button key={label} type="button" onClick={() => navigate(path)}><span><Icon /></span><b>{label}</b></button>)}
        </section>

        <section className="figma-sale-section">
          <header className="figma-section-header">
            <div className="figma-title-row"><span className="figma-bolt"><Zap /></span><h2>{flashData?.session_type === "live" ? "Flash sale hôm nay" : "Tour nổi bật hôm nay"}</h2>{flashData?.session_type === "live" && <span className="figma-timer">Kết thúc sau&nbsp; <b>{flashData.session?.countdown_text}</b></span>}</div>
            <button type="button" onClick={() => navigate("/dashboard/trekking?flash=1")}>Xem tất cả</button>
          </header>
          <div className="figma-sale-grid">
            {loadingCards && [0, 1, 2].map((item) => <article key={item} className="figma-sale-card figma-skeleton-card" aria-hidden="true"><span /><span /><span /><span /></article>)}
            {!loadingCards && tours.length === 0 && <p className="figma-data-state">Không thể tải danh sách tour. Vui lòng thử lại.</p>}
            {!loadingCards && tours.map((tour) => <article key={tour.id} className="figma-sale-card">
              <div className="figma-card-image"><img src={tour.cover_image_url} alt={tour.title} />{tour.discount > 0 && <span className="figma-discount">-{tour.discount}%</span>}<span className="figma-provider"><MapPin /> Tour ghép (Khách lẻ)</span></div>
              <h3>{tour.title}</h3>
              <p className="figma-card-meta"><span><Star /> {tour.rating} (124 đánh giá)</span><span>· {tour.distance} km</span><span>· {tour.difficulty}</span></p>
              <div className="figma-capacity"><span /></div>
              <div className="figma-price"><strong>{money(tour.promo_price)}</strong><small>/ khách</small>{tour.discount > 0 && <del>{money(tour.price)}</del>}</div>
              <div className="figma-qty"><span>Trạng thái:</span><b>{tour._available_slots > 0 ? `Còn ${tour._available_slots} chỗ` : "Xem lịch khởi hành"}</b></div>
              <button type="button" className="figma-primary-red" onClick={() => navigate("/dashboard/trekking?flash=1")}>Đặt ngay</button>
            </article>)}
          </div>
        </section>

        <section className="figma-recommendations">
          <header className="figma-section-header"><h2>Tuyến đường gợi ý hôm nay</h2><button type="button" onClick={() => navigate("/dashboard/trekking")}>Xem tất cả</button></header>
          <div className="figma-route-grid">
            {!loadingCards && tours.map((tour) => <article key={`route-${tour.id}`} onClick={() => navigate("/dashboard/trekking")}><div className="figma-route-placeholder"><Map /><span>Ảnh tuyến đường</span></div><h3>{tour.title.replace("Trekking ", "")}</h3><p>{tour.distance} km · {tour.difficulty}</p></article>)}
          </div>
        </section>
      </main>
    </div>
  );
}
