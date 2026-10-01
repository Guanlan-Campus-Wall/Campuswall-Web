import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import api from '../services/api'
import { fileType, fileUrl, messageAuthor } from '../utils/user'
import UserCard from './UserCard.jsx'
import FilePreviewModal from './FilePreviewModal.jsx'
import Menu from './Menu.jsx'
import Modal from './Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const FEED_MEDIA_LIMIT = 9

function Attachment({ file, index, onClick, remaining = 0 }) {
  const type = fileType(file)
  const more = remaining > 0 ? <span className="media__more">+{remaining}</span> : null

  if (type === 'image') {
    return (
      <button className="media__item" type="button" onClick={onClick} aria-label={`预览第 ${index + 1} 张图片`}>
        <img src={fileUrl(file, true)} alt={`留言图片 ${index + 1}`} loading="lazy" />
        {more}
      </button>
    )
  }
  if (type === 'video') {
    return (
      <button className="media__item is-video" type="button" onClick={onClick} aria-label={`预览第 ${index + 1} 个视频`}>
        <video muted playsInline preload="metadata">
          <source src={fileUrl(file, true)} />
        </video>
        <span className="media__play" aria-hidden="true"><i className="bi bi-play-fill" /></span>
        {more}
      </button>
    )
  }
  return (
    <button className="media__item is-file" type="button" onClick={onClick}>
      <span className="media__file-icon" aria-hidden="true">
        <i className={`bi ${type === 'audio' ? 'bi-music-note-beamed' : 'bi-file-earmark-text'}`} />
      </span>
      <span>{type === 'audio' ? '音频播放' : '查看附件'}</span>
      {more}
    </button>
  )
}

function lostFoundField(text, label) {
  const line = String(text || '').split('\n').find((entry) => entry.startsWith(`${label}：`) || entry.startsWith(`${label}:`))
  return line ? line.replace(/^[^：:]+[：:]/, '').trim() : ''
}

function describeLostFound(item) {
  const structured = item?.lost_found && typeof item.lost_found === 'object' ? item.lost_found : {}
  const tags = Array.isArray(item?.tags) ? item.tags : []
  const kind = structured.kind || (tags.includes('招领启事') ? 'found' : 'lost')
  const resolved = Boolean(structured.resolved) || tags.includes('已找回')
  return {
    kind,
    resolved,
    itemName: structured.item || lostFoundField(item?.text, '物品'),
    location: structured.location || lostFoundField(item?.text, '地点'),
    eventTime: structured.time || lostFoundField(item?.text, '时间'),
    details: structured.details || lostFoundField(item?.text, '特征与说明'),
    contact: structured.contact || lostFoundField(item?.text, '联系'),
    status: resolved ? '已找回' : (kind === 'found' ? '待认领' : '寻找中')
  }
}

