import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer as createHttpServer } from 'node:http'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server, SocialAuthButtons, authService, renderer, script, sdkOptions
let initializationCount, popupCount
const originalWindow = globalThis.window
const originalDocument = globalThis.document

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.cache/auth-tests',
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  })
  ;({ SocialAuthButtons } = await server.ssrLoadModule('/src/features/auth/components/SocialAuthButtons.jsx'))
  ;({ authService } = await server.ssrLoadModule('/src/features/auth/api/authService.js'))
})

beforeEach(() => {
  initializationCount = 0
  popupCount = 0
  sdkOptions = null
  script = null
  globalThis.window = { google: { accounts: { oauth2: {
    initTokenClient(options) {
      initializationCount++
      if (!options.client_id?.trim()) throw new Error('Missing required parameter client_id')
      sdkOptions = options
      return { requestAccessToken() { popupCount++ } }
    },
  } } } }
  globalThis.document = {
    createElement: () => ({}),
    body: {
      appendChild(element) { script = element },
      removeChild() {},
    },
  }
})

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = null
  globalThis.window = originalWindow
  globalThis.document = originalDocument
})
after(async () => { await server?.close() })

function mount(element, clientId = '') {
  act(() => {
    renderer = TestRenderer.create(React.createElement(GoogleOAuthProvider, { clientId }, element))
  })
}

function social(props = {}) {
  return React.createElement(SocialAuthButtons, { onAuthenticated() {}, onError() {}, ...props })
}

const googleButton = () => renderer.root.findAllByType('button').find(button =>
  button.children.some(child => typeof child === 'string' && child.includes('Google')))

test('missing Google client ID never initializes OAuth when the SDK loads', () => {
  mount(social())
  act(() => script.onload())
  assert.equal(initializationCount, 0)
  assert.equal(googleButton().props.disabled, true)
})

test('Google stays disabled while its SDK is loading or failed', () => {
  mount(social(), 'test.apps.googleusercontent.com')
  assert.equal(googleButton().props.disabled, true)
  act(() => script.onerror())
  assert.equal(googleButton().props.disabled, true)
  assert.equal(initializationCount, 0)
})

test('configured Google still opens OAuth and passes the token to the existing auth service', async () => {
  let receivedToken, authenticated
  const originalLogin = authService.loginWithGoogleToken
  authService.loginWithGoogleToken = async token => {
    receivedToken = token
    return { user: { role: 'customer' } }
  }
  try {
    mount(social({ onAuthenticated: result => { authenticated = result } }), 'test.apps.googleusercontent.com')
    act(() => script.onload())
    assert.equal(initializationCount, 1)
    assert.equal(googleButton().props.disabled, false)
    act(() => googleButton().props.onClick())
    assert.equal(popupCount, 1)
    await act(async () => { sdkOptions.callback({ access_token: 'fake-test-token' }) })
    assert.equal(receivedToken, 'fake-test-token')
    assert.equal(authenticated.user.role, 'customer')
  } finally {
    authService.loginWithGoogleToken = originalLogin
  }
})

for (const [name, path, title] of [
  ['login', 'LoginPage', 'Tham gia cộng đồng xanh'],
  ['register', 'RegisterPage', 'Trải nghiệm thiên nhiên đích thực'],
  ['forgot password', 'ForgotPasswordPage', 'Khôi phục mật khẩu'],
]) {
  test(`${name} renders its email form without Google configuration after SDK load`, async () => {
    const { default: Page } = await server.ssrLoadModule(`/src/features/auth/pages/${path}.jsx`)
    mount(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Page)))
    act(() => script.onload())
    assert.ok(renderer.root.findByProps({ name: 'email', type: 'email' }))
    assert.equal(renderer.root.findByType('h1').children.join(''), title)
    assert.equal(initializationCount, 0)
  })
}
