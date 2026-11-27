import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, MessageSquare, RefreshCw, Send, Sparkles } from "lucide-react";
import { useChat } from "../../../hooks/useChat";
import { difficultyLabel } from "../../../lib/chatMessage";
import AssistantParts from "../components/AssistantParts";
import TourDraftCard from "../components/TourDraftCard";

const TOUR_CARD_FALLBACK_IMAGE = "/images/trails/dinh-ban-co.jpg";
const PROMPT_STARTERS = [
  "Gợi ý tour nửa ngày cho nhóm 4 người dưới 450.000 đ",
  "Tuyến nào phù hợp cho người mới bắt đầu?",
  "Cách áp dụng voucher cùng điểm RE-Points",
];

function formatSessionTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function ReLoopAssistantPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const { messages, isLoading, sessions, sessionsLoading, sendMessage, selectSession, resetChat, sessionId } = useChat();
  const historyEndRef = useRef(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = (event) => {
    if (event) event.preventDefault();
    if (!draft.trim() || isLoading) return;
    sendMessage(draft);
    setDraft("");
  };

  return (
    <div className="sr-chat-shell">
      {/* Secondary Conversation History Sidebar */}
      <aside className="sr-chat-rail hidden lg:flex flex-col gap-3" aria-label="Lịch sử hội thoại">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--sr-text-muted)]">Hội thoại gần đây</span>
          <button
            type="button"
            className="sr-btn sr-btn-ghost sr-btn-sm"
            aria-label="Cuộc trò chuyện mới"
            onClick={resetChat}
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>

        {sessionsLoading && sessions.length === 0 ? (
          <p className="text-xs text-[var(--sr-text-muted)] px-1 py-1">Đang tải hội thoại…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-[var(--sr-text-muted)] px-1 py-1">Chưa có hội thoại nào.</p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {sessions.map((session) => {
              const active = session.session_id === sessionId;
              return (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => selectSession(session.session_id)}
                  aria-current={active ? "true" : undefined}
                  className={`px-2.5 py-2 rounded-lg text-left text-xs border-0 cursor-pointer ${
                    active
                      ? "bg-[var(--sr-bg-subtle)] font-semibold text-[var(--sr-text-primary)]"
                      : "bg-transparent hover:bg-[var(--sr-bg-hover)] text-[var(--sr-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={12} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{session.title || "Cuộc hội thoại"}</span>
                  </span>
                  <span className="block text-[10px] text-[var(--sr-text-muted)] mt-0.5 pl-[18px]">
                    {formatSessionTime(session.last_message_at)}
                    {session.turn_count ? ` · ${session.turn_count} lượt` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Spacious Centered AI Conversation Canvas */}
      <section className="sr-ai-canvas" aria-label="Trợ lý AI REloop">
        <div className="flex-1 overflow-y-auto">
          <div className="sr-ai-column">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[var(--sr-accent-soft)] text-[var(--sr-accent)] inline-flex items-center justify-center">
                  <Sparkles size={13} aria-hidden="true" />
                </span>
                <h1 className="text-sm font-semibold m-0">Trợ lý AI REloop</h1>
              </div>
              <button
                type="button"
                className="sr-btn sr-btn-secondary sr-btn-sm"
                onClick={resetChat}
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Cuộc trò chuyện mới</span>
              </button>
            </div>

            {/* Welcome Editorial Response (borderless, integrated photography) */}
            <article className="flex flex-col gap-4">
              <p className="text-sm text-[var(--sr-text-primary)] leading-relaxed m-0">
                Mình có thể gợi ý tuyến trekking Sơn Trà theo thể lực, ngân sách, thời tiết và giúp bạn kiểm tra ưu đãi hiện có.
              </p>

              <div className="sr-ai-tour-grid">
                {[
                  {
                    id: 1,
                    title: "Đỉnh Bàn Cờ: Rừng sương sớm",
                    meta: "4.2 km · 2.5 giờ · Mức Khá",
                    price: "382.500 đ / người",
                    img: "/images/trails/dinh-ban-co.jpg",
                  },
                  {
                    id: 2,
                    title: "Bãi Bấc: Cây Đa Di Sản",
                    meta: "3.1 km · 2.0 giờ · Mức Dễ",
                    price: "320.000 đ / người",
                    img: "/images/trails/bai-bac.jpg",
                  },
                ].map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => navigate(`/dashboard/trekking/${sample.id}`)}
                    className="flex flex-col gap-2 cursor-pointer"
                  >
                    <img
                      src={sample.img}
                      alt={sample.title}
                      className="w-full h-36 object-cover rounded-xl bg-[var(--sr-bg-subtle)]"
                    />
                    <div className="font-semibold text-sm text-[var(--sr-text-primary)]">
                      {sample.title}
                    </div>
                    <div className="text-xs text-[var(--sr-text-muted)]">{sample.meta}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-semibold sr-tabular">{sample.price}</span>
                      <span className="text-xs font-medium text-[var(--sr-accent)]">
                        Đặt tuyến này
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Live Messages from useChat */}
            {messages.map((msg, messageIndex) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-lg px-4 py-3 rounded-xl bg-[var(--sr-bg-page)] text-sm text-[var(--sr-text-primary)] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <article key={msg.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[var(--sr-accent-soft)] text-[var(--sr-accent)] inline-flex items-center justify-center">
                      <Sparkles size={13} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold">Trợ lý REloop</span>
                  </div>

                  <div className="text-sm text-[var(--sr-text-primary)] leading-relaxed">
                    <AssistantParts parts={msg.parts} fallback={msg.content} />
                  </div>

                  {msg.blocks
                    ?.filter((block) => block.type === "tour_list")
                    .map((block) => (
                      <div key={`${msg.id}-tours`} className="sr-ai-tour-grid">
                        {(block.items || []).map((tour) => (
                          <div
                            key={tour.id}
                            onClick={() => navigate(`/dashboard/trekking/${tour.id}`)}
                            className="flex flex-col gap-2 cursor-pointer"
                          >
                            <img
                              src={tour.cover_image_url || TOUR_CARD_FALLBACK_IMAGE}
                              alt={tour.title}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = TOUR_CARD_FALLBACK_IMAGE;
                              }}
                              className="w-full h-36 object-cover rounded-xl bg-[var(--sr-bg-subtle)]"
                            />
                            <div className="font-semibold text-sm text-[var(--sr-text-primary)]">
                              {tour.title}
                            </div>
                            <div className="text-xs text-[var(--sr-text-muted)]">
                              {tour.duration_hours || "2.5"} giờ ·{" "}
                              {difficultyLabel(tour.difficulty_level)} · {tour.avg_rating || "4.8"}
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs font-medium text-[var(--sr-accent)]">
                                Xem chi tiết và đặt tuyến
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                  {msg.blocks
                    ?.filter((block) => block.type === "draft_preview")
                    .flatMap((block) => block.items || [])
                    .map((item, index) => (
                      <TourDraftCard
                        key={`${msg.id}-draft-${index}`}
                        draft={item.draft || {}}
                        index={index}
                        messageIndex={messageIndex}
                        sessionId={sessionId}
                        isLatest={messageIndex === messages.length - 1}
                      />
                    ))}
                </article>
              )
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[var(--sr-text-muted)]">
                <Loader size={14} className="animate-spin" aria-hidden="true" />
                <span>Đang tìm tuyến phù hợp...</span>
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--sr-border)]">
              {PROMPT_STARTERS.map((q) => (
                <button
                  key={`chip-${q}`}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--sr-bg-page)] hover:bg-[var(--sr-bg-hover)] text-xs text-[var(--sr-text-secondary)] border-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            <div ref={historyEndRef} />
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="px-4 py-4 border-t border-[var(--sr-border)] bg-[var(--sr-bg-surface)]"
        >
          <div className="max-w-3xl mx-auto flex items-center gap-2 h-12 px-3 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)]">
            <input
              type="text"
              aria-label="Hỏi Trợ lý REloop"
              placeholder="Hỏi Trợ lý REloop về lịch khởi hành, độ khó hoặc voucher"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm text-[var(--sr-text-primary)] outline-none"
            />
            <button
              type="submit"
              className="sr-btn sr-btn-primary sr-btn-sm"
              disabled={isLoading || !draft.trim()}
            >
              <Send size={13} aria-hidden="true" />
              <span>Gửi</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
