import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'

const PAGE_SIZE = 10

export default function MyPosts() {
  const { user, loading: userLoading } = useUser()
  const { community } = usePlatform()
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editAnonymous, setEditAnonymous] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)
  const alert = useAlert()
  const canEdit = community.posting_enabled

  const loadMessages = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const response = await api.userMessages({ page: nextPage, page_size: PAGE_SIZE })
      const incoming = response.data?.messages || []
      setMessages((current) => append ? [...current, ...incoming] : incoming)
      setPage(response.data?.page || nextPage)
      setTotal(response.data?.total || 0)
      setTotalPages(response.data?.total_pages || 0)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '发布记录加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (user) loadMessages(1, false)
  }, [user?.id])

  if (userLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const deleteMessage = async () => {
    if (!selectedMessage) return
    setDeleting(true)
    try {
      const response = await api.userDeleteMessage(selectedMessage.id)
      if (response.data?.success) {
        setMessages((items) => items.filter((item) => item.id !== selectedMessage.id))
        setTotal((value) => Math.max(value - 1, 0))
        setSelectedMessage(null)
        alert.showTopRightAlert('留言已删除', 'success', '操作成功')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const openEditor = (message) => {
    setEditingMessage(message)
    setEditText(message.text || '')
    setEditTags((message.tags || []).join(', '))
    setEditAnonymous(message.anonymous !== false)
  }

  const saveEdit = async () => {
    if (!editingMessage) return
    const tags = [...new Set(editTags.split(',').map((tag) => tag.trim()).filter(Boolean))]
    if (!editText.trim() && !(editingMessage.files || []).length && !editingMessage.poll) {
      alert.showTopRightAlert('留言内容不能为空', 'warning', '无法保存')
      return
    }
    if (tags.length > 8 || tags.some((tag) => tag.length > 50)) {
      alert.showTopRightAlert('最多填写 8 个标签，每个标签不超过 50 个字符', 'warning', '标签不符合要求')
      return
    }
    setSavingEdit(true)
    try {
      const response = await api.userUpdateMessage(editingMessage.id, {
        text: editText.trim(),
        tags: tags.join(','),
        anonymous: editAnonymous
      })
      if (response.data?.success) {
        setMessages((items) => items.map((item) => item.id === editingMessage.id ? response.data.message : item))
        setEditingMessage(null)
        const pendingReview = response.data.message?.moderation_status === 'pending'
        alert.showTopRightAlert(
          pendingReview ? '修改已保存，留言已重新进入审核' : '留言修改已保存',
          'success',
          pendingReview ? '等待审核' : '保存成功'
        )
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '保存失败')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="page page--reading">
      <Link to="/me" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />个人中心</Link>
      <header className="page-head">
        <div className="page-head__text">
          <h1>我的发布</h1>
          <p>这里会显示当前账号发布的全部内容，包括公开页面无法追溯身份的匿名留言。</p>
        </div>
        <div className="stat-chip"><b className="tabular">{total}</b><span>发布总数</span></div>
      </header>

      {!canEdit ? (
        <div className="info-callout status-warning mb-4"><i className="bi bi-info-circle-fill" aria-hidden="true" /><span>{community.pause_reason || '管理员暂时关闭了发帖与留言编辑功能'}</span></div>
      ) : null}

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
          icon="bi-journal-text"
          title="还没有发布记录"
          action={<Link className="btn btn-primary" to="/wall"><i className="bi bi-pencil-square" aria-hidden="true" />去发布留言</Link>}
        >
          写下第一条校园动态，它会出现在这里。
        </EmptyState>
      ) : null}

      <div className="feed-list">
        {messages.map((message) => (
          <section className="own-post" key={message.id}>
            <div className="own-post__meta">
              <span><i className={`bi ${message.anonymous === false ? 'bi-person-check-fill' : 'bi-incognito'}`} aria-hidden="true" />{message.anonymous === false ? '展示昵称发布' : '匿名发布'}</span>
              <small>仅你和管理员可确认归属</small>
            </div>
            {message.moderation_status === 'pending' ? (
              <div className="info-callout status-warning">
                <i className="bi bi-hourglass-split" aria-hidden="true" />
                <span>这条留言正在等待管理员审核，通过后才会出现在公开页面。</span>
              </div>
            ) : null}
            <MessageCard message={message} onEditRequest={canEdit ? openEditor : undefined} onDeleteRequest={setSelectedMessage} />
          </section>
        ))}
      </div>

      {page < totalPages ? (
        <div className="text-center mt-6">
          <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => loadMessages(page + 1, true)}>
            <i className="bi bi-plus-circle" aria-hidden="true" />{loadingMore ? '加载中…' : '加载更多发布'}
          </button>
        </div>
      ) : null}

      <Modal
        visible={Boolean(selectedMessage)}
        title="删除我的留言"
        width="480px"
        onClose={() => !deleting && setSelectedMessage(null)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={deleting} onClick={() => setSelectedMessage(null)}>取消</button>
            <button className="btn btn-danger" type="button" disabled={deleting} onClick={deleteMessage}>
              <i className="bi bi-trash" aria-hidden="true" />{deleting ? '删除中…' : '确认删除'}
            </button>
          </>
        )}
      >
        <p className="text-soft">删除后留言会立即从公开页面和你的发布列表中移除，由管理员在回收站中统一保留或清理。</p>
      </Modal>

      <Modal
        visible={Boolean(editingMessage)}
        title="编辑我的留言"
        width="680px"
        onClose={() => !savingEdit && setEditingMessage(null)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={savingEdit} onClick={() => setEditingMessage(null)}>取消</button>
            <button className="btn btn-primary" type="button" disabled={savingEdit} onClick={saveEdit}>
              <i className="bi bi-check-circle" aria-hidden="true" />{savingEdit ? '保存中…' : '保存修改'}
            </button>
          </>
        )}
      >
        <div className="form-stack">
          {editingMessage?.moderation_status === 'hidden' ? (
            <div className="info-callout status-warning">
              <i className="bi bi-eye-slash" aria-hidden="true" />
              <div><b>这条留言仍处于下架状态</b><small>修改内容不会自动恢复展示，请等待管理员复核。</small></div>
            </div>
          ) : null}
          {editingMessage?.moderation_status === 'pending' ? (
            <div className="info-callout status-warning">
              <i className="bi bi-hourglass-split" aria-hidden="true" />
              <div><b>这条留言正在等待审核</b><small>保存修改后仍需管理员通过才会公开。</small></div>
            </div>
          ) : null}

          <label>
            <span className="field-label">留言内容</span>
            <textarea style={{ minHeight: 160 }} value={editText} maxLength={2000} onChange={(event) => setEditText(event.target.value)} placeholder="写下留言内容" />
            <span className="field-hint text-right tabular">{editText.length} / 2000</span>
          </label>

          <label>
            <span className="field-label">标签</span>
            <input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="多个标签使用英文逗号分隔" />
            <span className="field-hint">最多 8 个标签。附件与投票内容保持原样。</span>
          </label>

          <label className="check-row card-flat p-4">
            <input type="checkbox" checked={editAnonymous} onChange={(event) => setEditAnonymous(event.target.checked)} />
            <span>
              <b className="text-ink">匿名发布</b><br />
              <small className="text-muted">{editAnonymous ? '公开页面不会显示你的昵称' : `公开页面将显示“${user.nickname || '未设置昵称'}”`}</small>
            </span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
