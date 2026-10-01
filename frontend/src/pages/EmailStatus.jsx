import { Link, useSearchParams } from 'react-router-dom'
import { useUser } from '../contexts/UserContext.jsx'

export default function EmailStatus() {
  const [searchParams] = useSearchParams()
  const { user } = useUser()
  const ok = searchParams.get('email') === 'verified'

  return (
    <div className="page page--form">
      <section className="card result-card">
        <span className={`result-card__icon ${ok ? 'is-ok' : 'is-bad'}`}>
          <i className={`bi ${ok ? 'bi-envelope-check' : 'bi-envelope-x'}`} aria-hidden="true" />
        </span>
        <h1>{ok ? '邮箱已验证' : '验证没有完成'}</h1>
        <p>
          {ok
            ? (user ? '这个邮箱已经绑定到当前账号，可以接收校园墙消息。' : '邮箱已绑定。若账号还在审核，通过后再用学号登录即可接收消息。')
            : '验证链接无效、过期或已经被使用。请回到个人中心重新发送验证邮件。'}
        </p>
        <div className="result-card__actions">
          {user ? <Link className="btn btn-primary" to="/me">返回个人中心</Link> : <Link className="btn btn-primary" to="/login">去学号登录</Link>}
          <Link className="btn btn-outline" to="/wall">返回校园动态</Link>
        </div>
      </section>
    </div>
  )
}
