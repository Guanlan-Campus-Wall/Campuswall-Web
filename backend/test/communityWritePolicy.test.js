import assert from 'node:assert/strict'
import test from 'node:test'
import { SettingsStore, communityDefaults } from '../src/services/settingsStore.js'

const memorySettingsPool = (data = communityDefaults) => ({
  async query(sql, params = []) {
    if (sql.includes('SELECT data, updated_at FROM platform_settings')) {
      return { rowCount: 1, rows: [{ data, updated_at: new Date().toISOString() }] }
    }
    throw new Error(`Unexpected settings query: ${sql} ${JSON.stringify(params)}`)
  }
})

test('guest posting and commenting default to closed', () => {
  assert.equal(communityDefaults.guest_posting_enabled, false)
  assert.equal(communityDefaults.guest_commenting_enabled, false)
})

test('checkCommunityWrite rejects anonymous posts when guest posting is off', async () => {
  const store = new SettingsStore()
  store.pool = memorySettingsPool({
    ...communityDefaults,
    guest_posting_enabled: false,
    guest_commenting_enabled: false
  })
  const post = await store.checkCommunityWrite('post', { user: null, values: ['hello'] })
  assert.equal(post.success, false)
  assert.equal(post.code, 'GUEST_POSTING_DISABLED')
  const comment = await store.checkCommunityWrite('comment', { user: null, values: ['hello'] })
  assert.equal(comment.success, false)
  assert.equal(comment.code, 'GUEST_COMMENTING_DISABLED')
})

test('logged-in users can post when guest posting is off', async () => {
  const store = new SettingsStore()
  store.pool = memorySettingsPool({
    ...communityDefaults,
    guest_posting_enabled: false
  })
  const result = await store.checkCommunityWrite('post', { user: { id: 1 }, values: ['hello'] })
  assert.equal(result.success, true)
})