function PollBlock({ poll, busy, onVote }) {
  if (!poll) return null
  const totalVotes = Number(poll.total_votes || 0)
  const hasVoted = Boolean(poll.has_voted || poll.selected_option_id)
  const isClosed = Boolean(poll.is_closed || (poll.closes_at && dayjs(poll.closes_at).isBefore(dayjs())))
  const showResults = hasVoted || isClosed

  return (
    <section className="poll" aria-label={`投票：${poll.question}`}>
      <div className="poll__head">
        <div>
          <span className="poll__kicker"><i className="bi bi-ui-radios-grid" aria-hidden="true" />单选投票</span>
          <h3>{poll.question}</h3>
        </div>
        <span className={`badge ${isClosed ? 'status-warning' : 'status-success'}`}>{isClosed ? '已结束' : '进行中'}</span>
      </div>
      <div className="poll__options">
        {(poll.options || []).map((option) => {
          const selected = poll.selected_option_id === option.id
          const percent = totalVotes > 0 ? Math.round((Number(option.votes || 0) / totalVotes) * 100) : 0
          return (
            <button
              className={`poll__option${selected ? ' is-selected' : ''}`}
              type="button"
              key={option.id}
              disabled={busy || hasVoted || isClosed}
              aria-pressed={selected}
              onClick={() => onVote(option.id)}
            >
              {showResults ? <span className="poll__bar" style={{ width: `${percent}%` }} /> : null}
              <span className="poll__label">
                <i className={`bi ${selected ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" />
                <span>{option.text}</span>
              </span>
              {showResults ? <b className="poll__percent">{percent}%</b> : null}
            </button>
          )
        })}
      </div>
      <div className="poll__foot">
        <span>{totalVotes} 人参与{!showResults && !isClosed ? '，选择一项后查看结果' : ''}</span>
        {poll.closes_at ? <span>{isClosed ? '结束于' : '截止'} {dayjs(poll.closes_at).format('MM月DD日 HH:mm')}</span> : <span>长期有效</span>}
      </div>
    </section>
  )
}

export default function MessageCard({ message, compact = false, variant = 'default', onRefresh, onEditRequest, onDeleteRequest, onFavoriteChange }) {
  const [item, setItem] = useState(message)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFiles, setPreviewFiles] = useState([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [deletingComment, setDeletingComment] = useState(false)
  const commentInputRef = useRef(null)
  const textRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [pollBusy, setPollBusy] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [textExpanded, setTextExpanded] = useState(false)
  const [textOverflows, setTextOverflows] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const alert = useAlert()
  const { community } = usePlatform()
  const { user, isFavorite, toggleFavorite } = useUser()
  const location = useLocation()

  useEffect(() => {
    setItem(message)
    setTextExpanded(false)
    setCommentsExpanded(false)
  }, [message])

  const files = item.files || []
  const isFeed = variant === 'moments'
  const isLostFound = variant === 'lost-found' || Boolean(item.lost_found)
  const isCompactFeed = isFeed || isLostFound
  const lostFound = isLostFound ? describeLostFound(item) : null
  const visibleFiles = isCompactFeed ? files.slice(0, FEED_MEDIA_LIMIT) : files
  const comments = item.comments || []
  const visibleComments = isCompactFeed && !commentsExpanded ? comments.slice(0, 2) : comments
  const author = useMemo(() => messageAuthor(item), [item])
  const isHidden = item.moderation_status === 'hidden'
  const isPending = item.moderation_status === 'pending'
  const isUnavailable = isHidden || isPending
  const unavailableActionText = isPending ? '待审核的留言暂时不能互动' : '已下架的留言不能互动'
  const guestNeedsLogin = !user && !community.guest_commenting_enabled
  const canComment = community.commenting_enabled && Boolean(user || community.guest_commenting_enabled)
  const commentDisabledReason = !community.commenting_enabled
    ? (community.pause_reason || '管理员暂时关闭了评论功能')
    : '登录后才能评论'
  const postedAgo = item.timestamp ? dayjs(item.timestamp).fromNow() : '刚刚'
  const visibilityLabel = item.anonymous === false ? '展示昵称' : '匿名'
  const authorSubtitle = `${postedAgo} · ${visibilityLabel}`
  const favorited = isFavorite(item.id)
  const bodyText = isLostFound
    ? (lostFound.details || (!lostFound.itemName ? item.text : ''))
    : item.text
  const mediaCount = Math.min(visibleFiles.length, FEED_MEDIA_LIMIT)
  const mediaCols = mediaCount === 1 ? 1 : (mediaCount === 2 || mediaCount === 4 ? 2 : 3)
  const clampText = isCompactFeed && !textExpanded && !compact

  useLayoutEffect(() => {
    const node = textRef.current
    if (!node || textExpanded) {
      setTextOverflows(false)
      return
    }
    setTextOverflows(node.scrollHeight > node.clientHeight + 1)
  }, [bodyText, compact, textExpanded])

  const react = async (kind) => {
    const call = kind === 'like' ? api.likeMessage : api.dislikeMessage
    try {
      const res = await call(item.id)
      if (res.data?.success) {
        const reaction = Number(res.data.reaction || 0)
        setItem((prev) => ({
          ...prev,
          likes: res.data.likes ?? prev.likes,
          dislikes: res.data.dislikes ?? prev.dislikes,
          liked: reaction === 1,
          disliked: reaction === -1
        }))
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', kind === 'like' ? '点赞失败' : '点踩失败')
    }
  }

  const handleFavorite = async () => {
    if (favoriteBusy) return
    setFavoriteBusy(true)
    try {
      const nowFavorited = await toggleFavorite(item.id)
      alert.showTopRightAlert(nowFavorited ? '已加入「我的收藏」' : '已取消收藏', 'success', nowFavorited ? '收藏成功' : '已取消')
      onFavoriteChange?.(nowFavorited, item.id)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '收藏失败')
    } finally {
      setFavoriteBusy(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/wall/message/${item.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: '校园墙留言',
          text: String(item.text || '分享一条校园墙留言').slice(0, 100),
          url
        })
        return
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        alert.showTopRightAlert('留言链接已复制到剪贴板', 'success', '分享成功')
      } else {
        alert.showTopRightAlert(url, 'info', '分享链接')
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      alert.showTopRightAlert(url, 'info', '分享链接')
    }
  }

  const votePoll = async (optionId) => {
    if (pollBusy) return
    setPollBusy(true)
    try {
      const response = await api.votePoll(item.id, optionId)
      const data = response.data || {}
      if (data.poll) {
        setItem((previous) => ({
          ...previous,
          poll: {
            ...data.poll,
            selected_option_id: data.selected_option_id || null,
            has_voted: Boolean(data.selected_option_id),
            is_closed: Boolean(data.poll.closes_at && dayjs(data.poll.closes_at).isBefore(dayjs()))
          }
        }))
      }
      if (data.success) alert.showTopRightAlert('投票成功，结果已更新', 'success', '已投票')
      else alert.showTopRightAlert(data.error || '投票失败', 'warning', '无法投票')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '投票失败')
    } finally {
      setPollBusy(false)
    }
  }

  const submitComment = async () => {
    if (!canComment) {
      alert.showTopRightAlert(commentDisabledReason, 'warning', '暂时无法评论')
      return
    }
    if (!commentText.trim()) {
      alert.showTopRightAlert('评论内容不能为空', 'warning', '提示')
      return
    }
    setBusy(true)
    try {
      const res = await api.commentMessage(item.id, {
        text: commentText.trim(),
        refer_id: replyTarget?.id || ''
      })
      if (res.data?.success) {
        setItem((prev) => ({ ...prev, comments: [...(prev.comments || []), res.data.comment] }))
        setCommentText('')
        setReplyTarget(null)
        alert.showTopRightAlert('评论成功', 'success', '成功')
        onRefresh?.(item.id)
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '评论失败')
    } finally {
      setBusy(false)
    }
  }

  const openFilePreview = (targetFiles, index) => {
    setPreviewFiles(targetFiles)
    setPreviewIndex(index)
    setPreviewOpen(true)
  }

  const startReply = (comment, index) => {
    setReplyTarget({
      id: comment.id,
      floor: index + 1,
      text: String(comment.text || '附件评论').trim() || '附件评论'
    })
    setCommentOpen(true)
    window.setTimeout(() => commentInputRef.current?.focus(), 0)
  }

  const replyFloor = (commentId) => {
    const index = comments.findIndex((comment) => String(comment.id) === String(commentId))
    return index >= 0 ? `#${index + 1} 楼` : '一条已删除的评论'
  }

  const deleteOwnComment = async () => {
    if (!commentToDelete) return
    setDeletingComment(true)
    try {
      const response = await api.userDeleteComment(item.id, commentToDelete.id)
      if (response.data?.success) {
        setItem((previous) => ({
          ...previous,
          comments: (previous.comments || []).filter((comment) => comment.id !== commentToDelete.id)
        }))
        if (replyTarget?.id === commentToDelete.id) setReplyTarget(null)
        setCommentToDelete(null)
        alert.showTopRightAlert('评论已删除', 'success', '操作成功')
        onRefresh?.(item.id)
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '删除失败')
    } finally {
      setDeletingComment(false)
    }
  }

  return (
    <article className={`post${isFeed ? ' is-feed' : ''}${isLostFound ? ' is-lost-found' : ''}${isUnavailable ? ' is-unavailable' : ''}`}>
      <header className="post__head">
        <UserCard user={author} compact hideDescription subtitle={authorSubtitle} />
        <div className="post__flags">
          {item.pinned ? <span className="badge status-warning"><i className="bi bi-pin-angle" aria-hidden="true" />置顶</span> : null}
          {item.featured ? <span className="badge status-success"><i className="bi bi-star-fill" aria-hidden="true" />精华</span> : null}
          {item.edited_at ? <span className="badge" title={`编辑于 ${item.edited_at}`}>已编辑</span> : null}
        </div>
        <Menu label="更多操作">
          <button className="menu__item" type="button" onClick={handleShare} disabled={isUnavailable}>
            <i className="bi bi-share" aria-hidden="true" />分享
          </button>
          {!isUnavailable ? (
            <>
              <Link className="menu__item" to={`/wall/message/${item.id}`}><i className="bi bi-arrow-up-right" aria-hidden="true" />查看详情</Link>
              <Link className="menu__item" to={`/help/report/${item.id}`}><i className="bi bi-flag" aria-hidden="true" />举报违规</Link>
            </>
          ) : null}
          {onEditRequest ? (
            <button className="menu__item" type="button" onClick={() => onEditRequest(item)}><i className="bi bi-pencil" aria-hidden="true" />编辑</button>
          ) : null}
          {onDeleteRequest ? (
            <button className="menu__item is-danger" type="button" onClick={() => onDeleteRequest(item)}><i className="bi bi-trash" aria-hidden="true" />删除</button>
          ) : null}
        </Menu>
      </header>

      <div className="post__body">
        {isUnavailable ? (
          <div className="post__notice" role="status">
            <i className={`bi ${isPending ? 'bi-hourglass-split' : 'bi-eye-slash'}`} aria-hidden="true" />
            <div>
              <b>{isPending ? '这条留言正在等待审核' : '这条留言已被管理员下架'}</b>
              <p>{isPending ? '通过后才会出现在公开页面。' : (item.hidden_reason || '违反社区规范')}</p>
            </div>
          </div>
        ) : null}

        {isLostFound ? (
          <div className="lf">
            <div className="lf__top">
              <span className={`lf__kind lf__kind--${lostFound.kind}`}>
                <i className={`bi ${lostFound.kind === 'found' ? 'bi-inbox' : 'bi-search'}`} aria-hidden="true" />
                {lostFound.kind === 'found' ? '招领启事' : '寻物启事'}
              </span>
              <span className={`badge ${lostFound.resolved ? 'status-success' : 'status-warning'}`}>{lostFound.status}</span>
            </div>
            <h3 className="lf__title">{lostFound.itemName || (lostFound.kind === 'found' ? '招领启事' : '寻物启事')}</h3>
            <ul className="lf__facts">
              <li><i className="bi bi-geo-alt" aria-hidden="true" /><span>{lostFound.location || '地点未填写'}</span></li>
              {lostFound.eventTime ? <li><i className="bi bi-clock" aria-hidden="true" /><span>{lostFound.kind === 'found' ? '拾获' : '丢失'} · {lostFound.eventTime}</span></li> : null}
              {lostFound.contact ? <li><i className="bi bi-chat-dots" aria-hidden="true" /><span>{lostFound.contact}</span></li> : null}
            </ul>
          </div>
        ) : null}

        {bodyText ? (
          <div className="post__text-wrap">
            <p ref={textRef} className={`post__text${compact ? ' clamp-3' : ''}${clampText ? ' clamp-6' : ''}`}>{bodyText}</p>
            {isCompactFeed && textOverflows && !textExpanded && !compact ? (
              <button className="post__more" type="button" onClick={() => setTextExpanded(true)}>展开全文</button>
            ) : null}
          </div>
        ) : null}

        <PollBlock poll={item.poll} busy={pollBusy} onVote={votePoll} />

        {files.length ? (
          <div className={`media media--${mediaCols}${mediaCount === 1 ? ' is-single' : ''}`}>
            {visibleFiles.map((file, index) => (
              <Attachment
                key={`${file}-${index}`}
                file={file}
                index={index}
                remaining={isCompactFeed && index === FEED_MEDIA_LIMIT - 1 ? Math.max(0, files.length - FEED_MEDIA_LIMIT) : 0}
                onClick={() => openFilePreview(files, index)}
              />
            ))}
          </div>
        ) : null}

        {item.tags?.length ? (
          <div className="post__tags">
            {item.tags.map((tag) => (
              <Link className="tag" key={tag} to={`/p/${encodeURIComponent(tag)}`}>#{tag}</Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="post__bar">
        <button
          className={`react${item.liked ? ' is-on' : ''}`}
          type="button"
          onClick={() => react('like')}
          disabled={isUnavailable}
          aria-pressed={Boolean(item.liked)}
          title={isUnavailable ? unavailableActionText : '点赞'}
        >
          <i className={`bi ${item.liked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`} aria-hidden="true" />
          <span>{item.likes || 0}<span className="sr-only"> 个赞</span></span>
        </button>
        <button
          className={`react${commentOpen ? ' is-on' : ''}`}
          type="button"
          onClick={() => setCommentOpen((open) => !open)}
          disabled={isUnavailable || (!canComment && !guestNeedsLogin)}
          aria-expanded={commentOpen}
          title={isUnavailable ? (isPending ? '待审核的留言不能评论' : '已下架的留言不能评论') : (canComment || guestNeedsLogin ? '评论' : commentDisabledReason)}
        >
          <i className="bi bi-chat-dots" aria-hidden="true" />
          <span>{comments.length}<span className="sr-only"> 条评论</span></span>
        </button>
        <button
          className={`react${item.disliked ? ' is-on is-down' : ''}`}
          type="button"
          onClick={() => react('dislike')}
          disabled={isUnavailable}
          aria-pressed={Boolean(item.disliked)}
          title={isUnavailable ? unavailableActionText : '点踩'}
        >
          <i className={`bi ${item.disliked ? 'bi-hand-thumbs-down-fill' : 'bi-hand-thumbs-down'}`} aria-hidden="true" />
          <span>{item.dislikes || 0}<span className="sr-only"> 个踩</span></span>
        </button>
        <span className="post__bar-gap" />
        {user && !isUnavailable ? (
          <button
            className={`react react--icon${favorited ? ' is-on is-star' : ''}`}
            type="button"
            onClick={handleFavorite}
            disabled={favoriteBusy}
            aria-pressed={favorited}
            title={favorited ? '取消收藏' : '收藏'}
          >
            <i className={`bi ${favorited ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
            <span className="sr-only">{favorited ? '取消收藏' : '收藏'}</span>
          </button>
        ) : null}
      </div>

      {guestNeedsLogin && !isUnavailable ? (
        <Link className="post__login" to="/login" state={{ from: location }}>
          <i className="bi bi-box-arrow-in-right" aria-hidden="true" />登录后参与讨论
        </Link>
      ) : null}

      {comments.length || commentOpen ? (
        <section className="thread" aria-label="评论">
          {comments.length ? (
            <>
              <ol className="thread__list">
                {visibleComments.map((comment, index) => (
                  <li key={comment.id || index} className="comment">
                    <span className="comment__floor">#{index + 1}</span>
                    <div className="comment__main">
                      <div className="comment__meta">
                        {comment.owned ? <span className="badge badge-accent">我的评论</span> : null}
                        <time>{comment.timestamp}</time>
                        {comment.owned ? (
                          <button className="comment__link is-danger" type="button" title="删除我的评论" onClick={() => setCommentToDelete(comment)}>
                            <i className="bi bi-trash" aria-hidden="true" />删除
                          </button>
                        ) : null}
                      </div>
                      {comment.refer_id ? (
                        <div className="comment__quote">
                          <i className="bi bi-reply-fill" aria-hidden="true" />
                          <b>回复 {replyFloor(comment.refer_id)}</b>
                          <span>{comment.refer || '评论内容已不可见'}</span>
                        </div>
                      ) : null}
                      {comment.text ? <p className="comment__text">{comment.text}</p> : null}
                      {comment.files?.length ? (
                        <div className="media media--3 is-compact">
                          {comment.files.map((file, fileIndex) => (
                            <Attachment
                              file={file}
                              index={fileIndex}
                              key={`${comment.id || index}-${file}-${fileIndex}`}
                              onClick={() => openFilePreview(comment.files, fileIndex)}
                            />
                          ))}
                        </div>
                      ) : null}
                      {!isUnavailable && canComment ? (
                        <div className="comment__actions">
                          <button className="comment__link" type="button" onClick={() => startReply(comment, index)}>
                            <i className="bi bi-reply" aria-hidden="true" />回复
                          </button>
                          {comment.id ? (
                            <Link
                              className="comment__link"
                              to={`/help/report/${item.id}/comment/${encodeURIComponent(comment.id)}`}
                              aria-label={`举报第 ${index + 1} 楼评论`}
                            >
                              <i className="bi bi-flag" aria-hidden="true" />举报
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
              {comments.length > 2 && !commentsExpanded && isCompactFeed ? (
                <button className="post__more" type="button" onClick={() => { setCommentsExpanded(true); setCommentOpen(true) }}>
                  展开全部 {comments.length} 条评论
                </button>
              ) : null}
            </>
          ) : null}

          {commentOpen && !isUnavailable && !canComment && !guestNeedsLogin ? (
            <div className="info-callout status-warning"><i className="bi bi-info-circle-fill" aria-hidden="true" /><span>{commentDisabledReason}</span></div>
          ) : null}

          {commentOpen && !isUnavailable && canComment ? (
            <div className="composer-mini">
              {replyTarget ? (
                <div className="composer-mini__reply">
                  <span>
                    <b>正在回复 #{replyTarget.floor} 楼</b>
                    <span>{replyTarget.text}</span>
                  </span>
                  <button type="button" title="取消回复" aria-label="取消回复" onClick={() => setReplyTarget(null)}>
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <textarea
                ref={commentInputRef}
                className="field"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={replyTarget ? `回复 #${replyTarget.floor} 楼…` : '友善表达，写下你的评论…'}
                maxLength={500}
                rows={3}
              />
              <div className="composer-mini__foot">
                <span className="text-muted tabular">{commentText.length} / 500</span>
                <button className="btn btn-primary btn-sm" type="button" disabled={busy || !commentText.trim()} onClick={submitComment}>
                  <i className="bi bi-send" aria-hidden="true" />{busy ? '发送中…' : '发表评论'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <FilePreviewModal
        files={previewFiles}
        index={previewIndex}
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onIndexChange={setPreviewIndex}
      />
      <Modal
        visible={Boolean(commentToDelete)}
        title="删除我的评论"
        width="480px"
        onClose={() => !deletingComment && setCommentToDelete(null)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={deletingComment} onClick={() => setCommentToDelete(null)}>取消</button>
            <button className="btn btn-danger" type="button" disabled={deletingComment} onClick={deleteOwnComment}>
              <i className="bi bi-trash" aria-hidden="true" />{deletingComment ? '删除中…' : '确认删除'}
            </button>
          </>
        )}
      >
        <p className="text-soft">删除后评论会立即从公开页面和你的评论列表中移除，留言作者收到的历史通知仍会保留。</p>
      </Modal>
    </article>
  )
}
