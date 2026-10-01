import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useUser } from '../contexts/UserContext.jsx'
import ThemePicker from './ThemePicker.jsx'

const groups = [
  {
    label: '内容',
    links: [
      { to: '/admin', icon: 'bi-speedometer2', label: '仪表盘', capabilities: ['dashboard.read'] },
      { to: '/admin/wall', icon: 'bi-chat-quote', label: '帖子审核', capabilities: ['content.queue.read'] },
      { to: '/admin/confessions', icon: 'bi-heart', label: '表白墙审核', capabilities: ['content.queue.read'] },
      { to: '/admin/comments', icon: 'bi-chat-left-text', label: '评论管理', capabilities: ['content.comment.read'] },
      { to: '/admin/trash', icon: 'bi-trash3', label: '内容回收站', capabilities: ['content.trash.read'] }
    ]
  },
  {
    label: '社区',
    links: [
      { to: '/admin/users', icon: 'bi-people', label: '用户与权限', capabilities: ['users.read'] },
      { to: '/admin/notice', icon: 'bi-megaphone', label: '公告管理', capabilities: ['notice.read'] },
      { to: '/admin/feedback', icon: 'bi-life-preserver', label: '反馈工单', capabilities: ['feedback.read'] },
      { to: '/admin/report', icon: 'bi-flag', label: '举报管理', capabilities: ['report.read'] }
    ]
  },
  {
    label: '系统',
    links: [
      { to: '/admin/notifications', icon: 'bi-bell', label: '消息提醒', capabilities: ['settings.notifications.read'] },
      { to: '/admin/settings', icon: 'bi-shield-lock', label: '平台与验证', capabilities: ['settings.read'] },
      { to: '/admin/audit', icon: 'bi-clock-history', label: '操作审计', capabilities: ['audit.read'] },
      { to: '/admin/log', icon: 'bi-file-text', label: '管理员日志', capabilities: ['logs.legacy_admin.read'] },
      { to: '/admin/error_log', icon: 'bi-exclamation-triangle', label: '错误日志', capabilities: ['logs.error.read'] }
    ]
  }
]

export default function AdminShell({ children, title, bare = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshMe } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    let alive = true
    const refreshAdmin = () => {
      api.adminVerify().then((response) => {
        if (alive) setAdmin(response.data?.admin || null)
      }).catch(() => {
        if (alive) setAdmin(null)
      })
    }
    refreshAdmin()
    window.addEventListener('admin-session-updated', refreshAdmin)
    return () => {
      alive = false
      window.removeEventListener('admin-session-updated', refreshAdmin)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const visibleGroups = useMemo(() => {
    const allowed = new Set(admin?.capabilities || [])
    return groups
      .map((group) => ({ ...group, links: group.links.filter((link) => link.capabilities.some((capability) => allowed.has(capability))) }))
      .filter((group) => group.links.length > 0)
  }, [admin])

  const logout = async () => {
    try {
      await api.adminLogout()
    } finally {
      await refreshMe()
      window.dispatchEvent(new Event('admin-session-updated'))
      localStorage.removeItem('admin_user')
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <div className="admin">
      <aside className={`admin__side${menuOpen ? ' is-open' : ''}`} aria-label="后台导航">
        <Link className="admin__brand" to="/admin">
          <span className="brand__mark" aria-hidden="true"><img src="/school-badge.webp" alt="" width="28" height="28" /></span>
          <span>
            <b>观澜校园墙</b>
            <small>管理后台</small>
          </span>
        </Link>

        <nav className="admin__nav">
          {visibleGroups.map((group) => (
            <div className="admin__group" key={group.label}>
              <span className="admin__group-label">{group.label}</span>
              {group.links.map(({ to, icon, label }) => (
                <NavLink key={to} to={to} end={to === '/admin'} className="admin__link">
                  <i className={`bi ${icon}`} aria-hidden="true" />{label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin__user">
          {admin?.username ? (
            <p className="admin__who"><span className="admin__initial" aria-hidden="true">{String(admin.username).slice(0, 1).toUpperCase()}</span><span className="truncate-1">{admin.username}</span></p>
          ) : null}
          <div className="admin__user-actions">
            <Link className="btn btn-outline btn-sm" to="/wall"><i className="bi bi-box-arrow-up-right" aria-hidden="true" />前台</Link>
            <button className="btn btn-outline btn-sm" type="button" onClick={logout}><i className="bi bi-box-arrow-right" aria-hidden="true" />退出</button>
          </div>
        </div>
      </aside>

      {menuOpen ? <button className="admin__scrim" type="button" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} /> : null}

      <div className="admin__main">
        <header className="admin__top">
          <button className="btn btn-ghost btn-icon admin__menu-btn" type="button" aria-label={menuOpen ? '收起管理菜单' : '展开管理菜单'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>
          <h1>{title}</h1>
          <ThemePicker />
        </header>

        <main className="admin__content" id="main-content" tabIndex={-1}>
          {bare ? children : <div className="card admin__panel">{children}</div>}
        </main>
      </div>
    </div>
  )
}
