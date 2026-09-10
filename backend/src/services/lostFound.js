export const lostFoundTag = '失物招领'
export const lostItemTag = '寻物启事'
export const foundItemTag = '招领启事'

const lostFoundTypes = new Map([
  ['lost', 'lost'],
  ['missing', 'lost'],
  ['寻物', 'lost'],
  ['寻物启事', 'lost'],
  ['found', 'found'],
  ['picked_up', 'found'],
  ['招领', 'found'],
  ['招领启事', 'found'],
  ['拾物', 'found'],
  ['拾物启事', 'found']
])

export const normalizeLostFoundType = (value = '') => lostFoundTypes.get(String(value || '').trim().toLowerCase()) || ''

export const lostFoundTags = (type = '') => {
  const normalized = normalizeLostFoundType(type)
  if (normalized === 'lost') return [lostFoundTag, lostItemTag]
  if (normalized === 'found') return [lostFoundTag, foundItemTag]
  return []
}

const reservedLostFoundTags = new Set([lostFoundTag, lostItemTag, foundItemTag])

export const isLostFoundTag = (tag = '') => reservedLostFoundTags.has(String(tag || '').trim())

const lostFoundStatusTags = new Set(['已找回', '待找回', '待认领'])

export const isRestrictedLostFoundTag = (tag = '') => {
  const value = String(tag || '').trim()
  return isLostFoundTag(value) || lostFoundStatusTags.has(value)
}

export const isLostFoundMessage = (message) => Boolean(message) && (
  Boolean(message.lost_found)
  || (Array.isArray(message.tags) && message.tags.some(isLostFoundTag))
)

export const viewerMayReadLostFound = (account, message) => Boolean(account) || !isLostFoundMessage(message)

export const filterLostFoundForViewer = (messages, account) => {
  if (account) return messages
  return (Array.isArray(messages) ? messages : []).filter((message) => !isLostFoundMessage(message))
}

export const lostFoundPublicConfig = Object.freeze({
  enabled: true,
  tag: lostFoundTag,
  types: Object.freeze([
    Object.freeze({ value: 'lost', label: '寻物启事', tag: lostItemTag }),
    Object.freeze({ value: 'found', label: '招领启事', tag: foundItemTag })
  ])
})
