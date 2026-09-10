import assert from 'node:assert/strict'
import test from 'node:test'
import { isTrustedAdminOrigin } from '../src/services/auth.js'

const request = (headers = {}, host = 'localhost:5412') => ({
  protocol: 'http',
  headers: { host, ...headers }
})

test('mutating requests without Origin or Referer are rejected', () => {
  assert.equal(isTrustedAdminOrigin(request()), false)
  assert.equal(isTrustedAdminOrigin(request({ referer: 'not-a-url' })), false)
})

test('allowed frontend origin is trusted', () => {
  assert.equal(isTrustedAdminOrigin(request({ origin: 'http://localhost:5173' })), true)
  assert.equal(isTrustedAdminOrigin(request({ referer: 'http://localhost:5173/wall' })), true)
  assert.equal(isTrustedAdminOrigin(request({ origin: 'http://localhost:5412' }, 'localhost:5412')), true)
})

test('foreign origins are rejected', () => {
  assert.equal(isTrustedAdminOrigin(request({ origin: 'https://evil.example' })), false)
})

