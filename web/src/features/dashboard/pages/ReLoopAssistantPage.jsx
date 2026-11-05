import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Loader, RefreshCw, Send, Sprout } from 'lucide-react'
import { useChat } from '../../../hooks/useChat'
import './UserTripChatPage.css'

const TOUR_CARD_FALLBACK_IMAGE = '/assets/figma/landing-hero.png'

export default function ReLoopAssistantPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const { messages, isLoading, sendMessage, resetChat } = useChat()
  const historyEndRef = useRef(null)

  // Auto-scroll khi có tin nhắn mới hoặc loading thay đổi
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!draft.trim() || isLoading) return
    sendMessage(draft)
    setDraft('')
  }

  return (
    <div className="reloop-assistant-content-page">
      <section className="reloop-conversation">
        {/* Header với nút reset */}
        <div className="reloop-chat-header">
          <span>REloop Assistant</span>
          <button onClick={resetChat} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="reloop-history">
          <p className="reloop-time">Hôm nay · Bắt đầu cuộc trò chuyện mới</p>

          {/* Welcome message — luôn hiển thị */}
          <div className="reloop-message-row reloop-message-assistant">
            <span className="reloop-mark reloop-mark-small"><Sprout /></span>
            <div className="reloop-assistant-content">
              <small>REloop</small>
              <div className="reloop-assistant-card">
                <p>Chào bạn! Mình có thể giúp bạn tìm tuyến trekking, nhiệm vụ xanh và ưu đãi phù hợp ở Sơn Trà.</p>
                <button className="reloop-route-card" onClick={() => navigate('/dashboard/trekking')}>
                  <img src="/assets/figma/landing-hero.png" alt="Tuyến trekking Sơn Trà" />
                  <span>
                    <b>Cây Đa Di Sản</b>
                    <small>3.2 km · 1 giờ 30 phút · Dễ</small>
                    <em>Xem tuyến <ArrowRight /></em>
                  </span>
                </button>
                <p className="reloop-mission"><Leaf /><b>Gợi ý:</b> Thu gom rác nhựa trên tuyến để nhận 50 RE-Points.</p>
              </div>
            </div>
          </div>

          {/* Chat messages từ useChat hook */}
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div className="reloop-message-row reloop-message-user" key={msg.id}>
                <div className="reloop-user-bubble">{msg.content}</div>
              </div>
            ) : (
              <div className="reloop-message-row reloop-message-assistant" key={msg.id}>
                <span className="reloop-mark reloop-mark-small"><Sprout /></span>
                <div className="reloop-assistant-content">
                  <small>REloop</small>
                  <div className={`reloop-assistant-card${msg.isError ? ' reloop-error-card' : ''}`}>
                    <p>{msg.content}</p>
                    {msg.blocks?.filter((block) => block.type === 'tour_list').map((block) => (
                      <div className="reloop-tour-list" key={`${msg.id}-tour-list`}>
                        {block.items.map((tour) => (
                          <button
                            className="reloop-route-card"
                            key={tour.id}
                            type="button"
                            onClick={() => navigate(`/dashboard/trekking/${tour.id}`)}
                          >
                            <img
                              src={tour.cover_image_url || TOUR_CARD_FALLBACK_IMAGE}
                              alt={tour.title}
                              onError={(event) => {
                                event.currentTarget.onerror = null
                                event.currentTarget.src = TOUR_CARD_FALLBACK_IMAGE
                              }}
                            />
                            <span>
                              <b>{tour.title}</b>
                              <small>{tour.duration_hours || '—'} giờ · {tour.difficulty_level || '—'} · {tour.avg_rating || '—'} ★</small>
                              <em>Xem chi tiết <ArrowRight /></em>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Typing indicator khi đang chờ backend */}
          {isLoading && (
            <div className="reloop-message-row reloop-message-assistant">
              <span className="reloop-mark reloop-mark-small"><Sprout /></span>
              <div className="reloop-assistant-content">
                <small>REloop</small>
                <div className="reloop-assistant-card reloop-typing">
                  <Loader size={16} className="reloop-spinner" />
                  <span>Đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={historyEndRef} />
        </div>

        {/* Composer — input + nút gửi */}
        <form
          className="reloop-composer"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập tin nhắn..."
            aria-label="Nhập tin nhắn"
            disabled={isLoading}
            maxLength={4000}
          />
          <button
            aria-label="Gửi tin nhắn"
            disabled={isLoading || !draft.trim()}
          >
            <Send />
          </button>
        </form>
      </section>
    </div>
  )
}
