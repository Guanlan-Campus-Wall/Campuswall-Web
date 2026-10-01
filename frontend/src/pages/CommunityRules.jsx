import { Link } from 'react-router-dom'
import { usePlatform } from '../contexts/PlatformContext.jsx'

export default function CommunityRules() {
  const { community, loading } = usePlatform()
  const rules = String(community.community_rules || '')
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean)

  const paused = !community.posting_enabled || !community.commenting_enabled

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <div className="page-head__text">
          <h1>社区公约</h1>
          <p>规则由平台管理员维护，适用于留言、评论和投票内容。</p>
        </div>
        <span className="badge status-success"><i className="bi bi-check-circle-fill" aria-hidden="true" />当前有效</span>
      </header>

      {paused ? (
        <div className="info-callout status-warning mb-5">
          <i className="bi bi-info-circle-fill" aria-hidden="true" />
          <span>{community.pause_reason || '部分互动功能目前由管理员暂时关闭，请稍后再试。'}</span>
        </div>
      ) : null}

      {loading ? <div className="page-center"><div className="spinner" /></div> : null}

      {!loading && rules.length ? (
        <ol className="rules">
          {rules.map((rule, index) => (
            <li className="card" key={`${index}-${rule}`}>
              <span className="rules__no">{index + 1}</span>
              <p>{rule}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {!loading && !rules.length ? <p className="text-muted text-center py-8">管理员暂未发布额外社区规则。</p> : null}

      <div className="chip-row mt-8" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/wall"><i className="bi bi-chat-square-dots" aria-hidden="true" />进入校园动态</Link>
        <Link className="btn btn-outline" to="/help"><i className="bi bi-life-preserver" aria-hidden="true" />帮助与反馈</Link>
      </div>
    </div>
  )
}
