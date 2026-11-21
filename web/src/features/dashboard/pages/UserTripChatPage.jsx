import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Paperclip, Pin, Search, Send } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";

export const UserTripChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetTourId = searchParams.get("tour_id");
  const targetDate = searchParams.get("date");

  const { user } = useUserEco();
  const currentUserId = user?.id || null;
  const currentUserName = user?.name || user?.email?.split("@")[0] || "Du khách";

  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tripDetail, setTripDetail] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const fetchUserTrips = async (isInitial = false) => {
    if (isInitial) setLoadingTrips(true);
    try {
      const res = await api.get("/tours/inbox/trips/", {
        params: { customer_id: currentUserId, email: user?.email },
      });
      if (res.data && res.data.status === "success") {
        const list = res.data.data || [];
        setTrips(list);
        if (list.length > 0) {
          if (targetTourId) {
            const matched = list.find(
              (t) =>
                String(t.tour_id) === String(targetTourId) &&
                (!targetDate || t.scheduled_date === targetDate)
            );
            if (matched) {
              setSelectedTrip(matched);
              return;
            }
          }
          if (!selectedTrip || isInitial) {
            setSelectedTrip(list[0]);
          }
        }
      }
    } catch {
      // Keep UI usable when offline
    } finally {
      if (isInitial) setLoadingTrips(false);
    }
  };

  const fetchMessages = async (trip, showSpinner = false) => {
    if (!trip) return;
    if (showSpinner) setLoadingMessages(true);
    try {
      const res = await api.get("/tours/inbox/messages/", {
        params: { tour_id: trip.tour_id, date: trip.scheduled_date },
      });
      if (res.data && res.data.status === "success") {
        setMessages(res.data.data.messages || []);
        setTripDetail(res.data.data.trip || null);
      }
    } catch {
      // Ignore polling error
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchUserTrips(true);
  }, [currentUserId]);

  useEffect(() => {
    if (selectedTrip) fetchMessages(selectedTrip, true);
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip) return undefined;
    const interval = window.setInterval(() => fetchMessages(selectedTrip, false), 5000);
    return () => window.clearInterval(interval);
  }, [selectedTrip]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (event) => {
    if (event) event.preventDefault();
    if (!inputMessage.trim() || !selectedTrip || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    const optimisticMsg = {
      id: Date.now(),
      sender_id: currentUserId || 9999,
      sender_name: currentUserName,
      sender_role_label: "Du khách",
      content: textToSend,
      time_formatted: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      is_me: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post("/tours/inbox/messages/", {
        tour_id: selectedTrip.tour_id,
        scheduled_date: selectedTrip.scheduled_date,
        content: textToSend,
        message_type: "text",
        sender_id: currentUserId,
      });
      if (res.data && res.data.status === "success") {
        fetchMessages(selectedTrip, false);
        fetchUserTrips(false);
      }
    } catch {
      // Keep optimistic message visible
    } finally {
      setSending(false);
    }
  };

  const filteredTrips = trips.filter((t) =>
    (t.tour_title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sr-chat-shell">
      {/* Left Rail: Channels & Booked Trips */}
      <aside className="sr-chat-rail flex flex-col gap-5" aria-label="Danh sách phòng chat">
        <div className="flex items-center gap-2 px-2.5 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-[var(--sr-text-muted)]">
          <Search size={13} aria-hidden="true" />
          <input
            type="text"
            aria-label="Tìm kênh hoặc chuyến đi"
            placeholder="Tìm kênh, chuyến đi"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-[var(--sr-text-primary)] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="px-2 text-xs font-medium text-[var(--sr-text-muted)]">
            Phòng chat chuyến đi
          </span>
          {loadingTrips ? (
            <span className="px-2 py-2 text-xs text-[var(--sr-text-muted)]">Đang tải...</span>
          ) : filteredTrips.length === 0 ? (
            <div className="px-2 py-2 flex flex-col gap-2">
              <span className="text-xs text-[var(--sr-text-muted)]">
                Bạn chưa tham gia phòng chat chuyến đi nào.
              </span>
              <button
                type="button"
                className="sr-btn sr-btn-secondary sr-btn-sm"
                onClick={() => navigate("/dashboard/trekking")}
              >
                Đặt chuyến ngay
              </button>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isSelected =
                selectedTrip?.tour_id === trip.tour_id &&
                selectedTrip?.scheduled_date === trip.scheduled_date;
              return (
                <button
                  key={`${trip.tour_id}-${trip.scheduled_date}`}
                  type="button"
                  onClick={() => setSelectedTrip(trip)}
                  className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border-0 text-left cursor-pointer ${
                    isSelected
                      ? "bg-[var(--sr-bg-subtle)] text-[var(--sr-text-primary)] font-semibold"
                      : "bg-transparent text-[var(--sr-text-secondary)] hover:bg-[var(--sr-bg-hover)]"
                  }`}
                >
                  <span className="text-xs truncate w-full">{trip.tour_title}</span>
                  <span className="text-[var(--text-xs)] text-[var(--sr-text-muted)] sr-tabular">
                    {trip.scheduled_date}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Center Column: Conversation Stream */}
      <section className="sr-chat-stream-wrap" aria-label="Luồng hội thoại">
        <header className="px-6 h-14 flex items-center justify-between border-b border-[var(--sr-border)]">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--sr-text-primary)] m-0 truncate">
              {selectedTrip ? selectedTrip.tour_title : "Cộng đồng Sơn Trà ReLoop"}
            </h1>
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              {selectedTrip
                ? `Khởi hành ${selectedTrip.scheduled_date} · Kênh trao đổi cùng hướng dẫn viên`
                : "Chọn một chuyến đi bên trái để xem tin nhắn đoàn"}
            </p>
          </div>
          {selectedTrip && (
            <button
              type="button"
              className="sr-btn sr-btn-ghost sr-btn-sm"
              onClick={() => navigate(`/dashboard/trekking/${selectedTrip.tour_id}`)}
            >
              Xem tuyến
            </button>
          )}
        </header>

        <div ref={messagesContainerRef} className="sr-chat-messages">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--sr-bg-page)] text-xs text-[var(--sr-text-secondary)]">
            <Pin size={14} className="text-[var(--sr-accent)] shrink-0" aria-hidden="true" />
            <span>
              Vui lòng có mặt tại điểm tập kết trước giờ khởi hành 15 phút và mang theo giày bám tốt.
            </span>
          </div>

          {loadingMessages ? (
            <div className="text-xs text-[var(--sr-text-muted)]">Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-[var(--sr-text-muted)] py-8 text-center">
              Chưa có tin nhắn nào trong phòng chat này. Hãy gửi lời chào tới đoàn và hướng dẫn viên.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[var(--sr-bg-subtle)] text-[var(--sr-accent)] text-xs font-semibold flex items-center justify-center shrink-0">
                  {(msg.sender_name || "ST").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      {msg.sender_name || "Thành viên"}
                    </span>
                    <span className="text-[var(--text-xs)] text-[var(--sr-text-muted)] sr-tabular">
                      {msg.time_formatted || ""}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--sr-text-secondary)] m-0 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="sr-chat-composer" onSubmit={handleSendMessage}>
          <div className="flex items-center gap-2 flex-1 h-10 px-3 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)]">
            <input
              type="text"
              aria-label="Nhập tin nhắn"
              placeholder={
                selectedTrip
                  ? `Nhắn tin tới đoàn ${selectedTrip.tour_title}`
                  : "Chọn chuyến đi để bắt đầu trò chuyện"
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={!selectedTrip || sending}
              className="w-full bg-transparent border-0 text-sm text-[var(--sr-text-primary)] outline-none"
            />
            <Paperclip size={15} className="text-[var(--sr-text-muted)] shrink-0" aria-hidden="true" />
          </div>
          <button
            type="submit"
            className="sr-btn sr-btn-primary"
            disabled={!selectedTrip || !inputMessage.trim() || sending}
          >
            <Send size={14} aria-hidden="true" />
            <span>Gửi</span>
          </button>
        </form>
      </section>

      {/* Right Column: Trip Summary */}
      <aside className="sr-chat-info-rail hidden lg:flex flex-col gap-5" aria-label="Thông tin đoàn">
        <div>
          <h2 className="text-xs font-semibold text-[var(--sr-text-primary)] m-0 mb-2">
            Thông tin chuyến đi
          </h2>
          {selectedTrip ? (
            <div className="flex flex-col gap-1 pb-4 border-b border-[var(--sr-border)]">
              <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
                {selectedTrip.tour_title}
              </div>
              <div className="text-xs text-[var(--sr-text-secondary)] sr-tabular">
                Khởi hành: {selectedTrip.scheduled_date}
              </div>
              {tripDetail?.guide_name && (
                <div className="text-xs text-[var(--sr-accent)] font-medium">
                  HDV: {tripDetail.guide_name}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Chọn một phòng chat để xem lịch trình và thành viên đoàn.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default UserTripChatPage;
