import { Link, useSearchParams } from 'react-router-dom'

export default function HelpSuccess() {
  const [searchParams] = useSearchParams()
  const isReport = searchParams.get('type') === 'report'
  const itemName = isReport ? '举报' : '反馈'

  return (
    <div className="page page--form">
      <section className="card result-card">
        <span className="result-card__icon is-ok"><i className="bi bi-check-lg" aria-hidden="true" /></span>
        <h1>{itemName}提交成功</h1>
        <p>
          {isReport
            ? '举报已进入核查队列。管理员会依据社区公约完成核实与处置。'
            : '非常感谢你的反馈！相关请求已进入处理队列，管理员会尽快审阅。'}
        </p>
        <div className="info-callout status-warning result-card__note">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>通常在 1–2 个工作日内核实完毕</span>
        </div>
        <div className="result-card__actions">
          <Link className="btn btn-primary" to="/"><i className="bi bi-house-door" aria-hidden="true" />返回首页</Link>
          <Link className="btn btn-outline" to="/wall"><i className="bi bi-chat-square-dots" aria-hidden="true" />逛逛校园墙</Link>
        </div>
      </section>
    </div>
  )
}
