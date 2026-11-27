import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  Languages,
  Mail,
  Paperclip,
  Phone,
  Pin,
  Search,
  Send,
  ShieldAlert,
  Star,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";

const normalizeDateParam = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return trimmed;
};

function GuideProfileCard({ guide, fallbackName, fallbackPhone }) {
  const name = guide?.name || fallbackName || "Đang phân công HDV";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "HD";
  const phone = guide?.phone || fallbackPhone || "Đang cập nhật";
  const languages = Array.isArray(guide?.languages) ? guide.languages : [];
  const hasAssigned = Boolean(guide?.is_assigned_guide);
  const expYears = Number(guide?.experience_years || 0);
  const rating = Number(guide?.avg_rating || 0);

  return (
    <div className="rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] p-3.5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {guide?.avatar_url ? (
          <img
            src={guide.avatar_url}
            alt={name}
            className="w-11 h-11 rounded-full object-cover border border-[var(--sr-border)] shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] font-bold text-sm flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <strong className="text-sm text-[var(--sr-text-primary)] truncate">{name}</strong>
            {hasAssigned && (
              <BadgeCheck size={14} className="text-[var(--sr-accent)] shrink-0" aria-label="HDV đã xác minh" />
            )}
          </div>
          <p className="text-[11px] font-medium text-[var(--sr-accent-ink)] m-0">
            {guide?.role_label || (hasAssigned ? "Hướng Dẫn Viên Phụ Trách" : "Điều Hành Đơn Vị")}
          </p>
          {guide?.brand && (
            <p className="text-[11px] text-[var(--sr-text-muted)] m-0 truncate">{guide.brand}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {hasAssigned && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-2 py-0.5 text-[var(--sr-text-secondary)]">
            <Star
              size={11}
              className={rating > 0 ? "text-amber-500 fill-amber-400" : "text-stone-400"}
              aria-hidden="true"
            />
            <span>
              {rating > 0
                ? `${rating.toFixed(1)} / 5.0${guide?.total_reviews ? ` (${guide.total_reviews})` : ""}`
                : "HDV mới"}
            </span>
          </span>
        )}
        {expYears > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-2 py-0.5 text-[var(--sr-text-secondary)] sr-tabular">
            <Award size={11} className="text-[var(--sr-accent)]" aria-hidden="true" />
            <span>{expYears} năm KN</span>
          </span>
        )}
        {guide?.license_number && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-2 py-0.5 text-[var(--sr-text-secondary)] font-mono">
            Thẻ: {guide.license_number}
          </span>
        )}
      </div>

      {Array.isArray(guide?.top_tags) && guide.top_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {guide.top_tags.map((item) => (
            <span
              key={item.tag}
              className="rounded-full border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--sr-accent-ink)]"
            >
              {item.tag} ({item.count})
            </span>
          ))}
        </div>
      )}

      {languages.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-[var(--sr-text-secondary)]">
          <Languages size={13} className="text-[var(--sr-accent)] mt-0.5 shrink-0" aria-hidden="true" />
          <span>Ngôn ngữ: {languages.join(", ")}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--sr-border)] text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[var(--sr-text-muted)]">
            <Phone size={12} aria-hidden="true" />
            <span>Điện thoại</span>
          </span>
          {phone && phone !== "Đang cập nhật" ? (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="font-semibold text-[var(--sr-accent)] hover:underline sr-tabular"
            >
              {phone}
            </a>
          ) : (
            <span className="text-[var(--sr-text-muted)]">Đang cập nhật</span>
          )}
        </div>
        {guide?.email && (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[var(--sr-text-muted)] shrink-0">
              <Mail size={12} aria-hidden="true" />
              <span>Email</span>
            </span>
            <a
              href={`mailto:${guide.email}`}
              className="text-[var(--sr-text-secondary)] hover:underline truncate"
            >
              {guide.email}
            </a>
          </div>
        )}
      </div>

      {!hasAssigned && (
        <p className="text-[11px] text-[var(--sr-text-muted)] m-0 leading-relaxed">
          Đơn vị tổ chức chưa gắn hướng dẫn viên riêng cho ngày này — bạn đang kết nối trực tiếp với điều hành viên phụ trách tuyến.
        </p>
      )}
    </div>
  );
}

