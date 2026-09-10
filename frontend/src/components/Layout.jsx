import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Fragment, useEffect, useMemo } from 'react'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import { firstAdminDestination } from '../services/permissions.js'
import { navigationModules } from '../modules/registry.jsx'
import ThemePicker from './ThemePicker.jsx'

const filledIcons = Object.freeze({
  'bi-house': 'bi-house-fill',
  'bi-chat-square-dots': 'bi-chat-square-dots-fill',
  'bi-heart': 'bi-heart-fill',
  'bi-person': 'bi-person-fill'
})

export default function Layout() {
  const { community, enabledModuleIds } = usePlatform()
  const { user, loading: userLoading, notificationUnread } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const isConfessionPage = location.pathname.startsWith('/confessions')
  const isLostFoundPage = location.pathname.startsWith('/lost-found')
  const wallEnabled = enabledModuleIds.has('wall')
  const confessionEnabled = enabledModuleIds.has('confessions')
  const lostFoundEnabled = enabledModuleIds.has('lost-found')
  const publishEnabled = isConfessionPage
    ? confessionEnabled && community.posting_enabled && Boolean(user || community.guest_posting_enabled)
    : isLostFoundPage
      ? lostFoundEnabled && community.posting_enabled && Boolean(user)
      : wallEnabled && community.posting_enabled && Boolean(user || community.guest_posting_enabled)
  const showPublish = !isLoginPage && (isConfessionPage ? confessionEnabled : isLostFoundPage ? lostFoundEnabled : wallEnabled)
  const publishLabel = isConfessionPage ? '写便签' : (isLostFoundPage ? '发启事' : '发帖')
  const publishDisabledReason = !community.posting_enabled
    ? (community.pause_reason || '管理员暂时关闭了发帖功能')
    : (isLostFoundPage || !(user || community.guest_posting_enabled) ? '登录后才能发布' : '暂时无法发布')
  const desktopModules = navigationModules('desktop', enabledModuleIds)
  const mobileModules = navigationModules('mobile', enabledModuleIds)
  const footerModules = navigationModules('footer', enabledModuleIds)
  const launchTimestamp = Date.parse(community.site_launched_at || '')
  const runDays = Number.isFinite(launchTimestamp) ? Math.max(0, Math.floor((Date.now() - launchTimestamp) / 86400000)) : 0

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  const openPublish = () => {
    if (isConfessionPage) {
      window.dispatchEvent(new Event('open-confession-compose'))
      return
    }
    if (isLostFoundPage) {
      window.dispatchEvent(new Event('open-lost-found-compose'))
      return
    }
    if (location.pathname !== '/wall') {
      navigate('/wall', { state: { openPublish: true } })
    } else {
      window.dispatchEvent(new Event('open-publish-modal'))
    }
  }

  const accountDestination = user ? '/me' : '/login'
  const unreadLabel = notificationUnread > 99 ? '99+' : notificationUnread
  const adminDestination = firstAdminDestination(user)
  const hasAdminAccess = Boolean(adminDestination)
  const adminLabel = user?.role === 'reviewer' ? '运营后台' : '管理后台'
  const footerLinks = useMemo(() => {
    const links = footerModules.map((module) => ({ to: module.path, label: module.footerLabel || module.label, key: module.id }))
    if (enabledModuleIds.has('help')) {
      links.push({ to: '/rules', label: '社区公约', key: 'rules' })
    }
    links.push({ href: 'https://github.com/ZONGRUICHD/Campus-Wall-For-GuanLan', label: '开源', key: 'source' })
    return links
  }, [enabledModuleIds, footerModules])

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand-link" aria-label="龙华区观澜中学校园墙首页">
            <span className="brand-mark shrink-0" aria-hidden="true">
              <img src="/school-badge.webp" alt="" width="32" height="32" />
            </span>
            <span className="brand-copy">观澜中学</span>
          </Link>

          <nav className="site-nav desktop-site-nav" aria-label="主导航">
            {desktopModules.map((module) => (
              <NavLink className="nav-link" to={module.path} end={module.end} key={module.id}>
                <i className={`bi ${module.icon}`} />
                <span>{module.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="navbar-actions flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {!userLoading && hasAdminAccess ? (
              <Link
                className="btn btn-sm btn-outline px-2.5 sm:px-3 navbar-desktop-only"
                to={adminDestination}
                aria-label={`进入${adminLabel}`}
                title={`进入${adminLabel}`}
              >
                <i className="bi bi-shield-check" />
                <span>{adminLabel}</span>
              </Link>
            ) : null}

            {showPublish ? (
              <button
                className="btn btn-sm btn-primary px-3 sm:px-3.5"
                type="button"
                onClick={openPublish}
                disabled={!publishEnabled}
                title={publishEnabled ? publishLabel : publishDisabledReason}
              >
                <i className="bi bi-pencil-square" />
                <span className="hidden sm:inline">{publishLabel}</span>
                <span className="mobile-publish-label sm:hidden">{publishLabel}</span>
              </button>
            ) : null}

            {!userLoading ? (
              <Link
                className="btn btn-sm btn-outline navbar-desktop-only px-3"
                to={user ? '/me' : '/login'}
                aria-label={user ? `打开 ${user.nickname || user.username} 的个人中心` : '登录或注册'}
              >
                <i className={`bi ${user ? 'bi-person-circle' : 'bi-box-arrow-in-right'}`} />
                <span className="max-w-24 truncate">{user ? (user.nickname || user.username) : '登录'}</span>
                {user && notificationUnread > 0 ? <span className="badge status-danger">{notificationUnread > 99 ? '99+' : notificationUnread}</span> : null}
              </Link>
            ) : null}

            <ThemePicker />
          </div>
        </div>
      </header>

      <main className="page-wrap">
        <div className="route-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav
        className="mobile-tab-bar"
        aria-label="移动端主导航"
        style={{ gridTemplateColumns: `repeat(${mobileModules.length + 1}, minmax(0, 1fr))` }}
      >
        {mobileModules.map((module) => (
          <NavLink className="mobile-tab-item" to={module.path} end={module.end} key={module.id}>
            {({ isActive }) => (
              <>
                <span className="mobile-tab-icon" aria-hidden="true">
                  <i className={`bi ${isActive ? (filledIcons[module.icon] || module.icon) : module.icon}`} />
                </span>
                <span className="mobile-tab-label">{module.mobileLabel || module.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <NavLink
          className="mobile-tab-item"
          to={accountDestination}
          aria-label={user
            ? (notificationUnread > 0 ? `我的，${notificationUnread} 条未读通知` : '我的')
            : '我的，登录后查看'}
        >
          {({ isActive }) => (
            <>
              <span className="mobile-tab-icon" aria-hidden="true">
                <i className={`bi ${user ? 'bi-person-circle' : (isActive ? 'bi-person-fill' : 'bi-person')}`} />
                {user && notificationUnread > 0 ? <span className="mobile-tab-badge">{unreadLabel}</span> : null}
              </span>
              <span className="mobile-tab-label">我的</span>
            </>
          )}
        </NavLink>
      </nav>

      <footer className="app-footer">
        <div className="mx-auto max-w-4xl space-y-3">
          <nav className="footer-links" aria-label="页脚导航">
            {footerLinks.map((link, index) => (
              <Fragment key={link.key}>
                {index > 0 ? <span className="footer-separator" aria-hidden="true">•</span> : null}
                {link.href
                  ? <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                  : <Link to={link.to}>{link.label}</Link>}
              </Fragment>
            ))}
          </nav>
          <p className="footer-brand text-sm font-semibold text-[var(--text-primary)]">
            龙华区观澜中学 · 校园墙
          </p>
          {runDays ? <p className="text-[13px] text-[var(--text-muted)]">已上线 {runDays} 天</p> : null}
        </div>
      </footer>
    </div>
  )
}
