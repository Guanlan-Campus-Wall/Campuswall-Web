import { Link } from 'react-router-dom'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

export const campusEntries = Object.freeze([
  { id: 'confessions', to: '/confessions', label: '表白墙', description: '匿名表白与心情记录', icon: 'bi-heart', tone: 'rose' },
  { id: 'lost-found', to: '/lost-found', label: '失物招领', description: '寻物启事与物品招领', icon: 'bi-search', tone: 'amber' },
  { id: 'topics', to: '/p', label: '话题广场', description: '按标签查找感兴趣的讨论', icon: 'bi-hash', tone: 'green' },
  { id: 'help', to: '/help', label: '帮助与反馈', description: '使用帮助、问题与建议', icon: 'bi-life-preserver', tone: 'blue' }
])

export default function CampusGuide() {
  const { enabledModuleIds } = usePlatform()
  const { user } = useUser()

  return (
    <aside className="campus-guide" aria-label="校园指南">
      <section className="guide-intro">
        <img src="/school-badge.webp" alt="观澜中学校徽" width="48" height="48" />
        <h2>观澜中学校园墙</h2>
        <p>校园日常、消息与讨论。由学生搭建和维护。</p>
        {!user ? <Link className="btn btn-primary" to="/login">登录 / 注册</Link> : <Link className="btn btn-outline" to="/me">我的主页</Link>}
      </section>
      <section className="guide-directory">
        <h2>校园生活</h2>
        <nav aria-label="探索校园板块">
          {campusEntries.filter((entry) => enabledModuleIds.has(entry.id)).map((entry) => (
            <Link to={entry.to} key={entry.id}>
              <span className={`entry-symbol tone-${entry.tone}`}><i className={`bi ${entry.icon}`} aria-hidden="true" /></span>
              <span>{entry.label}{entry.id === 'lost-found' && !user ? <small>登录后查看</small> : null}</span>
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>
      {enabledModuleIds.has('help') ? (
        <section className="guide-note">
          <i className="bi bi-shield-check" aria-hidden="true" />
          <h2>社区须知</h2>
          <p>请勿公开个人隐私，讨论时尊重他人。发现违规内容可在帖子内举报。</p>
          <Link to="/rules">社区公约 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          <Link to="/help/form"><i className="bi bi-envelope" aria-hidden="true" />联系我</Link>
        </section>
      ) : null}
    </aside>
  )
}
