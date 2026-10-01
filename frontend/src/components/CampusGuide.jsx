import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'

export const campusEntries = Object.freeze([
  { id: 'confessions', to: '/confessions', label: '表白墙', description: '匿名表白与心情记录', icon: 'bi-heart-fill', tone: 'fig' },
  { id: 'lost-found', to: '/lost-found', label: '失物招领', description: '寻物启事与物品招领', icon: 'bi-search', tone: 'kraft' },
  { id: 'topics', to: '/p', label: '话题广场', description: '按标签查找感兴趣的讨论', icon: 'bi-hash', tone: 'olive' },
  { id: 'help', to: '/help', label: '帮助与反馈', description: '使用帮助、问题与建议', icon: 'bi-life-preserver', tone: 'sky' }
])

function HotTopics() {
  const [topics, setTopics] = useState([])

  useEffect(() => {
    let alive = true
    api.getTopics({ s: 'popular', start: 0, end: 10 })
      .then((response) => {
        if (alive) setTopics(Array.isArray(response.data?.data) ? response.data.data : [])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!topics.length) return null

  return (
    <section className="widget" aria-labelledby="hot-topics-title">
      <h2 className="widget__title" id="hot-topics-title"><i className="bi bi-fire" aria-hidden="true" />热门话题</h2>
      <div className="chip-row">
        {topics.map((topic) => (
          <Link className="tag tag--count" to={`/p/${encodeURIComponent(topic.tag)}`} key={topic.tag}>
            #{topic.tag}<small>{topic.count}</small>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function CampusGuide() {
  const { enabledModuleIds } = usePlatform()
  const { user } = useUser()

  return (
    <aside className="split__aside" aria-label="校园指南">
      <section className="school-card">
        <img src="/school-badge.webp" alt="观澜中学校徽" width="60" height="60" />
        <h2>龙华区观澜中学</h2>
        <p>校园日常、消息与讨论，由学生搭建和维护。</p>
        {!user
          ? <Link className="btn btn-primary btn-sm" to="/login">登录 / 注册</Link>
          : <Link className="btn btn-outline btn-sm" to="/me">我的主页</Link>}
      </section>

      <HotTopics />

      <section className="widget" aria-labelledby="campus-life-title">
        <h2 className="widget__title" id="campus-life-title">校园生活</h2>
        <nav className="widget__nav" aria-label="探索校园板块">
          {campusEntries.filter((entry) => enabledModuleIds.has(entry.id)).map((entry) => (
            <Link to={entry.to} key={entry.id}>
              <span className={`tile-icon tone-${entry.tone}`}><i className={`bi ${entry.icon}`} aria-hidden="true" /></span>
              <span className="widget__nav-text">
                <b>{entry.label}</b>
                <small>{entry.id === 'lost-found' && !user ? '登录后查看' : entry.description}</small>
              </span>
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>

      {enabledModuleIds.has('help') ? (
        <section className="widget widget--note">
          <h2 className="widget__title"><i className="bi bi-shield-check" aria-hidden="true" />社区须知</h2>
          <p>请勿公开个人隐私，讨论时尊重他人。发现违规内容可在帖子的「更多」菜单里举报。</p>
          <div className="widget__links">
            <Link to="/rules">社区公约 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
            <Link to="/help/form">联系我们 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </div>
        </section>
      ) : null}
    </aside>
  )
}
