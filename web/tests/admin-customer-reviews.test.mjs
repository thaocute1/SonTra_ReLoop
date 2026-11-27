import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server, Page, api, originalAdapter, renderer, requests, payload
const originalWindow = globalThis.window

const sampleData = () => ({
  summary: {
    avg_rating: 4.0,
    total_approved: 1,
    pending_approval_count: 1,
    reported_count: 1,
    low_rating_count: 1,
    rejected_count: 0,
    all_count: 2,
    attention_count: 2,
    flagged_tours_count: 1,
  },
  flagged_tours: [
    {
      id: 6,
      title: 'Tuyến Bàn Cờ',
      vendor_id: 5,
      vendor_name: 'Son Tra Eco',
      avg_rating: 2.8,
      total_reviews: 3,
      quality_level: 'critical',
    },
  ],
  flagged_vendors: [],
  vendors: [{ id: 5, brand_name: 'Son Tra Eco' }],
  tours: [{ id: 6, title: 'Tuyến Bàn Cờ', vendor_id: 5 }],
  results: [
    {
      id: 11,
      status: 'pending_approval',
      status_label: 'Chờ kiểm duyệt',
      tour_id: 6,
      tour_title: 'Tuyến Bàn Cờ',
      vendor_id: 5,
      vendor_name: 'Son Tra Eco',
      guide_name: 'HDV Minh',
      guide_rating: 5,
      order_code: 'ORD-11',
      customer_name: 'Nguyễn Văn A',
      customer_email: 'a@example.com',
      rating: 5,
      tour_rating: 5,
      tour_tags: [],
      guide_tags: [],
      low_rating_reasons: [],
      is_low_rating: false,
      comment: 'Gọi 0905123456',
      vendor_reply: '',
      reports: [],
      reports_count: 0,
      moderation_note: '',
      created_at: '27/11/2026 10:00',
    },
  ],
})

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.cache/admin-customer-review-tests',
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  })
  ;({ default: Page } = await server.ssrLoadModule('/src/pages/admin/AdminReviewsPage.jsx'))
  ;({ api } = await server.ssrLoadModule('/src/lib/axios.js'))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  requests = []
  payload = sampleData()
  globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
  api.defaults.adapter = async config => {
    requests.push(config)
    if (config.url === '/tours/admin/customer-reviews/') {
      return { status: 200, data: { status: 'success', data: payload }, config, headers: {} }
    }
    if (config.url === '/tours/admin/customer-reviews/11/moderate/') {
      return {
        status: 200,
        data: { status: 'success', message: 'Đã phê duyệt hiển thị đánh giá.', data: { ...payload.results[0], status: 'approved' } },
        config,
        headers: {},
      }
    }
    throw new Error('Unexpected request: ' + config.url)
  }
})

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = null
  api.defaults.adapter = originalAdapter
  globalThis.window = originalWindow
})

after(async () => { await server?.close() })

function text(node) {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return (node.children || []).map(text).join('')
}

test('admin reviews page renders watchlist, metrics and approves pending review', async () => {
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(MemoryRouter, {
      initialEntries: ['/admin/reviews'],
      future: { v7_startTransition: true, v7_relativeSplatPath: true },
    }, React.createElement(Page)))
  })

  const json = JSON.stringify(renderer.toJSON())
  assert.ok(json.includes('Kiểm duyệt & Giám sát đánh giá'))
  assert.ok(json.includes('Tuyến Bàn Cờ'))
  assert.ok(json.includes('Gọi 0905123456'))

  const approveBtn = renderer.root.findAllByType('button').find(b => text(b).includes('Phê duyệt hiển thị'))
  assert.ok(approveBtn)
  await act(async () => {
    await approveBtn.props.onClick()
  })

  const modReq = requests.find(r => r.url === '/tours/admin/customer-reviews/11/moderate/')
  assert.ok(modReq)
  assert.deepEqual(JSON.parse(modReq.data), { action: 'approve', note: '' })
})
