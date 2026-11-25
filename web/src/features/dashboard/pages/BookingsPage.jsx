import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import { api } from "../../../lib/axios";
import { realtimeBus } from "../../../lib/realtimeBus";
import { useUserEco } from "../../../context/UserEcoContext";
import { PageHeader } from "../../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../../utils/apiError";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getStatusLabel = (status) => {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "completed") return "Đã hoàn thành";
  if (status === "cancelled") return "Đã hủy";
  if (status === "pending") return "Chờ thanh toán";
  return "Đã xác nhận";
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const { refreshEcoData } = useUserEco();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [completingBooking, setCompletingBooking] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tours/my-bookings/");
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setBookings(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedBooking((prev) => prev || res.data.data[0]);
        }
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
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
      if (activeTab === "upcoming") return b.status === "confirmed" || b.status === "pending";
      if (activeTab === "completed") return b.status === "completed";
      if (activeTab === "cancelled") return b.status === "cancelled";
      return true;
    });
  }, [bookings, activeTab]);

  const tabs = [
    { id: "all", label: `Tất cả (${bookings.length})` },
    {
      id: "upcoming",
      label: `Sắp khởi hành (${bookings.filter((b) => ["confirmed", "pending"].includes(b.status)).length})`,
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!activeItem?.tour_id || submittingReview) return;
    setSubmittingReview(true);
    setReviewFeedback("");
    try {
      const submittedComment = reviewComment.trim();
      const res = await api.post(`/tours/${activeItem.tour_id}/reviews/`, {
        order_vendor_id: activeItem.id,
        rating: reviewRating,
        comment: submittedComment,
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === activeItem.id
            ? {
                ...b,
                has_reviewed: true,
                review_rating: reviewRating,
                review_comment: submittedComment,
              }
            : b
        )
      );
      setSelectedBooking((prev) =>
        prev && prev.id === activeItem.id
          ? {
              ...prev,
              has_reviewed: true,
              review_rating: reviewRating,
              review_comment: submittedComment,
            }
          : prev
      );
      setReviewFeedback(res.data?.message || "Cảm ơn bạn đã gửi đánh giá! (+10 RE-Points)");
      setReviewComment("");
      setReviewOpen(false);
      refreshEcoData?.();
    } catch (err) {
      setReviewFeedback(extractErrorMessage(err, "Không thể gửi đánh giá lúc này."));
    } finally {
      setSubmittingReview(false);
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
                      onClick={() => setSelectedBooking(booking)}
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
                        <span
                          className={
                            booking.status === "confirmed"
                              ? "text-[var(--sr-accent)] font-medium"
                              : "text-[var(--sr-text-muted)]"
                          }
                        >
                          {getStatusLabel(booking.status)}
                        </span>
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
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  className="sr-btn sr-btn-primary sr-btn-block"
                  onClick={() =>
                    navigate(
                      `/dashboard/inbox?tour_id=${activeItem.tour_id || ""}&date=${
                        activeItem.scheduled_date || ""
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
                {activeItem.status === "confirmed" && (
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
                {activeItem.status === "completed" && !activeItem.has_reviewed && (
                  <button
                    type="button"
                    className="sr-btn sr-btn-primary sr-btn-block"
                    onClick={() => {
                      setReviewFeedback("");
                      setReviewOpen((v) => !v);
                    }}
                  >
                    <Star size={15} aria-hidden="true" />
                    <span>{reviewOpen ? "Đóng khung đánh giá" : "Đánh giá chuyến đi (+10 RE-Points)"}</span>
                  </button>
                )}
              </div>

              {activeItem.status === "completed" && activeItem.has_reviewed && (
                <div className="rounded-lg border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-3 py-2.5 text-xs space-y-1">
                  <div className="font-semibold text-[var(--sr-accent-ink)]">
                    Đã đánh giá {activeItem.review_rating || 5}★
                  </div>
                  {activeItem.review_comment && (
                    <p className="text-[var(--sr-text-secondary)] m-0">{activeItem.review_comment}</p>
                  )}
                </div>
              )}

              {reviewFeedback && (
                <p role="status" className="text-xs text-[var(--sr-accent)] m-0">
                  {reviewFeedback}
                </p>
              )}

              {reviewOpen && activeItem.status === "completed" && !activeItem.has_reviewed && (
                <form
                  onSubmit={handleSubmitReview}
                  className="flex flex-col gap-2.5 pt-2 border-t border-[var(--sr-border)]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--sr-text-secondary)]">Chấm điểm</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={`px-2 py-1 rounded border text-xs cursor-pointer ${
                            reviewRating >= star
                              ? "bg-[var(--sr-accent-soft)] border-[var(--sr-accent)] text-[var(--sr-accent)] font-semibold"
                              : "border-[var(--sr-border)] text-[var(--sr-text-muted)]"
                          }`}
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm trekking, hướng dẫn viên và công tác bảo tồn..."
                    className="sr-textarea text-xs"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="sr-btn sr-btn-primary sr-btn-sm"
                  >
                    {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </form>
              )}
            </aside>
          )}
        </section>
      )}
    </div>
  );
}
