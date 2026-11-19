import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { createServer } from 'vite'

let server, Page, api, originalAdapter, renderer, requests, registrationError
const originalStorage = globalThis.localStorage
const originalWindow = globalThis.window
const session = { id: 16, campaign_title: 'Campaign QA', session_name: 'Session QA' }
const tour = { id: 6, title: 'Published QA', price: 10000, status: 'published', schedules: [], route: {} }

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.cache/vendor-tests',
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    plugins: [{
      name: 'isolate-maps-and-sidebar-in-vendor-form-tests',
      enforce: 'pre',
      resolveId(source) {
        if (/\/(RouteMapPicker|RouteMapPreview|VendorSidebar)(\.jsx)?$/.test(source)) return '\0vendor-test-component'
        if (source.endsWith('/lib/realtimeBus')) return '\0vendor-test-realtime'
      },
      load(id) {
        if (id === '\0vendor-test-component') return 'export default function Component() { return null }'
        if (id === '\0vendor-test-realtime') return 'export const realtimeBus = { emit() {}, subscribe() { return () => {} } }'
      },
    }],
  })
  ;({ default: Page } = await server.ssrLoadModule('/src/pages/vendor/VendorExperiencesPage.jsx'))
  ;({ api } = await server.ssrLoadModule('/src/lib/axios.js'))
  originalAdapter = api.defaults.adapter
})

beforeEach(() => {
  requests = []
  registrationError = null
  const storage = new Map([['access_token', 'vendor-access-test']])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  globalThis.window = { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} }
  api.defaults.adapter = async config => {
    requests.push(config)
    let data
    if (config.url === '/vendors/tours/') data = [tour, { ...tour, id: 21, title: 'Pending QA', status: 'pending_approval' }]
    else if (config.url === '/vendors/guides/') data = []
    else if (config.url === '/flash-sales/vendor/registrations/') data = { sessions: [session], registrations: [] }
    else if (config.url === '/flash-sales/vendor/register-item/') {
      if (registrationError) {
        const response = { status: registrationError.status, data: registrationError.data, config, headers: {} }
        throw new AxiosError('Registration rejected', 'ERR_BAD_REQUEST', config, {}, response)
      }
      return { status: 201, data: { status: 'success', message: 'Đã gửi đăng ký và đang chờ BQL duyệt.', data: { id: 1, status: 'pending_approval' } }, config, headers: {} }
    } else throw new Error('Unexpected test request: ' + config.url)
    return { status: 200, data: { status: 'success', data }, config, headers: {} }
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
const registerButtons = () => buttons().filter(button => text(button) === 'Đăng ký flash sale')
const modal = () => renderer.root.findByProps({ role: 'dialog', 'aria-label': 'Đăng ký Flash Sale' })
const submissions = () => requests.filter(request => request.url.endsWith('/register-item/'))

async function mount() {
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(MemoryRouter, {
      initialEntries: ['/vendor/experiences'], future: { v7_startTransition: true, v7_relativeSplatPath: true },
    }, React.createElement(Page)))
  })
}
async function openPublished() {
  await mount()
  await act(async () => { registerButtons().find(button => !button.props.disabled).props.onClick() })
}
async function submit() {
  await act(async () => { await modal().findByType('form').props.onSubmit({ preventDefault() {} }) })
}

test('pending tours show approval state and cannot register for Flash Sale', async () => {
  await mount()
  assert.equal(registerButtons().filter(button => button.props.disabled).length, 1)
  assert.ok(registerButtons().find(button => button.props.disabled).props.title.includes('BQL'))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('Chờ BQL phê duyệt'))
  assert.equal(submissions().length, 0)
})

test('first modal load selects a live registration session and sends the vendor Bearer token', async () => {
  await openPublished()
  assert.equal(modal().findByType('select').props.value, 16)
  await submit()
  assert.equal(submissions().length, 1)
  assert.equal(submissions()[0].headers.Authorization, 'Bearer vendor-access-test')
  assert.deepEqual(JSON.parse(submissions()[0].data), { session_id: 16, tour_id: 6, promo_price: 7500, slot_quantity: 10 })
  assert.equal(renderer.root.findAllByProps({ role: 'dialog', 'aria-label': 'Đăng ký Flash Sale' }).length, 0)
  assert.ok(JSON.stringify(renderer.toJSON()).includes('đang chờ BQL duyệt'))
})

test('backend rejection appears in the modal and keeps the registration fields', async () => {
  await openPublished()
  registrationError = { status: 400, data: { status: 'error', message: 'Tour đã được duyệt trong phiên và không thể chỉnh sửa.' } }
  await submit()
  assert.ok(text(modal().findByProps({ role: 'alert' })).includes(registrationError.data.message))
  assert.equal(modal().findByType('select').props.value, 16)
})

test('expired authentication shows a partner login action instead of a generic error', async () => {
  await openPublished()
  registrationError = { status: 401, data: { success: false, error: { detail: 'Authentication credentials were not provided.' } } }
  await submit()
  const alert = modal().findByProps({ role: 'alert' })
  assert.ok(text(alert).includes('Phiên đăng nhập đã hết hạn'))
  assert.equal(text(alert.findByType('button')), 'Đăng nhập lại')
})

test('invalid promo price is rejected before sending a registration', async () => {
  await openPublished()
  act(() => modal().findAllByType('input')[0].props.onChange({ target: { value: '10000' } }))
  await submit()
  assert.equal(submissions().length, 0)
  assert.ok(text(modal().findByProps({ role: 'alert' })).includes('thấp hơn giá niêm yết'))
})
