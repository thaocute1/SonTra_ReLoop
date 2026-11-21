import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Compass,
  MessageSquare,
  Phone,
  Radio,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { api } from "../../lib/axios";

export const VendorInboxPage = () => {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tripDetail, setTripDetail] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [inputMessage, setInputMessage] = useState("");
  const [messageType, setMessageType] = useState("text");

  const messagesContainerRef = useRef(null);
  const vendorName = localStorage.getItem("user_name")?.trim() || "Đối tác Sơn Trà";

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const fetchTrips = async (isInitial = false) => {
    if (isInitial) setLoadingTrips(true);
    try {
      const res = await api.get("/vendors/inbox/trips/");
      if (res.data?.status === "success") {
        const list = res.data.data || [];
        setTrips(list);
        if (list.length > 0 && (!selectedTrip || isInitial)) {
          setSelectedTrip(list[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching trip channels:", err);
    } finally {
      if (isInitial) setLoadingTrips(false);
    }
  };

  const fetchMessages = async (trip, showSpinner = false) => {
    if (!trip) return;
    if (showSpinner) setLoadingMessages(true);
    try {
      const res = await api.get(
        `/vendors/inbox/messages/?tour_id=${trip.tour_id}&date=${trip.scheduled_date}`
      );
      if (res.data?.status === "success") {
        setMessages(res.data.data.messages || []);
        setTripDetail(res.data.data.trip || null);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTrips(true);
  }, []);

  useEffect(() => {
    if (selectedTrip) fetchMessages(selectedTrip, true);
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip) return undefined;
    const interval = window.setInterval(() => {
      fetchMessages(selectedTrip, false);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedTrip]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedTrip || sending) return;

    const textToSend = inputMessage.trim();
    const typeToSend = messageType;
    setInputMessage("");
    setSending(true);

    const optimisticMsg = {
      id: Date.now(),
      sender_id: 9999,
      sender_name: vendorName,
      sender_role: "guide",
      sender_role_label: "Điều hành viên",
      content: textToSend,
      message_type: typeToSend,
      created_at: new Date().toISOString(),
      time_formatted: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      is_me: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post("/vendors/inbox/messages/", {
        tour_id: selectedTrip.tour_id,
        scheduled_date: selectedTrip.scheduled_date,
        content: textToSend,
        message_type: typeToSend,
      });
      if (res.data?.status === "success") {
        fetchMessages(selectedTrip, false);
        fetchTrips(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
      setMessageType("text");
    }
  };

  const filteredTrips = trips.filter((t) => {
    const matchesSearch = (t.tour_title || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === "today") return t.is_today;
    if (filterTab === "upcoming") return !t.is_today;
    return true;
  });

  const rosterPassengers = tripDetail?.passengers || selectedTrip?.passengers || [];

  return (
    <div className="sr-chat-shell">
      {/* Left Channels Rail */}
      <aside className="sr-chat-rail flex flex-col gap-3" aria-label="Danh sách kênh chuyến đi">
        <div className="sr-search-box !flex !w-full">
          <Search size={14} aria-hidden="true" />
          <input
            type="text"
            aria-label="Tìm chuyến khởi hành"
            placeholder="Tìm chuyến khởi hành..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sr-tabs" role="tablist" aria-label="Lọc kênh chuyến đi">
          {[
            ["all", "Tất cả"],
            ["today", "Hôm nay"],
            ["upcoming", "Sắp tới"],
          ].map(([key, lbl]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filterTab === key}
              onClick={() => setFilterTab(key)}
              className={`sr-tab flex-1 ${filterTab === key ? "is-selected" : ""}`}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="sr-activity-list">
          {loadingTrips ? (
            <p className="py-6 text-center text-xs text-[var(--sr-text-muted)]" role="status">
              Đang tải kênh chuyến đi...
            </p>
          ) : filteredTrips.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--sr-text-muted)]">
              Chưa có kênh chuyến đi nào.
            </p>
          ) : (
            filteredTrips.map((trip) => {
              const active =
                selectedTrip?.tour_id === trip.tour_id &&
                selectedTrip?.scheduled_date === trip.scheduled_date;
              return (
                <button
                  key={`${trip.tour_id}-${trip.scheduled_date}`}
                  type="button"
                  onClick={() => setSelectedTrip(trip)}
                  className={`sr-activity-row px-2 rounded-[var(--sr-radius-sm)] ${
                    active ? "bg-[var(--sr-bg-surface)]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--sr-text-primary)] truncate">
                      {trip.tour_title}
                    </p>
                    <p className="text-xs text-[var(--sr-text-muted)] truncate mt-0.5">
                      {trip.scheduled_date_formatted || trip.scheduled_date} ·{" "}
                      {trip.total_guests || 0} khách
                    </p>
                  </div>
                  {trip.unread_count > 0 && (
                    <span className="sr-badge sr-badge-moss shrink-0">{trip.unread_count}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Center Dispatch Stream */}
      <section className="sr-chat-stream-wrap" aria-label="Luồng hội thoại điều hành">
        {!selectedTrip ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
            <MessageSquare size={28} className="text-[var(--sr-text-muted)]" aria-hidden="true" />
            <p className="font-semibold text-[var(--sr-text-primary)]">
              Chọn một kênh chuyến đi để bắt đầu điều hành
            </p>
            <p className="text-xs text-[var(--sr-text-muted)]">
              Trao đổi trực tiếp với khách hàng, gửi ghi chú cho HDV hoặc phát cảnh báo thực địa.
            </p>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)] px-5 py-3.5">
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-[var(--sr-text-primary)] truncate">
                  {selectedTrip.tour_title} ·{" "}
                  {selectedTrip.scheduled_date_formatted || selectedTrip.scheduled_date}
                </h1>
                <p className="text-xs text-[var(--sr-text-muted)]">
                  {selectedTrip.total_guests || 0} khách xác nhận
                  {selectedTrip.guide_name ? ` · HDV ${selectedTrip.guide_name}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="sr-badge sr-badge-moss hidden sm:inline-flex">
                  <Radio size={12} aria-hidden="true" />
                  <span>Đồng bộ app HDV</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchMessages(selectedTrip, true)}
                  aria-label="Làm mới tin nhắn"
                  className="sr-btn sr-btn-sm sr-btn-secondary"
                >
                  <RefreshCw size={14} className={loadingMessages ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => setRosterOpen((v) => !v)}
                  className="sr-btn sr-btn-sm sr-btn-secondary lg:hidden"
                >
                  <Users size={14} aria-hidden="true" />
                  <span>Danh sách đoàn</span>
                </button>
              </div>
            </header>

            <div ref={messagesContainerRef} className="sr-chat-messages">
              {loadingMessages && messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--sr-text-muted)]" role="status">
                  Đang tải hội thoại...
                </p>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--sr-text-muted)]">
                  Chưa có tin nhắn nào trong chuyến này. Hãy gửi lời chào hoặc nhắc lịch tập kết.
                </p>
              ) : (
                messages.map((msg) => {
                  const isAlert = msg.message_type === "bql_alert";
                  const isGuideNote = msg.message_type === "guide_note";
                  const calloutClass = isAlert
                    ? "sr-callout sr-callout-urgent flex-col gap-1.5"
                    : isGuideNote
                      ? "sr-callout sr-callout-moss flex-col gap-1.5"
                      : "sr-callout flex-col gap-1.5";

                  return (
                    <article key={msg.id} className={calloutClass}>
                      <div className="flex w-full items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          {isAlert && <AlertTriangle size={14} aria-hidden="true" />}
                          {isGuideNote && <Compass size={14} aria-hidden="true" />}
                          <span>
                            {isAlert
                              ? `Cảnh báo thực địa · ${msg.sender_name}`
                              : isGuideNote
                                ? `Ghi chú HDV · ${msg.sender_name}`
                                : `${msg.sender_name}${msg.sender_role_label ? ` (${msg.sender_role_label})` : ""}`}
                          </span>
                        </span>
                        <span className="text-[var(--sr-text-muted)] sr-tabular">
                          {msg.time_formatted}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--sr-text-primary)]">{msg.content}</p>
                    </article>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="sr-chat-composer flex-col !items-stretch">
              <div className="sr-tabs" role="group" aria-label="Loại thông điệp">
                {[
                  ["text", "Tin nhắn khách"],
                  ["guide_note", "Ghi chú HDV"],
                  ["bql_alert", "Cảnh báo an toàn"],
                ].map(([typeKey, label]) => (
                  <button
                    key={typeKey}
                    type="button"
                    aria-pressed={messageType === typeKey}
                    onClick={() => setMessageType(typeKey)}
                    className={`sr-tab ${messageType === typeKey ? "is-selected" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  className="sr-input flex-1"
                  aria-label="Nội dung tin nhắn điều hành"
                  placeholder="Nhập thông báo điều hành cho đoàn hoặc hướng dẫn viên..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={sending || !inputMessage.trim()}
                  className="sr-btn sr-btn-primary"
                >
                  <Send size={14} aria-hidden="true" />
                  <span>Gửi tin</span>
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* Right Roster Panel */}
      <aside
        className={`sr-inbox-roster ${rosterOpen ? "is-open" : ""}`}
        aria-label="Danh sách đoàn & điểm danh"
      >
        <div className="flex items-center justify-between">
          <h2 className="sr-h2">Danh sách đoàn ({rosterPassengers.length})</h2>
        </div>

        {selectedTrip && (
          <div className="rounded-[var(--sr-radius-md)] border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] p-3 flex flex-col gap-1 text-xs">
            <span className="font-semibold text-[var(--sr-accent-ink)]">HDV phụ trách</span>
            <strong className="text-[var(--sr-text-primary)]">
              {selectedTrip.guide_name || "Đang phân công"}
            </strong>
            {selectedTrip.guide_phone && (
              <span className="inline-flex items-center gap-1 text-[var(--sr-text-muted)]">
                <Phone size={12} aria-hidden="true" />
                {selectedTrip.guide_phone}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col">
          {rosterPassengers.length === 0 ? (
            <p className="text-xs text-[var(--sr-text-muted)]">
              Chưa có danh sách hành khách chi tiết cho chuyến này.
            </p>
          ) : (
            rosterPassengers.map((p, idx) => (
              <div key={p.id || idx} className="sr-kv-row flex-col !items-start gap-0.5">
                <span className="font-semibold text-[var(--sr-text-primary)]">
                  {p.name || p.customer_name}
                </span>
                <span className="text-xs text-[var(--sr-text-muted)]">
                  {p.order_code || ""} {p.checkin_status ? `· ${p.checkin_status}` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default VendorInboxPage;
