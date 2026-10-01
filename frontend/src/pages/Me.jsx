import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import Avatar from '../components/Avatar.jsx'
import { useAlert } from '../contexts/AlertContext.jsx'
import { useUser } from '../contexts/UserContext.jsx'
import { firstAdminDestination } from '../services/permissions.js'
import { genderText, getAvatarUrl, getGenderIcon, handleAvatarError } from '../utils/user'

const avatarTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const maxAvatarBytes = 5 * 1024 * 1024

export default function Me() {
  const { user, loading, logout, refreshMe, setUser, notificationUnread } = useUser()
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState(0)
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [avatarStamp, setAvatarStamp] = useState(Date.now())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailNotifySaving, setEmailNotifySaving] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const alert = useAlert()
  const avatarInputRef = useRef(null)
  const adminDestination = firstAdminDestination(user)
  const adminLabel = user?.role === 'reviewer' ? '运营后台' : '管理后台'

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setGender(user.gender || 0)
      setBio(user.bio || '')
      setEmailDraft(user.email_pending || user.email || '')
    }
  }, [user])

  useEffect(() => {
    const email = searchParams.get('email') || ''
    const emailError = searchParams.get('email_error') || ''
    if (!email && !emailError) return
    if (email === 'verified') alert.showTopRightAlert('邮箱已验证，可以接收消息通知', 'success', '邮箱已绑定')
    if (email === 'invalid' || emailError) alert.showTopRightAlert('验证链接无效或已过期', 'warning', '邮箱验证失败')
    navigate('/me', { replace: true })
  }, [alert, navigate, searchParams])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('')
      return undefined
    }
    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarFile])

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await api.userUpdateProfile({ nickname, gender, bio })
      if (response.data?.success) {
        setUser(response.data.user)
        alert.showTopRightAlert('个人资料修改已保存', 'success', '保存成功')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const saveEmail = async (event) => {
    event.preventDefault()
    setEmailSaving(true)
    try {
      const response = await api.userRequestEmail({ email: emailDraft })
      if (response.data?.success) {
        await refreshMe()
        alert.showTopRightAlert(response.data.message || '验证邮件已发送', 'success', '请查收邮箱')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '邮箱保存失败')
    } finally {
      setEmailSaving(false)
    }
  }

  const toggleEmailNotify = async (enabled) => {
    setEmailNotifySaving(true)
    try {
      const response = await api.userSetEmailNotify(enabled)
      if (response.data?.user) setUser(response.data.user)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '通知设置失败')
    } finally {
      setEmailNotifySaving(false)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) {
      alert.showTopRightAlert('请选择需要上传的头像文件', 'warning', '提示')
      return
    }
    setUploading(true)
    try {
      const response = await api.userUploadAvatar(avatarFile)
      if (response.data?.success) {
        setUser(response.data.user)
        setAvatarStamp(Date.now())
        setAvatarFile(null)
        if (avatarInputRef.current) avatarInputRef.current.value = ''
        alert.showTopRightAlert('头像已自动居中裁剪并压缩', 'success', '更换成功')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const selectAvatar = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setAvatarFile(null)
      return
    }
    if (file.type && !avatarTypes.has(file.type)) {
      event.target.value = ''
      setAvatarFile(null)
      alert.showTopRightAlert('仅支持 PNG、JPEG、GIF 或 WebP 图片', 'warning', '格式不支持')
      return
    }
    if (file.size > maxAvatarBytes) {
      event.target.value = ''
      setAvatarFile(null)
      alert.showTopRightAlert('头像文件不能超过 5MB', 'warning', '文件过大')
      return
    }
    setAvatarFile(file)
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      alert.showTopRightAlert('新密码至少需要 8 个字符', 'warning', '密码过短')
      return
    }
    if (newPassword !== confirmPassword) {
      alert.showTopRightAlert('两次输入的新密码不一致', 'warning', '请检查输入')
      return
    }
    setPasswordSaving(true)
    try {
      const response = await api.userChangePassword({
        current_password: currentPassword,
        new_password: newPassword
      })
      if (response.data?.success) {
        setUser(response.data.user)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        alert.showTopRightAlert('密码已修改，其他设备需要重新登录', 'success', '修改成功')
      }
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '密码修改失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  const doLogout = async () => {
    await logout()
    alert.showTopRightAlert('已退出登录', 'info', '提示')
    navigate('/', { replace: true })
  }

  const shortcuts = [
    { to: '/me/posts', icon: 'bi-journal-text', tone: 'sky', label: '我的发布', hint: '帖子与便签' },
    { to: '/me/comments', icon: 'bi-chat-left-text', tone: 'olive', label: '我的评论', hint: '评论与回复' },
    { to: '/me/favorites', icon: 'bi-bookmark-fill', tone: 'kraft', label: '我的收藏', hint: '留住喜欢的内容' },
    { to: '/me/notifications', icon: 'bi-bell-fill', tone: 'fig', label: '消息通知', hint: notificationUnread ? `${notificationUnread} 条未读` : '暂无未读', badge: notificationUnread }
  ]

  return (
    <div className="page page--account">
      <section className="profile card">
        <div className="profile__cover" aria-hidden="true" />
        <div className="profile__body">
          <img
            className="profile__avatar"
            src={`${getAvatarUrl(user.id, user.avatar_url)}?v=${avatarStamp}`}
            alt={user.nickname}
            onError={handleAvatarError}
          />
          <div className="profile__main">
            <h1>{user.nickname || '未设置昵称'}</h1>
            <ul className="profile__meta">
              <li><i className="bi bi-person-badge" aria-hidden="true" />{user.student_id ? `学号 ${user.student_id}` : `@${user.username}`}</li>
              <li><i className={getGenderIcon(user.gender)} aria-hidden="true" />{genderText(user.gender)}</li>
              <li><Link className="text-link" to={`/user/${user.id}`}>公开主页 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></li>
            </ul>
            {user.bio ? <p className="profile__bio">{user.bio}</p> : null}
          </div>
          <div className="profile__actions">
            {adminDestination ? <Link className="btn btn-soft btn-sm" to={adminDestination}><i className="bi bi-shield-check" aria-hidden="true" />{adminLabel}</Link> : null}
            <button className="btn btn-outline btn-sm" type="button" onClick={doLogout}><i className="bi bi-box-arrow-right" aria-hidden="true" />退出登录</button>
          </div>
        </div>
      </section>

      <nav className="shortcuts" aria-label="个人内容">
        {shortcuts.map((item) => (
          <Link className="shortcut card" to={item.to} key={item.to}>
            <span className={`tile-icon tone-${item.tone}`}><i className={`bi ${item.icon}`} aria-hidden="true" /></span>
            <span className="shortcut__text"><b>{item.label}</b><small>{item.hint}</small></span>
            {item.badge ? <span className="badge badge-count">{item.badge > 99 ? '99+' : item.badge}</span> : null}
          </Link>
        ))}
      </nav>

      {user.is_muted ? (
        <div className="info-callout status-warning">
          <i className="bi bi-exclamation-octagon-fill" aria-hidden="true" />
          <div>
            <b>账号当前处于禁言状态</b>
            <small>到期时间：{user.muted_until || '未设置'}{user.mute_reason ? ` · 原因：${user.mute_reason}` : ''}</small>
          </div>
        </div>
      ) : null}

      <div className="settings-grid">
        <form className="card form-card form-stack" onSubmit={saveProfile}>
          <header className="card-title"><h2>个人资料</h2><p>公开页面和发帖时展示的信息。</p></header>

          <label>
            <span className="field-label">展示昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} placeholder="公开页面展示的昵称" />
          </label>

          <label>
            <span className="field-label flex justify-between"><span>个人简介</span><span className="text-muted tabular">{bio.length}/200</span></span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={200} placeholder="介绍一下自己，公开主页会展示这段内容" />
          </label>

          <label>
            <span className="field-label">性别</span>
            <select value={gender} onChange={(event) => setGender(Number(event.target.value))}>
              <option value={0}>保密 / 未设置</option>
              <option value={1}>男生</option>
              <option value={2}>女生</option>
            </select>
          </label>

          <p className="field-hint"><i className="bi bi-info-circle-fill" aria-hidden="true" /> 用户名是你的登录标识，暂不支持自行修改。发帖时可选择匿名或使用上述昵称。</p>

          <div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <i className="bi bi-check-circle" aria-hidden="true" />{saving ? '正在保存…' : '保存资料'}
            </button>
          </div>
        </form>

        <section className="card form-card form-stack">
          <header className="card-title"><h2>头像</h2><p>自动居中裁剪为正方形并压缩，最大 5 MB。</p></header>

          <label className="dropzone">
            {avatarPreviewUrl ? (
              <img src={avatarPreviewUrl} alt="头像居中裁剪预览" />
            ) : (
              <Avatar user={user} size="xl" />
            )}
            <b>{avatarFile ? avatarFile.name : '点击选择新头像'}</b>
            <small>{avatarFile ? '预览为中心裁剪效果' : 'GIF 将取首帧作为静态头像'}</small>
            <input hidden ref={avatarInputRef} type="file" disabled={uploading} accept="image/png,image/jpeg,image/gif,image/webp" onChange={selectAvatar} />
          </label>

          <button className="btn btn-primary btn-block" type="button" disabled={uploading || !avatarFile} onClick={uploadAvatar}>
            <i className="bi bi-cloud-upload" aria-hidden="true" />{uploading ? '上传中…' : '确认更换头像'}
          </button>
        </section>
      </div>

      <div className="settings-grid settings-grid--even">
        <form className="card form-card form-stack" onSubmit={saveEmail}>
          <header className="card-title"><h2>邮箱通知</h2><p>验证通过后才会发送评论等通知，链接 24 小时内有效。</p></header>
          <div className="chip-row">
            {user.email_verified ? <span className="badge status-success"><i className="bi bi-check-circle" aria-hidden="true" />已验证</span> : <span className="badge status-warning"><i className="bi bi-hourglass-split" aria-hidden="true" />尚未验证</span>}
            {user.email_pending ? <span className="badge">待验证：{user.email_pending}</span> : null}
          </div>
          <label>
            <span className="field-label">{user.email_verified ? '已验证邮箱' : '添加邮箱'}</span>
            <input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} maxLength={320} placeholder="用于接收评论等消息" autoComplete="email" />
          </label>
          {user.email_pending ? <p className="field-hint">已向 {user.email_pending} 发送验证信。请打开邮件中的按钮完成绑定；没收到就检查垃圾箱，或在这里重新发送。</p> : null}
          <label className="check-row">
            <input type="checkbox" checked={user.email_notify !== false} disabled={emailNotifySaving || !user.email_verified} onChange={(event) => toggleEmailNotify(event.target.checked)} />
            <span>{user.email_verified ? '接收邮件通知' : '验证完成前不能打开邮件通知'}</span>
          </label>
          <div>
            <button className="btn btn-primary" type="submit" disabled={emailSaving || !emailDraft.trim()}>
              <i className="bi bi-envelope" aria-hidden="true" />{emailSaving ? '正在发送…' : (user.email_verified ? '更换并重新验证' : '发送验证邮件')}
            </button>
          </div>
        </form>

        {user?.has_password ? (
          <form className="card form-card form-stack" onSubmit={changePassword}>
            <header className="card-title"><h2>修改登录密码</h2><p>修改后，其他设备上的旧登录状态会自动失效。</p></header>
            <label>
              <span className="field-label">当前密码</span>
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="请输入当前密码" required />
            </label>
            <div className="form-grid">
              <label>
                <span className="field-label">新密码</span>
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} placeholder="至少 8 个字符" required />
              </label>
              <label>
                <span className="field-label">确认新密码</span>
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} placeholder="再次输入" required />
              </label>
            </div>
            <div>
              <button className="btn btn-primary" type="submit" disabled={passwordSaving}>
                <i className="bi bi-shield-check" aria-hidden="true" />{passwordSaving ? '正在修改…' : '确认修改密码'}
              </button>
            </div>
          </form>
        ) : (
          <section className="card form-card form-stack">
            <header className="card-title"><h2>未设置密码</h2><p>此账号没有登录密码。请联系管理员重置后再从学号或管理员入口登录。</p></header>
          </section>
        )}
      </div>

      {!user.student_id ? (
        <div className="info-callout">
          <i className="bi bi-info-circle-fill" aria-hidden="true" />
          <span>这是后台创建的账号，没有绑定学号。请使用用户名从管理员入口登录。</span>
        </div>
      ) : null}
    </div>
  )
}
