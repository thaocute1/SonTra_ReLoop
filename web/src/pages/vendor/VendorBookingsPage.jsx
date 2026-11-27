import React, { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  Plus,
  Search,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";
import { VENDOR_LABELS } from "../../constants/labels";
import {
  DepartureCalendar,
  normalizeDateKey,
  toDateKey,
} from "../../components/vendor/DepartureCalendar";

const AVAILABLE_EXPERIENCES = [
  {
    id: 1,
    name: "Trekking đỉnh Bàn Cờ - ngắm hoàng hôn",
    price: 450000,
    duration: "4.5 giờ",
    level: "Trung bình",
    location: "Bán đảo Sơn Trà",
    timeSlots: ["06:00 - 10:30", "14:30 - 18:30"],
  },
  {
    id: 2,
    name: "Khám phá rừng cây đa ngàn năm Sơn Trà",
    price: 400000,
    duration: "3.5 giờ",
    level: "Dễ",
    location: "Rừng nguyên sinh Bãi Bắc",
    timeSlots: ["07:30 - 11:00", "13:30 - 17:00"],
  },
  {
    id: 3,
    name: "Chinh phục Mũi Nghê - đón bình minh sớm",
    price: 550000,
    duration: "5 giờ",
    level: "Thử thách",
    location: "Mũi Nghê - Ghềnh đá",
    timeSlots: ["05:00 - 09:30"],
  },
  {
    id: 4,
    name: "Ghềnh Bàng - lặn biển ngắm san hô & nhặt rác",
    price: 350000,
    duration: "4 giờ",
    level: "Trung bình",
    location: "Bãi Ghềnh Bàng",
    timeSlots: ["08:00 - 12:00", "13:30 - 17:30"],
  },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "waiting_confirmation", label: VENDOR_LABELS.STATUS_WAITING },
  { value: "confirmed", label: VENDOR_LABELS.STATUS_CONFIRMED },
  { value: "completed", label: VENDOR_LABELS.STATUS_COMPLETED },
  { value: "cancelled", label: VENDOR_LABELS.STATUS_CANCELLED },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "paid", label: VENDOR_LABELS.PAYMENT_PAID },
  { value: "deposit", label: VENDOR_LABELS.PAYMENT_DEPOSIT },
  { value: "unpaid", label: VENDOR_LABELS.PAYMENT_UNPAID },
];

const STATUS_BADGE_MAP = {
  waiting_confirmation: [VENDOR_LABELS.STATUS_WAITING, "sr-badge-warn"],
  waiting_payment: [VENDOR_LABELS.STATUS_WAITING, "sr-badge-warn"],
  confirmed: [VENDOR_LABELS.STATUS_CONFIRMED, "sr-badge-moss"],
  completed: [VENDOR_LABELS.STATUS_COMPLETED, "sr-badge-neutral"],
  cancelled: [VENDOR_LABELS.STATUS_CANCELLED, "sr-badge-urgent"],
};

