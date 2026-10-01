import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

const PAGE_SIZE = 10

export default function SavedMessages() {
  const { user, loading: userLoading } = useUser()
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const alert = useAlert()

  const loadFavorites = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const response = await api.userFavorites({ page: nextPage, page_size: PAGE_SIZE })
      const incoming = response.data?.messages || []
      setMessages((current) => append ? [...current, ...incoming] : incoming)
      setPage(response.data?.page || nextPage)
      setTotal(response.data?.total || 0)
      setTotalPages(response.data?.total_pages || 0)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '收藏加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (user) loadFavorites(1, false)
  }, [user?.id])

  if (userLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const handleFavoriteChange = (favorited, messageId) => {
    if (favorited) return
    setMessages((items) => items.filter((item) => Number(item.id) !== Number(messageId)))
    setTotal((value) => Math.max(value - 1, 0))
  }

  return (
    <div className="page page--reading">
      <Link to="/me" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />个人中心</Link>
      <header className="page-head">
        <div className="page-head__text">
          <h1>我的收藏</h1>
          <p>收藏会跟随你的学生账号保存，换设备登录后也能继续查看。</p>
        </div>
        <div className="stat-chip"><b className="tabular">{total}</b><span>已收藏留言</span></div>
      </header>

      {loading ? (
        <div className="feed-list" aria-hidden="true">
          {[1, 2].map((item) => (
            <div className="post" key={item}>
              <div className="skeleton h-11 w-44" />
              <div className="skeleton mt-4 h-20 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && messages.length === 0 ? (
        <EmptyState
          icon="bi-bookmark"
          title="还没有收藏留言"
          action={<Link className="btn btn-primary" to="/wall"><i className="bi bi-chat-square-text" aria-hidden="true" />去逛逛校园动态</Link>}
        >
          在帖子底部点击书签按钮，就能把感兴趣的内容留在这里。
        </EmptyState>
      ) : null}

      <div className="feed-list">
        {messages.map((message) => (
          <MessageCard key={message.id} message={message} onFavoriteChange={handleFavoriteChange} />
        ))}
      </div>

      {page < totalPages ? (
        <div className="text-center mt-6">
          <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => loadFavorites(page + 1, true)}>
            <i className="bi bi-plus-circle" aria-hidden="true" />{loadingMore ? '加载中…' : '加载更多收藏'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
