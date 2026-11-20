import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { api } from "../../../lib/axios";
import { realtimeBus } from "../../../lib/realtimeBus";
import { PageHeader } from "../../../components/ui/SaasPrimitives";

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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);

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
      label: `Hoàn thành (${bookings.filter((b) => b.status === "completed").length})`,
    },
    {
      id: "cancelled",
      label: `Đã hủy (${bookings.filter((b) => b.status === "cancelled").length})`,
    },
  ];

  const activeItem = selectedBooking || filteredBookings[0] || null;

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
                        {(booking.adults_count || 1) + (booking.children_count || 0)} khách
                      </td>
                      <td className="sr-tabular font-medium text-[var(--sr-text-primary)]">
                        {formatMoney(booking.total_amount || booking.final_price)}
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
                    {(activeItem.adults_count || 1) + (activeItem.children_count || 0)} khách
                  </span>
                </div>
                <div className="sr-itinerary-row justify-between">
                  <span className="text-xs text-[var(--sr-text-muted)]">Tổng thanh toán</span>
                  <span className="text-xs font-semibold sr-tabular">
                    {formatMoney(activeItem.total_amount || activeItem.final_price)}
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
              </div>
            </aside>
          )}
        </section>
      )}
    </div>
  );
}
