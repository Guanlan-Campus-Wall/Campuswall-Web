import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Modal from '../components/Modal.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
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
    <div className="campus-home">
      <section className="campus-welcome" aria-labelledby="home-welcome-title">
        <div className="welcome-copy">
          <span className="campus-eyebrow"><span className="campus-dot" /> 龙华区观澜中学 · 我们的校园社区</span>
          <h1>校园里的小事，<br /><em>都值得被看见。</em></h1>
          <h2 id="home-welcome-title">欢迎来到校园墙</h2>
          <p className="welcome-description">分享日常、传递心意、寻找失物。<br />从一句「你好」开始，让我们的校园更近一点。</p>

          {wallEnabled ? (
            <div className="welcome-actions">
              <Link to="/wall" className="btn btn-primary">
                <span>浏览校园动态</span>
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
              {canPublish ? (
                <button type="button" className="btn btn-outline" onClick={triggerPublishModal} title="快速发帖">
                  <i className="bi bi-pencil-square" aria-hidden="true" />
                  <span>发布动态</span>
                </button>
              ) : (
                <Link to="/login" className="btn btn-outline">
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  <span>登录参与</span>
                </Link>
              )}
            </div>
          ) : null}

          <div
            className="campus-runtime"
            aria-label={`本站已上线 ${runTime.days} 天 ${runTime.hours} 小时 ${runTime.minutes} 分钟 ${runTime.seconds} 秒`}
            title="自 2026 年 8 月 25 日 01:48:50（北京时间）首次公开访问起计算"
          >
            <i className="bi bi-clock" aria-hidden="true" />
            <span>已陪伴校园 {runTime.days} 天 <span className="runtime-clock">{String(runTime.hours).padStart(2, '0')}:{String(runTime.minutes).padStart(2, '0')}:{String(runTime.seconds).padStart(2, '0')}</span></span>
          </div>
        </div>
        <div className="welcome-board" aria-hidden="true">
          <div className="board-heading"><span>校园生活手记</span><span>GUANLAN / 日常</span></div>
          <div className="board-orbit" />
          <div className="board-note note-main"><span className="note-pin" /><i className="bi bi-chat-square-heart" /><span>今天，校园里<br />有什么新鲜事？</span><small>每一种声音，都值得被听见</small></div>
          <div className="board-note note-heart"><i className="bi bi-heart" /><span>把心意<br />说给你听。</span></div>
          <div className="board-note note-together"><i className="bi bi-people" /><span>很高兴，<br />在这里遇见你。</span></div>
          <span className="board-caption">把平凡的日子，写成我们的故事。</span>
        </div>
      </section>

      {latestNotice ? (
        <section className="campus-announcement" aria-labelledby="campus-announcement-title">
          <h2 id="campus-announcement-title" className="sr-only">校园公告</h2>
          <NoticeCard notice={latestNotice} compact onClick={openNotices} />
        </section>
      ) : null}

      <section className="campus-section" aria-labelledby="campus-services-title">
        <div className="campus-section-heading">
          <div><span className="campus-eyebrow">EXPLORE CAMPUS</span><h2 id="campus-services-title">在这里，连接校园生活</h2></div>
          <span>找到你想去的地方 <i className="bi bi-arrow-right" aria-hidden="true" /></span>
        </div>

        <nav className="campus-entry-grid" aria-label="校园功能入口">
          {visibleServiceEntries.map((entry) => (
            <Link className="campus-entry" to={entry.to} key={entry.id}>
              <span className={`entry-symbol tone-${entry.tone}`} aria-hidden="true"><i className={`bi ${entry.icon}`} /></span>
              <i className="bi bi-arrow-up-right entry-arrow" aria-hidden="true" />
              <h3>{entry.label}</h3>
              <p>{entry.description}</p>
              <small>{entry.id === 'lost-found' ? '登录后查看' : '去看看'} <i className={`bi ${entry.id === 'lost-found' ? 'bi-lock' : 'bi-arrow-right'}`} aria-hidden="true" /></small>
            </Link>
          ))}
        </nav>
      </section>

      <section className="campus-about" aria-labelledby="about-campus-wall-title">
        <div className="about-heading">
          <span className="campus-eyebrow">MADE BY STUDENTS</span>
          <h2 id="about-campus-wall-title">关于本站</h2>
          <span className="about-signature">一面墙，连接你我。</span>
        </div>
        <div className="about-copy">
          <p>
            龙华区观澜中学校园墙由学生自主搭建与维护，旨在为师生提供一个平等、自由、温馨的交流互动平台。
            欢迎大家提出宝贵建议，共同建设美好的校园社区。
          </p>
          <nav className="about-links" aria-label="关于本站链接">
            <a href="https://github.com/ZONGRUICHD/Campus-Wall-For-GuanLan" target="_blank" rel="noreferrer">
              <i className="bi bi-github" aria-hidden="true" /><span>开源代码仓库</span><i className="bi bi-arrow-up-right" aria-hidden="true" />
            </a>
            {enabledModuleIds.has('help') ? (
              <>
                <Link to="/rules"><i className="bi bi-file-earmark-ruled" aria-hidden="true" /><span>社区公约</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
                <Link to="/help"><i className="bi bi-envelope" aria-hidden="true" /><span>联系站长</span><i className="bi bi-chevron-right" aria-hidden="true" /></Link>
              </>
            ) : null}
          </nav>
        </div>
      </section>

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
