import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Modal from '../components/Modal.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import RecentDiscussions from '../components/RecentDiscussions.jsx'
import { campusEntries } from '../components/CampusGuide.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

const emptyRunTime = Object.freeze({ days: 0, hours: 0, minutes: 0, seconds: 0 })

const splitDuration = (milliseconds) => {
  const duration = Math.max(0, milliseconds)
  return {
    days: Math.floor(duration / 86400000),
    hours: Math.floor((duration % 86400000) / 3600000),
    minutes: Math.floor((duration % 3600000) / 60000),
    seconds: Math.floor((duration % 60000) / 1000)
  }
}

const noticeSeenKey = (notice) => {
  if (!notice) return ''
  const identity = notice.id || notice.timestamp || 'latest'
  const revision = Math.max(Number(notice.reminder_revision) || 1, 1)
  return `campuswall:notice:seen:${identity}:${revision}`
}

const isAttentionNotice = (notice) => ['important', 'urgent'].includes(notice?.priority)

export default function Home() {
  const [runTime, setRunTime] = useState(emptyRunTime)
  const [notices, setNotices] = useState([])
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeReadKeys, setNoticeReadKeys] = useState([])
  const alert = useAlert()
  const { community, enabledModuleIds } = usePlatform()
  const { user, loading: userLoading } = useUser()
  const navigate = useNavigate()
  const wallEnabled = enabledModuleIds.has('wall')
  const canPublish = wallEnabled && community.posting_enabled && Boolean(user || community.guest_posting_enabled)
  const publishDisabledReason = !wallEnabled
    ? '校园动态板块当前未启用'
    : !community.posting_enabled
      ? (community.pause_reason || '管理员暂时关闭了发帖功能')
      : '登录后才能发布'
  const visibleServiceEntries = campusEntries.filter((entry) => enabledModuleIds.has(entry.id))

  useEffect(() => {
    const serverTimestamp = Date.parse(community.server_time || '')
    const launchTimestamp = Date.parse(community.site_launched_at || '')
    const clockOffset = Number.isFinite(serverTimestamp) ? serverTimestamp - Date.now() : 0
    const update = () => {
      const correctedNow = Date.now() + clockOffset
      setRunTime(Number.isFinite(launchTimestamp)
        ? splitDuration(correctedNow - launchTimestamp)
        : emptyRunTime)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [community.server_time, community.site_launched_at])

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
            reminder_revision: Math.max(Number(item?.reminder_revision) || 1, 1)
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

  if (userLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (user) return <Navigate to="/wall" replace />

  const triggerPublishModal = () => {
    if (!canPublish) {
      alert.showTopRightAlert(publishDisabledReason, 'warning', '暂时无法发布')
      return
    }
    navigate('/wall', { state: { openPublish: true } })
  }

  return (
    <div className="forum-home">
      <header className="forum-welcome">
        <div><span className="forum-breadcrumb">社区首页 / 观澜中学</span><h1>欢迎来到观澜校园墙</h1><p>聊聊校园日常，分享消息，也可以在这里寻物、提问。</p></div>
        {wallEnabled ? <div className="forum-welcome-actions"><Link className="btn btn-outline" to="/wall">随便看看</Link>{canPublish ? <button className="btn btn-primary" onClick={triggerPublishModal}>发布动态</button> : <Link className="btn btn-primary" to="/login">登录 / 注册</Link>}</div> : null}
      </header>
      {latestNotice ? <section className="forum-announcement" aria-label="校园公告"><NoticeCard notice={latestNotice} compact onClick={openNotices} /></section> : null}
      <div className="forum-home-layout">
        <div className="forum-main">
          {wallEnabled ? <RecentDiscussions /> : null}
          <section className="forum-panel" aria-labelledby="campus-services-title">
            <header className="forum-panel-heading"><h2 id="campus-services-title">板块目录</h2><span>按内容逛逛</span></header>
            <nav className="forum-directory" aria-label="校园功能入口">
              {visibleServiceEntries.map((entry) => <Link className="forum-board-row" to={entry.to} key={entry.id}><span className={`entry-symbol tone-${entry.tone}`} aria-hidden="true"><i className={`bi ${entry.icon}`} /></span><span><strong>{entry.label}</strong><small>{entry.description}</small></span><i className={`bi ${entry.id === 'lost-found' ? 'bi-lock' : 'bi-chevron-right'}`} aria-hidden="true" /></Link>)}
            </nav>
          </section>
        </div>
        <aside className="forum-sidebar" aria-label="关于社区">
          <section className="forum-panel forum-about" aria-labelledby="about-campus-wall-title">
            <div className="forum-school"><img src="/school-badge.webp" alt="" width="40" height="40" /><div><h2 id="about-campus-wall-title">关于本站</h2><span>观澜中学 · 学生搭建与维护</span></div></div>
            <p>一个供观澜师生交流的地方。欢迎分享日常、发起讨论，或给网站提点建议。</p>
            {enabledModuleIds.has('help') ? <Link className="btn btn-outline forum-contact" to="/help/form"><i className="bi bi-envelope" aria-hidden="true" />联系我<i className="bi bi-arrow-up-right" aria-hidden="true" /></Link> : null}
            <div className="forum-runtime" title="自 2026 年 8 月 25 日首次上线起计算"><span className="campus-dot" />已运行 {runTime.days} 天 <span className="runtime-clock">{String(runTime.hours).padStart(2, '0')}:{String(runTime.minutes).padStart(2, '0')}:{String(runTime.seconds).padStart(2, '0')}</span></div>
          </section>
          {enabledModuleIds.has('help') ? <section className="forum-panel forum-side-note"><h2>发帖前看一眼</h2><ul><li>请勿公开他人的个人信息。</li><li>讨论事情，避免人身攻击。</li><li>寻物请写清时间与地点。</li></ul><Link to="/rules">社区公约 <i className="bi bi-chevron-right" aria-hidden="true" /></Link></section> : null}
          <p className="forum-sidebar-footer">龙华区观澜中学<br />校园墙 · 始于 2026</p>
        </aside>
      </div>

      {/* System Announcement Modal */}
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
