import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import HeartParticles from '../components/HeartParticles.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

const CONFESSION_TAG = '表白'
const CONFESSION_LIMIT = 280
const CONFESSION_FETCH_LIMIT = 72

const timestampValue = (value) => String(value || '')
const compareNewestFirst = (left, right) => (
  timestampValue(right.timestamp).localeCompare(timestampValue(left.timestamp))
  || Number(right.id || 0) - Number(left.id || 0)
)

const formatConfessionTime = (value) => {
  if (!value) return '发布时间未知'
  const parsed = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}

const initialReducedMotion = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
)

export default function ConfessionWall() {
  const alert = useAlert()
  const { community } = usePlatform()
  const { user } = useUser()
  const [confessions, setConfessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submissionReceipt, setSubmissionReceipt] = useState(null)
  const [selectedConfession, setSelectedConfession] = useState(null)
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion)
  const [composeOpen, setComposeOpen] = useState(false)
  const [heartLive, setHeartLive] = useState(true)

  const canPublish = community.posting_enabled && Boolean(user || community.guest_posting_enabled)
  const publishDisabledReason = !community.posting_enabled
    ? (community.pause_reason || '管理员暂时关闭了发帖功能')
    : '登录后才能发布'

  const loadConfessions = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.getMessages({
        start: 0,
        end: CONFESSION_FETCH_LIMIT,
        s: 'newest',
        tag: CONFESSION_TAG
      })
      const publicNotes = Array.isArray(response.data?.data) ? response.data.data : []
      setConfessions(publicNotes
        .filter((message) => (
          message?.moderation_status === 'visible'
          && message?.review_status === 'approved'
          && !message?.lost_found
          && String(message?.text || '').trim()
        ))
        .sort(compareNewestFirst))
    } catch (error) {
      setLoadError(error.message || '表白便签加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfessions()
  }, [loadConfessions])

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = (event) => setReducedMotion(event.matches)
    if (typeof motionQuery.addEventListener === 'function') motionQuery.addEventListener('change', updateMotion)
    else motionQuery.addListener?.(updateMotion)
    return () => {
      if (typeof motionQuery.removeEventListener === 'function') motionQuery.removeEventListener('change', updateMotion)
      else motionQuery.removeListener?.(updateMotion)
    }
  }, [])

  const submitConfession = async (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!canPublish) {
      alert.showTopRightAlert(publishDisabledReason, 'warning', '暂时无法发布')
      return
    }
    if (!text) {
      alert.showTopRightAlert('请先写下想说的话', 'warning', '便签还是空的')
      return
    }
    if (text.length > CONFESSION_LIMIT) {
      alert.showTopRightAlert(`表白便签最多 ${CONFESSION_LIMIT} 个字`, 'warning', '内容太长')
      return
    }

    setSubmitting(true)
    setSubmissionReceipt(null)
    try {
      const response = await api.submitMessage({
        text,
        tags: CONFESSION_TAG,
        anonymous: Boolean(user) ? anonymous : true
      })
      if (!response.data?.success) throw new Error(response.data?.error || '表白便签提交失败')
      setDraft('')
      const pendingReview = response.data?.moderation_status === 'pending'
      setSubmissionReceipt({ id: response.data.id, pendingReview })
      if (!pendingReview) await loadConfessions()
      alert.showTopRightAlert(
        pendingReview ? '便签已提交审核，通过后会出现在公开便签中' : '便签已发布，现在可以在公开便签中看到',
        'success',
        pendingReview ? '等待审核' : '发布成功'
      )
    } catch (error) {
      alert.showTopRightAlert(error.message || '请稍后重试', 'error', '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAuthor = selectedConfession?.official
    ? '观澜中学校园墙'
    : (selectedConfession?.anonymous === false
        ? selectedConfession.display_name_snapshot || '一位同学'
        : '匿名同学')

  return (
    <div className="confession-page confession-notes-page">
      <header className="confession-copy confession-page-intro">
        <div className="confession-page-heading">
          <h1>表白墙</h1>
          <button className="btn btn-primary" type="button" onClick={() => setComposeOpen((open) => !open)}>
            <i className="bi bi-pencil-square" aria-hidden="true" />
            {composeOpen ? '收起编辑' : '写一张便签'}
          </button>
        </div>
      </header>

      <section className={`confession-stage confession-note-stage${heartLive ? ' is-live' : ''}`} aria-label="立体粒子爱心与公开便签">
        <div className="confession-stage-toolbar">
          <div className="confession-stage-status" aria-live="polite">
            {loading ? <><span className="spinner" />正在加载便签…</> : null}
            {!loading && loadError ? <span className="text-danger">{loadError}</span> : null}
            {!loading && !loadError ? <span>{confessions.length} 张便签已经公开</span> : null}
          </div>
          <div className="confession-stage-actions">
            <button className="btn btn-sm btn-outline" type="button" onClick={() => setHeartLive((open) => !open)} disabled={reducedMotion} aria-pressed={heartLive && !reducedMotion}>
              {reducedMotion ? '已减少动态效果' : heartLive ? '暂停动画' : '播放动画'}
            </button>
            <button className="btn btn-sm btn-outline" type="button" onClick={loadConfessions} disabled={loading}>
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              刷新
            </button>
          </div>
        </div>

        <HeartParticles
          notes={confessions}
          activeId={null}
          reducedMotion={reducedMotion || !heartLive}
          onSelect={setSelectedConfession}
        />
      </section>

      {composeOpen ? (
      <section className="confession-compose card" aria-labelledby="confession-compose-title">
        <h2 id="confession-compose-title">写一张便签</h2>

        {!canPublish ? (
          <div className="info-callout status-warning">
            <i className="bi bi-info-circle-fill" aria-hidden="true" />
            <span>{publishDisabledReason}</span>
            {!user ? <Link className="btn btn-sm btn-primary" to="/login">去登录</Link> : null}
          </div>
        ) : null}

        <form className="confession-compose-form" onSubmit={submitConfession}>
          <label className="sr-only" htmlFor="confession-draft">表白便签内容</label>
          <textarea
            id="confession-draft"
            className="field confession-compose-input"
            rows="5"
            maxLength={CONFESSION_LIMIT}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="写下一句真诚、尊重且不暴露隐私的话..."
            disabled={!canPublish || submitting}
            aria-describedby="confession-compose-help confession-compose-count"
          />
          <div className="confession-compose-footer">
            <div className="confession-compose-meta">
              <span id="confession-compose-help">公开前需要审核，请勿填写姓名、班级、联系方式等隐私。</span>
              <span id="confession-compose-count" aria-live="polite">{draft.length}/{CONFESSION_LIMIT}</span>
            </div>
            <div className="confession-compose-actions">
              {user ? (
                <button
                  className="moments-composer-privacy"
                  type="button"
                  aria-pressed={!anonymous}
                  onClick={() => setAnonymous((current) => !current)}
                >
                  <i className={`bi ${anonymous ? 'bi-incognito' : 'bi-person-badge'}`} aria-hidden="true" />
                  {anonymous ? '匿名提交' : '展示昵称'}
                </button>
              ) : null}
              <button className="btn btn-primary" type="submit" disabled={!canPublish || submitting || !draft.trim()}>
                {submitting ? <span className="spinner" /> : <i className="bi bi-send-fill" aria-hidden="true" />}
                {submitting ? '正在提交' : ((user && !anonymous) ? '提交' : '匿名提交')}
              </button>
            </div>
          </div>
        </form>

        {submissionReceipt ? (
          <div className="confession-submission-receipt info-callout status-success" role="status">
            <i className={`bi ${submissionReceipt.pendingReview ? 'bi-hourglass-split' : 'bi-check-circle-fill'}`} aria-hidden="true" />
            <span>
              <b>便签 #{submissionReceipt.id} {submissionReceipt.pendingReview ? '已进入审核队列。' : '已公开发布。'}</b>{' '}
              {submissionReceipt.pendingReview ? '审核通过后刷新页面即可看到。' : '它现在已经加入公开便签列表。'}
            </span>
          </div>
        ) : null}
      </section>
      ) : null}

      <Modal
        visible={Boolean(selectedConfession)}
        title="表白便签"
        width="560px"
        onClose={() => setSelectedConfession(null)}
        footer={selectedConfession ? (
          <Link className="btn btn-outline" to={`/wall/message/${selectedConfession.id}`}>
            查看动态详情 <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        ) : null}
      >
        {selectedConfession ? (
          <article className="confession-note-detail">
            <span className="confession-note-detail-pin" aria-hidden="true" />
            <p className="confession-note-detail-text">{selectedConfession.text}</p>
            <footer className="confession-note-detail-meta">
              <span><i className="bi bi-person" aria-hidden="true" />{selectedAuthor}</span>
              <time dateTime={String(selectedConfession.timestamp || '')}>
                <i className="bi bi-clock" aria-hidden="true" />{formatConfessionTime(selectedConfession.timestamp)}
              </time>
            </footer>
          </article>
        ) : null}
      </Modal>
    </div>
  )
}
