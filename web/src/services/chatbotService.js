import { api } from '../lib/axios'

const ENDPOINT = '/cms-chatbot/agent/chat/'
const HISTORY_ENDPOINT = '/cms-chatbot/agent/history/'
const ADMIN_PREVIEW_ENDPOINT = '/cms-chatbot/agent/admin/preview/'
const ADMIN_APPROVE_ENDPOINT = '/cms-chatbot/agent/admin/approve/'

/**
 * Gửi tin nhắn đến AI Agent backend.
 *
 * Backend xử lý toàn bộ agent loop, tool calling và DeepSeek provider.
 * Client chỉ gửi message + session_id, KHÔNG gửi provider/role/api_key.
 *
 * @param {string} message    — Nội dung tin nhắn (1–4000 ký tự)
 * @param {string} sessionId  — Session ID (regex ^[A-Za-z0-9._:-]{1,128}$)
 * @returns {Promise<{ok: boolean, session_id: string, answer: string, trace: Array, status: string, error: Object|null}>}
 */
export async function sendChatMessage(message, sessionId) {
  const response = await api.post(ENDPOINT, {
    message,
    session_id: sessionId,
  })
  return response.data
}

export async function loadChatHistory(sessionId) {
  const response = await api.get(HISTORY_ENDPOINT, { params: { session_id: sessionId } })
  return response.data
}

/** Create a short-lived backend approval token for an admin mutation preview. */
export async function previewAdminMutation(tool, arguments_, requestId) {
  const response = await api.post(
    ADMIN_PREVIEW_ENDPOINT,
    { tool, arguments: arguments_ },
    requestId ? { headers: { 'X-Request-ID': requestId } } : undefined,
  )
  return response.data
}

/** Execute a mutation only after the admin has explicitly confirmed the preview. */
export async function approveAdminMutation(tool, arguments_, approvalToken, requestId) {
  const response = await api.post(
    ADMIN_APPROVE_ENDPOINT,
    {
      tool,
      arguments: { ...arguments_, approval_token: approvalToken },
    },
    requestId ? { headers: { 'X-Request-ID': requestId } } : undefined,
  )
  return response.data
}

