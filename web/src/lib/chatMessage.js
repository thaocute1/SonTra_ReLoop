/**
 * Chuẩn hóa message của AI Agent chat về một shape duy nhất cho UI.
 *
 * Contract:
 * - `docs/frontend-chat-schema-handover.md` — `message.parts` (text | chart)
 * - `docs/agent-tour-card-implementation-plan.md` — `blocks[].tour_list`
 */

export const DIFFICULTY_LABELS = {
  easy: 'Dễ',
  moderate: 'Trung bình',
  challenging: 'Thử thách',
  expert: 'Chuyên gia',
}

export function difficultyLabel(value) {
  return DIFFICULTY_LABELS[value] || value || '—'
}

/** Trả về mảng part hợp lệ; fallback về một text part từ `answer`. */
export function normalizeParts(message, answer) {
  const parts = Array.isArray(message?.parts)
    ? message.parts.filter((part) => part && typeof part === 'object')
    : []
  if (parts.length) return parts
  return answer ? [{ type: 'text', text: answer }] : []
}

/** Chỉ giữ tour_list có item hợp lệ (item cần `id` để điều hướng). */
export function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .filter((block) => block && block.type === 'tour_list')
    .map((block) => ({
      ...block,
      items: Array.isArray(block.items) ? block.items.filter((tour) => tour && tour.id != null) : [],
    }))
    .filter((block) => block.items.length > 0)
}

/** Có nội dung để hiển thị? (text hoặc ít nhất một part) */
export function hasRenderableContent(payload) {
  if (!payload) return false
  if (typeof payload.answer === 'string' && payload.answer.trim()) return true
  return Array.isArray(payload.message?.parts) && payload.message.parts.length > 0
}

export function normalizeAssistantMessage(payload, { id, timestamp } = {}) {
  const answer = typeof payload?.answer === 'string' ? payload.answer : ''
  return {
    id: id || `assistant-${Date.now()}`,
    role: 'assistant',
    content: answer,
    parts: normalizeParts(payload?.message, answer),
    blocks: normalizeBlocks(payload?.blocks),
    timestamp: timestamp || new Date().toISOString(),
  }
}

/** Message từ `GET /agent/history/` (đã có sẵn parts/blocks). */
export function normalizeHistoryMessage(message) {
  if (!message || typeof message !== 'object') return null
  const content = typeof message.content === 'string' ? message.content : ''
  if (message.role === 'user') {
    return {
      id: message.id,
      role: 'user',
      content,
      timestamp: message.timestamp,
    }
  }
  if (message.role !== 'assistant') return null
  return {
    id: message.id,
    role: 'assistant',
    content,
    parts: normalizeParts(message, content),
    blocks: normalizeBlocks(message.blocks),
    isError: Boolean(message.isError),
    timestamp: message.timestamp,
  }
}
