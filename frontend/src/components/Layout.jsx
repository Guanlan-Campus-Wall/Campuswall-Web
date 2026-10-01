import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAlert } from '../contexts/AlertContext.jsx'
import { usePlatform } from '../contexts/PlatformContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import api from '../services/api'
import { firstAdminDestination } from '../services/permissions.js'
import { navigationModules } from '../modules/registry.jsx'
import Avatar from './Avatar.jsx'
import BackToTop from './BackToTop.jsx'
import ThemePicker from './ThemePicker.jsx'

export default function Layout() {
  const { community, enabledModuleIds } = usePlatform()
  const { user, loading: userLoading, notificationUnread } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const alert = useAlert()
  const isAdminRoute = location.pathname.startsWith('/admin')

  const wallEnabled = enabledModuleIds.has('wall')
  const canPublish = wallEnabled && community.posting_enabled && Boolean(user || community.guest_posting_enabled)
  const publishDisabledReason = !wallEnabled
    ? '校园动态板块当前未启用'
    : !community.posting_enabled
      ? (community.pause_reason || '管理员暂时关闭了发帖功能')
      : '登录后才能发布'
  const navModules = (placement) => navigationModules(placement, enabledModuleIds)
    .filter((module) => userLoading || !user || module.id !== 'home')
  const desktopModules = navModules('desktop')
  const mobileModules = navModules('mobile')
  const footerModules = navModules('footer')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    const host = window.location.hostname
    if (host !== 'wall.zongtech.xyz') return undefined
    let alive = true
    api.getNetworkPrefer()
      .then((response) => {
        if (!alive || !response.data?.redirect || !response.data?.prefer_origin) return
        const preferred = new URL(response.data.prefer_origin)
        if (preferred.hostname === host) return
        const next = new URL(window.location.href)
        next.protocol = preferred.protocol
        next.host = preferred.host
        window.location.replace(next.toString())
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const openPublish = () => {
    if (!canPublish) {
      if (wallEnabled && !user && community.posting_enabled) {
        navigate('/login', { state: { from: { pathname: '/wall' } } })
        return
      }
      alert.showTopRightAlert(publishDisabledReason, 'warning', '暂时无法发布')
      return
    }
    if (location.pathname !== '/wall') {
      navigate('/wall', { state: { openPublish: true } })
    } else {
      window.dispatchEvent(new Event('open-publish-modal'))
    }
  }

  if (isAdminRoute) {
    return (
      <div className="app-shell app-shell--admin">
        <a className="skip-to-content" href="#main-content">跳转到主要内容</a>
        <Outlet />
      </div>
    )
  }

  const unreadLabel = notificationUnread > 99 ? '99+' : notificationUnread
  const adminDestination = firstAdminDestination(user)
  const hasAdminAccess = Boolean(adminDestination)
  const adminLabel = user?.role === 'reviewer' ? '运营后台' : '管理后台'

  // 移动端标签栏：把「发布」按钮放在正中间
  const tabItems = [
    ...mobileModules.map((module) => ({ kind: 'module', key: module.id, module })),
    { kind: 'account', key: 'account' }
  ]
  if (wallEnabled) tabItems.splice(Math.floor(tabItems.length / 2), 0, { kind: 'publish', key: 'publish' })

  return (
    <div className="app-shell">
      <a className="skip-to-content" href="#main-content">跳转到主要内容</a>

      <header className="site-header">
        <div className="site-header__inner">
          <Link to={user ? '/wall' : '/'} className="brand" aria-label={user ? '观澜中学校园墙 · 校园动态' : '观澜中学校园墙 · 首页'}>
            <span className="brand__mark" aria-hidden="true">
              <img src="/school-badge.webp" alt="" width="32" height="32" />
            </span>
            <span className="brand__text">
              <b>观澜校园墙</b>
            </span>
          </Link>

          <nav className="top-nav" aria-label="主导航">
            {desktopModules.map((module) => (
              <NavLink to={module.path} end={module.end} key={module.id}>
                <i className={`bi ${module.icon}`} aria-hidden="true" />
                <span>{module.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="site-header__actions">
            {!userLoading && hasAdminAccess ? (
              <Link className="btn btn-ghost btn-sm hide-mobile" to={adminDestination} title={`进入${adminLabel}`}>
                <i className="bi bi-shield-check" aria-hidden="true" />
                <span>{adminLabel}</span>
              </Link>
            ) : null}

            {wallEnabled && user ? (
              <button
                className="btn btn-primary btn-sm hide-mobile"
                type="button"
                onClick={openPublish}
                disabled={!canPublish}
                title={canPublish ? '发布动态' : publishDisabledReason}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
                <span>发布</span>
              </button>
            ) : null}

            <ThemePicker />

            {!userLoading ? (
              user ? (
                <Link
                  className="account-chip"
                  to="/me"
                  aria-label={`打开 ${user.nickname || user.username} 的个人中心${notificationUnread > 0 ? `，${notificationUnread} 条未读通知` : ''}`}
                >
                  <Avatar user={user} size="sm" />
                  <span className="account-chip__name">{user.nickname || user.username}</span>
                  {notificationUnread > 0 ? <span className="account-chip__dot" aria-hidden="true">{unreadLabel}</span> : null}
                </Link>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/login" aria-label="登录或注册">
                  <span>登录</span>
                </Link>
              )
            ) : null}
          </div>
        </div>
      </header>

      <main className="page-main" id="main-content" tabIndex={-1}>
        <div className="route" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <span className="brand__mark" aria-hidden="true">
              <img src="/school-badge.webp" alt="" width="32" height="32" loading="lazy" />
            </span>
            <div>
              <b>龙华区观澜中学 · 校园墙</b>
              <span>学生自主搭建与维护</span>
            </div>
          </div>
          <nav className="site-footer__links" aria-label="页脚导航">
            {footerModules.map((module) => (
              <Link to={module.path} key={module.id}>{module.footerLabel || module.label}</Link>
            ))}
            {enabledModuleIds.has('help') ? <Link to="/rules">社区公约</Link> : null}
          </nav>
        </div>
      </footer>

      <nav className="tabbar" aria-label="移动端主导航">
        {tabItems.map((item) => {
          if (item.kind === 'publish') {
            return (
              <button className="tabbar__fab" type="button" key={item.key} onClick={openPublish} aria-label="发布动态">
                <i className="bi bi-plus-lg" aria-hidden="true" />
              </button>
            )
          }
          if (item.kind === 'account') {
            return (
              <NavLink
                className="tabbar__item"
                to={user ? '/me' : '/login'}
                key={item.key}
                aria-label={user
                  ? (notificationUnread > 0 ? `我的，${notificationUnread} 条未读通知` : '我的')
                  : '我的，登录后查看'}
              >
                <span className="tabbar__icon" aria-hidden="true">
                  <i className={`bi ${user ? 'bi-person-circle' : 'bi-person'}`} />
                  {user && notificationUnread > 0 ? <span className="tabbar__badge">{unreadLabel}</span> : null}
                </span>
                <span>我的</span>
              </NavLink>
            )
          }
          return (
            <NavLink className="tabbar__item" to={item.module.path} end={item.module.end} key={item.key}>
              <span className="tabbar__icon" aria-hidden="true"><i className={`bi ${item.module.icon}`} /></span>
              <span>{item.module.mobileLabel || item.module.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <BackToTop />
    </div>
  )
}
