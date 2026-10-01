import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import CaptchaWidget from '../components/CaptchaWidget.jsx'
import Collage from '../components/Collage.jsx'
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
    <div className="page auth">
      <aside className="auth__brand">
        <Link className="auth__back" to="/"><i className="bi bi-arrow-left" aria-hidden="true" />返回首页</Link>
        <div className="auth__brand-body">
          <span className="auth__badge"><img src="/school-badge.webp" alt="观澜中学校徽" width="64" height="64" /></span>
          <h2>观澜校园墙</h2>
          <p>使用本校学号注册和登录，参与校园讨论。</p>
          <ul>
            <li><i className="bi bi-incognito" aria-hidden="true" />可以匿名发声，也可以展示昵称</li>
            <li><i className="bi bi-search" aria-hidden="true" />失物招领、表白墙、话题广场</li>
            <li><i className="bi bi-bell" aria-hidden="true" />评论与回复第一时间通知你</li>
          </ul>
        </div>
        <Collage className="auth__art" />
      </aside>

      <section className="auth__form">
        <div className="auth__head">
          <h1>{isRegister ? '学号注册' : '学号登录'}</h1>
          <p>
            {isRegister
              ? '请填写本校学号。提交后需审核员通过才能登录。'
              : '学生使用学号登录。后台人员请走管理员入口。'}
          </p>
        </div>

        <div className="seg seg--full" role="tablist" aria-label="账号操作">
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>登录</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>注册</button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          <label htmlFor="account-student-id">
            <span className="field-label">{isRegister ? '学号' : '学号或用户名'}</span>
            <input
              id="account-student-id"
              className="auth__input"
              value={studentId}
              onChange={(event) => setStudentId(isRegister ? event.target.value.replace(/\D/g, '').slice(0, STUDENT_ID_INPUT_MAX) : event.target.value)}
              inputMode={isRegister ? 'numeric' : 'text'}
              autoComplete="username"
              maxLength={isRegister ? STUDENT_ID_INPUT_MAX : 24}
              placeholder="请输入学号"
            />
          </label>

          {isRegister ? (
            <label htmlFor="account-nickname">
              <span className="field-label">昵称（选填）</span>
              <input id="account-nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} placeholder="不填则使用默认昵称" />
            </label>
          ) : null}

          <label htmlFor="account-password">
            <span className="field-label">{isRegister ? '设置密码' : '登录密码'}</span>
            <div className="input-affix">
              <input id="account-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength={128} placeholder={isRegister ? '至少 8 个字符' : '请输入密码'} />
              <button type="button" className="input-affix__btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </label>

          {isRegister ? (
            <label htmlFor="account-password-confirm">
              <span className="field-label">确认密码</span>
              <input id="account-password-confirm" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={128} placeholder="再次输入密码" />
            </label>
          ) : null}

          {isRegister ? (
            <div className="form-stack auth__email">
              <label htmlFor="account-email">
                <span className="field-label">邮箱（选填）</span>
                <input id="account-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} placeholder="用于接收消息，可稍后在个人中心添加" />
              </label>
              <label className="check-row">
                <input type="checkbox" checked={emailNotify} onChange={(event) => setEmailNotify(event.target.checked)} />
                <span>验证邮箱后接收消息通知。未验证前不会发信。</span>
              </label>
            </div>
          ) : null}

          {captchaLoading ? <div className="auth__captcha-loading"><div className="spinner is-sm" /><span>正在加载安全验证…</span></div> : null}
          {captchaError ? <div className="info-callout status-danger">{captchaError}</div> : null}
          {!captchaLoading && !captchaError && captchaRequired ? (
            <div className="auth__captcha">
              <span className="field-label">人机验证</span>
              <CaptchaWidget action={captchaAction} provider={captcha.provider} siteKey={captcha.site_key} onToken={setCaptchaToken} resetKey={captchaResetKey} />
            </div>
          ) : null}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting || captchaLoading || Boolean(captchaError) || (captchaRequired && !captchaToken)}>
            <i className={`bi ${isRegister ? 'bi-person-plus' : 'bi-box-arrow-in-right'}`} aria-hidden="true" />
            <span>{submitting ? (isRegister ? '正在提交…' : '正在登录…') : (isRegister ? '提交学号注册' : '登录')}</span>
          </button>
        </form>

        <div className="auth__foot">
          <Link to="/wall"><i className="bi bi-arrow-left" aria-hidden="true" /> 先逛逛校园动态</Link>
          <Link to="/admin/login">管理员入口</Link>
        </div>
      </section>
    </div>
  )
}
