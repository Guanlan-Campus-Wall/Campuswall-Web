import { config } from '../config.js'

const cache = new Map()
const CACHE_LIMIT = 4000
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const telecomPattern = /电信|chinanet|china\s*telecom|ctcc|chinatietong/i

const stripPort = (value = '') => String(value || '').replace(/^\[/, '').replace(/\]:\d+$/, '').replace(/:\d+$/, '')

export const clientIpFromRequest = (req) => {
  const forwarded = String(req.headers?.['cf-connecting-ip'] || req.headers?.['x-real-ip'] || '').split(',')[0].trim()
  const raw = forwarded || String(req.ip || req.socket?.remoteAddress || '')
  return stripPort(raw.replace(/^::ffff:/, ''))
}

const cacheKeyFor = (ip) => {
  if (ip.includes(':')) return ip
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
  return ip
}

const remember = (key, value) => {
  if (cache.size >= CACHE_LIMIT) {
    const first = cache.keys().next().value
    cache.delete(first)
  }
  cache.set(key, { ...value, cached_at: Date.now() })
}

const cached = (key) => {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.cached_at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit
}

const privateOrLocal = (ip) => (
  !ip
  || ip === '127.0.0.1'
  || ip === '::1'
  || ip.startsWith('10.')
  || ip.startsWith('192.168.')
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  || ip.startsWith('fc')
  || ip.startsWith('fd')
)

const lookupIsp = async (ip) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) return { isp: '', org: '' }
    const payload = await response.json()
    return {
      isp: String(payload.isp || payload.organization || payload.org || ''),
      org: String(payload.organization || payload.org || payload.isp || '')
    }
  } catch {
    return { isp: '', org: '' }
  } finally {
    clearTimeout(timer)
  }
}

export const networkPreferenceFor = async (req) => {
  const preferOrigin = String(config.telecomPreferHost || 'https://home.zongtech.xyz:12345').trim().replace(/\/+$/, '') || 'https://home.zongtech.xyz:12345'
  const enabled = config.telecomPreferEnabled !== false
  const ip = clientIpFromRequest(req)
  const empty = {
    success: true,
    enabled,
    client_ip: ip,
    isp: '',
    telecom: false,
    redirect: false,
    prefer_origin: preferOrigin
  }
  if (!enabled || privateOrLocal(ip)) return empty
  const key = cacheKeyFor(ip)
  const hit = cached(key)
  const info = hit || await lookupIsp(ip)
  if (!hit) remember(key, info)
  const blob = `${info.isp || ''} ${info.org || ''}`
  const telecom = telecomPattern.test(blob)
  return {
    ...empty,
    isp: info.isp || '',
    telecom,
    redirect: telecom
  }
}
