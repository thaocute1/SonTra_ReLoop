import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server, Page, api, originalAdapter, renderer, requests, dashboardPayload
const originalStorage = globalThis.localStorage
const originalWindow = globalThis.window

const baseDashboard = () => ({
  vendor_info: { brand_name: 'nguyen', status_label: 'Đối tác đã xác minh', avatar_text: 'NG' },
  metrics: {
    monthly_revenue_formatted: '10.000 đ',
    monthly_revenue_growth: null,
    total_bookings: 5,
    monthly_bookings_diff: 5,
    avg_rating: 5,
    total_reviews: 1,
  },
  booking_overview: { confirmed: 0, completed: 1, cancelled: 1 },
  revenue_chart: { period: '3m', data: [] },
  reconciliation: { summary: { gross_amount: 10000, vendor_net_amount: 8500 } },
  experience_performance: [],
  recent_bookings: [],
  review_overview: {
    summary: {
      avg_rating: 5,
      total_reviews: 1,
      unreplied_count: 1,
      low_rating_count: 0,
      low_unreplied_count: 0,
      five_star_count: 1,
      five_star_rate: 100,
      rating_breakdown: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    recent_reviews: [
      {
        id: 501,
        tour_id: 6,
        tour_title: 'Chinh phục đỉnh bàn cờ',
        guide_name: 'HDV Minh',
        guide_rating: 5,
        order_code: 'ORD-2026-TK588396',
        customer_name: 'Phong N.',
        rating: 5,
        tour_rating: 5,
        tour_tags: ['Cảnh đẹp'],
        guide_tags: ['Nhiệt tình'],
        low_rating_reasons: [],
        is_low_rating: false,
        comment: 'Chuyến đi rất đáng nhớ!',
        vendor_reply: '',
        replied_at: '',
        created_at: '27/11/2026',
      },
    ],
  },
})

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.cache/vendor-dashboard-tests',
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  })
  ;({ default: Page } = await server.ssrLoadModule('/src/pages/vendor/VendorDashboardPage.jsx'))
  ;({ api } = await server.ssrLoadModule('/src/lib/axios.js'))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  requests = []
  dashboardPayload = baseDashboard()
  const storage = new Map([['access_token', 'vendor-access-test']])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  api.defaults.adapter = async config => {
    requests.push(config)
    if (config.url === '/vendors/dashboard/') {
      return { status: 200, data: { status: 'success', data: dashboardPayload }, config, headers: {} }
    }
    if (config.url === '/vendors/reviews/501/reply/') {
      const body = JSON.parse(config.data)
      return {
        status: 200,
        data: {
          status: 'success',
          message: 'Đã gửi phản hồi đánh giá cho du khách.',
          data: {
            id: 501,
            vendor_reply: body.reply,
            replied_at: '28/11/2026 00:15',
          },
        },
        config,
        headers: {},
      }
    }
    throw new Error('Unexpected test request: ' + config.url)
  }
})

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = null
  api.defaults.adapter = originalAdapter
  globalThis.localStorage = originalStorage
  globalThis.window = originalWindow
})

after(async () => { await server?.close() })

function text(node) {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return (node.children || []).map(text).join('')
}

async function mountOverview() {
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(MemoryRouter, {
      initialEntries: ['/vendor/dashboard'],
      future: { v7_startTransition: true, v7_relativeSplatPath: true },
    }, React.createElement(Page)))
  })
}

test('overview renders reviews section at the bottom with breakdown and recent reviews', async () => {
  await mountOverview()
  const serialized = JSON.stringify(renderer.toJSON())
  assert.ok(serialized.includes('Đánh giá gần đây'))
  assert.ok(serialized.includes('Tổng quan đánh giá'))
  assert.ok(serialized.includes('Phân bố mức sao'))
  assert.ok(serialized.includes('Chuyến đi rất đáng nhớ!'))
  assert.ok(serialized.includes('Phong N.'))
  assert.ok(serialized.includes('ORD-2026-TK588396'))
})

test('overview allows replying inline to a recent review', async () => {
  await mountOverview()
  const replyButton = renderer.root.findAllByType('button').find(btn => text(btn).includes('Phản hồi'))
  assert.ok(replyButton)

  await act(async () => {
    replyButton.props.onClick()
  })

  const textarea = renderer.root.findByType('textarea')
  await act(async () => {
    textarea.props.onChange({ target: { value: 'Cảm ơn bạn đã đồng hành cùng Sơn Trà!' } })
  })

  const form = renderer.root.findByType('form')
  await act(async () => {
    await form.props.onSubmit({ preventDefault() {} })
  })

  const replyReq = requests.find(r => r.url === '/vendors/reviews/501/reply/')
  assert.ok(replyReq)
  assert.deepEqual(JSON.parse(replyReq.data), { reply: 'Cảm ơn bạn đã đồng hành cùng Sơn Trà!' })
  const serialized = JSON.stringify(renderer.toJSON())
  assert.ok(serialized.includes('Đã phản hồi du khách'))
  assert.ok(serialized.includes('Cảm ơn bạn đã đồng hành cùng Sơn Trà!'))
})

test('overview shows empty state when there are no reviews yet', async () => {
  dashboardPayload = {
    ...baseDashboard(),
    metrics: { ...baseDashboard().metrics, avg_rating: 0, total_reviews: 0 },
    review_overview: {
      summary: {
        avg_rating: 0,
        total_reviews: 0,
        unreplied_count: 0,
        five_star_count: 0,
        five_star_rate: 0,
        rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
      recent_reviews: [],
    },
  }
  await mountOverview()
  const serialized = JSON.stringify(renderer.toJSON())
  assert.ok(serialized.includes('Chưa có đánh giá nào từ du khách'))
})
