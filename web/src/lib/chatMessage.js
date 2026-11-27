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

/** Giữ tour_list và draft_preview; mỗi loại lọc item hợp lệ. */
export function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  const normalized = []
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'tour_list') {
      const items = Array.isArray(block.items)
        ? block.items.filter((tour) => tour && tour.id != null)
        : []
      if (items.length) normalized.push({ ...block, items })
    } else if (block.type === 'draft_preview') {
      const items = Array.isArray(block.items)
        ? block.items.filter(
            (item) => item && typeof item === 'object' && item.draft && typeof item.draft === 'object',
          )
        : []
      if (items.length) normalized.push({ ...block, items })
    }
  }
  return normalized
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
