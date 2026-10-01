import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAlert } from '../contexts/AlertContext.jsx'

export default function Report() {
  const { id, commentId } = useParams()
  const [message, setMessage] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ category: 'abuse', email: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const alert = useAlert()

  useEffect(() => {
    setLoaded(false)
    api.getMessageDetail(id).then((response) => {
      if (response.data?.success) setMessage(response.data.message)
    }).catch(() => {
      setMessage(null)
    }).finally(() => setLoaded(true))
  }, [id])

  const targetComment = commentId
    ? (message?.comments || []).find((comment) => String(comment.id) === String(commentId))
    : null
  const targetMissing = loaded && (!message || (commentId && !targetComment))
  const targetTypeText = commentId ? '评论' : '留言'
  const targetExcerpt = commentId
    ? String(targetComment?.text || ((targetComment?.files || []).length ? '附件评论' : ''))
    : String(message?.text || ((message?.files || []).length ? '附件留言' : ''))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.text.trim()) {
      alert.showTopRightAlert('请填写详细举报理由', 'warning', '提示')
      return
    }
    if (targetMissing) {
      alert.showTopRightAlert(`被举报${targetTypeText}已不存在`, 'warning', '无法提交')
      return
    }
    setSubmitting(true)
    try {
      if (commentId) {
        await api.submitCommentReport(id, commentId, form)
      } else {
        await api.submitReport(id, form)
      }
      navigate('/help/success?type=report')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '举报提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--narrow">
      <Link to={`/wall/message/${id}`} className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />返回留言详情</Link>

      <header className="page-head">
        <div className="page-head__text">
          <h1>举报违规{targetTypeText}</h1>
          <p>共同守护友善的校园交流社区。我们会严格保密举报人信息并及时核实处理。</p>
        </div>
      </header>

      {loaded && targetMissing ? (
        <div className="info-callout status-warning mb-5">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>被举报{targetTypeText}已删除或暂时不可访问，无法继续提交举报。</span>
        </div>
      ) : null}

      {!targetMissing && (message || targetComment) ? (
        <blockquote className="quote-block">
          <span><i className="bi bi-quote" aria-hidden="true" />被举报{targetTypeText} #{id}{commentId ? ' 的评论' : ''}</span>
          <p>{targetExcerpt || '该内容仅包含附件'}</p>
        </blockquote>
      ) : null}

      <form className="card form-card form-stack" onSubmit={submit}>
        <label>
          <span className="field-label">违规分类</span>
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="abuse">辱骂攻击 / 恶意人肉 / 骚扰</option>
            <option value="spam">广告推销 / 刷屏刷榜</option>
            <option value="porn">色情低俗 / 违法违禁信息</option>
            <option value="rumor">虚假造谣 / 不实传闻</option>
            <option value="other">其它违规情况</option>
          </select>
        </label>

        <label>
          <span className="field-label">联系邮箱（选填）</span>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="如需管理员联系，可填写常用邮箱" />
        </label>

        <label>
          <span className="field-label">举报详细说明 *</span>
          <textarea style={{ minHeight: 150 }} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="请详细描述具体的违规事实或理由…" maxLength={1000} />
          <span className="field-hint text-right tabular">{form.text.length}/1000</span>
        </label>

        <div>
          <button className="btn btn-danger btn-lg" type="submit" disabled={submitting || targetMissing}>
            <i className="bi bi-shield-fill-check" aria-hidden="true" />{submitting ? '正在提交…' : '提交举报'}
          </button>
        </div>
      </form>
    </div>
  )
}
