import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import HeartParticles from '../components/HeartParticles.jsx'
import Modal from '../components/Modal.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

const CONFESSION_TAG = '表白'
const CONFESSION_LIMIT = 280
const CONFESSION_FETCH_LIMIT = 72
const NOTE_TILTS = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.8]

const timestampValue = (value) => String(value || '')
const compareNewestFirst = (left, right) => (
  timestampValue(right.timestamp).localeCompare(timestampValue(left.timestamp))
  || Number(right.id || 0) - Number(left.id || 0)
)

const parseTimestamp = (value) => new Date(String(value || '').replace(' ', 'T'))

const formatConfessionTime = (value) => {
  if (!value) return '发布时间未知'
  const parsed = parseTimestamp(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}

const shortTime = (value) => {
  const parsed = parseTimestamp(value)
  return Number.isNaN(parsed.getTime())
    ? '时间未知'
    : new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
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
      setComposeOpen(false)
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

  const animationDisabled = reducedMotion || !heartLive

  return (
    <div className="page confession">
      <section className="sky" aria-label="立体粒子爱心">
        <div className="sky__stars" aria-hidden="true" />
        <header className="sky__head">
          <div>
            <h1>表白墙</h1>
            <p>把没说出口的话，写成一张便签。</p>
          </div>
          <button className="btn btn-light btn-lg" type="button" onClick={() => setComposeOpen(true)}>
            <i className="bi bi-pencil-square" aria-hidden="true" />写一张便签
          </button>
        </header>

        <HeartParticles reducedMotion={animationDisabled} />

        <div className="sky__bar">
          <div className="sky__status" aria-live="polite">
            {loading ? <><span className="spinner is-sm" />正在加载便签…</> : null}
            {!loading && loadError ? <span className="sky__error">{loadError}</span> : null}
            {!loading && !loadError ? <span><i className="bi bi-heart-fill" aria-hidden="true" /> {confessions.length} 张便签已经公开</span> : null}
          </div>
          <div className="sky__tools">
            <button className="btn btn-glass btn-sm" type="button" onClick={() => setHeartLive((open) => !open)} disabled={reducedMotion} aria-pressed={heartLive && !reducedMotion}>
              {reducedMotion ? '已减少动态效果' : heartLive ? '暂停动画' : '播放动画'}
            </button>
            <button className="btn btn-glass btn-sm" type="button" onClick={loadConfessions} disabled={loading}>
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />刷新
            </button>
          </div>
        </div>
      </section>

      {submissionReceipt ? (
        <div className="info-callout status-success confession__receipt" role="status">
          <i className={`bi ${submissionReceipt.pendingReview ? 'bi-hourglass-split' : 'bi-check-circle-fill'}`} aria-hidden="true" />
          <span>
            <b>便签 #{submissionReceipt.id} {submissionReceipt.pendingReview ? '已进入审核队列。' : '已公开发布。'}</b>{' '}
            {submissionReceipt.pendingReview ? '审核通过后刷新页面即可看到。' : '它现在已经加入公开便签墙。'}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={() => setSubmissionReceipt(null)} aria-label="关闭提示">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="notes" aria-labelledby="notes-title">
        <header className="notes__head">
          <h2 id="notes-title">公开便签</h2>
          <span className="badge">{confessions.length} 张</span>
        </header>

        {loading && !confessions.length ? (
          <div className="notes__grid" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((i) => <div className="note note--skeleton skeleton" key={i} />)}
          </div>
        ) : null}

        {!loading && !confessions.length && !loadError ? (
          <EmptyState icon="bi-heart" title="还没有公开便签" role="status">审核通过的便签会贴在这面墙上。</EmptyState>
        ) : null}

        {confessions.length ? (
          <div className="notes__grid">
            {confessions.map((note, index) => {
              const seed = Number(note.id) || index
              return (
                <button
                  className={`note note--c${seed % 5}`}
                  style={{ '--tilt': `${NOTE_TILTS[seed % NOTE_TILTS.length]}deg` }}
                  type="button"
                  key={note.id}
                  onClick={() => setSelectedConfession(note)}
                  aria-label={`查看 ${shortTime(note.timestamp)} 发布的表白便签`}
                >
                  <span className="note__tape" aria-hidden="true" />
                  <span className="note__text">{note.text}</span>
                  <time className="note__time" dateTime={String(note.timestamp || '')}>{shortTime(note.timestamp)}</time>
                </button>
              )
            })}
          </div>
        ) : null}
      </section>

      <Modal
        visible={composeOpen}
        title="写一张便签"
        width="560px"
        onClose={() => !submitting && setComposeOpen(false)}
        footer={(
          <>
            <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setComposeOpen(false)}>取消</button>
            <button className="btn btn-primary" type="submit" form="confession-form" disabled={!canPublish || submitting || !draft.trim()}>
              {submitting ? <span className="spinner" /> : <i className="bi bi-send-fill" aria-hidden="true" />}
              {submitting ? '正在提交' : ((user && !anonymous) ? '提交便签' : '匿名提交')}
            </button>
          </>
        )}
      >
        <form id="confession-form" className="note-editor" onSubmit={submitConfession}>
          {!canPublish ? (
            <div className="info-callout status-warning">
              <i className="bi bi-info-circle-fill" aria-hidden="true" />
              <span>{publishDisabledReason}</span>
              {!user ? <Link className="btn btn-sm btn-primary" to="/login">去登录</Link> : null}
            </div>
          ) : null}

          <div className="note-editor__paper">
            <span className="note__tape" aria-hidden="true" />
            <label className="sr-only" htmlFor="confession-draft">表白便签内容</label>
            <textarea
              id="confession-draft"
              className="note-editor__input"
              rows="6"
              maxLength={CONFESSION_LIMIT}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="写下一句真诚、尊重且不暴露隐私的话…"
              disabled={!canPublish || submitting}
              aria-describedby="confession-compose-help confession-compose-count"
            />
            <span className="note-editor__count tabular" id="confession-compose-count" aria-live="polite">{draft.length}/{CONFESSION_LIMIT}</span>
          </div>

          <div className="note-editor__row">
            <span id="confession-compose-help" className="field-hint">公开前需要审核，请勿填写姓名、班级、联系方式等隐私。</span>
            {user ? (
              <button className="chip" type="button" aria-pressed={!anonymous} onClick={() => setAnonymous((current) => !current)}>
                <i className={`bi ${anonymous ? 'bi-incognito' : 'bi-person-badge'}`} aria-hidden="true" />
                {anonymous ? '匿名提交' : '展示昵称'}
              </button>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        visible={Boolean(selectedConfession)}
        title="表白便签"
        width="520px"
        onClose={() => setSelectedConfession(null)}
        footer={selectedConfession ? (
          <Link className="btn btn-outline" to={`/wall/message/${selectedConfession.id}`}>
            查看动态详情 <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        ) : null}
      >
        {selectedConfession ? (
          <article className="note-detail">
            <span className="note__tape" aria-hidden="true" />
            <p className="note-detail__text">{selectedConfession.text}</p>
            <footer className="note-detail__meta">
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
