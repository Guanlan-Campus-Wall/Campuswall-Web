import assert from 'node:assert/strict'
import test from 'node:test'
import { MessageStore } from '../src/services/messageStore.js'
import { editedPublicationStateFor, publicationStateFor } from '../src/services/publicationPolicy.js'

const visible = (reason) => ({
  moderation_status: 'visible',
  review_status: 'approved',
  review_bypass_reason: reason,
  review_source: reason,
  review_hits: []
})

test('clean ordinary posts publish after AI lexicon pass', async () => {
  const guest = await publicationStateFor({ tags: ['日常'], text: '今天晚自习好安静' })
  const user = await publicationStateFor({ tags: ['学习'], user: { role: 'user' }, text: '有人一起订资料吗' })
  assert.equal(guest.moderation_status, 'visible')
  assert.equal(guest.review_status, 'approved')
  assert.equal(user.moderation_status, 'visible')
})

test('insulting posts stay pending for human review', async () => {
  const result = await publicationStateFor({ tags: ['日常'], text: '你这个傻逼' })
  assert.equal(result.moderation_status, 'pending')
  assert.equal(result.review_status, 'pending')
  assert.ok(result.review_hits.length > 0)
})

test('every privileged role publishes ordinary posts immediately', async () => {
  for (const role of ['reviewer', 'admin', 'super_admin']) {
    assert.deepEqual(
      await publicationStateFor({ tags: ['日常'], user: { role } }),
      visible('privileged_author'),
      role
    )
  }
  assert.deepEqual(await publicationStateFor({ admin: { username: 'shenhe1' } }), visible('privileged_author'))
})

test('guest and ordinary-user confessions follow AI review while privileged authors remain exempt', async () => {
  for (const tag of ['表白', '表白墙', '#表白', '## 表白墙']) {
    const state = await publicationStateFor({ tags: [tag], text: '想对操场说一声加油' })
    assert.equal(state.moderation_status, 'visible', tag)
  }
  assert.equal(
    (await publicationStateFor({ tags: ['表白'], user: { role: 'user' }, text: '一张很普通的便签' })).moderation_status,
    'visible'
  )
  for (const role of ['reviewer', 'admin', 'super_admin']) {
    assert.deepEqual(
      await publicationStateFor({ tags: ['表白'], user: { role } }),
      visible('privileged_author'),
      role
    )
  }
})

test('lost-and-found posts publish immediately while authentication remains a route concern', async () => {
  assert.deepEqual(
    await publicationStateFor({ user: { role: 'user' }, lostFound: { kind: 'lost' } }),
    visible('lost_found')
  )
  assert.deepEqual(
    await publicationStateFor({ user: { role: 'user' }, lostFound: { kind: 'found' } }),
    visible('lost_found')
  )
})

test('an explicit moderator return remains pending after an owner edit', async () => {
  const heldMessage = { review_hold: true }
  const held = await editedPublicationStateFor({ message: heldMessage, tags: ['失物招领'], user: { role: 'user' }, lostFound: { kind: 'lost' } })
  assert.equal(held.moderation_status, 'pending')
  assert.equal(held.review_source, 'review_hold')
  const reviewerHeld = await editedPublicationStateFor({ message: heldMessage, tags: ['日常'], user: { role: 'reviewer' } })
  assert.equal(reviewerHeld.moderation_status, 'pending')
})

test('owner edits follow the same confession and lost-and-found publication matrix without a hold', async () => {
  const confession = await editedPublicationStateFor({ message: {}, tags: ['表白'], user: { role: 'user' }, text: '一张干净便签' })
  assert.equal(confession.moderation_status, 'visible')
  assert.deepEqual(
    await editedPublicationStateFor({ message: {}, tags: ['表白'], user: { role: 'admin' } }),
    visible('privileged_author')
  )
  assert.deepEqual(
    await editedPublicationStateFor({ message: {}, tags: ['失物招领'], user: { role: 'user' }, lostFound: { kind: 'found' } }),
    visible('lost_found')
  )
})

test('returning a published post records a moderator hold', async () => {
  const store = new MessageStore()
  store.mutateStoredMessage = async (_id, mutator) => {
    const mutation = await mutator({
      id: 91,
      moderation_status: 'visible',
      review_status: 'approved',
      review_revision: 1
    }, {})
    return mutation.result
  }
  store.enqueueModerationNotification = async () => 0
  store.refreshHotMessages = () => []
  try {
    const result = await store.setReviewState(91, { approved: false, reviewer: 'shenhe1' })
    assert.equal(result.message.review_hold, true)
    assert.equal(result.message.review_hold_by, 'shenhe1')
    assert.equal(result.message.moderation_status, 'pending')
    assert.equal(result.message.review_status, 'pending')
  } finally {
    await store.pool.end()
  }
})

test('message creation stores the policy state and only enqueues actual review work', async () => {
  const store = new MessageStore()
  await store.pool.end()

  let nextId = 100
  let notificationCount = 0
  const client = {
    query: async () => ({ rowCount: 1, rows: [] }),
    release: () => {}
  }
  store.pool = { connect: async () => client }
  store.createId = () => nextId++
  store.findPartition = () => null
  store.insertMessage = async () => ({ rowCount: 1 })
  store.enqueueModerationNotification = async () => { notificationCount += 1 }
  store.refreshHotMessages = () => []

  const ordinaryId = await store.postMessage({ text: '普通动态今晚自习', tags: ['日常'], user: { id: 1, role: 'user' } })
  const reviewerId = await store.postMessage({ text: '审核员动态', tags: ['日常'], user: { id: 2, role: 'reviewer' } })
  const confessionId = await store.postMessage({ text: '一张便签想说加油', tags: ['表白'] })
  const reviewerConfessionId = await store.postMessage({ text: '审核员便签', tags: ['表白'], user: { id: 4, role: 'reviewer' } })
  const insultId = await store.postMessage({ text: '你这个傻逼', tags: ['日常'], user: { id: 5, role: 'user' } })
  const lostFoundId = await store.postMessage({
    text: '失物招领',
    tags: ['失物招领'],
    user: { id: 3, role: 'user' },
    lostFound: { kind: 'lost' }
  })

  assert.equal(store.getMessage(ordinaryId).moderation_status, 'visible')
  assert.equal(store.getMessage(ordinaryId).review_status, 'approved')
  assert.equal(store.getMessage(confessionId).moderation_status, 'visible')
  assert.equal(store.getMessage(confessionId).review_status, 'approved')
  assert.equal(store.getMessage(insultId).moderation_status, 'pending')
  assert.equal(store.getMessage(insultId).review_status, 'pending')
  for (const id of [reviewerId, reviewerConfessionId, lostFoundId]) {
    assert.equal(store.getMessage(id).moderation_status, 'visible', id)
    assert.equal(store.getMessage(id).review_status, 'approved', id)
    assert.equal(Object.hasOwn(store.getMessage(id), 'pending_since'), false, id)
  }
  assert.equal(notificationCount, 1)
})
