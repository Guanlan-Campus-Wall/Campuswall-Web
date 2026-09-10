import { createHash, randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { isSmtpConfigured, normalizeEmail, sendMail } from './smtpMailer.js'

export { normalizeEmail, isSmtpConfigured }

export const hashEmailToken = (token) => createHash('sha256').update(String(token || '')).digest('hex')

export const createEmailToken = () => randomBytes(32).toString('hex')

export const resolveEmailApiOrigin = ({
  publicApiUrl = '',
  feishuRedirectUri = '',
  publicSiteUrl = ''
} = {}) => {
  const explicit = String(publicApiUrl || '').trim().replace(/\/+$/, '')
  if (explicit) return explicit
  try {
    const redirect = String(feishuRedirectUri || '').trim()
    if (redirect) return new URL(redirect).origin
  } catch {
    // fall through
  }
  try {
    const site = String(publicSiteUrl || '').trim()
    if (!site) return ''
    const url = new URL(site)
    if (url.hostname === 'wall.zongtech.xyz') return 'https://api-wall.zongtech.xyz'
    return url.origin
  } catch {
    return String(publicSiteUrl || '').trim().replace(/\/+$/, '')
  }
}

export const emailVerifyUrl = (token, settings = config) => {
  if (!token) return ''
  const origin = resolveEmailApiOrigin({
    publicApiUrl: settings.publicApiUrl,
    feishuRedirectUri: settings.feishuRedirectUri,
    publicSiteUrl: settings.publicSiteUrl
  })
  if (!origin) return ''
  return `${origin}/api/user/email/verify?token=${encodeURIComponent(token)}`
}

export const classifyVerificationEmailError = (error) => {
  if (error?.message === 'email_not_configured') {
    return { code: 'email_not_configured', error: '邮件服务暂未配置，请稍后再试' }
  }
  return { code: 'email_send_failed', error: '验证邮件发送失败，请稍后重试' }
}

export const sendVerificationEmail = async ({ to, token }) => {
  const link = emailVerifyUrl(token)
  if (!link) throw Object.assign(new Error('email_not_configured'), { permanent: true })
  const site = String(config.publicSiteUrl || 'https://wall.zongtech.xyz').trim()
  await sendMail({
    to,
    subject: '验证校园墙邮箱',
    text: [
      '请打开下面的链接完成邮箱验证，链接 24 小时内有效。',
      '',
      link,
      '',
      '如果不是你本人操作，请忽略这封邮件。'
    ].join('\n'),
    html: [
      '<div style="font-family:sans-serif;line-height:1.7;color:#111;max-width:560px;margin:0 auto;padding:24px">',
      '<h1 style="font-size:20px;margin:0 0 12px">验证校园墙邮箱</h1>',
      '<p style="margin:0 0 16px">点击下面的按钮完成绑定。链接 24 小时内有效。</p>',
      `<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">验证邮箱</a></p>`,
      `<p style="margin:0 0 8px;font-size:13px;color:#555">如果按钮无法打开，请复制此链接：<br>${link}</p>`,
      `<p style="margin:0;font-size:12px;color:#888">如果不是你本人操作，请忽略这封邮件。<br>${site}</p>`,
      '</div>'
    ].join('')
  })
}

export const sendAccountNotificationEmail = async ({ to, content, type = 'comment' }) => {
  const kind = type === 'comment' ? '评论' : '消息'
  await sendMail({
    to,
    subject: `校园墙有新的${kind}通知`,
    text: [
      String(content || '你有一条新的校园墙通知。').trim() || '你有一条新的校园墙通知。',
      '',
      '登录校园墙主页即可查看详情。',
      String(config.publicSiteUrl || '').trim()
    ].filter(Boolean).join('\n')
  })
}
