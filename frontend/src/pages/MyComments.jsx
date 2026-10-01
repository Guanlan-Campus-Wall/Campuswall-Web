import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import FilePreviewModal from '../components/FilePreviewModal.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import { fileType } from '../utils/user'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const PAGE_SIZE = 20

const attachmentIcon = (file) => {
  const type = fileType(file)
  if (type === 'image') return 'bi-image'
  if (type === 'video') return 'bi-camera-video'
  if (type === 'audio') return 'bi-music-note-beamed'
  if (type === 'pdf') return 'bi-file-earmark-pdf'
  return 'bi-paperclip'
}

export default function MyComments() {
  const { user, loading: userLoading } = useUser()
  const [comments, setComments] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [previewFiles, setPreviewFiles] = useState([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const alert = useAlert()

  const loadComments = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const response = await api.userComments({ page: nextPage, page_size: PAGE_SIZE })
      const incoming = response.data?.comments || []
      setComments((current) => append ? [...current, ...incoming] : incoming)
      setPage(response.data?.page || nextPage)
      setTotal(response.data?.total || 0)
      setTotalPages(response.data?.total_pages || 0)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '评论记录加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (user) loadComments(1, false)
  }, [user?.id])

  if (userLoading) {
    return <div className="page-center"><div className="spinner" /></div>
  }
  if (!user) return <Navigate to="/login" replace />

  const openPreview = (files, index) => {
    setPreviewFiles(files)
    setPreviewIndex(index)
    setPreviewOpen(true)
  }

  const deleteComment = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      const response = await api.userDeleteComment(selected.message_id, selected.id)
      if (response.data?.success) {
        setComments((items) => items.filter((comment) => comment.id !== selected.id))
        setTotal((value) => Math.max(value - 1, 0))
        setSelected(null)
        alert.showTopRightAlert('评论已删除', 'success', '操作成功')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page page--reading">
      <Link to="/me" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />个人中心</Link>
      <header className="page-head">
        <div className="page-head__text">
          <h1>我的评论</h1>
          <p>汇总你在不同留言下发表的评论与回复，匿名身份不会因此在公开页面暴露。</p>
        </div>
        <div className="stat-chip"><b className="tabular">{total}</b><span>评论总数</span></div>
      </header>

      {loading ? (
        <div className="feed-list" aria-hidden="true">
          {[1, 2, 3].map((item) => <div className="post" key={item}><div className="skeleton h-5 w-36" /><div className="skeleton mt-3 h-16 w-full" /></div>)}
        </div>
      ) : null}

      {!loading && comments.length === 0 ? (
        <EmptyState
          icon="bi-chat-left-text"
          title="还没有评论记录"
          action={<Link className="btn btn-primary" to="/wall"><i className="bi bi-chat-dots" aria-hidden="true" />去校园动态看看</Link>}
        >
          参与一场友善讨论后，你的评论会汇总在这里。
        </EmptyState>
      ) : null}

      <div className="feed-list">
        {comments.map((comment) => {
          const files = Array.isArray(comment.files) ? comment.files : []
          const destination = comment.message_hidden ? (comment.message_owned ? '/me/posts' : '') : `/wall/message/${comment.message_id}`
          return (
            <article className={`my-comment card${comment.comment_hidden ? ' is-hidden' : ''}`} key={`${comment.message_id}-${comment.id}`}>
              <header className="my-comment__head">
                <span className="my-comment__time"><i className="bi bi-clock" aria-hidden="true" />{comment.timestamp ? dayjs(comment.timestamp).fromNow() : '未知时间'}</span>
                {comment.refer_id ? <span className="badge"><i className="bi bi-reply-fill" aria-hidden="true" />回复</span> : <span className="badge">评论</span>}
                {comment.comment_hidden ? <span className="badge status-danger"><i className="bi bi-eye-slash" aria-hidden="true" />已下架</span> : null}
                <button className="btn btn-ghost btn-icon btn-sm ml-auto" type="button" title="删除这条评论" aria-label="删除这条评论" onClick={() => setSelected(comment)}>
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              </header>

              {comment.comment_hidden ? (
                <div className="info-callout status-danger">
                  <i className="bi bi-eye-slash" aria-hidden="true" />
                  <span>这条评论已被管理员下架：{comment.hidden_reason || '违反社区规范'}</span>
                </div>
              ) : null}

              {comment.refer_id ? (
                <div className="comment__quote">
                  <i className="bi bi-reply-fill" aria-hidden="true" />
                  <b>{comment.refer_floor ? `回复 #${comment.refer_floor} 楼` : '回复一条已删除的评论'}</b>
                  <span>{comment.refer || '评论内容已不可见'}</span>
                </div>
              ) : null}

              {comment.text ? <p className="my-comment__text">{comment.text}</p> : null}

              {files.length ? (
                <div className="chip-row">
                  {files.map((file, index) => (
                    <button className="chip chip--sm" type="button" key={`${file}-${index}`} onClick={() => openPreview(files, index)}>
                      <i className={`bi ${attachmentIcon(file)}`} aria-hidden="true" />
                      <span className="truncate-1" style={{ maxWidth: 160 }}>{file}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={`origin${comment.message_hidden ? ' is-hidden' : ''}`}>
                <i className={`bi ${comment.message_hidden ? 'bi-eye-slash' : 'bi-journal-text'}`} aria-hidden="true" />
                <div>
                  <b>{comment.message_hidden ? '原帖已下架' : '来自原帖'}</b>
                  <p>{comment.message_preview || (comment.message_owned ? '可前往“我的发布”查看下架原因' : '原帖当前无法公开访问')}</p>
                </div>
                {destination ? (
                  <Link className="btn btn-outline btn-sm" to={destination}>
                    {comment.message_hidden ? '我的发布' : '查看原帖'}<i className="bi bi-arrow-up-right" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {page < totalPages ? (
        <div className="text-center mt-6">
          <button className="btn btn-outline" type="button" disabled={loadingMore} onClick={() => loadComments(page + 1, true)}>
            <i className="bi bi-plus-circle" aria-hidden="true" />{loadingMore ? '加载中…' : '加载更多评论'}
          </button>
        </div>
      ) : null}

      <FilePreviewModal files={previewFiles} index={previewIndex} visible={previewOpen} onClose={() => setPreviewOpen(false)} onIndexChange={setPreviewIndex} />
      <Modal
        visible={Boolean(selected)}
        title="删除我的评论"
        width="480px"
        onClose={() => !deleting && setSelected(null)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={deleting} onClick={() => setSelected(null)}>取消</button>
            <button className="btn btn-danger" type="button" disabled={deleting} onClick={deleteComment}>
              <i className="bi bi-trash" aria-hidden="true" />{deleting ? '删除中…' : '确认删除'}
            </button>
          </>
        )}
      >
        <p className="text-soft">删除后评论会立即从公开页面和你的评论列表中移除，由管理员在回收站中统一保留或清理。</p>
      </Modal>
    </div>
  )
}
