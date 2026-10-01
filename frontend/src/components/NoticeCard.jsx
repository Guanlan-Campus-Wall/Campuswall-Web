const priorityMeta = Object.freeze({
  normal: { label: '校园公告', icon: 'bi-megaphone', tone: 'normal' },
  important: { label: '重要公告', icon: 'bi-exclamation-circle-fill', tone: 'important' },
  urgent: { label: '紧急公告', icon: 'bi-exclamation-triangle-fill', tone: 'urgent' }
})

const statusLabels = Object.freeze({
  draft: '草稿',
  published: '已发布',
  scheduled: '定时发布',
  archived: '已归档'
})

const cleanText = (value) => String(value || '').trim()
const noticeDateTime = (value) => value ? String(value).replace(' ', 'T') : undefined

export const noticeTitle = (notice) => cleanText(notice?.title)
  || cleanText(notice?.content).split(/\r?\n/).find(Boolean)
  || '校园公告'

export const noticeSummary = (notice) => cleanText(notice?.summary)
  || cleanText(notice?.content).replace(/\s+/g, ' ').slice(0, 120)

export default function NoticeCard({ notice, compact = false, showStatus = false, onClick }) {
  if (!notice) return null
  const priority = priorityMeta[notice.priority] || priorityMeta.normal
  const publishedAt = notice.publish_at || notice.timestamp || ''
  const title = noticeTitle(notice)
  const summary = noticeSummary(notice)
  const content = cleanText(notice.content)
  const className = `notice notice--${priority.tone}${compact ? ' is-compact' : ''}${onClick ? ' is-interactive' : ''}`

  const body = (
    <>
      <span className="notice__icon" aria-hidden="true"><i className={`bi ${priority.icon}`} /></span>
      <span className="notice__copy">
        {compact ? null : (
          <span className="notice__meta">
            <b className="notice__badge">{priority.label}</b>
            {showStatus ? <b className={`notice__status is-${notice.status || 'published'}`}>{statusLabels[notice.status] || '已发布'}</b> : null}
            <time dateTime={noticeDateTime(publishedAt)}>{publishedAt || '尚未设置发布时间'}</time>
          </span>
        )}
        <strong>{title}</strong>
        {summary ? <span className="notice__summary">{summary}</span> : null}
        {!compact && content ? <span className="notice__content">{content}</span> : null}
      </span>
      {onClick ? <span className="notice__action">查看 <i className="bi bi-chevron-right" aria-hidden="true" /></span> : null}
    </>
  )

  if (onClick) {
    return (
      <button className={className} type="button" onClick={onClick} aria-label={`查看公告：${title}`}>
        {body}
      </button>
    )
  }

  return <article className={className}>{body}</article>
}
