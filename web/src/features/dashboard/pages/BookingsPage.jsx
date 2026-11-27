import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, MessageSquare, Pencil, RefreshCw, RotateCcw, Star } from "lucide-react";
import { api } from "../../../lib/axios";
import { realtimeBus } from "../../../lib/realtimeBus";
import { useUserEco } from "../../../context/UserEcoContext";
import { PageHeader, SaasSelect } from "../../../components/ui/SaasPrimitives";
import TourGuideReviewForm, { STAR_RATING_LABELS } from "../../../components/reviews/TourGuideReviewForm";
import { extractErrorMessage } from "../../../utils/apiError";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const BANK_OPTIONS = [
  { value: "970422", label: "MB Bank" },
  { value: "970436", label: "Vietcombank" },
  { value: "970407", label: "Techcombank" },
  { value: "970418", label: "BIDV" },
  { value: "970415", label: "VietinBank" },
  { value: "970416", label: "ACB" },
  { value: "970432", label: "VPBank" },
  { value: "970423", label: "TPBank" },
  { value: "970403", label: "Sacombank" },
  { value: "970405", label: "Agribank" },
];

const REFUND_STATUS_STYLES = {
  requested: "bg-amber-50 text-amber-800 border-amber-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  refunded: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
};

const UPCOMING_STATUSES = new Set(["confirmed", "waiting_payment", "waiting_confirmation", "pending"]);

