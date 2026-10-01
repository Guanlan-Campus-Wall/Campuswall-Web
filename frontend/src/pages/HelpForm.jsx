import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAlert } from '../contexts/AlertContext.jsx'

export default function HelpForm() {
  const [form, setForm] = useState({ category: 'bug', title: '', email: '', text: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const alert = useAlert()

  const submit = async (event) => {
    event.preventDefault()
    if (!form.text.trim()) {
      alert.showTopRightAlert('请填写详细反馈内容', 'warning', '提示')
      return
    }
    setLoading(true)
    try {
      await api.submitHelp(form)
      navigate('/help/success')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page--narrow">
      <Link to="/help" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />返回帮助中心</Link>

      <header className="page-head">
        <div className="page-head__text">
          <h1>提交反馈</h1>
          <p>你的每一条建议，管理员都会认真阅读。</p>
        </div>
      </header>

      <div className="split split--form">
        <form className="card form-card form-stack" onSubmit={submit}>
          <label>
            <span className="field-label">反馈分类</span>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="bug">网站故障</option>
              <option value="feature">功能建议</option>
              <option value="account">账号问题</option>
              <option value="content">内容与社区</option>
              <option value="other">其他反馈</option>
            </select>
          </label>

          <label>
            <span className="field-label">反馈主题</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：建议增加某某功能 / 页面加载异常" maxLength={200} />
          </label>

          <label>
            <span className="field-label">联系邮箱（选填）</span>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="需要进一步沟通时，管理员可通过邮箱联系你" maxLength={320} />
          </label>

          <label>
            <span className="field-label">反馈详细说明 *</span>
            <textarea style={{ minHeight: 160 }} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="请尽可能详细地描述你遇到的情况或改进建议…" maxLength={10000} />
            <span className="field-hint text-right tabular">{form.text.length}/10000</span>
          </label>

          <div>
            <button className="btn btn-primary btn-lg" disabled={loading} type="submit">
              <i className="bi bi-send-fill" aria-hidden="true" />{loading ? '正在提交…' : '提交反馈'}
            </button>
          </div>
        </form>

        <aside className="split__aside">
          <section className="widget">
            <h2 className="widget__title"><i className="bi bi-info-circle-fill" aria-hidden="true" />填写建议</h2>
            <ol className="steps">
              <li><span>1</span><div><p>简要说明遇到的问题或需求</p></div></li>
              <li><span>2</span><div><p>如有具体操作步骤可详细列出</p></div></li>
              <li><span>3</span><div><p>留下邮箱方便管理员需要时联系你</p></div></li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
