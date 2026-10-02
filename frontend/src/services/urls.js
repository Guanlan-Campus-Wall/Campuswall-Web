const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '')

const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL)
const configuredStaticUrl = trimTrailingSlash(import.meta.env.VITE_STATIC_URL || '')
export const apiBaseUrl = configuredApiBaseUrl
export const staticBaseUrl = `${configuredStaticUrl || `${apiBaseUrl}/static`}/`

const isAbsoluteUrl = (value = '') => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)

export function toApiUrl(value = '') {
  const url = String(value || '')
  if (!url || !apiBaseUrl || isAbsoluteUrl(url)) return url
  return `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`
}
