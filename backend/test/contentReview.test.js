import assert from 'node:assert/strict'
import test from 'node:test'
import { findInsultHits, reviewPostContent } from '../src/services/contentReview.js'

test('common Chinese insults are blocked and clean campus text is not', () => {
  assert.ok(findInsultHits('你这个傻逼给我滚').length > 0)
  assert.ok(findInsultHits('nmsl').length > 0)
  assert.deepEqual(findInsultHits('今天晚自习作业好多'), [])
  assert.deepEqual(findInsultHits('校园墙讨论区'), [])
})

test('clean posts pass review when no model is configured', async () => {
  const result = await reviewPostContent('放学后去操场跑步')
  assert.equal(result.blocked, false)
})
