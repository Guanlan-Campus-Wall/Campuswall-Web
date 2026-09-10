import assert from 'node:assert/strict'
import test from 'node:test'
import { clientIpFromRequest, networkPreferenceFor } from '../src/services/ispPrefer.js'

test('private client IPs never redirect to the telecom origin', async () => {
  const result = await networkPreferenceFor({
    headers: { 'cf-connecting-ip': '192.168.1.8' },
    ip: '192.168.1.8'
  })
  assert.equal(result.success, true)
  assert.equal(result.telecom, false)
  assert.equal(result.redirect, false)
  assert.equal(result.prefer_origin, 'https://home.zongtech.xyz')
})

test('client IP prefers Cloudflare connecting IP', () => {
  assert.equal(clientIpFromRequest({
    headers: { 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' },
    ip: '10.0.0.1'
  }), '1.2.3.4')
})
