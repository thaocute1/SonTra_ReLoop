import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, Clock3, Download, MapPin, Minus, Navigation, Plus, ShieldCheck, Star, X, Zap } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import flashSaleService from "../../../services/flashSaleService";
import RouteMapPreview from "../../../components/common/RouteMapPreview";
import PayOSPaymentModal from "../components/PayOSPaymentModal";

const FALLBACK_TOURS = [
  { id: 1, title: "Chinh phục đỉnh Bàn Cờ", vendor_name: "Sơn Trà Trekking", price: 450000, promo_price: 382500, discount: 15, avg_rating: 4.8, total_reviews: 124, distance: 4.2, duration_hours: 2.5, difficulty_level: "moderate", difficulty_label: "Độ cao, cần giày trekking", cover_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=88" },
  { id: 2, title: "Bãi Bắc - Cây đa di sản", vendor_name: "Sơn Trà REloop", price: 450000, promo_price: 382500, discount: 15, avg_rating: 4.8, total_reviews: 124, distance: 3.1, duration_hours: 1.5, difficulty_level: "easy", difficulty_label: "Phù hợp gia đình, có trạm nước", cover_image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=88" },
  { id: 3, title: "Mũi Nghê", vendor_name: "Sơn Trà REloop", price: 450000, promo_price: 382500, discount: 15, avg_rating: 4.7, total_reviews: 89, distance: 5.6, duration_hours: 3.5, difficulty_level: "challenging", difficulty_label: "Địa hình đá trơn trượt khi mưa", cover_image_url: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=88" },
];

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VND`;
const FILTERS = [["all", "Tất cả"], ["flash", "Flash sale"], ["easy", "Dễ (Gia đình)"], ["moderate", "Trung bình"], ["challenging", "Thử thách"], ["gps", "Có GPS Checkpoint"]];

export default function TrekkingFigmaPage() {
  const { globalSearch = "" } = useOutletContext() || {};
  const { user } = useUserEco();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("flash") ? "flash" : searchParams.get("gps") ? "gps" : "all");
  const [rows, setRows] = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(FALLBACK_TOURS[0]);
  const [people, setPeople] = useState(1);
  const [paymentMethod] = useState("payos");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [bookingForm, setBookingForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", pickup_location: "Trung tâm Đà Nẵng", special_notes: "" });
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [payosOpen, setPayosOpen] = useState(false);
  const [flashData, setFlashData] = useState(null);
  const [loadingFlash, setLoadingFlash] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/tours/").then((res) => {
      const data = res.data?.status === "success" ? res.data?.data : res.data;
      if (mounted && Array.isArray(data)) setRows(data);
    }).catch(() => {
      if (mounted) setRows([]);
    }).finally(() => {
      if (mounted) setLoadingTours(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    flashSaleService.getActiveSession().then(setFlashData).catch(() => setFlashData(null)).finally(() => setLoadingFlash(false));
  }, []);

  useEffect(() => {
    setBookingForm((current) => ({
      ...current,
      customer_name: current.customer_name || user?.name || "",
      customer_phone: current.customer_phone || user?.phone || "",
      customer_email: current.customer_email || user?.email || "",
    }));
  }, [user]);

  const tours = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((live, index) => {
      const fallback = FALLBACK_TOURS[index % FALLBACK_TOURS.length];
      const original = Number(live.price) || fallback.price;
      const flashItem = flashData?.session_type === "live" ? flashData.session?.items?.find((item) => Number(item.tour_id) === Number(live.id) && item.status === "approved" && !item.is_sold_out) : null;
      return { ...fallback, ...live, title: live.title || fallback.title, cover_image_url: live.cover_image_url || fallback.cover_image_url, price: original, promo_price: flashItem ? Number(flashItem.promo_price) : original, discount: flashItem ? Number(flashItem.discount_percent) : 0, campaign_item_id: flashItem?.id || null, distance: live.route?.total_distance_km || fallback.distance, avg_rating: Number(live.avg_rating) || fallback.avg_rating };
    });
  }, [rows, flashData]);

  const visibleTours = tours.filter((tour) => {
    if (globalSearch && !tour.title.toLowerCase().includes(globalSearch.toLowerCase())) return false;
    if (filter === "flash") return Boolean(tour.campaign_item_id);
    if (["easy", "moderate", "challenging"].includes(filter)) return tour.difficulty_level === filter;
    if (filter === "gps") return Array.isArray(tour.checkpoints) && tour.checkpoints.length > 0;
    return true;
  });
  const isLiveFlash = flashData?.session_type === "live";
  const loadingList = loadingTours || (filter === "flash" && loadingFlash);

  const chooseTour = async (tour) => {
    setSelected(tour);
    setPeople(1);
    setBookingError("");
    setReceipt(null);
    const localSchedule = tour.schedules?.find((schedule) => ["open", "almost_full"].includes(schedule.status) && Number(schedule.remaining_slots) > 0) || null;
    setSelectedSchedule(localSchedule);
    try {
      const response = await api.get(`/tours/${tour.id}/`);
      const detail = response.data?.status === "success" ? response.data.data : response.data;
      if (detail) {
        const hydrated = { ...tour, ...detail, distance: detail.route?.total_distance_km || tour.distance };
        setSelected(hydrated);
        setSelectedSchedule(detail.schedules?.find((schedule) => ["open", "almost_full"].includes(schedule.status) && Number(schedule.remaining_slots) > 0) || null);
      }
    } catch {
      // Keep the list data visible; checkout will remain disabled without a real schedule.
    }
  };

  const openBooking = async (tour) => { await chooseTour(tour); setView("booking"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openDetail = (tour) => { setSelected(tour); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const continueToPayment = () => {
    if (!selectedSchedule) return setBookingError("Tour này chưa có lịch khởi hành còn chỗ.");
    if (!bookingForm.customer_name.trim()) return setBookingError("Vui lòng nhập họ và tên người đặt.");
    const phoneDigits = bookingForm.customer_phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) return setBookingError("Số điện thoại phải có từ 9 đến 15 chữ số.");
    if (bookingForm.customer_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.customer_email.trim())) return setBookingError("Email chưa đúng định dạng.");
    if (people > Number(selectedSchedule.remaining_slots || 0)) return setBookingError(`Chuyến này chỉ còn ${selectedSchedule.remaining_slots} chỗ.`);
    setBookingError("");
    setView("payment");
  };

  const submitBooking = async () => {
    if (submitting || !selectedSchedule) return;
    setSubmitting(true);
    setBookingError("");
    try {
      const response = await api.post("/orders/booking/", {
        tour_id: selected.id,
        schedule_id: selectedSchedule.id,
        adults_count: people,
        children_count: 0,
        customer_name: bookingForm.customer_name.trim(),
        customer_phone: bookingForm.customer_phone.trim(),
        customer_email: bookingForm.customer_email.trim(),
        pickup_location: bookingForm.pickup_location.trim() || "Trung tâm Đà Nẵng",
        payment_method: paymentMethod,
        special_notes: bookingForm.special_notes.trim(),
        campaign_item_id: selected.campaign_item_id,
      });
      const data = response.data?.status === "success" ? response.data.data : response.data;
      setReceipt(data);
      if (data?.payos?.qrCode || data?.payos?.checkoutUrl) {
        setPayosOpen(true);
      } else {
        setBookingError(data?.payment_error || "Đã giữ chỗ nhưng chưa tạo được mã PayOS. Vui lòng thử lại trong lịch sử đặt tour.");
      }
    } catch (error) {
      const data = error.response?.data;
      setBookingError(data?.message || data?.error || data?.detail || "Không thể tạo đơn đặt tour. Vui lòng kiểm tra đăng nhập và thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "booking") return <BookingView tour={selected} schedule={selectedSchedule} onSchedule={setSelectedSchedule} people={people} setPeople={setPeople} form={bookingForm} setForm={setBookingForm} error={bookingError} onBack={() => setView("list")} onContinue={continueToPayment} />;
  if (view === "payment") return <><PaymentView tour={selected} schedule={selectedSchedule} people={people} error={bookingError} submitting={submitting} bookingCreated={Boolean(receipt)} onBack={() => setView("booking")} onPay={submitBooking} /><PayOSPaymentModal isOpen={payosOpen} paymentData={receipt} onClose={() => { setPayosOpen(false); setView("list"); }} onPaymentSuccess={(paidReceipt) => { setReceipt(paidReceipt); setPayosOpen(false); setView("success"); }} /></>;
  if (view === "success") return <SuccessView tour={selected} schedule={selectedSchedule} people={people} receipt={receipt} method={paymentMethod} onHome={() => setView("list")} />;
  if (view === "detail") return <DetailView tour={selected} onBack={() => setView("list")} onBook={() => openBooking(selected)} />;

  return <div className="figma-screen figma-trekking-screen">
    <main className="figma-screen-content">
      <div className="figma-filter-row">
        {FILTERS.map(([id, label]) => <button key={id} type="button" className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{id === "flash" && <Zap />} {label}</button>)}
      </div>

      <section className={`figma-trekking-sale ${filter === "flash" && isLiveFlash ? "session" : ""}`}>
        <header>
          <div><Zap /><h2>{filter === "flash" ? (isLiveFlash ? flashData.session?.session_name : "Flash sale") : "Các tour đang mở bán"}</h2>{isLiveFlash && <span>Kết thúc sau&nbsp; {flashData.session?.countdown_text}</span>}</div>
          {filter === "flash" && isLiveFlash && <div className="figma-session-times">{["07:00", "09:00", "11:00", "13:00", "15:00"].map((time, index) => <button type="button" key={time} className={index === 1 ? "active" : ""}>{time}<small>{index === 1 ? "Đang diễn ra" : index < 1 ? "Đã qua" : "Sắp tới"}</small></button>)}</div>}
        </header>
        {filter === "flash" && isLiveFlash && <p className="figma-session-count">{visibleTours.length} tuyến trong phiên hiện tại</p>}
        <div className="figma-trek-list">
          {loadingList && [0, 1].map((item) => <article key={item} className="figma-tour-row figma-skeleton-row" aria-hidden="true"><span /><div><span /><span /><span /></div><span /></article>)}
          {!loadingList && visibleTours.slice(0, 2).map((tour) => <TourRow key={tour.id} tour={tour} onBook={() => openBooking(tour)} />)}
          {!loadingList && filter === "flash" && visibleTours.length === 0 && <p className="figma-data-state">Hiện không có phiên flash sale đang diễn ra.</p>}
          {!loadingList && filter !== "flash" && visibleTours.length === 0 && <p className="figma-data-state">Không tìm thấy tour phù hợp.</p>}
        </div>
      </section>

      {filter !== "flash" && <section className="figma-all-routes">
        <h2>Tất cả tuyến</h2>
        <div className="figma-trek-list">{!loadingTours && visibleTours.slice(2).map((tour) => <TourRow key={tour.id} tour={tour} detail onBook={() => openDetail(tour)} />)}</div>
      </section>}
    </main>
  </div>;
}

function TourRow({ tour, onBook, detail = false }) {
  return <article className="figma-tour-row">
    <div className="figma-tour-thumb"><img src={tour.cover_image_url} alt={tour.title} />{Number(tour.discount) > 0 && <span>-{tour.discount}%</span>}</div>
    <div className="figma-tour-copy"><h3>{tour.title}</h3><p><span><Star /> {tour.avg_rating}</span> ({tour.total_reviews || 124} đánh giá)</p><div><span>↗ {tour.distance} km</span><span>◷ {tour.duration_hours} giờ</span><b>{tour.difficulty_label}</b></div><div className="figma-row-progress"><span /></div><small>Đã đặt 18/30</small></div>
    <div className="figma-tour-price"><strong>{money(detail ? tour.price : tour.promo_price)}/người</strong>{!detail && Number(tour.discount) > 0 && <del>{money(tour.price)}/người</del>}<div><small>Còn chỗ:</small><b>{tour._available_slots ?? tour.max_capacity ?? "—"}</b></div><button type="button" onClick={onBook}>{detail ? "Xem chi tiết" : "Đặt ngay"}</button></div>
  </article>;
}

function BookingView({ tour, schedule, onSchedule, people, setPeople, form, setForm, error, onBack, onContinue }) {
  const schedules = (tour.schedules || []).filter((item) => ["open", "almost_full"].includes(item.status) && Number(item.remaining_slots) > 0);
  const price = Number(tour.campaign_item_id ? tour.promo_price : (schedule?.price || tour.price) || 0);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const scheduleOptions = schedules.map((item) => ({
    id: item.id,
    top: item.formatted_date || item.departure_date,
    bottom: `${String(item.start_time || "").slice(0, 5)} · Còn ${item.remaining_slots} chỗ`,
  }));

  return <div className="figma-flow-screen">
    <div className="figma-flow-breadcrumb"><button onClick={onBack}><ArrowLeft /> Quay lại</button><span>Trekking&nbsp; / &nbsp;<b>Đặt tour</b></span></div>
    <main className="figma-booking-layout">
      <section>
        <div className="figma-flow-title"><h1>Đặt tour</h1><span><CalendarDays /> Lịch khởi hành thật</span></div>
        <img className="figma-booking-cover" src={tour.cover_image_url} alt={tour.title} />
        <h2>{tour.title}</h2>
        <p className="figma-rating"><Star /> {tour.avg_rating} ({tour.total_reviews || 0} đánh giá)</p>
        <div className="figma-tag-row"><span>⚠ Độ cao</span><span>🥾 Cần giày trekking</span><CheckpointMapButton tour={tour} /></div>
        <div className="figma-detail-stats"><article><MapPin /><span>Quãng đường<b>{tour.distance} km</b></span></article><article><Clock3 /><span>Thời gian<b>{tour.duration_hours} giờ</b></span></article><article><ShieldCheck /><span>Độ khó<b>{tour.difficulty_label || "Trung bình"}</b></span></article><article><Star /><span>Thưởng xanh<b>+50 RE-Points</b></span></article></div>
        <div className="figma-capacity wide"><span style={{ width: `${schedule ? Math.min(100, (Number(schedule.booked_count || 0) / Number(schedule.max_capacity || 1)) * 100) : 0}%` }} /></div>
        <p className="figma-capacity-label">Đã đặt {schedule?.booked_count || 0}/{schedule?.max_capacity || tour.max_capacity || 0} chỗ <b>Còn {schedule?.remaining_slots || 0} chỗ</b></p>
        <div className="figma-description"><b>Mô tả tuyến đường</b><p>{tour.description || `Trekking khám phá Sơn Trà · ${tour.distance} km · ${tour.duration_hours} giờ.`}</p></div>
        <Itinerary />
      </section>
      <aside>
        <div className="figma-booking-price"><strong>{money(price)}</strong><small>/người</small>{tour.campaign_item_id && <><del>{money(schedule?.price || tour.price)}</del><span>Tiết kiệm {tour.discount}%</span></>}</div>
        <Picker title="Chọn lịch khởi hành" options={scheduleOptions} activeId={schedule?.id} onSelect={(id) => onSchedule(schedules.find((item) => String(item.id) === String(id)) || null)} empty="Chưa có lịch khởi hành còn chỗ" />
        <div className="figma-people"><b>Số lượng người</b><small>Còn {schedule?.remaining_slots || 0} chỗ trống</small><div><span>Số người tham gia:</span><button type="button" aria-label="Giảm số người" onClick={() => setPeople(Math.max(1, people - 1))}><Minus /></button><b>{people}</b><button type="button" aria-label="Tăng số người" onClick={() => setPeople(Math.min(Number(schedule?.remaining_slots || 1), people + 1))}><Plus /></button></div></div>
        <Traveler number={1} label="Người đặt (Bạn)" name={form.customer_name} phone={form.customer_phone} onName={update("customer_name")} onPhone={update("customer_phone")} />
        <div className="figma-traveler"><label>Email<input type="email" value={form.customer_email} onChange={update("customer_email")} autoComplete="email" placeholder="ten@email.com" /></label><label>Điểm đón<input value={form.pickup_location} onChange={update("pickup_location")} placeholder="Trung tâm Đà Nẵng" /></label><label>Ghi chú cho hướng dẫn viên<textarea value={form.special_notes} onChange={update("special_notes")} rows="3" placeholder="Yêu cầu hỗ trợ, tình trạng sức khỏe hoặc lưu ý khác (không bắt buộc)" /></label></div>
        {error && <p className="figma-form-error" role="alert">{error}</p>}
        <div className="figma-order-summary"><b>Tóm tắt đơn hàng</b><p>Giá vé × {people} người <span>{money(price * people)}</span></p><strong>Tổng cộng <span>{money(price * people)}</span></strong></div>
        <button className="figma-continue" type="button" onClick={onContinue} disabled={!schedule}>Kiểm tra thông tin</button>
      </aside>
    </main>
  </div>;
}

function PaymentView({ tour, schedule, people, error, submitting, bookingCreated, onBack, onPay }) {
  return <div className="figma-flow-screen"><div className="figma-flow-breadcrumb"><button type="button" onClick={onBack} disabled={bookingCreated}><ArrowLeft /> Quay lại</button><span>Đặt tour&nbsp; / &nbsp;<b>Thanh toán</b></span></div><main className="figma-payment-screen"><h1>Xác nhận và thanh toán</h1><div className="figma-hold-banner"><ShieldCheck /><div><h2>Lịch khởi hành đã sẵn sàng</h2><p>Kiểm tra thông tin trước khi tạo mã VietQR PayOS.</p></div><b>{schedule?.remaining_slots || 0} chỗ</b></div><div className="figma-payment-grid"><section><h2><ShieldCheck /> Phương thức thanh toán</h2><div className="figma-payment-tabs"><button type="button" className="active">PayOS VietQR</button></div><div className="figma-qr figma-pay-at-start"><ShieldCheck /><div><h3>Thanh toán VietQR an toàn</h3><p>Sau khi xác nhận, hệ thống tạo mã QR theo đúng số tiền và tự động kích hoạt chuyến đi khi PayOS báo thanh toán thành công.</p></div></div><div className="figma-payment-info">Thông tin đặt chỗ <span>{schedule?.formatted_date || schedule?.departure_date} · {schedule?.time_slot}</span></div>{error && <p className="figma-form-error" role="alert">{error}</p>}<button type="button" className="figma-pay-button" onClick={onPay} disabled={submitting || bookingCreated}>{submitting ? "Đang tạo mã PayOS..." : bookingCreated ? "Đơn đang chờ thanh toán" : <><Check /> Tạo mã VietQR và thanh toán</>}</button></section><OrderCard tour={tour} schedule={schedule} people={people} /></div><p className="figma-safe-note"><ShieldCheck /> PayOS tự động đối soát giao dịch · Cần hỗ trợ? Liên hệ Sơn Trà REloop</p></main></div>;
}

function SuccessView({ tour, schedule, people, receipt, method, onHome }) {
  const total = Number(receipt?.total_price || schedule?.price * people || tour.price * people || 0);
  const methodLabel = receipt?.payment_method || (method === "payos" ? "PayOS VietQR" : "—");
  const downloadReceipt = () => window.print();
  return <div className="figma-flow-screen"><main className="figma-success-screen"><div className="figma-success-banner"><span><Check /></span><div><h1>Thanh toán thành công</h1><p>PayOS đã xác nhận giao dịch và Sơn Trà REloop đã kích hoạt chuyến đi của bạn.</p></div></div><div className="figma-success-grid"><section><header><h2>Phiếu xác nhận thanh toán</h2><span>✓ {receipt?.payment_status_label || "Đã thanh toán"}</span></header><p><b>Sơn Trà REloop</b><br />Biên nhận thanh toán · Không phải hóa đơn VAT</p><dl><div><dt>Mã đơn hàng</dt><dd>{receipt?.order_code || receipt?.id}</dd></div><div><dt>Thời gian xác nhận</dt><dd>{receipt?.created_at || "—"}</dd></div><div><dt>Phương thức</dt><dd>{methodLabel}</dd></div></dl><h3>Chi tiết chuyến đi</h3><dl><div><dt>{receipt?.experience_name || tour.title}</dt><dd /></div><div><dt>Ngày tham gia</dt><dd>{receipt?.booking_date || schedule?.formatted_date}</dd></div><div><dt>Phiên tour</dt><dd>{receipt?.time_slot || schedule?.time_slot}</dd></div><div><dt>Giá vé × {people} người</dt><dd>{money(total)}</dd></div></dl><div className="figma-paid-total"><span>Tổng đã thanh toán</span><b>{money(total)}</b></div><div className="figma-success-actions"><button type="button" onClick={onHome}>Xem thêm tour</button><button type="button" onClick={downloadReceipt}><Download /> Tải phiếu xác nhận</button></div></section><aside><h2>Chuyến đi của bạn</h2><img src={tour.cover_image_url} alt={tour.title} /><h3>{tour.title}</h3><p>{tour.distance} km&nbsp; · &nbsp;{tour.duration_hours} giờ</p><div className="figma-help"><b>Cần hỗ trợ?</b><p>Liên hệ Sơn Trà REloop và cung cấp mã đơn hàng {receipt?.order_code} để được hỗ trợ.</p></div></aside></div></main></div>;
}

function DetailView({ tour, onBack, onBook }) {
  const nextSchedule = (tour.schedules || []).find((item) => ["open", "almost_full"].includes(item.status) && Number(item.remaining_slots) > 0);
  return <div className="figma-flow-screen figma-detail-view"><div className="figma-detail-top"><button type="button" onClick={onBack}><ArrowLeft /> Quay lại danh sách trekking</button></div><main><section><img className="figma-detail-cover" src={tour.cover_image_url} alt={tour.title} /><div className="figma-tag-row"><span>⚠ Độ cao</span><span>🥾 Cần giày trekking</span><CheckpointMapButton tour={tour} /></div><h1>{tour.title}</h1><p>{tour.description || "Hành trình trekking khám phá thiên nhiên bán đảo Sơn Trà cùng hướng dẫn viên địa phương."}</p><div className="figma-detail-stats"><article><MapPin /><span>Quãng đường<b>{tour.distance || 0} km</b></span></article><article><Clock3 /><span>Thời gian<b>{tour.duration_hours || 0} giờ</b></span></article><article><ShieldCheck /><span>Độ khó<b>{tour.difficulty_label || "Trung bình"}</b></span></article><article><Star /><span>Thưởng xanh<b>+50 RE-Points</b></span></article></div><h2>Mô tả chi tiết chuyến đi</h2><p>{tour.description || "Khám phá cảnh quan Sơn Trà, thực hành trekking an toàn và hoàn thành các checkpoint GPS trên tuyến."}</p><h2>Lịch trình tóm tắt</h2><Itinerary /></section><aside><div className="figma-detail-price"><strong>{money(nextSchedule?.price || tour.price)}</strong><small>/người</small>{nextSchedule ? <span>Chuyến gần nhất: {nextSchedule.formatted_date} · {nextSchedule.time_slot}</span> : <span>Hiện chưa có lịch khởi hành còn chỗ.</span>}</div><div className="figma-order-note"><b>Lịch và số lượng khách</b><p>Bạn sẽ chọn lịch khởi hành thật, số khách và nhập thông tin liên hệ ở bước tiếp theo.</p></div><button type="button" className="figma-pay-button" onClick={onBook} disabled={!nextSchedule}>Chọn lịch và đặt tour</button></aside></main></div>;
}

function CheckpointMapButton({ tour }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeMap, setRouteMap] = useState(null);
  const checkpointCount = routeMap?.checkpoints?.length ?? tour?.checkpoints?.length ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const showMap = async () => {
    setOpen(true);
    if (routeMap || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/tours/${tour.id}/route-map/`);
      const data = response.data?.status === "success" ? response.data.data : response.data;
      setRouteMap(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể tải bản đồ checkpoint lúc này.");
    } finally {
      setLoading(false);
    }
  };

  const checkpoints = routeMap?.checkpoints || tour?.checkpoints || [];
  const coordinates = routeMap?.coordinates || tour?.route?.coordinates || [];

  return <>
    <button type="button" className="figma-checkpoint-button" onClick={showMap} aria-haspopup="dialog" aria-expanded={open}><Navigation /> {checkpointCount > 0 ? `Có GPS Checkpoint (${checkpointCount})` : "Xem bản đồ tuyến"}</button>
    {open && <div className="figma-map-modal" role="dialog" aria-modal="true" aria-labelledby={`checkpoint-map-${tour.id}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section>
        <header><div><span><Navigation /></span><div><h2 id={`checkpoint-map-${tour.id}`}>Bản đồ GPS checkpoint</h2><p>{routeMap?.title || tour.title}</p></div></div><button type="button" aria-label="Đóng bản đồ" onClick={() => setOpen(false)}><X /></button></header>
        {loading && <div className="figma-map-loading"><span /><p>Đang tải tuyến đường và checkpoint...</p></div>}
        {!loading && error && <div className="figma-form-error" role="alert">{error}<button type="button" onClick={() => { setRouteMap(null); showMap(); }}>Thử lại</button></div>}
        {!loading && !error && <>
          <RouteMapPreview coordinates={coordinates} checkpoints={checkpoints} height="min(52vh, 520px)" tourTitle={tour.title} className="figma-checkpoint-map" />
          <div className="figma-checkpoint-summary"><span><b>{checkpoints.length}</b> checkpoint</span><span><b>{routeMap?.total_distance_km || tour?.route?.total_distance_km || tour.distance || 0} km</b> tổng chiều dài</span><span><b>{routeMap?.elevation_gain_m || tour?.route?.elevation_gain_m || 0} m</b> độ cao tích lũy</span></div>
          <div className="figma-checkpoint-list">{checkpoints.length ? checkpoints.map((checkpoint, index) => <article key={checkpoint.id || index}><span>{checkpoint.order_index || index + 1}</span><div><h3>{checkpoint.name || `Checkpoint ${index + 1}`}</h3><p>{checkpoint.desc || checkpoint.description || "Điểm kiểm tra an toàn trên tuyến."}</p><small>Bán kính quét GPS: {checkpoint.radius_tolerance_m || 30} m</small></div></article>) : <p className="figma-data-state">Tuyến này chưa được thiết lập checkpoint GPS.</p>}</div>
        </>}
      </section>
    </div>}
  </>;
}

function Picker({ title, options, active, activeId, onSelect, empty }) { return <div className="figma-picker"><b>{title}</b><div>{options.length ? options.map((option, index) => { const normalized = typeof option === "string" ? { id: option, top: option.split("\n")[0], bottom: option.split("\n")[1] } : option; const isActive = activeId !== undefined ? String(normalized.id) === String(activeId) : index === active; return <button type="button" className={isActive ? "active" : ""} key={normalized.id} onClick={() => onSelect?.(normalized.id)}><b>{normalized.top}</b><small>{normalized.bottom}</small></button>; }) : <p>{empty}</p>}</div></div>; }
function Traveler({ number, label, name, phone, onName, onPhone }) { return <div className="figma-traveler"><h3><span>{number}</span>{label}</h3><label>Họ và tên<input value={name} onChange={onName} autoComplete="name" placeholder="Nguyễn Văn An" /></label><label>Số điện thoại<input value={phone} onChange={onPhone} inputMode="tel" autoComplete="tel" placeholder="09x xxx xxxx" /></label></div>; }
function Itinerary() { return <div className="figma-itinerary">{[["06:00 AM", "Tập trung tại Trạm An toàn Sơn Trà, điểm danh & kiểm tra dụng cụ."], ["06:30 AM", "Bắt đầu trekking xuyên rừng nguyên sinh, trải nghiệm GPS Checkpoint tích điểm."], ["08:30 AM", "Đến đỉnh Bàn Cờ, nghỉ ngơi, chụp hình và thưởng thức trà xanh Sơn Trà."], ["09:30 AM", "Thu gom rác trên đường về (Nhiệm vụ xanh) và kết thúc hành trình."]].map(([time, text]) => <p key={time}><b>{time}</b><span>{text}</span></p>)}</div>; }
function OrderCard({ tour, schedule, people }) { const unitPrice = Number(tour.campaign_item_id ? tour.promo_price : (schedule?.price || tour.price) || 0); const total = unitPrice * people; return <aside className="figma-order-card"><h2>Thông tin đặt chỗ</h2><img src={tour.cover_image_url} alt={tour.title} /><h3>{tour.title}</h3><p>Tour ghép · {people} người · {tour.distance} km · {tour.duration_hours} giờ</p><dl><div><dt>Ngày tham gia</dt><dd>{schedule?.formatted_date || "—"}</dd></div><div><dt>Phiên tour</dt><dd>{schedule?.time_slot || "—"}</dd></div><div><dt>Giá vé × {people} người</dt><dd>{money(total)}</dd></div>{tour.campaign_item_id && <div className="sale"><dt>Ưu đãi flash sale</dt><dd>-{tour.discount}%</dd></div>}</dl><strong>Tổng thanh toán <span>{money(total)}</span></strong><div className="figma-order-note"><b>Thanh toán qua PayOS VietQR</b><p>Chuyến đi được xác nhận sau khi PayOS thông báo giao dịch thành công.</p></div></aside>; }
