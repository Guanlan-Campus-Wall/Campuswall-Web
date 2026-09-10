import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Modal from '../components/Modal.jsx'
import MessageCard from '../components/MessageCard.jsx'
import NoticeCard, { noticeTitle } from '../components/NoticeCard.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'

const noticeSeenKey = (notice) => {
  if (!notice) return ''
  const identity = notice.id || notice.timestamp || 'latest'
  const revision = Math.max(Number(notice.reminder_revision) || 1, 1)
  return `campuswall:notice:seen:${identity}:${revision}`
}

const isAttentionNotice = (notice) => ['important', 'urgent'].includes(notice?.priority)

const serviceEntries = Object.freeze([
  { id: 'confessions', to: '/confessions', label: '表白墙', icon: 'bi-heart' },
  { id: 'lost-found', to: '/lost-found', label: '失物招领', icon: 'bi-search' },
  { id: 'topics', to: '/p', label: '话题', icon: 'bi-hash' }
])

export default function Home() {
  const [notices, setNotices] = useState([])
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeReadKeys, setNoticeReadKeys] = useState([])
  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(true)
  const { enabledModuleIds } = usePlatform()
  const wallEnabled = enabledModuleIds.has('wall')
  const visibleServiceEntries = serviceEntries.filter((entry) => enabledModuleIds.has(entry.id))

  useEffect(() => {
    api.getNotice().then((response) => {
      if (response.data?.success) {
        const items = (Array.isArray(response.data.content) ? response.data.content : [])
          .map((item) => ({
            ...item,
            title: String(item?.title || '').trim(),
            summary: String(item?.summary || '').trim(),
            content: String(item?.content || item?.text || '').trim(),
            priority: ['important', 'urgent'].includes(item?.priority) ? item.priority : 'normal',
            reminder_revision: Math.max(Number(item.reminder_revision) || 1, 1)
          }))
          .filter((item) => item.content)
        setNotices(items)
        const attentionKeys = items.filter(isAttentionNotice).map(noticeSeenKey).filter(Boolean)
        if (attentionKeys.length) {
          let unreadKeys = attentionKeys
          try {
            unreadKeys = attentionKeys.filter((key) => !window.localStorage.getItem(key))
          } catch {
            // If storage is unavailable, showing the important notice is safer
            // than silently treating it as read.
          }
          if (unreadKeys.length) {
            setNoticeReadKeys(unreadKeys)
            setNoticeOpen(true)
          }
        }
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!wallEnabled) {
      setPreview([])
      setPreviewLoading(false)
      return undefined
    }
    let active = true
    api.getMessages({ s: 'newest', start: 0, end: 5 })
      .then((response) => {
        if (active) setPreview(Array.isArray(response.data?.data) ? response.data.data : [])
      })
      .catch(() => {
        if (active) setPreview([])
      })
      .finally(() => {
        if (active) setPreviewLoading(false)
      })
    return () => { active = false }
  }, [wallEnabled])

  const latestNotice = notices[0] || null

  const openNotices = () => {
    setNoticeReadKeys(notices.filter(isAttentionNotice).map(noticeSeenKey).filter(Boolean))
    setNoticeOpen(true)
  }

  const closeNotices = () => {
    if (noticeReadKeys.length) {
      try {
        noticeReadKeys.forEach((key) => window.localStorage.setItem(key, 'seen'))
      } catch {
        // The modal can still close when persistent storage is unavailable.
      }
    }
    setNoticeReadKeys([])
    setNoticeOpen(false)
  }

  return (
    <div className="home-page campus-home">
      <header className="campus-home-hero">
        <h1 className="campus-page-title">校园墙</h1>
      </header>

      {latestNotice ? (
        <button
          className={`campus-notice-row is-${latestNotice.priority}`}
          type="button"
          onClick={openNotices}
          aria-label={`查看公告：${noticeTitle(latestNotice)}`}
        >
          <i className={`bi ${latestNotice.priority === 'urgent' ? 'bi-exclamation-triangle-fill' : 'bi-megaphone'}`} aria-hidden="true" />
          <span className="campus-notice-title">{noticeTitle(latestNotice)}</span>
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      ) : null}

      {visibleServiceEntries.length ? (
        <nav className="campus-quick-links" aria-label="校园功能入口">
          {visibleServiceEntries.map((entry) => (
            <Link className="campus-quick-link" to={entry.to} key={entry.id}>
              <i className={`bi ${entry.icon}`} aria-hidden="true" />
              <span>{entry.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {wallEnabled ? (
        <section aria-labelledby="campus-recent-title">
          <div className="campus-section-head">
            <h2 id="campus-recent-title">最近动态</h2>
            <Link to="/wall">全部动态 →</Link>
          </div>
          {previewLoading ? <p className="campus-empty">正在载入最近动态…</p> : null}
          {!previewLoading && !preview.length ? <p className="campus-empty">还没有公开动态。</p> : null}
          {preview.length ? (
            <div className="campus-feed">
              {preview.map((message) => (
                <MessageCard key={message.id} message={message} variant="moments" />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <Modal
        visible={noticeOpen}
        title="观澜中学校园墙公告"
        onClose={closeNotices}
        footer={
          <button className="btn btn-primary" type="button" onClick={closeNotices}>
            我知道了
          </button>
        }
      >
        <div className="swift-announcement-list">
          {notices.map((notice, index) => <NoticeCard notice={notice} key={notice.id || `${notice.timestamp}-${index}`} />)}
        </div>
      </Modal>
    </div>
  )
}
