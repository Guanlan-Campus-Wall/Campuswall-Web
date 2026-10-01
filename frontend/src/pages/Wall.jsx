import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Avatar from '../components/Avatar.jsx'
import CampusGuide from '../components/CampusGuide.jsx'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import { anonymousUser } from '../utils/user.js'

const CHUNK_SIZE = 5 * 1024 * 1024
const MAX_POST_FILES = 20
const presetTags = ['日常', '表白', '树洞', '提问', '吐槽', '寻物', '学习', '互助']
const DRAFT_STORAGE_PREFIX = 'campus-wall-publish-draft-v1'
const EMPTY_POLL_OPTIONS = ['', '']

function SelectedMediaTile({ file, index, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')

  useEffect(() => {
    if (!isImage && !isVideo) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage, isVideo])

  return (
    <div className="composer__tile">
      {isImage && previewUrl ? <img src={previewUrl} alt={`待上传图片 ${index + 1}`} /> : null}
      {isVideo && previewUrl ? <video src={previewUrl} muted playsInline aria-label={`待上传视频 ${index + 1}`} /> : null}
      {!isImage && !isVideo ? (
        <span className="composer__tile-icon" aria-hidden="true">
          <i className={`bi ${isAudio ? 'bi-music-note-beamed' : 'bi-file-earmark'}`} />
        </span>
      ) : null}
      {isVideo ? <span className="composer__tile-badge"><i className="bi bi-play-fill" aria-hidden="true" />视频</span> : null}
      <button className="composer__tile-remove" type="button" aria-label={`移除 ${file.name}`} title={`移除 ${file.name}`} onClick={onRemove}>
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
      <span className="composer__tile-name">{file.name}</span>
    </div>
  )
}

export default function Wall() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const { community } = usePlatform()
  const { user } = useUser()
  const alert = useAlert()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchWord, setSearchWord] = useState(params.get('w') || '')
  const [filter, setFilter] = useState(params.get('f') || 'all')
  const [sortBy, setSortBy] = useState(params.get('s') || 'newest')
  const [pageStart, setPageStart] = useState(0)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishAnonymous, setPublishAnonymous] = useState(true)
  const [publishText, setPublishText] = useState('')
  const [publishTags, setPublishTags] = useState([])
  const [publishMode, setPublishMode] = useState('post')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(EMPTY_POLL_OPTIONS)
  const [pollDuration, setPollDuration] = useState('3')
  const [tagInput, setTagInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState('')
  const pageSize = 15
  const draftKey = `${DRAFT_STORAGE_PREFIX}:${user?.id || 'guest'}`
  const canPublish = community.posting_enabled && Boolean(user || community.guest_posting_enabled)
  const publishDisabledReason = !community.posting_enabled
    ? (community.pause_reason || '管理员暂时关闭了发帖功能')
    : '登录后才能发布'

  const openPublish = useCallback(() => {
    if (!canPublish) {
      alert.showTopRightAlert(publishDisabledReason, 'warning', '暂时无法发布')
      return
    }
    const hasCurrentContent = publishText.trim() || publishTags.length || files.length || pollQuestion.trim() || pollOptions.some((option) => option.trim())
    if (!hasCurrentContent) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(draftKey) || 'null')
        if (saved && typeof saved === 'object') {
          setPublishText(String(saved.text || '').slice(0, 2000))
          setPublishTags(Array.isArray(saved.tags) ? saved.tags.slice(0, 8) : [])
          setPublishMode(saved.mode === 'poll' ? 'poll' : 'post')
          setPollQuestion(String(saved.pollQuestion || '').slice(0, 200))
          setPollOptions(Array.isArray(saved.pollOptions) && saved.pollOptions.length >= 2
            ? saved.pollOptions.slice(0, 6).map((option) => String(option || '').slice(0, 80))
            : EMPTY_POLL_OPTIONS)
          setPollDuration(['1', '3', '7', 'none'].includes(saved.pollDuration) ? saved.pollDuration : '3')
          if (typeof saved.anonymous === 'boolean' && user) setPublishAnonymous(saved.anonymous)
          setDraftSavedAt(saved.savedAt || '')
        }
      } catch {}
    }
    setPublishOpen(true)
  }, [alert, canPublish, draftKey, files.length, pollOptions, pollQuestion, publishDisabledReason, publishTags.length, publishText, user])

  const loadMessages = async ({ reset = false, sortValue = sortBy, wordValue = searchWord, filterValue = filter } = {}) => {
    const start = reset ? 0 : pageStart
    if (reset) setLoading(true)
    try {
      const response = await api.getMessages({
        s: sortValue,
        w: wordValue,
        f: filterValue,
        start,
        end: start + pageSize
      })
      const incoming = response.data?.data || []
      setMessages((prev) => reset ? incoming : [...prev, ...incoming])
      setHasMore(incoming.length === pageSize)
      if (reset) setPageStart(0)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '加载留言失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadMessages({ reset: true })
  }, [])

  useEffect(() => {
    const handler = () => openPublish()
    window.addEventListener('open-publish-modal', handler)
    return () => window.removeEventListener('open-publish-modal', handler)
  }, [openPublish])

  useEffect(() => {
    if (!location.state?.openPublish) return
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
    openPublish()
  }, [location.hash, location.pathname, location.search, location.state, navigate, openPublish])

  useEffect(() => {
    if (!publishOpen) return undefined
    const timer = window.setTimeout(() => {
      const hasDraft = publishText.trim() || publishTags.length || pollQuestion.trim() || pollOptions.some((option) => option.trim())
      try {
        if (!hasDraft) {
          window.localStorage.removeItem(draftKey)
          setDraftSavedAt('')
          return
        }
        const savedAt = new Date().toISOString()
        window.localStorage.setItem(draftKey, JSON.stringify({
          text: publishText,
          tags: publishTags,
          mode: publishMode,
          pollQuestion,
          pollOptions,
          pollDuration,
          anonymous: publishAnonymous,
          savedAt
        }))
        setDraftSavedAt(savedAt)
      } catch {}
    }, 500)
    return () => window.clearTimeout(timer)
  }, [draftKey, pollDuration, pollOptions, pollQuestion, publishAnonymous, publishMode, publishOpen, publishTags, publishText])

  const refresh = () => loadMessages({ reset: true })

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    loadMessages({ reset: true, filterValue: newFilter })
  }

  const handleSortChange = (newSort) => {
    setSortBy(newSort)
    loadMessages({ reset: true, sortValue: newSort })
  }

  const clearPublishDraft = () => {
    try {
      window.localStorage.removeItem(draftKey)
    } catch {}
    setPublishText('')
    setPublishTags([])
    setTagInput('')
    setFiles([])
    setPublishMode('post')
    setPollQuestion('')
    setPollOptions(EMPTY_POLL_OPTIONS)
    setPollDuration('3')
    setDraftSavedAt('')
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    const next = pageStart + pageSize
    setPageStart(next)
    setLoadingMore(true)
    try {
      const response = await api.getMessages({
        s: sortBy,
        w: searchWord,
        f: filter,
        start: next,
        end: next + pageSize
      })
      const incoming = response.data?.data || []
      setMessages((prev) => [...prev, ...incoming])
      setHasMore(incoming.length === pageSize)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '加载失败')
    } finally {
      setLoadingMore(false)
    }
  }

  const refreshSpecificMessage = async (id) => {
    try {
      const response = await api.getMessageDetail(id)
      if (response.data?.success) {
        setMessages((items) => items.map((item) => item.id === id ? response.data.message : item))
      }
    } catch {}
  }

  const addTag = (tag) => {
    const next = tag.trim().replace(',', '')
    if (!next || publishTags.includes(next) || publishTags.length >= 8) return
    setPublishTags((items) => [...items, next])
    setTagInput('')
    setSuggestions([])
  }

  const handleFileSelection = (event) => {
    const existing = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
    const selected = Array.from(event.target.files || []).filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`
      if (existing.has(key)) return false
      existing.add(key)
      return true
    })
    const available = Math.max(0, MAX_POST_FILES - files.length)
    const accepted = selected.slice(0, available)
    if (selected.length > available) {
      alert.showTopRightAlert(`每条动态最多添加 ${MAX_POST_FILES} 个媒体文件`, 'warning', `已保留前 ${MAX_POST_FILES} 项`)
    }
    if (accepted.length) setFiles((items) => [...items, ...accepted])
    event.target.value = ''
  }

  const handleTagKey = async (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(tagInput)
      return
    }
    const value = event.currentTarget.value
    if (!value) {
      setSuggestions([])
      return
    }
    try {
      const response = await api.getTags()
      setSuggestions((response.data || []).filter((tag) => tag.includes(value) && !publishTags.includes(tag)).slice(0, 5))
    } catch {}
  }

  const uploadDirect = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('originalName', file.name)
    const response = await api.directUpload(formData)
    if (!response.data?.success) throw new Error(response.data?.error || '文件上传失败')
    return response.data.filenames || []
  }

  const uploadChunked = async (file) => {
    const fileKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    for (let i = 0; i < totalChunks; i += 1) {
      const formData = new FormData()
      formData.append('chunk', file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size)))
      formData.append('chunkIndex', i)
      formData.append('totalChunks', totalChunks)
      formData.append('fileKey', fileKey)
      formData.append('originalName', file.name)
      const response = await api.chunkedUpload(formData)
      if (!response.data?.success) throw new Error(response.data?.error || '分片上传失败')
      setProgress(Math.round(((i + 1) / totalChunks) * 100))
    }
    const merged = await api.mergeChunks({ fileKey })
    if (!merged.data?.success) throw new Error(merged.data?.error || '合并文件失败')
    return merged.data.filenames || []
  }

  const submitPublish = async () => {
    if (!canPublish) {
      alert.showTopRightAlert(publishDisabledReason, 'warning', '暂时无法发布')
      return
    }
    const cleanPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
    if (publishMode === 'poll' && (!pollQuestion.trim() || cleanPollOptions.length < 2)) {
      alert.showTopRightAlert('请填写投票问题和至少两个选项', 'warning', '投票未完成')
      return
    }
    if (!publishText.trim() && files.length === 0 && publishMode !== 'poll') {
      alert.showTopRightAlert('请输入留言内容或上传附件', 'warning', '提示')
      return
    }
    setPublishing(true)
    setProgress(0)
    try {
      const filenames = []
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        setStatusText(`正在上传 (${i + 1}/${files.length}): ${file.name}`)
        const uploaded = file.size > CHUNK_SIZE ? await uploadChunked(file) : await uploadDirect(file)
        filenames.push(...uploaded)
      }
      const response = await api.submitMessage({
        text: publishText.trim(),
        tags: publishTags.join(','),
        filenames,
        anonymous: Boolean(user) ? publishAnonymous : true,
        pollQuestion: publishMode === 'poll' ? pollQuestion.trim() : '',
        pollOptions: publishMode === 'poll' ? cleanPollOptions : [],
        pollClosesAt: publishMode === 'poll' && pollDuration !== 'none'
          ? new Date(Date.now() + Number(pollDuration) * 86400000).toISOString()
          : ''
      })
      clearPublishDraft()
      setPublishOpen(false)
      const pendingReview = response.data?.moderation_status === 'pending'
      alert.showTopRightAlert(
        pendingReview ? '留言已提交审核，请稍后在校园动态中查看' : '留言已成功发布！',
        'success',
        pendingReview ? '等待审核' : '发布成功'
      )
      refresh()
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '发布失败')
    } finally {
      setPublishing(false)
      setStatusText('')
      setProgress(0)
    }
  }

  const hasDraftContent = Boolean(publishText.trim() || publishTags.length || pollQuestion.trim() || pollOptions.some((option) => option.trim()))
  const displayName = user ? (user.nickname || user.username) : ''
  const hour = new Date().getHours()
  const greeting = hour < 5 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="page">
      <header className="page-head page-head--wall">
        <div className="page-head__text">
          <h1>校园动态</h1>
          <p>看看大家最近在聊什么。</p>
        </div>
        <div className="page-head__actions">
          <Link className="btn btn-outline btn-sm" to="/p"><i className="bi bi-hash" aria-hidden="true" />话题广场</Link>
        </div>
      </header>

      <div className="split">
        <section className="split__main" aria-label="校园动态列表">
          <p className="wall-greeting"><i className="bi bi-sun" aria-hidden="true" />{greeting}，{displayName || '同学'}</p>

          <div className="composer-card">
            <p className="composer-card__hello"><i className="bi bi-sun" aria-hidden="true" />{greeting}，{displayName || '同学'}</p>
            {canPublish ? (
              <button className="composer-card__input" type="button" onClick={openPublish}>
                分享一下今天的校园见闻…
              </button>
            ) : (
              <div className="composer-card__input is-static">
                <b>{user ? '暂时无法发布' : '登录后参与校园讨论'}</b>
                <small>{publishDisabledReason}</small>
              </div>
            )}
            <div className="composer-card__bar">
              <div className="composer-card__tools">
                <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={openPublish} disabled={!canPublish} aria-label="添加图片或视频" title="添加图片或视频"><i className="bi bi-image" aria-hidden="true" /></button>
                <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={() => { setPublishMode('poll'); openPublish() }} disabled={!canPublish} aria-label="发起投票" title="发起投票"><i className="bi bi-ui-radios-grid" aria-hidden="true" /></button>
                <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={openPublish} disabled={!canPublish} aria-label="添加话题" title="添加话题"><i className="bi bi-hash" aria-hidden="true" /></button>
              </div>
              {canPublish ? (
                <button className="composer-card__send" type="button" onClick={openPublish} aria-label="写动态"><i className="bi bi-arrow-up" aria-hidden="true" /></button>
              ) : !user ? (
                <Link className="btn btn-primary btn-sm" to="/login" state={{ from: location }}>登录</Link>
              ) : null}
            </div>
          </div>

          <div className="toolbar card">
            <form className="searchbox" role="search" onSubmit={(event) => { event.preventDefault(); refresh() }}>
              <label className="sr-only" htmlFor="wall-search">搜索留言关键词或标签</label>
              <i className="bi bi-search" aria-hidden="true" />
              <input
                id="wall-search"
                type="search"
                value={searchWord}
                onChange={(event) => setSearchWord(event.target.value)}
                placeholder="搜索动态或标签"
              />
              {searchWord ? (
                <button type="button" className="searchbox__clear" onClick={() => { setSearchWord(''); loadMessages({ reset: true, wordValue: '' }) }} aria-label="清空搜索关键词">
                  <i className="bi bi-x-circle-fill" aria-hidden="true" />
                </button>
              ) : null}
              <button className="btn btn-primary btn-sm" type="submit">搜索</button>
            </form>

            <div className="toolbar__row">
              <div className="seg" role="group" aria-label="内容类型">
                {[['all', '全部'], ['files', '图影音'], ['polls', '投票']].map(([value, label]) => (
                  <button type="button" key={value} aria-pressed={filter === value} onClick={() => handleFilterChange(value)}>{label}</button>
                ))}
              </div>
              <div className="toolbar__side">
                <label className="sr-only" htmlFor="wall-sort-order">排序方式</label>
                <select id="wall-sort-order" className="field field--compact" value={sortBy} onChange={(event) => handleSortChange(event.target.value)}>
                  <option value="newest">最新发布</option>
                  <option value="likes">点赞最多</option>
                  <option value="dislikes">点踩最多</option>
                </select>
                <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={refresh} disabled={loading} title="刷新列表" aria-label="刷新列表">
                  <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {searchWord && !loading ? (
            <div className="info-callout">
              <i className="bi bi-search" aria-hidden="true" />
              <span>关键词「<b>{searchWord}</b>」共找到 <b>{messages.length}</b> 条动态</span>
            </div>
          ) : null}

          {loading && messages.length === 0 ? (
            <div className="feed-list" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="post">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-11 w-11 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-20" />
                    </div>
                  </div>
                  <div className="skeleton mt-4 h-16 w-full" />
                  <div className="skeleton mt-4 h-8 w-48" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <EmptyState
              icon="bi-chat-square-dots"
              title={searchWord || filter !== 'all' ? '还没有找到相关动态' : '还没有公开动态'}
              action={canPublish
                ? <button className="btn btn-primary" type="button" onClick={openPublish}><i className="bi bi-pencil-square" aria-hidden="true" />立即发帖</button>
                : (!user ? <Link className="btn btn-primary" to="/login" state={{ from: location }}>登录参与</Link> : null)}
            >
              {searchWord || filter !== 'all' ? '试试其他关键词，或切换到全部动态。' : '发布一条动态，发起讨论。'}
            </EmptyState>
          ) : null}

          <div className="feed-list" aria-busy={loading}>
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} variant="moments" onRefresh={refreshSpecificMessage} />
            ))}
          </div>

          {!loading && !hasMore && messages.length > 0 ? <p className="feed-end">— 已显示全部动态 —</p> : null}

          {hasMore && messages.length ? (
            <div className="text-center">
              <button className="btn btn-outline min-w-44" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? (<><span className="spinner" /><span>加载中…</span></>) : (<><i className="bi bi-chevron-down" aria-hidden="true" /><span>加载更多</span></>)}
              </button>
            </div>
          ) : null}
        </section>

        <CampusGuide />
      </div>

      <Modal
        visible={publishOpen}
        title="发布校园动态"
        width="680px"
        onClose={() => setPublishOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" onClick={() => setPublishOpen(false)}>取消</button>
            <button className="btn btn-primary" type="button" disabled={!canPublish || publishing} onClick={submitPublish}>
              {publishing ? <><span className="spinner" />正在发布…</> : <><i className="bi bi-send-fill" aria-hidden="true" />发布</>}
            </button>
          </>
        )}
      >
        <div className="composer">
          <div className="composer__who">
            <div className="user-card">
              <Avatar user={(!user || publishAnonymous) ? anonymousUser : user} size="md" anonymous={!user || publishAnonymous} />
              <div className="user-card__body">
                <div className="user-card__name"><span>{(!user || publishAnonymous) ? '匿名用户' : displayName}</span></div>
                <p className="user-card__sub">{(!user || publishAnonymous) ? '公开页面不会显示你的身份' : '公开页面将显示你的昵称'}</p>
              </div>
            </div>
            {user ? (
              <button className="chip" type="button" aria-pressed={!publishAnonymous} onClick={() => setPublishAnonymous((current) => !current)}>
                <i className={`bi ${publishAnonymous ? 'bi-incognito' : 'bi-person-badge'}`} aria-hidden="true" />
                {publishAnonymous ? '匿名发布' : '展示昵称'}
              </button>
            ) : (
              <span className="chip is-static"><i className="bi bi-incognito" aria-hidden="true" />游客仅能匿名发布</span>
            )}
          </div>

          <div className="seg" role="group" aria-label="动态类型">
            <button type="button" aria-pressed={publishMode === 'post'} onClick={() => setPublishMode('post')}>
              <i className="bi bi-chat-square-text" aria-hidden="true" /> 图文动态
            </button>
            <button type="button" aria-pressed={publishMode === 'poll'} onClick={() => setPublishMode('poll')}>
              <i className="bi bi-ui-radios-grid" aria-hidden="true" /> 发起投票
            </button>
          </div>

          <section className="composer__surface" aria-label="动态内容">
            <textarea
              className="composer__text"
              value={publishText}
              onChange={(event) => setPublishText(event.target.value)}
              placeholder={publishMode === 'poll' ? '补充投票背景或说明（选填）' : '这一刻，想和大家分享什么？'}
              maxLength={2000}
              aria-label="动态正文"
            />

            {files.length || publishMode === 'post' ? (
              <div className="composer__media">
                {files.map((file, index) => (
                  <SelectedMediaTile
                    file={file}
                    index={index}
                    key={`${file.name}-${file.lastModified}-${index}`}
                    onRemove={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ))}
                {files.length < MAX_POST_FILES ? (
                  <label className="composer__add">
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    <span>{files.length ? '继续添加' : '图片 / 视频'}</span>
                    <small>{files.length}/{MAX_POST_FILES}</small>
                    <input hidden multiple type="file" accept="image/*,audio/*,video/*" onChange={handleFileSelection} />
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="composer__foot">
              {hasDraftContent ? (
                <span className="composer__draft">
                  <i className="bi bi-check-circle" aria-hidden="true" />
                  {draftSavedAt
                    ? `草稿已自动保存 ${new Date(draftSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                    : '正在保存草稿…'}
                  <button type="button" onClick={clearPublishDraft}>清空</button>
                </span>
              ) : <span />}
              <span className="tabular text-muted">{publishText.length} / 2000</span>
            </div>
          </section>

          {publishMode === 'poll' ? (
            <section className="composer__poll" aria-label="投票设置">
              <div className="composer__poll-head">
                <div>
                  <h3>投票设置</h3>
                  <p>每个访问者只能选择一项，投票后不可修改。</p>
                </div>
                <span className="badge">单选</span>
              </div>
              <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="输入投票问题" maxLength={200} aria-label="投票问题" />
              <div className="composer__poll-options">
                {pollOptions.map((option, index) => (
                  <div className="composer__poll-option" key={`poll-option-${index}`}>
                    <span className="composer__poll-index">{index + 1}</span>
                    <input
                      value={option}
                      onChange={(event) => setPollOptions((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      placeholder={`选项 ${index + 1}`}
                      maxLength={80}
                      aria-label={`选项 ${index + 1}`}
                    />
                    {pollOptions.length > 2 ? (
                      <button className="btn btn-ghost btn-icon btn-sm" type="button" title="删除选项" aria-label={`删除选项 ${index + 1}`} onClick={() => setPollOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="composer__poll-foot">
                <button className="btn btn-outline btn-sm" type="button" disabled={pollOptions.length >= 6} onClick={() => setPollOptions((items) => [...items, ''])}>
                  <i className="bi bi-plus-circle" aria-hidden="true" />添加选项
                </button>
                <label className="composer__poll-time">
                  <span>结束时间</span>
                  <select value={pollDuration} onChange={(event) => setPollDuration(event.target.value)}>
                    <option value="1">1 天后</option>
                    <option value="3">3 天后</option>
                    <option value="7">7 天后</option>
                    <option value="none">长期有效</option>
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          <section className="composer__tags" aria-labelledby="publish-tags-title">
            <div className="composer__tags-head">
              <span id="publish-tags-title"><i className="bi bi-hash" aria-hidden="true" />添加话题</span>
              <small>最多 8 个</small>
            </div>
            {publishTags.length ? (
              <div className="chip-row">
                {publishTags.map((tag, index) => (
                  <span className="tag" key={tag}>
                    #{tag}
                    <button className="tag-remove" type="button" aria-label={`移除标签 ${tag}`} onClick={() => setPublishTags((items) => items.filter((_, i) => i !== index))}>×</button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKey}
              placeholder="输入标签后按回车确认，如：日常、寻物"
              aria-label="输入话题标签"
            />
            <div className="chip-row">
              {presetTags.filter((tag) => !publishTags.includes(tag)).map((tag) => (
                <button type="button" key={tag} className="chip chip--sm" onClick={() => addTag(tag)}>+ {tag}</button>
              ))}
            </div>
            {suggestions.length ? (
              <div className="chip-row">
                {suggestions.map((tag) => (
                  <button className="chip chip--sm is-active" type="button" key={tag} onClick={() => addTag(tag)}>#{tag}</button>
                ))}
              </div>
            ) : null}
          </section>

          {statusText ? (
            <div className="composer__progress" role="status">
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
              <p>{statusText}</p>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