const getStatusLabel = (status) => {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "completed") return "Đã hoàn thành";
  if (status === "cancelled") return "Đã hủy";
  if (status === "waiting_payment" || status === "pending") return "Chờ thanh toán";
  if (status === "waiting_confirmation") return "Chờ xác nhận";
  return status || "Chưa rõ";
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const { refreshEcoData } = useUserEco();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [completingBooking, setCompletingBooking] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundBankBin, setRefundBankBin] = useState("970422");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountHolder, setRefundAccountHolder] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/tours/my-bookings/");
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedBooking((prev) => prev || res.data.data[0]);
        }
      } else {
        setBookings([]);
        setLoadError("Dữ liệu đơn đặt tour trả về chưa hợp lệ.");
      }
    } catch (err) {
      setBookings([]);
      setLoadError(
        extractErrorMessage(
          err,
          "Không thể tải danh sách đơn đặt tour từ máy chủ. Vui lòng thử lại."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const unsub = realtimeBus.subscribe((event) => {
      if (event.type === "ORDER_CREATED" || event.type === "FLASH_SALE_SLOT_UPDATED") {
        fetchBookings();
      }
    });
    return () => unsub();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === "upcoming") return UPCOMING_STATUSES.has(b.status);
      if (activeTab === "completed") return b.status === "completed";
      if (activeTab === "cancelled") return b.status === "cancelled";
      return true;
    });
  }, [bookings, activeTab]);

  const tabs = [
    { id: "all", label: `Tất cả (${bookings.length})` },
    {
      id: "upcoming",
      label: `Sắp khởi hành (${bookings.filter((b) => UPCOMING_STATUSES.has(b.status)).length})`,
    },
    {
      id: "completed",
      label: `Hành trình đã hoàn thành (${bookings.filter((b) => b.status === "completed").length})`,
    },
    {
      id: "cancelled",
      label: `Đã hủy (${bookings.filter((b) => b.status === "cancelled").length})`,
    },
  ];

  const activeItem = selectedBooking || filteredBookings[0] || null;

  const handleCompleteBooking = async (booking) => {
    if (!booking?.id || completingBooking) return;
    setCompletingBooking(true);
    setReviewFeedback("");
    try {
      const res = await api.post(`/tours/my-bookings/${booking.id}/complete/`);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: "completed", status_label: "Hoàn thành" } : b
        )
      );
      setSelectedBooking((prev) =>
        prev && prev.id === booking.id
          ? { ...prev, status: "completed", status_label: "Hoàn thành" }
          : prev
      );
      setReviewFeedback(
        res.data?.message || "Đã xác nhận hoàn thành chuyến đi! Bây giờ bạn có thể đánh giá."
      );
      setReviewOpen(true);
    } catch (err) {
      setReviewFeedback(extractErrorMessage(err, "Không thể xác nhận hoàn thành chuyến đi."));
    } finally {
      setCompletingBooking(false);
    }
  };

  const handleReviewSuccess = async (payload, mode) => {
    const saved = payload?.data || {};
    const patch = {
      has_reviewed: true,
      review_id: saved.id || activeItem?.review_id,
      review_rating: Number(saved.tour_rating || saved.rating || 5),
      review_guide_rating: saved.guide_rating ?? activeItem?.review_guide_rating ?? null,
      review_tour_tags: saved.tour_tags || [],
      review_guide_tags: saved.guide_tags || [],
      review_low_rating_reasons: saved.low_rating_reasons || [],
      review_comment: saved.comment || "",
      review_edited_at: mode === "edit" ? saved.edited_at || "Đã chỉnh sửa" : null,
      review_can_edit: mode !== "edit",
    };
    setBookings((prev) =>
      prev.map((b) => (b.id === activeItem.id ? { ...b, ...patch } : b))
    );
    setSelectedBooking((prev) =>
      prev && prev.id === activeItem.id ? { ...prev, ...patch } : prev
    );
    setReviewFeedback(
      payload?.message ||
        (mode === "edit" ? "Đã cập nhật đánh giá thành công." : "Cảm ơn bạn đã gửi đánh giá!")
    );
    setReviewOpen(false);
    setEditReviewOpen(false);
    refreshEcoData?.();
  };

  const handleRequestRefund = async (e) => {
    e.preventDefault();
    if (!activeItem?.id || submittingRefund) return;
    setSubmittingRefund(true);
    setReviewFeedback("");

    const bankOption = BANK_OPTIONS.find((b) => b.value === refundBankBin);
    try {
      const payload = {
        reason: refundReason.trim(),
        ...(activeItem.payment_method !== "paypal" && activeItem.payment_method !== "vnpay"
          ? {
              bank_bin: refundBankBin,
              bank_name: bankOption?.label || "",
              account_number: refundAccountNumber.trim(),
              account_holder: refundAccountHolder.trim(),
            }
          : {}),
      };
      const res = await api.post(`/tours/my-bookings/${activeItem.id}/refund-request/`, payload);
      const updated = res.data?.data || {};
      const nextPatch = {
        refund_status: updated.refund_status || "requested",
        refund_status_label: updated.refund_status_label || "Chờ duyệt hoàn tiền",
        refund_reason: updated.refund_reason || refundReason.trim(),
      };
      setBookings((prev) => prev.map((b) => (b.id === activeItem.id ? { ...b, ...nextPatch } : b)));
      setSelectedBooking((prev) =>
        prev && prev.id === activeItem.id ? { ...prev, ...nextPatch } : prev
      );
      setRefundOpen(false);
      setRefundReason("");
      setReviewFeedback(res.data?.message || "Đã gửi yêu cầu hủy & hoàn tiền tới Ban Quản Lý.");
    } catch (err) {
      setReviewFeedback(extractErrorMessage(err, "Không thể gửi yêu cầu hoàn tiền."));
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Đơn đặt của tôi"
        subtitle="Theo dõi trạng thái thanh toán, điểm tập kết và lịch sử các chuyến đã đi"
        actions={
          <div className="sr-tabs" role="tablist" aria-label="Lọc trạng thái đơn đặt">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`sr-tab ${activeTab === tab.id ? "is-selected" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="sr-surface" role="status">
          Đang tải danh sách đơn đặt tour...
        </div>
      ) : loadError ? (
        <div className="sr-surface flex flex-col items-start gap-3" role="alert">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Không thể tải đơn đặt tour</span>
          </div>
          <p className="sr-subtitle m-0">{loadError}</p>
          <button
            type="button"
            className="sr-btn sr-btn-primary sr-btn-sm"
            onClick={fetchBookings}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="sr-surface flex flex-col items-start gap-4">
          <h2 className="sr-h2">Chưa có đơn đặt tour nào trong mục này</h2>
          <p className="sr-subtitle">
            Khám phá các tuyến trekking đang mở tại bán đảo Sơn Trà để lên lịch hành trình mới.
          </p>
          <button
            type="button"
            className="sr-btn sr-btn-primary"
            onClick={() => navigate("/dashboard/trekking")}
          >
            Khám phá tour ngay
          </button>
        </div>
      ) : (
        <section className="sr-split-detail" aria-label="Danh sách và chi tiết đơn đặt">
          <div className="sr-table-wrap">
            <table className="sr-table">
              <caption className="sr-only">Danh sách đơn đặt tour của bạn</caption>
              <thead>
                <tr>
                  <th scope="col">Mã đơn và tuyến đường</th>
                  <th scope="col" className="sr-hide-mobile">Ngày đi</th>
                  <th scope="col" className="sr-hide-mobile">Khách</th>
                  <th scope="col">Tổng tiền</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const isSel = activeItem?.id === booking.id;
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setRefundOpen(false);
                        setReviewOpen(false);
                        setEditReviewOpen(false);
                        setReviewFeedback("");
                      }}
                      className={`cursor-pointer ${isSel ? "is-selected" : ""}`}
                    >
                      <td className="font-medium text-[var(--sr-text-primary)]">
                        #{booking.order_code || booking.id} · {booking.tour_title}
                      </td>
                      <td className="sr-hide-mobile sr-tabular">
                        {booking.scheduled_date || "Đang cập nhật"}
                      </td>
                      <td className="sr-hide-mobile sr-tabular">
                        {booking.total_guests || (booking.adults_count || 1) + (booking.children_count || 0)} khách
                      </td>
                      <td className="sr-tabular font-medium text-[var(--sr-text-primary)]">
                        {formatMoney(booking.total_price ?? booking.total_amount ?? booking.final_price)}
                      </td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={
                              booking.status === "confirmed"
                                ? "text-[var(--sr-accent)] font-medium"
                                : "text-[var(--sr-text-muted)]"
                            }
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                          {booking.refund_status && booking.refund_status !== "none" && (
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                REFUND_STATUS_STYLES[booking.refund_status] ||
                                "bg-stone-100 text-stone-700 border-stone-200"
                              }`}
                            >
                              {booking.refund_status_label || booking.refund_status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activeItem && (
            <aside className="sr-surface flex flex-col gap-4" aria-label="Chi tiết đơn đặt">
              <p className="sr-eyebrow">
                Đơn #{activeItem.order_code || activeItem.id} · {getStatusLabel(activeItem.status)}
              </p>
              <h2 className="sr-h2">{activeItem.tour_title}</h2>

              <div className="flex flex-col">
                <div className="sr-itinerary-row justify-between">
                  <span className="text-xs text-[var(--sr-text-muted)]">Ngày khởi hành</span>
                  <span className="text-xs font-medium sr-tabular">
                    {activeItem.scheduled_date || "Đang cập nhật"}
                  </span>
                </div>
                <div className="sr-itinerary-row justify-between">
                  <span className="text-xs text-[var(--sr-text-muted)]">Điểm tập kết</span>
                  <span className="text-xs font-medium">
                    {activeItem.pickup_location || "Trung tâm Đà Nẵng"}
                  </span>
                </div>
                <div className="sr-itinerary-row justify-between">
                  <span className="text-xs text-[var(--sr-text-muted)]">Số khách</span>
                  <span className="text-xs font-medium sr-tabular">
                    {activeItem.total_guests || (activeItem.adults_count || 1) + (activeItem.children_count || 0)} khách
                  </span>
                </div>
                <div className="sr-itinerary-row justify-between">
                  <span className="text-xs text-[var(--sr-text-muted)]">Tổng thanh toán</span>
                  <span className="text-xs font-semibold sr-tabular">
                    {formatMoney(activeItem.total_price ?? activeItem.total_amount ?? activeItem.final_price)}
                  </span>
                </div>
                {activeItem.refund_status && activeItem.refund_status !== "none" && (
                  <div className="sr-itinerary-row justify-between">
                    <span className="text-xs text-[var(--sr-text-muted)]">Trạng thái hoàn tiền</span>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        REFUND_STATUS_STYLES[activeItem.refund_status] ||
                        "bg-stone-100 text-stone-700 border-stone-200"
                      }`}
                    >
                      {activeItem.refund_status_label || activeItem.refund_status}
                    </span>
                  </div>
                )}
                {activeItem.refunded_amount > 0 && (
                  <div className="sr-itinerary-row justify-between">
                    <span className="text-xs text-[var(--sr-text-muted)]">Số tiền đã hoàn</span>
                    <span className="text-xs font-semibold text-emerald-700 sr-tabular">
                      {formatMoney(activeItem.refunded_amount)}
                    </span>
                  </div>
                )}
              </div>

              {activeItem.refund_reason && activeItem.refund_status !== "none" && (
                <div className="rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-3 py-2 text-xs text-[var(--sr-text-secondary)]">
                  <strong className="text-[var(--sr-text-primary)]">Lý do / Phản hồi:</strong>{" "}
                  {activeItem.refund_reason}
                </div>
              )}

              {activeItem.payment_transaction && (
                <div className="rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-3 py-2.5 text-xs space-y-1">
                  <div className="font-semibold text-[var(--sr-text-primary)]">
                    Lịch sử giao dịch
                  </div>
                  <div className="flex justify-between gap-2 text-[var(--sr-text-secondary)]">
                    <span>Cổng thanh toán</span>
                    <span className="font-medium uppercase">
                      {activeItem.payment_transaction.gateway}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-[var(--sr-text-secondary)]">
                    <span>Mã giao dịch</span>
                    <span className="font-mono text-[11px] break-all text-right">
                      {activeItem.payment_transaction.vnp_transaction_no ||
                        activeItem.payment_transaction.capture_id ||
                        activeItem.payment_transaction.transaction_code}
                    </span>
                  </div>
                  {activeItem.payment_transaction.vnp_bank_code && (
                    <div className="flex justify-between gap-2 text-[var(--sr-text-secondary)]">
                      <span>Ngân hàng</span>
                      <span>{activeItem.payment_transaction.vnp_bank_code}</span>
                    </div>
                  )}
                  {activeItem.payment_transaction.created_at && (
                    <div className="flex justify-between gap-2 text-[var(--sr-text-secondary)]">
                      <span>Thời gian tạo</span>
                      <span className="sr-tabular">{activeItem.payment_transaction.created_at}</span>
                    </div>
                  )}
                  {activeItem.payment_transaction.refund_reference && (
                    <div className="flex justify-between gap-2 text-emerald-700">
                      <span>Mã hoàn tiền</span>
                      <span className="font-mono text-[11px]">
                        {activeItem.payment_transaction.refund_reference}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {activeItem.status === "waiting_payment" &&
                  (activeItem.payment_method === "vnpay" || activeItem.payment_method === "paypal") && (
                    <button
                      type="button"
                      className="sr-btn sr-btn-primary sr-btn-block"
                      onClick={() =>
                        navigate(
                          activeItem.payment_method === "vnpay"
                            ? `/payment/vnpay/return?order_id=${activeItem.order_id}`
                            : `/payment/paypal/cancel?order_id=${activeItem.order_id}`
                        )
                      }
                    >
                      <span>
                        {activeItem.payment_method === "vnpay"
                          ? "Kiểm tra / tiếp tục VNPAY"
                          : "Kiểm tra / tiếp tục PayPal"}
                      </span>
                    </button>
                  )}
                <button
                  type="button"
                  className="sr-btn sr-btn-primary sr-btn-block"
                  onClick={() =>
                    navigate(
                      `/dashboard/inbox?tour_id=${activeItem.tour_id || ""}&date=${
                        activeItem.departure_date_raw || activeItem.scheduled_date || ""
                      }`
                    )
                  }
                >
                  <MessageSquare size={15} aria-hidden="true" />
                  <span>Mở phòng chat chuyến đi</span>
                </button>
                <button
                  type="button"
                  className="sr-btn sr-btn-secondary sr-btn-block"
                  onClick={() => navigate(`/dashboard/trekking/${activeItem.tour_id || 1}`)}
                >
                  Xem lại thông tin tuyến
                </button>
                {activeItem.status === "confirmed" &&
                  activeItem.refund_status !== "requested" &&
                  activeItem.refund_status !== "in_review" && (
                  <button
                    type="button"
                    disabled={completingBooking}
                    className="sr-btn sr-btn-secondary sr-btn-block"
                    onClick={() => handleCompleteBooking(activeItem)}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>
                      {completingBooking ? "Đang xác nhận..." : "Xác nhận đã hoàn thành chuyến đi"}
                    </span>
                  </button>
                )}
                {activeItem.status === "confirmed" &&
                  activeItem.payment_status === "paid" &&
                  (!activeItem.refund_status ||
                    activeItem.refund_status === "none" ||
                    activeItem.refund_status === "rejected") && (
                    <button
                      type="button"
                      className="sr-btn sr-btn-secondary sr-btn-block"
                      onClick={() => {
                        setReviewFeedback("");
                        setRefundOpen((v) => !v);
                      }}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      <span>
                        {refundOpen ? "Đóng form hoàn tiền" : "Yêu cầu hủy & hoàn tiền"}
                      </span>
                    </button>
                  )}
                {activeItem.status === "completed" &&
                  !activeItem.has_reviewed &&
                  !activeItem.review_absent_blocked &&
                  !activeItem.review_expired && (
                    <button
                      type="button"
                      className="sr-btn sr-btn-primary sr-btn-block"
                      onClick={() => {
                        setReviewFeedback("");
                        setReviewOpen((v) => !v);
                      }}
                    >
                      <Star size={15} aria-hidden="true" />
                      <span>
                        {reviewOpen
                          ? "Đóng khung đánh giá"
                          : activeItem.has_guide
                            ? "Đánh giá Tour & HDV"
                            : "Đánh giá chuyến đi"}
                      </span>
                    </button>
                  )}
                {activeItem.status === "completed" &&
                  !activeItem.has_reviewed &&
                  activeItem.review_absent_blocked && (
                    <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Đơn đặt được ghi nhận vắng mặt nên không mở quyền đánh giá.
                    </p>
                  )}
                {activeItem.status === "completed" &&
                  !activeItem.has_reviewed &&
                  !activeItem.review_absent_blocked &&
                  activeItem.review_expired && (
                    <p className="m-0 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-3 py-2 text-xs text-[var(--sr-text-muted)]">
                      Đã quá hạn 14 ngày kể từ ngày khởi hành ({activeItem.review_deadline}) để gửi đánh giá.
                    </p>
                  )}
              </div>

              {activeItem.status === "completed" && activeItem.has_reviewed && (
                <div className="rounded-lg border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-3 py-2.5 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--sr-accent-ink)]">
                      Tour: {activeItem.review_rating || 5}★ ({STAR_RATING_LABELS[activeItem.review_rating || 5]})
                      {activeItem.review_guide_rating
                        ? ` · HDV${activeItem.guide_name ? ` ${activeItem.guide_name}` : ""}: ${activeItem.review_guide_rating}★`
                        : ""}
                    </span>
                    {activeItem.review_can_edit && activeItem.review_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewFeedback("");
                          setEditReviewOpen((v) => !v);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--sr-accent-ink)] underline border-0 bg-transparent cursor-pointer p-0"
                      >
                        <Pencil size={11} aria-hidden="true" />
                        <span>{editReviewOpen ? "Đóng" : "Sửa (48h)"}</span>
                      </button>
                    )}
                  </div>
                  {activeItem.review_comment && (
                    <p className="text-[var(--sr-text-secondary)] m-0">{activeItem.review_comment}</p>
                  )}
                  {activeItem.review_edited_at && (
                    <p className="text-[10px] text-[var(--sr-text-muted)] m-0 italic">
                      Đã chỉnh sửa lúc {activeItem.review_edited_at}
                    </p>
                  )}
                </div>
              )}

              {reviewFeedback && (
                <p role="status" className="text-xs text-[var(--sr-accent)] m-0">
                  {reviewFeedback}
                </p>
              )}

              {refundOpen && activeItem.status === "confirmed" && (
                <form
                  onSubmit={handleRequestRefund}
                  className="flex flex-col gap-2.5 pt-2 border-t border-[var(--sr-border)]"
                >
                  <strong className="text-xs text-[var(--sr-text-primary)]">
                    Gửi yêu cầu hủy & hoàn tiền
                  </strong>
                  <textarea
                    rows={3}
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Nhập lý do hủy chuyến đi..."
                    className="sr-textarea text-xs"
                  />

                  {activeItem.payment_method === "paypal" || activeItem.payment_method === "vnpay" ? (
                    <p className="m-0 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-3 py-2 text-[11px] text-[var(--sr-text-secondary)]">
                      {activeItem.payment_method === "paypal"
                        ? "Đơn thanh toán qua PayPal Sandbox sẽ được hoàn trực tiếp về tài khoản PayPal của bạn sau khi BQL duyệt."
                        : "Đơn thanh toán qua VNPAY Sandbox sẽ được hoàn về thẻ/tài khoản đã thanh toán sau khi BQL duyệt."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SaasSelect
                        label="Ngân hàng"
                        value={refundBankBin}
                        options={BANK_OPTIONS}
                        onChange={setRefundBankBin}
                        className="w-full"
                      />
                      <input
                        type="text"
                        required
                        value={refundAccountNumber}
                        onChange={(e) => setRefundAccountNumber(e.target.value)}
                        placeholder="Số tài khoản nhận tiền hoàn"
                        className="sr-input text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={refundAccountHolder}
                        onChange={(e) => setRefundAccountHolder(e.target.value)}
                        placeholder="Tên chủ tài khoản (viết hoa không dấu)"
                        className="sr-input text-xs"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="sr-btn sr-btn-primary sr-btn-sm"
                  >
                    {submittingRefund ? "Đang gửi..." : "Gửi yêu cầu hoàn tiền"}
                  </button>
                </form>
              )}

              {reviewOpen &&
                activeItem.status === "completed" &&
                !activeItem.has_reviewed &&
                !activeItem.review_absent_blocked &&
                !activeItem.review_expired && (
                  <TourGuideReviewForm
                    tourId={activeItem.tour_id}
                    orderVendorId={activeItem.id}
                    hasGuide={activeItem.has_guide}
                    guideName={activeItem.guide_name}
                    guideAvatarUrl={activeItem.guide_avatar_url}
                    deadline={activeItem.review_deadline}
                    daysRemaining={activeItem.review_days_remaining}
                    onSuccess={handleReviewSuccess}
                    onCancel={() => setReviewOpen(false)}
                  />
                )}

              {editReviewOpen && activeItem.has_reviewed && activeItem.review_can_edit && (
                <TourGuideReviewForm
                  tourId={activeItem.tour_id}
                  editReview={{
                    id: activeItem.review_id,
                    rating: activeItem.review_rating,
                    tour_rating: activeItem.review_rating,
                    guide_rating: activeItem.review_guide_rating,
                    has_guide: Boolean(activeItem.has_guide || activeItem.review_guide_rating),
                    guide_name: activeItem.guide_name,
                    tour_tags: activeItem.review_tour_tags,
                    guide_tags: activeItem.review_guide_tags,
                    low_rating_reasons: activeItem.review_low_rating_reasons,
                    comment: activeItem.review_comment,
                  }}
                  onSuccess={handleReviewSuccess}
                  onCancel={() => setEditReviewOpen(false)}
                />
              )}
            </aside>
          )}
        </section>
      )}
    </div>
  );
}
