import { useState, useCallback, useRef, useEffect } from 'react'
import { loadChatHistory, sendChatMessage } from '../services/chatbotService'
import {
  hasRenderableContent,
  normalizeAssistantMessage,
  normalizeHistoryMessage,
} from '../lib/chatMessage'

/**
 * Error code → user-friendly message (tiếng Việt).
 * Covers all AgentPipelineError codes from backend + network errors.
 */
const ERROR_MESSAGES = {
  INVALID_REQUEST: 'Tin nhắn không hợp lệ, vui lòng thử lại.',
  EMPTY_MODEL_RESPONSE: 'Trợ lý không phản hồi được, thử lại sau.',
  MAX_LOOPS_REACHED: 'Trợ lý đang gặp khó khăn, thử lại sau.',
  MODEL_PROVIDER_ERROR: 'Dịch vụ trợ lý tạm gián đoạn.',
  PROVIDER_TIMEOUT: 'Trợ lý phản hồi chậm, vui lòng thử lại.',
  AGENT_DISABLED: 'Trợ lý đang bảo trì.',
  BACKEND_UNAVAILABLE: 'Hệ thống đang bận, thử lại sau.',
  PROVIDER_NOT_CONFIGURED: 'Trợ lý chưa sẵn sàng.',
  TOOL_CALL_LIMIT: 'Trợ lý đang gặp khó khăn, thử lại sau.',
  MALFORMED_TOOL_CALL: 'Trợ lý đang gặp khó khăn, thử lại sau.',
  UNKNOWN_TOOL: 'Trợ lý đang gặp khó khăn, thử lại sau.',
  TOOL_TIMEOUT: 'Trợ lý phản hồi chậm, vui lòng thử lại.',
  TOOL_RESULT_TOO_LARGE: 'Trợ lý đang gặp khó khăn, thử lại sau.',
  INVALID_PROVIDER_RESPONSE: 'Dịch vụ trợ lý tạm gián đoạn.',
  INVALID_CONFIGURATION: 'Trợ lý chưa sẵn sàng.',
  RATE_LIMITED: 'Bạn gửi quá nhanh, chờ một chút nhé.',
  NETWORK_ERROR: 'Không thể kết nối, kiểm tra lại mạng.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền sử dụng tính năng này.',
  CONFIRMATION_REQUIRED: 'Cần xác nhận trước khi thực hiện thay đổi.',
  APPROVAL_EXPIRED: 'Xác nhận đã hết hạn, vui lòng thực hiện lại.',
  DEFAULT: 'Đã xảy ra lỗi, vui lòng thử lại.',
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function generateSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getStoredSessionId() {
  const key = 'reloop_chat_session_id'
  const stored = window.localStorage.getItem(key)
  if (stored) return stored
  const generated = generateSessionId()
  window.localStorage.setItem(key, generated)
  return generated
}

/**
 * Map axios/backend error → user-friendly Vietnamese message.
 * Does NOT expose raw error details, stack traces, or provider output.
 */
function mapError(error) {
  // HTTP 429 → rate limited
  if (error?.response?.status === 429) return ERROR_MESSAGES.RATE_LIMITED

  // HTTP 401 → phiên hết hạn (điều hướng đăng nhập do axios interceptor xử lý)
  if (error?.response?.status === 401) return ERROR_MESSAGES.UNAUTHENTICATED

  // Backend error envelope: { ok: false, error: { code, message } }
  const code = error?.response?.data?.error?.code
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]

  // Network / connection errors
  if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  return ERROR_MESSAGES.DEFAULT
}

/**
 * Custom hook quản lý state chat với AI Agent backend.
 *
 * - Optimistic UI: user bubble hiển thị ngay khi gửi.
 * - Loading state: disable input + hiển thị typing indicator.
 * - Error mapping: mọi lỗi đều có message tiếng Việt thân thiện.
 * - Session: tạo 1 lần khi hook mount, đổi mới khi resetChat().
 * - Response: giữ cả `parts` (text/chart) và `blocks` (tour card) theo contract.
 *
 * @returns {{ messages, isLoading, sessionId, sendMessage, resetChat }}
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const sessionIdRef = useRef(getStoredSessionId())

  useEffect(() => {
    let active = true
    setIsLoading(true)
    loadChatHistory(sessionIdRef.current)
      .then((data) => {
        if (!active || !data?.ok || !Array.isArray(data.messages)) return
        setMessages(data.messages.map(normalizeHistoryMessage).filter(Boolean))
      })
      .catch(() => {
        // An unavailable history endpoint must not prevent a new chat turn.
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // 1. Optimistic: thêm user bubble ngay lập tức
    const userMsg = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // 2. Gọi backend agent chat
      const data = await sendChatMessage(trimmed, sessionIdRef.current)

      if (data?.ok && hasRenderableContent(data)) {
        // 3a. Thành công: assistan bubble gồm parts (text/chart) + blocks (tour card)
        setMessages((prev) => [
          ...prev,
          normalizeAssistantMessage(data, {
            id: generateId(),
            timestamp: new Date().toISOString(),
          }),
        ])
      } else {
        // 3b. Backend trả ok=false hoặc không có nội dung
        const errorText = data?.error?.message || ERROR_MESSAGES.DEFAULT
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: errorText,
            parts: [],
            blocks: [],
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ])
      }
    } catch (err) {
      // 4. Network / HTTP error
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: mapError(err),
          parts: [],
          blocks: [],
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetChat = useCallback(() => {
    setMessages([])
    sessionIdRef.current = generateSessionId()
    window.localStorage.setItem('reloop_chat_session_id', sessionIdRef.current)
  }, [])

  return {
    messages,
    isLoading,
    sessionId: sessionIdRef.current,
    sendMessage,
    resetChat,
  }
}
