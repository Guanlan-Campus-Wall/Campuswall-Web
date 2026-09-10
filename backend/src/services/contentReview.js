import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const lexiconPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/chinese-insults.json')
const loadedWords = JSON.parse(readFileSync(lexiconPath, 'utf8'))

const asciiWordPattern = /^[a-z0-9]+$/i

export const normalizeReviewText = (value = '') => String(value || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s\u00a0\u200b\u200c\u200d\ufeff]+/g, '')

const insultWords = [...new Set(
  (Array.isArray(loadedWords) ? loadedWords : [])
    .map((word) => normalizeReviewText(word))
    .filter((word) => word && (asciiWordPattern.test(word) ? word.length >= 2 : Array.from(word).length >= 2))
)].sort((left, right) => right.length - left.length)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const listInsultWords = () => [...insultWords]

export const findInsultHits = (value = '', { limit = 8 } = {}) => {
  const haystack = normalizeReviewText(value)
  if (!haystack) return []
  const hits = []
  for (const word of insultWords) {
    if (!word) continue
    const matched = asciiWordPattern.test(word)
      ? new RegExp(`(?<![a-z0-9])${escapeRegExp(word)}(?![a-z0-9])`, 'i').test(haystack)
      : haystack.includes(word)
    if (!matched) continue
    hits.push(word)
    if (hits.length >= limit) break
  }
  return hits
}

const defaultAiResult = (hits) => ({
  blocked: hits.length > 0,
  source: hits.length ? 'lexicon' : 'lexicon_clean',
  hits,
  model: '',
  error: ''
})

const parseAiDecision = (payload = {}) => {
  const message = payload?.choices?.[0]?.message?.content
  const raw = String(typeof message === 'string' ? message : '').trim()
  if (!raw) return { blocked: false, hits: [] }
  const jsonText = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const parsed = JSON.parse(jsonText)
    const blocked = parsed.blocked === true || parsed.unsafe === true || parsed.pass === false
    const hits = Array.isArray(parsed.terms || parsed.hits)
      ? (parsed.terms || parsed.hits).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : []
    return { blocked, hits }
  } catch {
    const blocked = /"blocked"\s*:\s*true|"unsafe"\s*:\s*true|"pass"\s*:\s*false/i.test(raw)
    return { blocked, hits: blocked ? ['model_flag'] : [] }
  }
}

const reviewWithOpenAi = async (text, settings) => {
  const baseUrl = String(settings.base_url || '').replace(/\/+$/, '')
  const apiKey = String(settings.api_key || '')
  const model = String(settings.model || 'gpt-4o-mini').trim() || 'gpt-4o-mini'
  if (!baseUrl || !apiKey) return { blocked: false, hits: [], error: '' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(3000, Number(settings.timeout_ms) || 8000))
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content: '你是校园墙辱骂审核器。只判断文本是否包含中文互联网常见辱骂、人身攻击或脏词。只返回 JSON：{"blocked":true|false,"terms":[]}。不要解释。'
          },
          { role: 'user', content: String(text || '').slice(0, 4000) }
        ]
      }),
      signal: controller.signal
    })
    if (!response.ok) {
      return { blocked: true, hits: [], error: `openai_http_${response.status}` }
    }
    const payload = await response.json()
    const decision = parseAiDecision(payload)
    return { ...decision, error: '' }
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return { blocked: true, hits: [], error: aborted ? 'openai_timeout' : 'openai_unavailable' }
  } finally {
    clearTimeout(timer)
  }
}

export const reviewPostContent = async (text = '', { title = '', tags = [] } = {}) => {
  const combined = [title, text, ...(Array.isArray(tags) ? tags : [])].filter(Boolean).join('\n')
  const hits = findInsultHits(combined)
  if (hits.length) return defaultAiResult(hits)

  let settings = { enabled: false, configured: false }
  try {
    const { settingsStore } = await import('./settingsStore.js')
    settings = await Promise.race([
      settingsStore.aiRuntime(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('ai_settings_timeout')), 2000))
    ])
  } catch {
    settings = { enabled: false, configured: false }
  }

  if (!settings.enabled || !settings.configured) {
    return defaultAiResult([])
  }

  const modelResult = await reviewWithOpenAi(combined, settings)
  if (modelResult.blocked || modelResult.error) {
    return {
      blocked: true,
      source: modelResult.error ? 'ai_unavailable' : 'openai',
      hits: modelResult.hits.length ? modelResult.hits : (modelResult.error ? [modelResult.error] : ['model_flag']),
      model: String(settings.model || ''),
      error: modelResult.error || ''
    }
  }
  return {
    blocked: false,
    source: 'openai_clean',
    hits: [],
    model: String(settings.model || ''),
    error: ''
  }
}
