import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CaptchaWidget from '../../components/CaptchaWidget.jsx'
import ThemePicker from '../../components/ThemePicker.jsx'
import api from '../../services/api'
import { useAlert } from '../../contexts/AlertContext.jsx'
import { useUser } from '../../contexts/UserContext.jsx'

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState({ enabled: false, provider: 'none', site_key: '' })
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaLoading, setCaptchaLoading] = useState(true)
  const [captchaError, setCaptchaError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const alert = useAlert()
  const { refreshMe } = useUser()
  const captchaRequired = captcha.enabled && captcha.protected_actions?.admin_login !== false

  useEffect(() => {
    let active = true
    api.getCaptchaConfig()
      .then((response) => {
        if (active) setCaptcha(response.data?.captcha || { enabled: false, provider: 'none', site_key: '' })
      })
      .catch((error) => {
        if (active) setCaptchaError(error.message || '安全验证配置加载失败')
      })
      .finally(() => {
        if (active) setCaptchaLoading(false)
      })
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (captchaRequired && !captchaToken) {
      alert.showTopRightAlert('请先完成人机验证', 'warning', '提示')
      return
    }
    setLoading(true)
    try {
      const response = await api.adminLogin({ ...form, captcha_token: captchaToken })
      if (response.data?.success) {
        localStorage.setItem('admin_user', form.username)
        await refreshMe()
        const from = location.state?.from
        const destination = from?.pathname
          ? `${from.pathname}${from.search || ''}${from.hash || ''}`
          : '/admin'
        navigate(destination, { replace: true })
      } else {
        alert.showTopRightAlert(response.data?.error || '登录失败', 'warning', '错误')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '登录失败')
      if (captchaRequired) {
        setCaptchaToken('')
        setCaptchaResetKey((value) => value + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login" id="main-content" tabIndex={-1}>
      <div className="admin-login__theme"><ThemePicker /></div>
      <div className="admin-login__box">
        <div className="admin-login__brand">
          <span className="brand__mark" aria-hidden="true"><img src="/school-badge.webp" alt="" width="28" height="28" /></span>
          <b>观澜校园墙</b>
        </div>
        <h1>管理后台</h1>
        <p>用于审核内容、管理公告、处理举报和维护用户账号。请确认你正在使用可信设备。</p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            <span className="field-label">用户名</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="请输入管理员用户名" autoComplete="username" />
          </label>
          <label>
            <span className="field-label">密码</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="请输入密码" autoComplete="current-password" />
          </label>
          {captchaLoading ? <div className="auth__captcha-loading"><div className="spinner is-sm" /><span>正在加载安全验证…</span></div> : null}
          {captchaError ? <div className="info-callout status-danger">{captchaError}</div> : null}
          {!captchaLoading && !captchaError && captchaRequired ? (
            <div className="auth__captcha">
              <span className="field-label">Cloudflare 人机验证</span>
              <CaptchaWidget action="admin_login" provider={captcha.provider} siteKey={captcha.site_key} onToken={setCaptchaToken} resetKey={captchaResetKey} />
            </div>
          ) : null}
          <button className="btn btn-primary btn-lg btn-block" disabled={loading || captchaLoading || Boolean(captchaError) || (captchaRequired && !captchaToken)} type="submit">
            <i className="bi bi-box-arrow-in-right" aria-hidden="true" />{loading ? '登录中…' : '登录后台'}
          </button>
        </form>

        <div className="auth__foot">
          <Link to="/login">师生登录</Link>
          <Link to="/help">遇到问题？</Link>
        </div>
      </div>
    </main>
  )
}
