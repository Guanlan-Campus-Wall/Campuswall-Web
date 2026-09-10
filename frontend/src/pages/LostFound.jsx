import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import api from '../services/api'

const filters = [
  { value: 'all', label: '全部', tag: '失物招领' },
  { value: 'lost', label: '寻物启事', tag: '寻物启事' },
  { value: 'found', label: '招领启事', tag: '招领启事' },
  { value: 'resolved', label: '已找回', tag: '已找回' }
]

const initialForm = {
  kind: 'lost',
  item: '',
  location: '',
  time: '',
  details: '',
  contact: '',
  resolved: false
}

const messageTags = (message) => {
  if (Array.isArray(message?.tags)) {
    return message.tags.map((tag) => typeof tag === 'string' ? tag : (tag?.tag || tag?.name || '')).filter(Boolean)
  }
  return String(message?.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
}

export default function LostFound() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [messages, setMessages] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const loadSequence = useRef(0)
  const alert = useAlert()
  const { community } = usePlatform()
  const { user } = useUser()
  const location = useLocation()
  const canPublish = Boolean(user) && community.posting_enabled
  const canBrowse = Boolean(user)
  const disabledReason = !user
    ? '登录后才能查看和填写失物招领'
    : (community.pause_reason || '管理员暂时关闭了发帖功能')
  const selectedFilter = useMemo(
    () => filters.find((filter) => filter.value === activeFilter) || filters[0],
    [activeFilter]
  )

  const loadMessages = useCallback(async () => {
    const sequence = ++loadSequence.current
    if (!canBrowse) {
      setMessages([])
      setTotalPages(1)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await api.userGetLostFound({
        filter: selectedFilter.value,
        tag: selectedFilter.tag,
        page,
        page_size: 24
      })
      if (sequence === loadSequence.current) {
        const nextTotalPages = Math.max(1, Number(response.data?.total_pages) || 1)
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        setMessages(response.data?.messages || response.data?.data || [])
        setTotalPages(nextTotalPages)
      }
    } catch (error) {
      if (sequence === loadSequence.current) alert.showTopRightAlert(error.message, 'warning', '失物信息加载失败')
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [alert, canBrowse, page, selectedFilter.tag, selectedFilter.value])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const openCompose = () => {
      if (!user) return
      setComposeOpen(true)
      window.setTimeout(() => document.getElementById('lost-found-publish')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
    window.addEventListener('open-lost-found-compose', openCompose)
    return () => window.removeEventListener('open-lost-found-compose', openCompose)
  }, [user])

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!user) {
      alert.showTopRightAlert('登录后才能填写失物招领', 'warning', '请先登录')
      return
    }
    if (!canPublish) {
      alert.showTopRightAlert(disabledReason, 'warning', '暂时无法发布')
      return
    }
    if (!form.item.trim() || !form.location.trim()) {
      alert.showTopRightAlert('请填写物品名称和相关地点', 'warning', '信息还不完整')
      return
    }

    const subtype = form.kind === 'lost' ? '寻物启事' : '招领启事'
    const status = form.resolved ? '已找回' : (form.kind === 'lost' ? '待找回' : '待认领')
    const lines = [
      `【${subtype}】`,
      `物品：${form.item.trim()}`,
      `地点：${form.location.trim()}`,
      form.time.trim() ? `时间：${form.time.trim()}` : '',
      form.details.trim() ? `特征与说明：${form.details.trim()}` : '',
      `联系：${form.contact.trim() || '请在评论区留言'}`,
      `状态：${status}`
    ].filter(Boolean)

    setSubmitting(true)
    try {
      const response = await api.userSubmitLostFound({
        kind: form.kind,
        item: form.item.trim(),
        location: form.location.trim(),
        time: form.time.trim(),
        details: form.details.trim(),
        contact: form.contact.trim(),
        resolved: form.resolved,
        text: lines.join('\n'),
        tags: ['失物招领', subtype, status]
      })
      const pendingReview = response.data?.moderation_status === 'pending'
      alert.showTopRightAlert(
        pendingReview ? '启事已提交审核，请稍后回来查看' : '启事已发布到失物招领专区',
        'success',
        pendingReview ? '等待审核' : '发布成功'
      )
      setForm((current) => ({ ...initialForm, kind: current.kind }))
      if (activeFilter === 'all' && page === 1) await loadMessages()
      else {
        setActiveFilter('all')
        setPage(1)
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lost-found-page space-y-6">
      <section className="lost-found-hero">
        <h1 className="campus-page-title">失物招领</h1>
        {user ? (
          <button className="btn btn-primary" type="button" onClick={() => setComposeOpen((open) => !open)}>
            {composeOpen ? '收起表单' : '发布启事'}
          </button>
        ) : (
          <Link className="btn btn-primary" to="/login" state={{ from: location }}>登录后查看</Link>
        )}
      </section>

      {composeOpen && user ? (
        <form id="lost-found-publish" className="lost-found-form lost-found-compose" onSubmit={submit}>
          {!canPublish ? <div className="info-callout status-warning"><i className="bi bi-info-circle-fill" /><span>{disabledReason}</span></div> : null}

          <fieldset className="lost-found-kind" disabled={!canPublish || submitting}>
            <legend className="sr-only">启事类型</legend>
            <label className={form.kind === 'lost' ? 'is-selected' : ''}>
              <input type="radio" name="lost-found-kind" value="lost" checked={form.kind === 'lost'} onChange={() => updateForm('kind', 'lost')} />
              <span>我丢了物品</span>
            </label>
            <label className={form.kind === 'found' ? 'is-selected' : ''}>
              <input type="radio" name="lost-found-kind" value="found" checked={form.kind === 'found'} onChange={() => updateForm('kind', 'found')} />
              <span>我捡到物品</span>
            </label>
          </fieldset>

          <div className="lost-found-fields">
            <label><span>物品名称 *</span><input className="field" maxLength={60} required disabled={!canPublish || submitting} value={form.item} onChange={(event) => updateForm('item', event.target.value)} placeholder="例如：蓝色水杯" /></label>
            <label><span>相关地点 *</span><input className="field" maxLength={80} required disabled={!canPublish || submitting} value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="例如：教学楼二楼连廊" /></label>
            <label><span>大致时间</span><input className="field" maxLength={60} disabled={!canPublish || submitting} value={form.time} onChange={(event) => updateForm('time', event.target.value)} placeholder="例如：周二午休前后" /></label>
            <label><span>公开联系方式</span><input className="field" maxLength={80} disabled={!canPublish || submitting} value={form.contact} onChange={(event) => updateForm('contact', event.target.value)} placeholder="可留空，改用评论区沟通" /></label>
            <label className="lost-found-details"><span>特征与说明</span><textarea className="field" maxLength={500} disabled={!canPublish || submitting} value={form.details} onChange={(event) => updateForm('details', event.target.value)} placeholder="描述颜色、型号；请勿填写身份证号等敏感信息。" /></label>
          </div>

          <label className="lost-found-resolved">
            <input type="checkbox" checked={form.resolved} disabled={!canPublish || submitting} onChange={(event) => updateForm('resolved', event.target.checked)} />
            <span>这是“已找回”状态更新</span>
          </label>

          <div className="lost-found-form-footer">
            <p>请保留一项未公开特征，用于领取时核验。</p>
            <button className="btn btn-primary" type="submit" disabled={!canPublish || submitting || !form.item.trim() || !form.location.trim()}>
              {submitting ? '提交中…' : '提交启事'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="lost-found-feed" aria-labelledby="lost-found-feed-title">
        <div className="lost-found-feed-heading">
          <h2 id="lost-found-feed-title" className="campus-section-head">校内启事</h2>
          <div className="lost-found-filters" role="tablist" aria-label="失物招领筛选">
            {filters.map((filter) => (
              <button className={`btn btn-sm ${activeFilter === filter.value ? 'btn-primary' : 'btn-outline'}`} type="button" role="tab" aria-selected={activeFilter === filter.value} key={filter.value} onClick={() => { setActiveFilter(filter.value); setPage(1) }}>{filter.label}</button>
            ))}
          </div>
        </div>

        {!canBrowse ? (
          <div className="empty-state-card">
            <h3>登录后查看失物招领</h3>
            <p>启事里可能含有联系方式，未登录访客不能读取列表。</p>
            <Link className="btn btn-primary mt-3" to="/login" state={{ from: location }}>去登录</Link>
          </div>
        ) : null}
        {canBrowse && loading ? <div className="page-center"><div className="spinner" /><p className="text-sm text-muted">正在载入启事…</p></div> : null}
        {canBrowse && !loading && !messages.length ? (
          <div className="empty-state-card">
            <h3>暂时没有{selectedFilter.label === '全部' ? '启事' : selectedFilter.label}</h3>
          </div>
        ) : null}
        <div className="lost-found-entry-list">
          {messages.map((message) => {
            const tags = messageTags(message)
            const kind = message.lost_found?.kind || (tags.includes('招领启事') ? 'found' : 'lost')
            const status = message.lost_found?.resolved || tags.includes('已找回') ? '已找回' : (kind === 'found' ? '待认领' : '寻找中')
            const itemName = message.lost_found?.item || String(message.text || '').split('\n').find((line) => line.startsWith('物品：'))?.slice(3) || '失物招领'
            const location = message.lost_found?.location || ''
            const time = message.lost_found?.time || ''
            return (
              <article className="lost-found-entry" key={message.id}>
                <div className="lost-found-entry-head">
                  <h3>{itemName}</h3>
                  <span className={`badge ${status === '已找回' ? 'status-success' : 'status-warning'}`}>{status}</span>
                </div>
                <p className="lost-found-entry-meta">
                  {kind === 'found' ? '招领启事' : '寻物启事'}
                  {location ? ` · ${location}` : ''}
                  {time ? ` · ${time}` : ''}
                </p>
                {message.lost_found?.contact ? <p className="lost-found-entry-meta">联系：{message.lost_found.contact}</p> : null}
                <Link className="text-sm font-semibold text-[var(--text-secondary)]" to={`/wall/message/${message.id}`}>查看详情</Link>
              </article>
            )
          })}
        </div>
        {totalPages > 1 ? (
          <nav className="mt-5 flex items-center justify-center gap-3" aria-label="失物招领分页">
            <button className="btn btn-sm btn-outline" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
            <span className="text-sm text-muted">第 {page} / {totalPages} 页</span>
            <button className="btn btn-sm btn-outline" type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button>
          </nav>
        ) : null}
      </section>
    </div>
  )
}
