import { Link } from 'react-router-dom'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

export const campusEntries = Object.freeze([
  { id: 'confessions', to: '/confessions', label: '表白墙', description: '把没说出口的心意，留在这里', icon: 'bi-heart', tone: 'rose' },
  { id: 'lost-found', to: '/lost-found', label: '失物招领', description: '让遗失的物品，找到回来的路', icon: 'bi-search', tone: 'amber' },
  { id: 'topics', to: '/p', label: '话题广场', description: '学习、日常、互助，总有同频的人', icon: 'bi-hash', tone: 'green' },
  { id: 'help', to: '/help', label: '帮助与反馈', description: '你的一个建议，让校园墙更好', icon: 'bi-life-preserver', tone: 'blue' }
])

export default function CampusGuide() {
  const { enabledModuleIds } = usePlatform()
  const { user } = useUser()

  return (
    <aside className="campus-guide" aria-label="校园指南">
      <section className="guide-intro">
        <img src="/school-badge.webp" alt="观澜中学校徽" width="48" height="48" />
        <span className="campus-eyebrow">OUR CAMPUS, OUR STORIES</span>
        <h2>在观澜，<br />遇见同频的你。</h2>
        <p>分享课间的小事，接住彼此的心声。这里是属于我们的校园一角。</p>
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
          <h2>让表达，多一点善意</h2>
          <p>尊重不同的声音，保护彼此的隐私，一起维护友善的校园社区。</p>
          <Link to="/rules">阅读社区公约 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        </section>
      ) : null}
    </aside>
  )
}
