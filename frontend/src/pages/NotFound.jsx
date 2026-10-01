import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page page--form">
      <section className="card result-card result-card--404">
        <div className="result-card__sea" aria-hidden="true">
          <b>404</b>
        </div>
        <h1>这一页不见了</h1>
        <p>你访问的页面可能已被移动，或链接输入有误。</p>
        <div className="result-card__actions">
          <Link to="/" className="btn btn-primary"><i className="bi bi-house-door" aria-hidden="true" />返回首页</Link>
          <Link to="/wall" className="btn btn-outline"><i className="bi bi-chat-square-dots" aria-hidden="true" />逛逛校园墙</Link>
        </div>
      </section>
    </div>
  )
}
