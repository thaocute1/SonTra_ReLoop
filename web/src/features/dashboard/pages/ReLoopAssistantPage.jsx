import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, RefreshCw, Send, Sparkles } from "lucide-react";
import { useChat } from "../../../hooks/useChat";
import { difficultyLabel } from "../../../lib/chatMessage";
import AssistantParts from "../components/AssistantParts";

const TOUR_CARD_FALLBACK_IMAGE = "/images/trails/dinh-ban-co.jpg";
const PROMPT_STARTERS = [
  "Gợi ý tour nửa ngày cho nhóm 4 người dưới 450.000 đ",
  "Tuyến nào phù hợp cho người mới bắt đầu?",
  "Cách áp dụng voucher cùng điểm RE-Points",
];

export default function ReLoopAssistantPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const { messages, isLoading, sendMessage, resetChat } = useChat();
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

        <button
          type="button"
          className="px-2.5 py-2 rounded-lg bg-[var(--sr-bg-subtle)] text-left text-xs font-semibold text-[var(--sr-text-primary)] border-0 cursor-pointer"
        >
          Tư vấn hành trình Sơn Trà
        </button>

        {PROMPT_STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => sendMessage(starter)}
            className="px-2.5 py-2 rounded-lg bg-transparent hover:bg-[var(--sr-bg-hover)] text-left text-xs text-[var(--sr-text-muted)] border-0 cursor-pointer"
          >
            {starter}
          </button>
        ))}
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
            {messages.map((msg) =>
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
