import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import CaptchaWidget from '../components/CaptchaWidget.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import api from '../services/api'

const STUDENT_ID_INPUT_MAX = 32

const destinationFrom = (location) => {
  const from = location.state?.from
  const path = typeof from === 'string'
    ? from
    : (from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '')
  if (path.startsWith('/') && path !== '/' && !path.startsWith('/login')) return path
  return '/wall'
}

export default function Login() {
  const { user, loading, login, register } = useUser()
  const [mode, setMode] = useState('login')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [emailNotify, setEmailNotify] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [captcha, setCaptcha] = useState({ enabled: false, provider: 'none', site_key: '' })
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaLoading, setCaptchaLoading] = useState(true)
  const [captchaError, setCaptchaError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const alert = useAlert()
  const destination = useMemo(() => destinationFrom(location), [location])
  const emailStatus = searchParams.get('email') || ''
  const emailError = searchParams.get('email_error') || ''

  useEffect(() => {
    if (!emailStatus && !emailError) return undefined
    if (emailStatus === 'verified') {
      alert.showTopRightAlert('邮箱已验证，审核通过后即可登录接收消息', 'success', '邮箱已绑定')
    } else {
      alert.showTopRightAlert('验证链接无效或已过期', 'warning', '邮箱验证失败')
    }
    navigate({ pathname: '/login', search: '', hash: '' }, { replace: true, state: location.state })
    return undefined
  }, [alert, emailError, emailStatus, location.state, navigate])

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

  if (!loading && user) return <Navigate to={destination} replace />

  const captchaAction = mode === 'register' ? 'register' : 'login'
  const captchaRequired = captcha.enabled && captcha.protected_actions?.[captchaAction] !== false

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setPassword('')
    setPasswordConfirm('')
    setNickname('')
    setEmail('')
    setEmailNotify(true)
    setCaptchaToken('')
    setCaptchaResetKey((value) => value + 1)
  }

  const submit = async (event) => {
    event.preventDefault()
    const cleanId = studentId.trim()
    const isRegister = mode === 'register'
    if (isRegister && !/^\d+$/.test(cleanId)) {
      alert.showTopRightAlert('学号格式不正确', 'warning', '无法注册')
      return
    }
    if (!isRegister && !cleanId) {
      alert.showTopRightAlert('请输入学号或用户名，以及密码', 'warning', '信息还不完整')
      return
    }
    if (!password) {
      alert.showTopRightAlert('请输入密码', 'warning', '信息还不完整')
      return
    }
    if (isRegister && password.length < 8) {
      alert.showTopRightAlert('密码至少需要 8 个字符', 'warning', '密码太短')
      return
    }
    if (isRegister && password !== passwordConfirm) {
      alert.showTopRightAlert('两次输入的密码不一致', 'warning', '请重新确认密码')
      return
    }
    if (captchaRequired && !captchaToken) {
      alert.showTopRightAlert('请先完成人机验证', 'warning', '提示')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        student_id: cleanId,
        username: cleanId,
        password,
        captcha_token: captchaToken
      }
      if (isRegister) {
        const cleanEmail = email.trim()
        if (cleanEmail) payload.email = cleanEmail
        payload.email_notify = emailNotify
        payload.nickname = nickname.trim()
        const result = await register(payload)
        alert.showTopRightAlert(
          result?.email_queued
            ? '注册已提交。请查收验证邮件；审核员通过后再使用学号登录。'
            : '注册已提交。审核员通过后，再用同一学号和密码登录。',
          'success',
          '等待审核'
        )
        switchMode('login')
        return
      }
      await login(payload)
      alert.showTopRightAlert('登录成功，欢迎回来', 'success', '欢迎')
      navigate(destination, { replace: true })
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', isRegister ? '注册失败' : '登录失败')
      if (captchaRequired) {
        setCaptchaToken('')
        setCaptchaResetKey((value) => value + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className="auth-page campus-auth">
      <aside className="auth-welcome">
        <Link className="auth-home-link" to="/"><i className="bi bi-arrow-left" aria-hidden="true" />返回首页</Link>
        <img src="/school-badge.webp" alt="观澜中学校徽" width="68" height="68" />
        <h2>观澜中学校园墙</h2>
        <p>使用本校学号注册和登录，再参与校园讨论。</p>
        <div className="auth-welcome-bottom"><i className="bi bi-chat-square-heart" aria-hidden="true" />观澜中学 · 校园墙</div>
      </aside>
      <section className="card auth-form-card space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <h1 className="text-[1.75rem] font-bold leading-9 text-[var(--text-primary)]">{isRegister ? '学号注册' : '学号登录'}</h1>
          <p className="text-[0.9375rem] leading-6 text-[var(--text-secondary)]">
            {isRegister
              ? '请填写本校学号。提交后需审核员通过才能登录。'
              : '学生使用学号登录。后台人员请走管理员入口。'}
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-[12px] bg-[var(--card-secondary-bg)] p-1 auth-tabs" role="tablist" aria-label="账号操作">
          <button className={!isRegister ? 'is-active' : ''} type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>登录</button>
          <button className={isRegister ? 'is-active' : ''} type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>注册</button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5" htmlFor="account-student-id">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{isRegister ? '学号' : '学号或用户名'}</span>
            <input
              id="account-student-id"
              className="field auth-field w-full"
              value={studentId}
              onChange={(event) => setStudentId(isRegister ? event.target.value.replace(/\D/g, '').slice(0, STUDENT_ID_INPUT_MAX) : event.target.value)}
              inputMode={isRegister ? 'numeric' : 'text'}
              autoComplete="username"
              maxLength={isRegister ? STUDENT_ID_INPUT_MAX : 24}
              placeholder="请输入学号"
            />
          </label>

          {isRegister ? (
            <label className="block space-y-1.5" htmlFor="account-nickname">
              <span className="text-sm font-medium text-[var(--text-secondary)]">昵称（选填）</span>
              <input id="account-nickname" className="field auth-field w-full" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} placeholder="不填则使用默认昵称" />
            </label>
          ) : null}

          <label className="block space-y-1.5" htmlFor="account-password">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{isRegister ? '设置密码' : '登录密码'}</span>
            <div className="relative">
              <input id="account-password" className="field auth-field w-full pr-12" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength={128} placeholder={isRegister ? '至少 8 个字符' : '请输入密码'} />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword}><i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /></button>
            </div>
          </label>

          {isRegister ? (
            <label className="block space-y-1.5" htmlFor="account-password-confirm">
              <span className="text-sm font-medium text-[var(--text-secondary)]">确认密码</span>
              <input id="account-password-confirm" className="field auth-field w-full" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={128} placeholder="再次输入密码" />
            </label>
          ) : null}

          {isRegister ? (
            <div className="auth-email-block space-y-3">
              <label className="block space-y-1.5" htmlFor="account-email">
                <span className="text-sm font-medium text-[var(--text-secondary)]">邮箱（选填）</span>
                <input id="account-email" className="field auth-field w-full" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} placeholder="用于接收消息，可稍后在个人中心添加" />
              </label>
              <label className="flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
                <input className="mt-0.5" type="checkbox" checked={emailNotify} onChange={(event) => setEmailNotify(event.target.checked)} />
                <span>验证邮箱后接收消息通知。未验证前不会发信。</span>
              </label>
            </div>
          ) : null}

          {captchaLoading ? <div className="captcha-loading"><div className="spinner" /><span>正在加载安全验证...</span></div> : null}
          {captchaError ? <div className="info-callout status-danger p-3 text-sm">{captchaError}</div> : null}
          {!captchaLoading && !captchaError && captchaRequired ? (
            <div className="auth-captcha-slot space-y-2">
              <span className="text-xs font-bold text-[var(--text-secondary)]">人机验证</span>
              <CaptchaWidget action={captchaAction} provider={captcha.provider} siteKey={captcha.site_key} onToken={setCaptchaToken} resetKey={captchaResetKey} />
            </div>
          ) : null}

          <button className="btn btn-primary mt-2 w-full justify-center min-h-12" type="submit" disabled={submitting || captchaLoading || Boolean(captchaError) || (captchaRequired && !captchaToken)}>
            <i className={`bi ${isRegister ? 'bi-person-plus' : 'bi-box-arrow-in-right'}`} />
            <span>{submitting ? (isRegister ? '正在提交...' : '正在登录...') : (isRegister ? '提交学号注册' : '学号登录')}</span>
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-[var(--border-color)] pt-4 text-xs">
          <Link className="font-semibold text-[var(--primary-color)] hover:underline" to="/wall">← 返回校园动态</Link>
          <Link className="text-[var(--text-muted)] hover:underline" to="/admin/login">管理员入口</Link>
        </div>
      </section>
    </div>
  )
}
