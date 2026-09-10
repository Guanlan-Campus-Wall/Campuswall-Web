import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterLostFoundForViewer,
  isLostFoundMessage,
  isRestrictedLostFoundTag,
  viewerMayReadLostFound
} from '../src/services/lostFound.js'

const wallPost = { id: 1, tags: ['日常'], text: 'hello' }
const lostPost = {
  id: 2,
  tags: ['失物招领', '寻物启事'],
  lost_found: { kind: 'lost', contact: '123456' },
  text: '丢了水杯'
}

test('lost-found posts are identifiable', () => {
  assert.equal(isLostFoundMessage(wallPost), false)
  assert.equal(isLostFoundMessage(lostPost), true)
})

test('guests cannot read lost-found posts through public helpers', () => {
  assert.equal(viewerMayReadLostFound(null, lostPost), false)
  assert.equal(viewerMayReadLostFound(null, wallPost), true)
  assert.deepEqual(filterLostFoundForViewer([wallPost, lostPost], null), [wallPost])
})

test('logged-in viewers can read lost-found posts', () => {
  const account = { id: 9 }
  assert.equal(viewerMayReadLostFound(account, lostPost), true)
  assert.deepEqual(filterLostFoundForViewer([wallPost, lostPost], account), [wallPost, lostPost])
})

test('guest tag lists hide lost-found related labels', () => {
  assert.equal(isRestrictedLostFoundTag('日常'), false)
  assert.equal(isRestrictedLostFoundTag('失物招领'), true)
  assert.equal(isRestrictedLostFoundTag('寻物启事'), true)
  assert.equal(isRestrictedLostFoundTag('已找回'), true)
})