export const UserTripChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetTourId = searchParams.get("tour_id");
  const targetDate = normalizeDateParam(searchParams.get("date"));

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
  const [sendError, setSendError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [guideModalOpen, setGuideModalOpen] = useState(false);
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
    setSendError("");
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
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInputMessage(textToSend);
        setSendError(res.data?.message || "Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputMessage(textToSend);
      setSendError(err?.response?.data?.message || "Gửi tin nhắn thất bại. Vui lòng kiểm tra kết nối và thử lại.");
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="sr-btn sr-btn-secondary sr-btn-sm"
                onClick={() => setGuideModalOpen(true)}
              >
                <UserCheck size={14} aria-hidden="true" />
                <span>Thông tin HDV</span>
              </button>
              <button
                type="button"
                className="sr-btn sr-btn-ghost sr-btn-sm"
                onClick={() => navigate(`/dashboard/trekking/${selectedTrip.tour_id}`)}
              >
                Xem tuyến
              </button>
            </div>
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

        {sendError && (
          <div role="alert" className="px-4 py-2 text-xs text-[var(--sr-urgent-ink)] bg-[var(--sr-urgent-soft)] border-t border-[var(--sr-border)]">
            {sendError}
          </div>
        )}
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

      {/* Right Column: Trip & Guide Summary */}
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
                Khởi hành: {tripDetail?.date_formatted || selectedTrip.date_formatted || selectedTrip.scheduled_date}
                {tripDetail?.time_slot ? ` (${tripDetail.time_slot})` : ""}
              </div>
              {tripDetail?.total_members && (
                <div className="text-xs text-[var(--sr-text-muted)] sr-tabular">
                  Thành viên đoàn: {tripDetail.total_members} người
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--sr-text-muted)] m-0">
              Chọn một phòng chat để xem lịch trình và thông tin hướng dẫn viên.
            </p>
          )}
        </div>

        {selectedTrip && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-[var(--sr-text-primary)] m-0">
              Hướng dẫn viên phụ trách
            </h2>
            <GuideProfileCard
              guide={tripDetail?.guide}
              fallbackName={selectedTrip.guide_name}
              fallbackPhone={selectedTrip.guide_phone}
            />
          </div>
        )}

        {selectedTrip && tripDetail?.bql && (
          <div className="rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] p-3 flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--sr-text-primary)]">
              <ShieldAlert size={13} className="text-[var(--sr-accent)]" aria-hidden="true" />
              <span>{tripDetail.bql.role_label || "Trực Ban Kiểm Lâm"}</span>
            </div>
            <span className="text-[var(--sr-text-secondary)]">{tripDetail.bql.name}</span>
            {tripDetail.bql.sos_hotline && (
              <span className="text-[11px] text-[var(--sr-text-muted)] sr-tabular">
                SOS: {tripDetail.bql.sos_hotline}
              </span>
            )}
          </div>
        )}
      </aside>

      {/* Modal xem chi tiết HDV (hỗ trợ cả mobile / tablet khi cột phải bị ẩn) */}
      {guideModalOpen && selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGuideModalOpen(false);
          }}
        >
          <div className="sr-surface w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 id="guide-modal-title" className="sr-h2 m-0">
                  Thông tin hướng dẫn viên
                </h2>
                <p className="text-xs text-[var(--sr-text-muted)] m-0">
                  {selectedTrip.tour_title} · {tripDetail?.date_formatted || selectedTrip.scheduled_date}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng thông tin hướng dẫn viên"
                className="sr-btn sr-btn-secondary sr-btn-sm"
                onClick={() => setGuideModalOpen(false)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <GuideProfileCard
              guide={tripDetail?.guide}
              fallbackName={selectedTrip.guide_name}
              fallbackPhone={selectedTrip.guide_phone}
            />

            {tripDetail?.bql && (
              <div className="rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-3 flex flex-col gap-1 text-xs">
                <strong className="text-[var(--sr-text-primary)]">
                  {tripDetail.bql.role_label || "Trực Ban Kiểm Lâm"}
                </strong>
                <span className="text-[var(--sr-text-secondary)]">{tripDetail.bql.name}</span>
                {tripDetail.bql.sos_hotline && (
                  <span className="text-[var(--sr-text-muted)] sr-tabular">
                    Hotline SOS: {tripDetail.bql.sos_hotline}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTripChatPage;
