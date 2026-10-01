import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const PAGE_SIZE = 20

const notificationMeta = (notification) => {
  if (notification.type === 'reply') {
    return { icon: 'bi-reply-fill', tone: 'sky', title: '有人回复了你的评论', action: '查看回复', destination: notification.message_id ? `/wall/message/${notification.message_id}` : '/me/posts' }
  }
  if (notification.type === 'featured') {
    return { icon: 'bi-star-fill', tone: 'kraft', title: '你的留言被设为精华', action: '查看留言', destination: notification.message_id ? `/wall/message/${notification.message_id}` : '/me/posts' }
  }
  if (notification.type === 'moderation') {
    return { icon: 'bi-shield-exclamation', tone: 'fig', title: '你的留言状态有更新', action: '查看我的发布', destination: '/me/posts' }
  }
  if (notification.type === 'comment_moderation') {
    return { icon: 'bi-shield-exclamation', tone: 'fig', title: '你的评论状态有更新', action: '查看我的评论', destination: '/me/comments' }
  }
  return { icon: 'bi-chat-dots', tone: 'olive', title: '有人评论了你的留言', action: '查看留言', destination: notification.message_id ? `/wall/message/${notification.message_id}` : '/me/posts' }
}

export default function Notifications() {
  const { user, loading: userLoading, setNotificationUnread } = useUser()
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()
  const alert = useAlert()

  const loadNotifications = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const response = await api.userNotifications({ page: nextPage, page_size: PAGE_SIZE })
      const incoming = response.data?.notifications || []
      setNotifications((current) => append ? [...current, ...incoming] : incoming)
      setPage(response.data?.page || nextPage)
      setTotal(response.data?.total || 0)
      setTotalPages(response.data?.total_pages || 0)
      setUnread(response.data?.unread || 0)
      setNotificationUnread(response.data?.unread || 0)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '通知加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (user) loadNotifications(1, false)
  }, [user?.id])

  if (userLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.userMarkNotificationRead(notification.id)
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
        setUnread((value) => Math.max(value - 1, 0))
        setNotificationUnread((value) => Math.max(value - 1, 0))
      } catch {}
    }
    navigate(notificationMeta(notification).destination)
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.userMarkAllNotificationsRead()
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
      setUnread(0)
      setNotificationUnread(0)
      alert.showTopRightAlert('所有通知已标记为已读', 'success', '操作成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '操作失败')
    } finally {
      setMarkingAll(false)
    }
  }

  const deleteNotification = async (notification) => {
    setDeletingId(notification.id)
    try {
      await api.userDeleteNotification(notification.id)
      setNotifications((items) => items.filter((item) => item.id !== notification.id))
      const nextTotal = Math.max(total - 1, 0)
      setTotal(nextTotal)
      setTotalPages(Math.ceil(nextTotal / PAGE_SIZE))
      if (!notification.is_read) {
        setUnread((value) => Math.max(value - 1, 0))
        setNotificationUnread((value) => Math.max(value - 1, 0))
      }
      alert.showTopRightAlert('通知已删除', 'success', '操作成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const clearNotifications = async () => {
    setClearing(true)
    try {
      await api.userClearNotifications()
      setNotifications([])
      setPage(1)
      setTotal(0)
      setTotalPages(0)
      setUnread(0)
      setNotificationUnread(0)
      setClearOpen(false)
      alert.showTopRightAlert('通知已清空', 'success', '操作成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '清空失败')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="page page--reading">
      <Link to="/me" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />个人中心</Link>
      <header className="page-head">
        <div className="page-head__text">
          <h1>消息通知</h1>
          <p>评论、回复与内容状态的提醒都在这里。</p>
        </div>
        <div className="page-head__actions">
          {unread ? (
            <button className="btn btn-primary btn-sm" type="button" disabled={markingAll} onClick={markAllRead}>
              <i className="bi bi-check-all" aria-hidden="true" />{markingAll ? '处理中…' : `全部已读（${unread}）`}
            </button>
          ) : null}
          {total ? (
            <button className="btn btn-outline btn-sm" type="button" onClick={() => setClearOpen(true)}>
              <i className="bi bi-trash3" aria-hidden="true" />清空
            </button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="card notif-list" aria-hidden="true">
          {[1, 2, 3].map((item) => <div className="skeleton m-4 h-16" key={item} />)}
        </div>
      ) : null}

      {!loading && notifications.length === 0 ? (
        <EmptyState icon="bi-inbox" title="暂时没有通知">新的互动与内容状态提醒会显示在这里。</EmptyState>
      ) : null}

      {notifications.length ? (
        <section className="card notif-list" aria-label="通知列表">
          {notifications.map((notification) => {
            const meta = notificationMeta(notification)
            return (
              <article className={`notif${notification.is_read ? '' : ' is-unread'}`} key={notification.id}>
                <button className="notif__open" type="button" onClick={() => openNotification(notification)}>
                  <span className={`tile-icon tone-${meta.tone}`}><i className={`bi ${meta.icon}`} aria-hidden="true" /></span>
                  <span className="notif__copy">
                    <span className="notif__top">
                      <b>{meta.title}</b>
                      <time>{dayjs(notification.created_at).fromNow()}</time>
                    </span>
                    <span className="notif__text">{notification.content || '查看最新回复'}</span>
                    <span className="notif__action">{meta.action} <i className="bi bi-arrow-right" aria-hidden="true" /></span>
                  </span>
                  {!notification.is_read ? <span className="notif__dot" aria-label="未读" /> : null}
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  type="button"
                  title="删除这条通知"
                  aria-label="删除这条通知"
                  disabled={deletingId === notification.id}
                  onClick={() => deleteNotification(notification)}
                >
                  <i className={`bi ${deletingId === notification.id ? 'bi-hourglass-split' : 'bi-trash3'}`} aria-hidden="true" />
                </button>
              </article>
            )
          })}
        </section>
      ) : null}

      {page < totalPages ? (
        <div className="text-center mt-6">
          <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => loadNotifications(page + 1, true)}>
            <i className="bi bi-plus-circle" aria-hidden="true" />{loadingMore ? '加载中…' : '加载更多通知'}
          </button>
        </div>
      ) : null}

      <Modal
        visible={clearOpen}
        title="清空全部通知"
        width="480px"
        onClose={() => !clearing && setClearOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={clearing} onClick={() => setClearOpen(false)}>取消</button>
            <button className="btn btn-danger" type="button" disabled={clearing} onClick={clearNotifications}>
              <i className="bi bi-trash3" aria-hidden="true" />{clearing ? '清空中…' : '确认清空'}
            </button>
          </>
        )}
      >
        <p className="text-soft">清空后无法恢复，所有已读和未读通知都会被删除。</p>
      </Modal>
    </div>
  )
}
