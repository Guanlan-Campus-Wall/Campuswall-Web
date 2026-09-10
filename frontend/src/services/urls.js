const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '')

const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL)
const configuredStaticUrl = trimTrailingSlash(import.meta.env.VITE_STATIC_URL || '')
const preferHost = 'home.zongtech.xyz'

const isPreferOrigin = () => typeof window !== 'undefined' && window.location.hostname === preferHost

export const apiBaseUrl = isPreferOrigin() ? '' : configuredApiBaseUrl
export const staticBaseUrl = isPreferOrigin()
  ? '/static/'
  : `${configuredStaticUrl || `${apiBaseUrl}/static`}/`

const isAbsoluteUrl = (value = '') => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)

export function toApiUrl(value = '') {
  const url = String(value || '')
  if (!url || !apiBaseUrl || isAbsoluteUrl(url)) return url
  return `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`
}
