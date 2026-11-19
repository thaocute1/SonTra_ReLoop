import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { AxiosError } from 'axios'
import { createServer } from 'vite'

let server, Page, api, renderer, originalAdapter, rows, requests, reviewError, emitted
const originalStorage = globalThis.localStorage
const originalWindow = globalThis.window
const pending = {
  id: 21, title: 'Pending Tour QA', status: 'pending_approval', vendor_name: 'Green QA', vendor_status: 'approved',
  price: 450000, duration_hours: 2, difficulty_label: 'Dễ', max_capacity: 15, created_at: '2026-11-19T09:00:00Z',
}
const detail = { ...pending, description: 'Route QA description', route: { start_point: 'Start QA', end_point: 'Finish QA', total_distance_km: 4, coordinates: [[16.1, 108.2], [16.11, 108.21]] }, checkpoints: [{ id: 1, name: 'Checkpoint QA' }], schedules: [{ id: 1, formatted_date: '20/11/2026', time_slot: '06:00 - 10:00', max_capacity: 15, price: 450000 }] }

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.cache/admin-tour-tests',
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: 'custom', optimizeDeps: { noDiscovery: true },
    plugins: [{
      name: 'isolate-maps-in-tour-review-tests', enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('/RouteMapPreview')) return '\0tour-test-map'
        if (source.endsWith('/lib/realtimeBus')) return '\0tour-test-realtime'
      },
      load(id) {
        if (id === '\0tour-test-map') return 'export default function Map() { return null }'
        if (id === '\0tour-test-realtime') return 'export const realtimeBus = { emit(...args) { globalThis.window.testEvents.push(args) } }'
      },
    }],
  })
  ;({ default: Page } = await server.ssrLoadModule('/src/pages/admin/TourReviewPage.jsx'))
  ;({ api } = await server.ssrLoadModule('/src/lib/axios.js'))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  rows = [{ ...pending }, { ...pending, id: 6, title: 'Published QA', status: 'published' }]
  requests = []
  emitted = []
  reviewError = null
  globalThis.localStorage = { getItem: key => key === 'access_token' ? 'admin-access-test' : null }
  globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, testEvents: emitted }
  api.defaults.adapter = async config => {
    requests.push(config)
    let data
    if (config.url === '/tours/admin/review-queue/') {
      let results = rows.filter(row => config.params.status === 'all' || row.status === config.params.status)
      if (config.params.search) results = results.filter(row => (row.title + row.vendor_name).includes(config.params.search))
      data = { success: true, results, count: results.length, total_pages: 1, current_page: 1,
        metrics: { pending_approval: rows.filter(row => row.status === 'pending_approval').length, published: rows.filter(row => row.status === 'published').length, rejected: rows.filter(row => row.status === 'rejected').length, all: rows.length } }
    } else if (config.url.endsWith('/review/')) {
      if (reviewError) throw new AxiosError('Review conflict', 'ERR_BAD_REQUEST', config, {}, { status: reviewError.status, config, headers: {}, data: { error: { detail: reviewError.message } } })
      const body = JSON.parse(config.data)
      const row = rows.find(row => row.id === 21)
      row.status = body.action === 'approve' ? 'published' : 'rejected'
      data = { status: 'success', message: body.action === 'approve' ? 'Đã phê duyệt và xuất bản tour.' : 'Đã từ chối tour và thông báo cho đối tác.', data: { ...detail, status: row.status } }
    } else if (config.url === '/tours/admin/21/') data = { status: 'success', data: { ...detail, status: rows[0].status } }
    else throw new Error('Unexpected test API: ' + config.url)
    return { status: 200, data, config, headers: {} }
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
  return node.children.map(child => typeof child === 'string' ? child : text(child)).join('')
}
const buttons = () => renderer.root.findAllByType('button')
const button = label => buttons().find(node => text(node) === label)
const reviewRequests = () => requests.filter(request => request.url.endsWith('/review/'))
async function mount() { await act(async () => { renderer = TestRenderer.create(React.createElement(Page)) }) }
async function openDetail() {
  await mount()
  await act(async () => button('Xem & duyệt').props.onClick())
}

test('review page opens the pending queue with authenticated API calls and shows route detail', async () => {
  await openDetail()
  assert.equal(requests[0].params.status, 'pending_approval')
  assert.equal(requests[0].headers.Authorization, 'Bearer admin-access-test')
  assert.ok(renderer.root.findByProps({ role: 'dialog' }))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Checkpoint QA'))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('06:00 - 10:00'))
})

test('approving publishes through the API, refreshes the queue and notifies vendor tabs', async () => {
  await openDetail()
  await act(async () => { await button('Phê duyệt & xuất bản').props.onClick() })
  assert.deepEqual(JSON.parse(reviewRequests()[0].data), { action: 'approve', reason: '' })
  assert.equal(renderer.root.findAllByProps({ role: 'dialog' }).length, 0)
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Đã phê duyệt và xuất bản tour.'))
  assert.equal(rows[0].status, 'published')
  assert.equal(emitted[0][0], 'TOUR_REVIEWED')
  assert.equal(emitted[0][1].tourId, 21)
})

test('rejection requires a reason and submits it without changing the approval endpoint', async () => {
  await openDetail()
  assert.equal(button('Từ chối tour').props.disabled, true)
  act(() => renderer.root.findByType('textarea').props.onChange({ target: { value: '  Cần bổ sung lịch trình.  ' } }))
  assert.equal(button('Từ chối tour').props.disabled, false)
  await act(async () => { await button('Từ chối tour').props.onClick() })
  assert.deepEqual(JSON.parse(reviewRequests()[0].data), { action: 'reject', reason: 'Cần bổ sung lịch trình.' })
  assert.equal(rows[0].status, 'rejected')
})

test('a stale review shows the backend conflict and prevents another decision', async () => {
  await openDetail()
  reviewError = { status: 409, message: 'Tour này không còn chờ duyệt. Vui lòng tải lại danh sách.' }
  await act(async () => { await button('Phê duyệt & xuất bản').props.onClick() })
  assert.ok(text(renderer.root.findByProps({ role: 'alert' })).includes(reviewError.message))
  assert.equal(button('Phê duyệt & xuất bản'), undefined)
  assert.equal(reviewRequests().length, 1)
})

test('status filters and search use server results instead of cached or fabricated tours', async () => {
  await mount()
  await act(async () => button('Đã xuất bản (1)').props.onClick())
  assert.equal(requests.at(-1).params.status, 'published')
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Published QA'))
  act(() => renderer.root.findByProps({ 'aria-label': 'Tìm tour hoặc đối tác' }).props.onChange({ target: { value: 'no-match' } }))
  await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Không có tour phù hợp'))
})