const REFUND_BADGE_MAP = {
  requested: ["Chờ duyệt hoàn tiền", "sr-badge-warn"],
  in_review: ["Đang xem xét hoàn", "sr-badge-warn"],
  approved: ["Đã duyệt hoàn tiền", "sr-badge-moss"],
  refunded: ["Đã hoàn tiền", "sr-badge-moss"],
  rejected: ["Từ chối hoàn tiền", "sr-badge-urgent"],
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export const VendorBookingsPage = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [viewMode, setViewMode] = useState("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => toDateKey(new Date()));
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [experiences, setExperiences] = useState(AVAILABLE_EXPERIENCES);
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [newOrder, setNewOrder] = useState({
    experience_id: 1,
    booking_date: new Date().toISOString().split("T")[0],
    time_slot: "06:00 - 10:30",
    adults_count: 2,
    children_count: 0,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    pickup_location: "",
    payment_method: "Chuyển khoản QR",
    payment_status: "paid",
    special_notes: "",
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/vendors/bookings/"),
      api.get("/vendors/tours/"),
    ])
      .then(([bookingsRes, toursRes]) => {
        if (!active) return;
        if (
          bookingsRes.status === "fulfilled" &&
          bookingsRes.value.data?.status === "success" &&
          bookingsRes.value.data.data?.bookings
        ) {
          const list = bookingsRes.value.data.data.bookings;
          setBookings(list);
          if (list.length > 0) setSelectedBooking(list[0]);
        }

        if (
          toursRes.status === "fulfilled" &&
          toursRes.value.data?.status === "success" &&
          Array.isArray(toursRes.value.data.data) &&
          toursRes.value.data.data.length > 0
        ) {
          const mappedTours = toursRes.value.data.data.map((t) => {
            const slots = Array.from(
              new Set(
                (t.schedules || [])
                  .map((s) => s.time_slot)
                  .filter(Boolean)
              )
            );
            return {
              id: t.id,
              name: t.title,
              price: Number(t.price || 0),
              schedules: t.schedules || [],
              timeSlots: slots.length > 0 ? slots : ["06:00 - 10:30", "14:30 - 18:30"],
            };
          });
          setExperiences(mappedTours);
          setNewOrder((prev) => ({
            ...prev,
            experience_id: mappedTours[0].id,
            time_slot: mappedTours[0].timeSlots[0],
          }));
        }
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu đơn đặt:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(""), 4000);
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    const statusLabels = {
      confirmed: VENDOR_LABELS.STATUS_CONFIRMED,
      completed: VENDOR_LABELS.STATUS_COMPLETED,
      cancelled: VENDOR_LABELS.STATUS_CANCELLED,
    };

    try {
      await api.patch(`/vendors/bookings/${bookingId}/status/`, { status: newStatus });
    } catch (err) {
      if (err?.response) {
        showToast(err.response?.data?.message || "Không thể cập nhật trạng thái đơn trên máy chủ.");
        return;
      }
      // Local fallback when offline
    }

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId || b.order_code === bookingId) {
          return {
            ...b,
            status: newStatus,
            status_label: statusLabels[newStatus] || newStatus,
            payment_status: newStatus === "completed" ? "paid" : b.payment_status,
            payment_status_label:
              newStatus === "completed" ? VENDOR_LABELS.PAYMENT_PAID : b.payment_status_label,
          };
        }
        return b;
      })
    );

    if (
      selectedBooking &&
      (selectedBooking.id === bookingId || selectedBooking.order_code === bookingId)
    ) {
      setSelectedBooking((prev) => ({
        ...prev,
        status: newStatus,
        status_label: statusLabels[newStatus] || newStatus,
      }));
    }

    showToast(`Đã cập nhật đơn #${bookingId} thành "${statusLabels[newStatus]}".`);
  };

  const selectedExp =
    experiences.find((e) => String(e.id) === String(newOrder.experience_id)) ||
    experiences[0];
  const calculatedTotal =
    Number(newOrder.adults_count) * selectedExp.price +
    Math.round(Number(newOrder.children_count) * selectedExp.price * 0.7);
  const esgContribution = Math.round(calculatedTotal * 0.1);

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (submittingOrder) return;
    if (!newOrder.customer_name.trim() || !newOrder.customer_phone.trim()) {
      showToast("Vui lòng nhập họ tên và số điện thoại khách hàng.");
      return;
    }

    const matchedSchedule = (selectedExp.schedules || []).find(
      (s) =>
        s.departure_date === newOrder.booking_date &&
        (!newOrder.time_slot || s.time_slot === newOrder.time_slot)
    );

    const payload = {
      tour_id: selectedExp.id,
      experience_id: selectedExp.id,
      schedule_id: matchedSchedule?.id,
      unit_price: selectedExp.price,
      customer_name: newOrder.customer_name.trim(),
      customer_phone: newOrder.customer_phone.trim(),
      customer_email: newOrder.customer_email.trim(),
      pickup_location: newOrder.pickup_location.trim() || "Trung tâm Đà Nẵng",
      booking_date: newOrder.booking_date,
      booking_date_formatted: newOrder.booking_date.split("-").reverse().join("/"),
      time_slot: newOrder.time_slot,
      adults_count: Number(newOrder.adults_count) || 1,
      children_count: Number(newOrder.children_count) || 0,
      payment_status: newOrder.payment_status,
      payment_method: newOrder.payment_method,
      special_notes: newOrder.special_notes.trim(),
    };

    setSubmittingOrder(true);
    try {
      const res = await api.post("/vendors/bookings/create/", payload);
      const createdBooking = res.data?.data;
      if (!createdBooking) {
        throw new Error("Không nhận được dữ liệu đơn từ máy chủ.");
      }

      setBookings((prev) => [createdBooking, ...prev]);
      setSelectedBooking(createdBooking);
      showToast(`Đã tạo đơn đặt chỗ #${createdBooking.order_code} cho khách ${createdBooking.customer_name}.`);
      setActiveTab("list");
      setNewOrder((prev) => ({
        ...prev,
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        pickup_location: "",
        special_notes: "",
      }));
    } catch (err) {
      showToast(extractErrorMessage(err, "Không thể tạo đơn đặt chỗ. Vui lòng thử lại."));
    } finally {
      setSubmittingOrder(false);
    }
  };

  const calendarBookings = bookings.filter((b) => {
    if (statusFilter !== "all") {
      if (statusFilter === "waiting_confirmation") {
        if (b.status !== "waiting_confirmation" && b.status !== "waiting_payment") return false;
      } else if (b.status !== statusFilter) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        b.order_code?.toLowerCase().includes(term) ||
        b.customer_name?.toLowerCase().includes(term) ||
        b.experience_name?.toLowerCase().includes(term) ||
        b.customer_phone?.includes(term)
      );
    }
    return true;
  });

  const filteredBookings = calendarBookings.filter((b) => {
    if (!selectedDate) return true;
    const normalized = normalizeDateKey(b.booking_date) || normalizeDateKey(b.booking_date_formatted);
    return normalized === selectedDate;
  });

  const handleCreateForDate = (dateKey) => {
    setNewOrder((prev) => ({
      ...prev,
      booking_date: dateKey,
    }));
    setActiveTab("create_order");
  };

  const activeDetail =
    selectedBooking && filteredBookings.some((b) => b.id === selectedBooking.id)
      ? selectedBooking
      : filteredBookings[0] || null;

  const experienceOptions = experiences.map((exp) => ({
    value: String(exp.id),
    label: `${exp.name} (${formatMoney(exp.price)})`,
  }));

  const slotOptions = selectedExp.timeSlots.map((slot) => ({
    value: slot,
    label: slot,
  }));

  return (
    <div className="sr-page">
      <PageHeader
        title="Lịch & Đơn đặt"
        subtitle="Xác nhận đơn đặt, phân công hướng dẫn viên và theo dõi trạng thái thanh toán của khách."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-tabs" role="tablist" aria-label="Chế độ quản lý đơn đặt">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "list" && viewMode === "table"}
                onClick={() => {
                  setActiveTab("list");
                  setViewMode("table");
                }}
                className={`sr-tab ${activeTab === "list" && viewMode === "table" ? "is-selected" : ""}`}
              >
                Danh sách đơn đặt
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "list" && viewMode === "calendar"}
                onClick={() => {
                  setActiveTab("list");
                  setViewMode("calendar");
                }}
                className={`sr-tab ${activeTab === "list" && viewMode === "calendar" ? "is-selected" : ""}`}
              >
                Lịch khởi hành
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "create_order"}
                onClick={() => setActiveTab("create_order")}
                className={`sr-tab ${activeTab === "create_order" ? "is-selected" : ""}`}
              >
                {VENDOR_LABELS.CREATE_BOOKING}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("create_order")}
              className="sr-btn sr-btn-primary"
            >
              <Plus size={15} aria-hidden="true" />
              <span>{VENDOR_LABELS.CREATE_BOOKING}</span>
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div role="status" className="sr-callout sr-callout-moss justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="sr-btn sr-btn-sm sr-btn-ghost"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {activeTab === "create_order" ? (
        <form onSubmit={handleCreateOrderSubmit} className="sr-split-detail">
          <section className="sr-surface flex flex-col gap-5">
            <h2 className="sr-h2">Thông tin khách &amp; Chuyến khởi hành</h2>

            <div className="sr-field">
              <span className="sr-field-label">Chọn trải nghiệm</span>
              <SaasSelect
                label=""
                value={String(newOrder.experience_id)}
                options={experienceOptions}
                onChange={(val) => {
                  const chosen = experiences.find((e) => String(e.id) === String(val));
                  setNewOrder((prev) => ({
                    ...prev,
                    experience_id: chosen?.id ?? val,
                    time_slot: chosen?.timeSlots[0] || "06:00 - 10:30",
                  }));
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-date">Ngày khởi hành</label>
                <input
                  id="ord-date"
                  type="date"
                  className="sr-input"
                  value={newOrder.booking_date}
                  onChange={(e) => setNewOrder({ ...newOrder, booking_date: e.target.value })}
                />
              </div>
              <div className="sr-field">
                <span className="sr-field-label">Khung giờ</span>
                <SaasSelect
                  label=""
                  value={newOrder.time_slot}
                  options={slotOptions}
                  onChange={(val) => setNewOrder({ ...newOrder, time_slot: val })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-adults">Số người lớn</label>
                <input
                  id="ord-adults"
                  type="number"
                  min="1"
                  max="40"
                  className="sr-input"
                  value={newOrder.adults_count}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, adults_count: Number(e.target.value) })
                  }
                />
              </div>
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-children">Số trẻ em (70% giá)</label>
                <input
                  id="ord-children"
                  type="number"
                  min="0"
                  max="20"
                  className="sr-input"
                  value={newOrder.children_count}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, children_count: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-name">Họ tên khách hàng</label>
                <input
                  id="ord-name"
                  className="sr-input"
                  required
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                  placeholder="Nguyễn Minh Khoa"
                />
              </div>
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-phone">Số điện thoại</label>
                <input
                  id="ord-phone"
                  className="sr-input"
                  required
                  value={newOrder.customer_phone}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
                  placeholder="0905 412 889"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="ord-email">Email (không bắt buộc)</label>
                <input
                  id="ord-email"
                  type="email"
                  className="sr-input"
                  value={newOrder.customer_email}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_email: e.target.value })}
                  placeholder="khachhang@gmail.com"
                />
              </div>
              <div className="sr-field">
                <span className="sr-field-label">Trạng thái thanh toán</span>
                <SaasSelect
                  label=""
                  value={newOrder.payment_status}
                  options={PAYMENT_STATUS_OPTIONS}
                  onChange={(val) => setNewOrder({ ...newOrder, payment_status: val })}
                />
              </div>
            </div>

            <div className="sr-field">
              <label className="sr-field-label" htmlFor="ord-notes">Ghi chú đặc biệt</label>
              <textarea
                id="ord-notes"
                className="sr-textarea"
                rows={2}
                value={newOrder.special_notes}
                onChange={(e) => setNewOrder({ ...newOrder, special_notes: e.target.value })}
                placeholder="Dị ứng thực phẩm, yêu cầu gậy trekking, điểm đón..."
              />
            </div>
          </section>

          <aside className="sr-surface flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-3">
              <span className="sr-eyebrow">Tóm tắt đơn &amp; Quỹ bảo tồn</span>
              <h3 className="sr-h2">{selectedExp.name}</h3>
              <p className="text-xs text-[var(--sr-text-muted)]">
                {newOrder.booking_date.split("-").reverse().join("/")} · {newOrder.time_slot}
              </p>

              <div className="flex flex-col pt-2">
                <div className="sr-kv-row">
                  <span className="text-[var(--sr-text-secondary)]">
                    Người lớn ({newOrder.adults_count})
                  </span>
                  <strong className="sr-tabular">
                    {formatMoney(newOrder.adults_count * selectedExp.price)}
                  </strong>
                </div>
                {newOrder.children_count > 0 && (
                  <div className="sr-kv-row">
                    <span className="text-[var(--sr-text-secondary)]">
                      Trẻ em ({newOrder.children_count})
                    </span>
                    <strong className="sr-tabular">
                      {formatMoney(Math.round(newOrder.children_count * selectedExp.price * 0.7))}
                    </strong>
                  </div>
                )}
                <div className="sr-kv-row">
                  <span className="text-[var(--sr-text-secondary)]">
                    Trích Quỹ Bảo tồn Sơn Trà (10%)
                  </span>
                  <strong className="sr-tabular text-[var(--sr-accent-ink)]">
                    {formatMoney(esgContribution)}
                  </strong>
                </div>
                <div className="sr-kv-row">
                  <span className="font-semibold text-[var(--sr-text-primary)]">Tổng thanh toán</span>
                  <strong className="text-lg sr-tabular text-[var(--sr-text-primary)]">
                    {formatMoney(calculatedTotal)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="sr-btn sr-btn-secondary flex-1"
              >
                Quay lại
              </button>
              <button type="submit" disabled={submittingOrder} className="sr-btn sr-btn-primary flex-1">
                <Check size={15} aria-hidden="true" />
                <span>{submittingOrder ? "Đang tạo đơn..." : "Tạo đơn xác nhận"}</span>
              </button>
            </div>
          </aside>
        </form>
      ) : (
        <>
          <div className="sr-toolbar">
            <div className="sr-search-box !flex w-full md:w-80">
              <Search size={14} aria-hidden="true" />
              <input
                type="text"
                aria-label="Tìm mã đơn, tên khách hàng"
                placeholder="Tìm mã đơn, tên khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="sr-toolbar-group">
              <SaasSelect
                label="Trạng thái"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
              />
              {viewMode === "table" && (
                <>
                  <input
                    type="date"
                    aria-label="Lọc theo ngày khởi hành"
                    className="sr-input !w-auto !min-h-[2.125rem] !py-1"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate("")}
                      className="sr-btn sr-btn-sm sr-btn-ghost"
                    >
                      Xóa ngày
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {viewMode === "calendar" ? (
            <DepartureCalendar
              bookings={calendarBookings}
              loading={loading}
              selectedDateKey={calendarSelectedDate}
              onSelectDateKey={setCalendarSelectedDate}
              selectedBooking={selectedBooking}
              onSelectBooking={setSelectedBooking}
              onUpdateStatus={handleUpdateStatus}
              onCreateForDate={handleCreateForDate}
              statusBadgeMap={STATUS_BADGE_MAP}
              formatMoney={formatMoney}
            />
          ) : (
            <div className="sr-split-detail">
            <section className="sr-surface flex flex-col gap-4">
              {loading ? (
                <p role="status" className="py-10 text-center text-sm text-[var(--sr-text-muted)]">
                  Đang tải danh sách đơn đặt...
                </p>
              ) : filteredBookings.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <CalendarIcon size={24} className="text-[var(--sr-text-muted)]" aria-hidden="true" />
                  <p className="font-semibold text-[var(--sr-text-primary)]">
                    Không tìm thấy đơn đặt phù hợp
                  </p>
                  <p className="text-xs text-[var(--sr-text-muted)]">
                    Thử bỏ bộ lọc hoặc tạo đơn đặt chỗ mới cho khách.
                  </p>
                </div>
              ) : (
                <div className="sr-table-wrap">
                  <table className="sr-table">
                    <thead>
                      <tr>
                        <th scope="col">Mã đơn</th>
                        <th scope="col">Khách hàng &amp; Trải nghiệm</th>
                        <th scope="col" className="sr-hide-mobile">Khách</th>
                        <th scope="col">Tổng tiền</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => {
                        const [stLabel, stCls] =
                          STATUS_BADGE_MAP[b.status] || [
                            b.status_label || "Chưa rõ",
                            "sr-badge-neutral",
                          ];
                        const isSelected = activeDetail?.id === b.id;
                        return (
                          <tr
                            key={b.id}
                            onClick={() => setSelectedBooking(b)}
                            className={`cursor-pointer ${isSelected ? "is-selected" : ""}`}
                          >
                            <td className="font-semibold text-[var(--sr-accent-ink)] sr-tabular">
                              {b.order_code || `#${b.id}`}
                            </td>
                            <td>
                              <div className="font-semibold text-[var(--sr-text-primary)]">
                                {b.customer_name}
                              </div>
                              <div className="text-xs text-[var(--sr-text-muted)]">
                                {b.experience_name} ·{" "}
                                {b.booking_date_formatted || b.booking_date}
                              </div>
                            </td>
                            <td className="sr-hide-mobile sr-tabular">
                              {b.guests_label || `${(b.adults_count || 1) + (b.children_count || 0)} khách`}
                            </td>
                            <td className="sr-tabular font-semibold text-[var(--sr-text-primary)]">
                              {b.total_price_formatted || formatMoney(b.total_price)}
                            </td>
                            <td>
                              <div className="flex flex-col items-start gap-1">
                                <span className={`sr-badge ${stCls}`}>
                                  <span className="sr-badge-dot" aria-hidden="true" />
                                  <span>{stLabel}</span>
                                </span>
                                {b.refund_status && b.refund_status !== "none" && (
                                  <span
                                    className={`sr-badge ${
                                      (REFUND_BADGE_MAP[b.refund_status] || [])[1] || "sr-badge-neutral"
                                    }`}
                                  >
                                    <span className="sr-badge-dot" aria-hidden="true" />
                                    <span>
                                      {(REFUND_BADGE_MAP[b.refund_status] || [])[0] ||
                                        b.refund_status_label ||
                                        b.refund_status}
                                    </span>
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
              )}
            </section>

            {/* Right Inspector */}
            {activeDetail && (
              <aside className="sr-surface flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="sr-eyebrow">Chi tiết đơn đặt</span>
                      <h2 className="sr-h2 mt-1">
                        {activeDetail.order_code || `#${activeDetail.id}`} ·{" "}
                        {activeDetail.customer_name}
                      </h2>
                    </div>
                    <span
                      className={`sr-badge ${
                        (STATUS_BADGE_MAP[activeDetail.status] || [])[1] || "sr-badge-neutral"
                      }`}
                    >
                      <span className="sr-badge-dot" aria-hidden="true" />
                      <span>
                        {(STATUS_BADGE_MAP[activeDetail.status] || [])[0] ||
                          activeDetail.status_label}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <div className="sr-kv-row">
                      <span className="text-[var(--sr-text-muted)]">Trải nghiệm</span>
                      <strong className="text-right text-[var(--sr-text-primary)]">
                        {activeDetail.experience_name}
                      </strong>
                    </div>
                    <div className="sr-kv-row">
                      <span className="text-[var(--sr-text-muted)]">Khởi hành</span>
                      <strong className="sr-tabular">
                        {activeDetail.booking_date_formatted || activeDetail.booking_date} ·{" "}
                        {activeDetail.time_slot || "06:00"}
                      </strong>
                    </div>
                    <div className="sr-kv-row">
                      <span className="text-[var(--sr-text-muted)]">Số lượng</span>
                      <strong>{activeDetail.guests_label || "2 khách"}</strong>
                    </div>
                    <div className="sr-kv-row">
                      <span className="text-[var(--sr-text-muted)] inline-flex items-center gap-1">
                        <Phone size={12} aria-hidden="true" /> Điện thoại
                      </span>
                      <strong className="sr-tabular">{activeDetail.customer_phone || "Chưa có"}</strong>
                    </div>
                    <div className="sr-kv-row">
                      <span className="text-[var(--sr-text-muted)] inline-flex items-center gap-1">
                        <Mail size={12} aria-hidden="true" /> Email
                      </span>
                      <strong className="truncate max-w-[14rem]">
                        {activeDetail.customer_email || "Chưa có"}
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-[var(--sr-radius-md)] border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-3.5 flex flex-col gap-2 text-xs">
                    <strong className="text-[var(--sr-text-primary)]">
                      Tạm tính &amp; Minh bạch quỹ ESG
                    </strong>
                    <div className="flex justify-between">
                      <span className="text-[var(--sr-text-secondary)]">Tổng giá trị đơn</span>
                      <strong className="sr-tabular">
                        {activeDetail.total_price_formatted || formatMoney(activeDetail.total_price)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sr-text-secondary)]">Thanh toán</span>
                      <strong>{activeDetail.payment_status_label || VENDOR_LABELS.PAYMENT_PAID}</strong>
                    </div>
                    {activeDetail.refund_status && activeDetail.refund_status !== "none" && (
                      <div className="flex justify-between">
                        <span className="text-[var(--sr-text-secondary)]">Hoàn tiền</span>
                        <strong>
                          {(REFUND_BADGE_MAP[activeDetail.refund_status] || [])[0] ||
                            activeDetail.refund_status_label}
                        </strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[var(--sr-text-secondary)]">
                        Trích Quỹ Bảo tồn (10%)
                      </span>
                      <strong className="sr-tabular text-[var(--sr-accent-ink)]">
                        {formatMoney(Math.round(Number(activeDetail.total_price || 0) * 0.1))}
                      </strong>
                    </div>
                  </div>
                </div>

                {activeDetail.status !== "cancelled" && activeDetail.status !== "completed" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sr-border)] pt-4">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(activeDetail.id, "cancelled")}
                      className="sr-btn sr-btn-destructive"
                    >
                      <XCircle size={15} aria-hidden="true" />
                      <span>Hủy đơn</span>
                    </button>

                    {activeDetail.status === "waiting_confirmation" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeDetail.id, "confirmed")}
                        className="sr-btn sr-btn-primary flex-1"
                      >
                        <Check size={15} aria-hidden="true" />
                        <span>Xác nhận đơn</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(activeDetail.id, "completed")}
                        className="sr-btn sr-btn-primary flex-1"
                      >
                        <UserCheck size={15} aria-hidden="true" />
                        <span>Đánh dấu hoàn thành</span>
                      </button>
                    )}
                  </div>
                )}
              </aside>
            )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorBookingsPage;
