import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import Modal from '../components/Modal.jsx'
import Pager from '../components/Pager.jsx'
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
  const { user, loading: userLoading } = useUser()
  const location = useLocation()
  const canPublish = Boolean(user) && community.posting_enabled
  const disabledReason = !user
    ? '登录后才能填写失物招领'
    : (community.pause_reason || '管理员暂时关闭了发帖功能')
  const selectedFilter = useMemo(
    () => filters.find((filter) => filter.value === activeFilter) || filters[0],
    [activeFilter]
  )

  const loadMessages = useCallback(async () => {
    if (!user) {
      setMessages([])
      setLoading(false)
      return
    }
    const sequence = ++loadSequence.current
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
  }, [alert, page, selectedFilter.tag, selectedFilter.value, user])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

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
      setComposeOpen(false)
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

  if (userLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page page--narrow">
        <header className="page-head">
          <div className="page-head__text">
            <h1>失物招领</h1>
            <p>丢了东西？捡到东西？在这里让它回到主人身边。</p>
          </div>
        </header>
        <EmptyState
          icon="bi-lock"
          title="登录后查看失物招领"
          action={<Link className="btn btn-primary" to="/login" state={{ from: location }}>去登录</Link>}
        >
          启事里可能含联系方式，未登录访客不能浏览列表。
        </EmptyState>
      </div>
    )
  }

  const formDisabled = !canPublish || submitting

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>失物招领</h1>
          <p>丢了东西？捡到东西？在这里让它回到主人身边。</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn-primary" type="button" onClick={() => setComposeOpen(true)}>
            <i className="bi bi-pencil-square" aria-hidden="true" />发布启事
          </button>
        </div>
      </header>

      <div className="split">
        <section className="split__main" aria-labelledby="lost-found-feed-title">
          <h2 id="lost-found-feed-title" className="sr-only">校内启事</h2>
          <div className="toolbar card">
            <div className="seg" role="tablist" aria-label="失物招领筛选">
              {filters.map((filter) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter.value}
                  key={filter.value}
                  onClick={() => { setActiveFilter(filter.value); setPage(1) }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="page-center"><div className="spinner" /><p>正在寻找最新线索…</p></div>
          ) : null}

          {!loading && !messages.length ? (
            <EmptyState icon="bi-inbox" title={`暂时没有${selectedFilter.label === '全部' ? '启事' : selectedFilter.label}`}>
              如果你有相关信息，点击右上角「发布启事」即可发布第一条。
            </EmptyState>
          ) : null}

          <div className="feed-list">
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} variant="lost-found" onRefresh={loadMessages} />
            ))}
          </div>

          <Pager label="失物招领分页" loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>

        <aside className="split__aside" aria-labelledby="lost-found-guide-title">
          <section className="widget">
            <h2 className="widget__title" id="lost-found-guide-title"><i className="bi bi-shield-check" aria-hidden="true" />处理指南</h2>
            <ol className="steps">
              <li><span>1</span><div><b>写清时间地点</b><p>描述能帮助同学判断是否相关。</p></div></li>
              <li><span>2</span><div><b>领取前先核验</b><p>请对方说出未公开的物品特征。</p></div></li>
              <li><span>3</span><div><b>找回后更新状态</b><p>可发布带 #已找回 的简短更新，提醒大家停止扩散。</p></div></li>
            </ol>
            <Link className="btn btn-outline btn-sm mt-4" to="/rules"><i className="bi bi-shield-check" aria-hidden="true" />查看社区公约</Link>
          </section>
        </aside>
      </div>

      <Modal
        visible={composeOpen}
        title="发布启事"
        width="640px"
        onClose={() => !submitting && setComposeOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setComposeOpen(false)}>取消</button>
            <button className="btn btn-primary" type="submit" form="lost-found-publish" disabled={formDisabled || !form.item.trim() || !form.location.trim()}>
              <i className="bi bi-send-fill" aria-hidden="true" />{submitting ? '提交中…' : '提交启事'}
            </button>
          </>
        )}
      >
        <form id="lost-found-publish" className="form-stack" onSubmit={submit}>
          {!canPublish ? <div className="info-callout status-warning"><i className="bi bi-info-circle-fill" aria-hidden="true" /><span>{disabledReason}</span></div> : null}

          <fieldset className="kind-switch" disabled={formDisabled}>
            <legend className="sr-only">启事类型</legend>
            <label className={form.kind === 'lost' ? 'is-selected' : ''}>
              <input type="radio" name="lost-found-kind" value="lost" checked={form.kind === 'lost'} onChange={() => updateForm('kind', 'lost')} />
              <span className="tile-icon tone-kraft"><i className="bi bi-search" aria-hidden="true" /></span>
              <b>我丢了物品</b>
            </label>
            <label className={form.kind === 'found' ? 'is-selected' : ''}>
              <input type="radio" name="lost-found-kind" value="found" checked={form.kind === 'found'} onChange={() => updateForm('kind', 'found')} />
              <span className="tile-icon tone-olive"><i className="bi bi-inbox" aria-hidden="true" /></span>
              <b>我捡到物品</b>
            </label>
          </fieldset>

          <div className="form-grid">
            <label><span className="field-label">物品名称 *</span><input maxLength={60} required disabled={formDisabled} value={form.item} onChange={(event) => updateForm('item', event.target.value)} placeholder="例如：蓝色水杯" /></label>
            <label><span className="field-label">相关地点 *</span><input maxLength={80} required disabled={formDisabled} value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="例如：教学楼二楼连廊" /></label>
            <label><span className="field-label">大致时间</span><input maxLength={60} disabled={formDisabled} value={form.time} onChange={(event) => updateForm('time', event.target.value)} placeholder="例如：周二午休前后" /></label>
            <label><span className="field-label">公开联系方式</span><input maxLength={80} disabled={formDisabled} value={form.contact} onChange={(event) => updateForm('contact', event.target.value)} placeholder="可留空，改用评论区沟通" /></label>
            <label className="is-wide"><span className="field-label">特征与说明</span><textarea maxLength={500} disabled={formDisabled} value={form.details} onChange={(event) => updateForm('details', event.target.value)} placeholder="描述颜色、型号或不宜公开的核验线索提示；请勿填写身份证号等敏感信息。" /></label>
          </div>

          <label className="check-row card-flat p-3">
            <input type="checkbox" checked={form.resolved} disabled={formDisabled} onChange={(event) => updateForm('resolved', event.target.checked)} />
            <span><b className="text-ink">这是「已找回」状态更新</b><br /><small className="text-muted">勾选后启事会进入已找回筛选，提醒大家停止扩散。</small></span>
          </label>

          <p className="field-hint"><i className="bi bi-shield-check" aria-hidden="true" /> 请保留一项未公开特征，用于领取时核验。</p>
        </form>
      </Modal>
    </div>
  )
}
