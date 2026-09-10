import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminShell from '../../components/AdminShell.jsx'
import CaptchaWidget from '../../components/CaptchaWidget.jsx'
import { useAlert } from '../../contexts/AlertContext.jsx'
import { defaultCommunity, usePlatform } from '../../contexts/PlatformContext.jsx'
import { useUser } from '../../contexts/UserContext.jsx'
import api from '../../services/api'

const communityFormValue = (settings = {}) => ({
  ...defaultCommunity,
  ...settings,
  sensitive_words: Array.isArray(settings.sensitive_words)
    ? settings.sensitive_words.join('\n')
    : String(settings.sensitive_words || '')
})

const captchaFormValue = (settings = {}) => ({
  enabled: settings.enabled === true,
  provider: ['turnstile', 'recaptcha'].includes(settings.provider) ? settings.provider : 'none',
  site_key: String(settings.site_key || ''),
  secret_key: '',
  clear_secret: false,
  has_secret: settings.has_secret === true,
  configured: settings.configured === true,
  protect_login: settings.protect_login !== false,
  protect_register: settings.protect_register !== false,
  protect_admin_login: settings.protect_admin_login !== false,
  allowed_hostnames: Array.isArray(settings.allowed_hostnames) ? settings.allowed_hostnames.join('\n') : String(settings.allowed_hostnames || ''),
  source: settings.source || 'environment',
  updated_at: settings.updated_at || null,
  updated_by: settings.updated_by || ''
})

function ToggleRow({ checked, description, disabled = false, label, onChange }) {
  return (
    <label className="settings-toggle-row">
      <span><b>{label}</b><small>{description}</small></span>
      <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-switch" aria-hidden="true" />
    </label>
  )
}

export default function AdminSettings() {
  const [communityForm, setCommunityForm] = useState(communityFormValue())
  const [captchaForm, setCaptchaForm] = useState(captchaFormValue())
  const [savedCaptcha, setSavedCaptcha] = useState(captchaFormValue())
  const [aiForm, setAiForm] = useState({ enabled: false, base_url: '', api_key: '', clear_api_key: false, has_api_key: false, configured: false, model: 'gpt-4o-mini', lexicon_size: 0 })
  const [savingAi, setSavingAi] = useState(false)
  const [captchaTestToken, setCaptchaTestToken] = useState('')
  const [captchaTestResetKey, setCaptchaTestResetKey] = useState(0)
  const [testingCaptcha, setTestingCaptcha] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingCommunity, setSavingCommunity] = useState(false)
  const [savingCaptcha, setSavingCaptcha] = useState(false)
  const alert = useAlert()
  const { refreshCommunity } = usePlatform()
  const { hasCapability } = useUser()
  const canUpdateCommunity = hasCapability('settings.community.update')
  const canUpdateCaptcha = hasCapability('settings.captcha.update')
  const canReadAi = hasCapability('settings.ai.read')
  const canUpdateAi = hasCapability('settings.ai.update')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [communityResponse, captchaResponse, aiResponse] = await Promise.all([
        api.adminGetCommunitySettings(),
        api.adminGetCaptchaSettings(),
        api.adminGetAiSettings().catch(() => ({ data: { settings: null } }))
      ])
      setCommunityForm(communityFormValue(communityResponse.data?.settings || {}))
      const nextCaptcha = captchaFormValue(captchaResponse.data?.settings || {})
      setCaptchaForm(nextCaptcha)
      setSavedCaptcha(nextCaptcha)
      if (aiResponse.data?.settings) {
        setAiForm({
          enabled: aiResponse.data.settings.enabled === true,
          base_url: String(aiResponse.data.settings.base_url || ''),
          api_key: '',
          clear_api_key: false,
          has_api_key: aiResponse.data.settings.has_api_key === true,
          configured: aiResponse.data.settings.configured === true,
          model: String(aiResponse.data.settings.model || 'gpt-4o-mini'),
          lexicon_size: Number(aiResponse.data.settings.lexicon_size) || 0
        })
      }
      setCaptchaTestToken('')
      setCaptchaTestResetKey((value) => value + 1)
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '设置加载失败')
    } finally {
      setLoading(false)
    }
  }, [alert])

  useEffect(() => { load() }, [load])

  const updateCommunity = (name, value) => {
    setCommunityForm((current) => ({ ...current, [name]: value }))
  }

  const updateCaptcha = (name, value) => {
    setCaptchaForm((current) => ({ ...current, [name]: value }))
  }

  const saveCommunity = async (event) => {
    event.preventDefault()
    if (!canUpdateCommunity) return
    setSavingCommunity(true)
    try {
      const response = await api.adminUpdateCommunitySettings({
        posting_enabled: communityForm.posting_enabled,
        commenting_enabled: communityForm.commenting_enabled,
        guest_posting_enabled: communityForm.guest_posting_enabled,
        guest_commenting_enabled: communityForm.guest_commenting_enabled,
        require_post_approval: communityForm.require_post_approval,
        pause_reason: communityForm.pause_reason,
        community_rules: communityForm.community_rules,
        sensitive_words: communityForm.sensitive_words
      })
      setCommunityForm(communityFormValue(response.data?.settings || communityForm))
      await refreshCommunity()
      const released = Number(response.data?.released_pending || 0)
      alert.showTopRightAlert(released ? `设置已生效，${released} 条待审留言已公开` : '社区运营设置已同步到前台', 'success', '保存成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '保存失败')
    } finally {
      setSavingCommunity(false)
    }
  }

  const sensitiveWordCount = useMemo(() => new Set(
    String(communityForm.sensitive_words || '').split(/[\n,，]+/).map((word) => word.trim().toLowerCase()).filter(Boolean)
  ).size, [communityForm.sensitive_words])
  const captchaReady = !captchaForm.enabled || (
    captchaForm.provider !== 'none'
    && captchaForm.site_key.trim()
    && !captchaForm.clear_secret
    && (captchaForm.has_secret || captchaForm.secret_key.trim())
    && [captchaForm.protect_login, captchaForm.protect_register, captchaForm.protect_admin_login].some(Boolean)
    && (captchaForm.provider !== 'turnstile' || String(captchaForm.allowed_hostnames || '').trim())
  )

  const saveCaptcha = async (event) => {
    event.preventDefault()
    if (!canUpdateCaptcha || !captchaReady) return
    setSavingCaptcha(true)
    try {
      const response = await api.adminUpdateCaptchaSettings({
        enabled: captchaForm.enabled,
        provider: captchaForm.provider,
        site_key: captchaForm.site_key.trim(),
        secret_key: captchaForm.secret_key.trim(),
        clear_secret: captchaForm.clear_secret,
        protect_login: captchaForm.protect_login,
        protect_register: captchaForm.protect_register,
        protect_admin_login: captchaForm.protect_admin_login,
        allowed_hostnames: captchaForm.allowed_hostnames
      })
      const nextCaptcha = captchaFormValue(response.data?.settings || captchaForm)
      setCaptchaForm(nextCaptcha)
      setSavedCaptcha(nextCaptcha)
      setCaptchaTestToken('')
      setCaptchaTestResetKey((value) => value + 1)
      alert.showTopRightAlert('人机验证设置已生效', 'success', '保存成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '人机验证保存失败')
    } finally {
      setSavingCaptcha(false)
    }
  }

  const testCaptcha = async () => {
    if (!canUpdateCaptcha || !captchaTestToken) return
    setTestingCaptcha(true)
    try {
      const response = await api.adminTestCaptcha({ captcha_token: captchaTestToken })
      const verification = response.data?.verification || {}
      alert.showTopRightAlert(`验证成功，来源 ${verification.hostname || '已确认'}`, 'success', 'Cloudflare Turnstile 正常')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', '人机验证测试失败')
    } finally {
      setCaptchaTestToken('')
      setCaptchaTestResetKey((value) => value + 1)
      setTestingCaptcha(false)
    }
  }

  const saveAi = async (event) => {
    event.preventDefault()
    if (!canUpdateAi) return
    setSavingAi(true)
    try {
      const response = await api.adminUpdateAiSettings({
        enabled: aiForm.enabled,
        base_url: aiForm.base_url.trim(),
        api_key: aiForm.api_key.trim(),
        clear_api_key: aiForm.clear_api_key,
        model: aiForm.model.trim() || 'gpt-4o-mini'
      })
      const settings = response.data?.settings || {}
      setAiForm((current) => ({
        ...current,
        enabled: settings.enabled === true,
        base_url: String(settings.base_url || ''),
        api_key: '',
        clear_api_key: false,
        has_api_key: settings.has_api_key === true,
        configured: settings.configured === true,
        model: String(settings.model || 'gpt-4o-mini'),
        lexicon_size: Number(settings.lexicon_size) || current.lexicon_size
      }))
      alert.showTopRightAlert('AI 审核配置已保存，API Key 不会回显', 'success', '保存成功')
    } catch (error) {
      alert.showTopRightAlert(error.message, 'warning', 'AI 配置保存失败')
    } finally {
      setSavingAi(false)
    }
  }

  return (
    <AdminShell title="平台设置">
      {loading ? <div className="page-center"><div className="spinner" /></div> : null}

      {!loading ? (
        <>
          <div className="admin-settings-heading">
            <div><h2>社区运营控制</h2></div>
            <span className={`badge ${communityForm.posting_enabled && communityForm.commenting_enabled ? 'status-success' : 'status-warning'}`}>{communityForm.posting_enabled && communityForm.commenting_enabled ? '互动开放' : '部分关闭'}</span>
          </div>

          <form className="admin-settings-form mt-5 max-w-4xl" onSubmit={saveCommunity}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="允许发布留言" description="关闭后所有访客都不能发布留言" checked={communityForm.posting_enabled} disabled={!canUpdateCommunity || savingCommunity} onChange={(value) => updateCommunity('posting_enabled', value)} />
              <ToggleRow label="允许发表评论" description="关闭后所有留言暂停新增评论和回复" checked={communityForm.commenting_enabled} disabled={!canUpdateCommunity || savingCommunity} onChange={(value) => updateCommunity('commenting_enabled', value)} />
              <ToggleRow label="允许游客发帖" description="关闭后未登录访客不能发布动态或表白；默认关闭，需登录后发帖" checked={communityForm.guest_posting_enabled} disabled={!canUpdateCommunity || savingCommunity || !communityForm.posting_enabled} onChange={(value) => updateCommunity('guest_posting_enabled', value)} />
              <ToggleRow label="允许游客评论" description="关闭后未登录访客不能评论或回复；默认关闭" checked={communityForm.guest_commenting_enabled} disabled={!canUpdateCommunity || savingCommunity || !communityForm.commenting_enabled} onChange={(value) => updateCommunity('guest_commenting_enabled', value)} />
              <ToggleRow label="强制全部人工审核" description="打开后，即使 AI/词库未命中辱骂也会送人工。关闭时：命中辱骂必进人工复审，未命中直接公开。免审角色和失物招领仍立即公开。" checked={communityForm.require_post_approval} disabled={!canUpdateCommunity || savingCommunity} onChange={(value) => updateCommunity('require_post_approval', value)} />
            </div>

            <label className="block space-y-2">
              <span className="font-bold">暂停说明</span>
              <input className="field w-full" value={communityForm.pause_reason || ''} maxLength={300} disabled={!canUpdateCommunity || savingCommunity} onChange={(event) => updateCommunity('pause_reason', event.target.value)} placeholder="例如：系统维护中，预计今晚 22:00 恢复" />
              <span className="block text-right text-xs text-muted">{String(communityForm.pause_reason || '').length}/300</span>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-3 font-bold"><span>社区公约</span><span className="text-xs text-muted">每行一条规则</span></span>
              <textarea className="field min-h-48 w-full" value={communityForm.community_rules || ''} maxLength={10000} disabled={!canUpdateCommunity || savingCommunity} onChange={(event) => updateCommunity('community_rules', event.target.value)} />
              <span className="block text-right text-xs text-muted">{String(communityForm.community_rules || '').length}/10000</span>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-3 font-bold"><span>敏感词拦截</span><span className={`text-xs ${sensitiveWordCount > 200 ? 'text-rose-500' : 'text-muted'}`}>{sensitiveWordCount}/200</span></span>
              <textarea className="field min-h-40 w-full font-mono text-sm" value={communityForm.sensitive_words || ''} disabled={!canUpdateCommunity || savingCommunity} onChange={(event) => updateCommunity('sensitive_words', event.target.value)} placeholder="每行一个词，也支持使用逗号分隔" />
              <span className="text-xs text-muted">命中后由后端拒绝发布，不会向公开配置接口返回词表。</span>
            </label>

            <div className="settings-security-note"><i className="bi bi-shield-check" /><span>开关和敏感词在后端强制执行，不能通过绕过前端按钮规避。</span></div>

            {!canUpdateCommunity ? <div className="info-callout"><i className="bi bi-eye" /><span><b>当前为只读模式</b><br />你可以查看社区设置，但没有修改社区设置的权限。</span></div> : null}

            <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
              <button className="btn btn-outline" type="button" disabled={savingCommunity} onClick={load}>重置</button>
              {canUpdateCommunity ? <button className="btn btn-primary" type="submit" disabled={savingCommunity || sensitiveWordCount > 200}><i className="bi bi-check-lg" />{savingCommunity ? '保存中...' : '保存社区设置'}</button> : null}
            </div>
          </form>

          <div className="mt-8 border-t border-[var(--border-color)] pt-7">
            <div className="admin-settings-heading">
              <div><h2>Cloudflare Turnstile 人机验证</h2><p className="mt-1 text-sm text-muted">保护师生登录、账号注册和后台登录；令牌必须由服务器向 Cloudflare 二次校验。</p></div>
              <span className={`badge ${captchaForm.enabled && captchaForm.configured ? 'status-success' : 'status-warning'}`}>{captchaForm.enabled && captchaForm.configured ? '保护中' : (captchaForm.configured ? '已配置 · 未启用' : '待配置')}</span>
            </div>

            <form className="admin-settings-form mt-5 max-w-4xl" onSubmit={saveCaptcha}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-[var(--card-secondary-bg)] p-4"><span className="text-xs text-muted">服务商</span><strong className="mt-1 block">{captchaForm.provider === 'turnstile' ? 'Cloudflare' : (captchaForm.provider === 'recaptcha' ? 'reCAPTCHA' : '未选择')}</strong></div>
                <div className="rounded-2xl bg-[var(--card-secondary-bg)] p-4"><span className="text-xs text-muted">站点密钥</span><strong className="mt-1 block">{captchaForm.site_key ? '已填写' : '未填写'}</strong></div>
                <div className="rounded-2xl bg-[var(--card-secondary-bg)] p-4"><span className="text-xs text-muted">服务端密钥</span><strong className="mt-1 block">{captchaForm.has_secret && !captchaForm.clear_secret ? '已加密保存' : '未保存'}</strong></div>
                <div className="rounded-2xl bg-[var(--card-secondary-bg)] p-4"><span className="text-xs text-muted">配置来源</span><strong className="mt-1 block">{captchaForm.source === 'database' ? '后台管理' : '服务器环境'}</strong></div>
              </div>

              <ToggleRow
                label="启用人机验证"
                description="总开关；关闭后保留密钥和范围设置，重新开启无需重复填写"
                checked={captchaForm.enabled}
                disabled={!canUpdateCaptcha || savingCaptcha}
                onChange={(value) => updateCaptcha('enabled', value)}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="font-bold">验证服务商</span>
                  <select className="field w-full" value={captchaForm.provider} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(event) => updateCaptcha('provider', event.target.value)}>
                    <option value="none">不使用</option>
                    <option value="turnstile">Cloudflare Turnstile</option>
                    <option value="recaptcha">Google reCAPTCHA（兼容旧配置）</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="font-bold">站点密钥</span>
                  <input className="field w-full" value={captchaForm.site_key} maxLength={500} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(event) => updateCaptcha('site_key', event.target.value)} autoComplete="off" placeholder="Site key" />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>服务端密钥</span><span className="text-xs text-muted">{captchaForm.has_secret ? '已保存；留空表示不替换' : '尚未保存'}</span></span>
                <input className="field w-full" type="password" value={captchaForm.secret_key} maxLength={1000} disabled={!canUpdateCaptcha || savingCaptcha || captchaForm.clear_secret} onChange={(event) => updateCaptcha('secret_key', event.target.value)} autoComplete="new-password" placeholder={captchaForm.has_secret ? '留空保留已有密钥' : 'Secret key'} />
                {captchaForm.has_secret ? (
                  <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={captchaForm.clear_secret} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(event) => updateCaptcha('clear_secret', event.target.checked)} /><span>保存时清除已有服务端密钥（会自动停止保护）</span></label>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>允许的前端域名</span><span className="text-xs text-muted">每行一个，不含协议、端口或通配符</span></span>
                <textarea className="field min-h-28 w-full font-mono text-sm" value={captchaForm.allowed_hostnames} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(event) => updateCaptcha('allowed_hostnames', event.target.value)} placeholder="wall.zongtech.xyz" />
                <span className="text-xs text-muted">服务端会校验 Cloudflare 返回的 hostname；Cloudflare 控制台中的 Widget 也必须允许相同域名。</span>
              </label>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3"><b>保护范围</b><span className="text-xs text-muted">可分别启停</span></div>
                <div className="grid gap-3 md:grid-cols-3">
                  <ToggleRow label="师生登录" description="用户名密码登录" checked={captchaForm.protect_login} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(value) => updateCaptcha('protect_login', value)} />
                  <ToggleRow label="账号注册" description="新用户提交注册" checked={captchaForm.protect_register} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(value) => updateCaptcha('protect_register', value)} />
                  <ToggleRow label="后台登录" description="审核员与管理员入口" checked={captchaForm.protect_admin_login} disabled={!canUpdateCaptcha || savingCaptcha} onChange={(value) => updateCaptcha('protect_admin_login', value)} />
                </div>
              </div>

              <div className="settings-security-note"><i className="bi bi-shield-lock" /><span>服务端密钥使用 AES-256-GCM 加密保存且永不回显；Cloudflare Token 单次使用，登录失败后组件会自动重置。</span></div>
              {!canUpdateCaptcha ? <div className="info-callout"><i className="bi bi-eye" /><span>当前为只读模式；需要 <code>settings.captcha.update</code> 才能修改人机验证配置。</span></div> : null}

              <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                <button className="btn btn-outline" type="button" disabled={savingCaptcha} onClick={load}>重置</button>
                {canUpdateCaptcha ? <button className="btn btn-primary" type="submit" disabled={savingCaptcha || !captchaReady}><i className="bi bi-shield-check" />{savingCaptcha ? '保存中...' : '保存人机验证'}</button> : null}
              </div>
            </form>

            {savedCaptcha.configured && savedCaptcha.provider !== 'none' ? (
              <section className="admin-settings-form mt-5 max-w-4xl" aria-labelledby="captcha-test-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 id="captcha-test-title" className="text-lg font-bold">配置自检</h3><p className="mt-1 text-sm text-muted">使用已保存的 Site Key 生成真实令牌，再由后端使用已保存的 Secret Key 验证。</p></div>
                  <a className="btn btn-outline" href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" />Cloudflare 控制台</a>
                </div>
                <CaptchaWidget action="admin_test" provider={savedCaptcha.provider} siteKey={savedCaptcha.site_key} onToken={setCaptchaTestToken} resetKey={captchaTestResetKey} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4">
                  <span className="text-xs text-muted">{captchaTestToken ? '浏览器验证已完成，可以测试服务端密钥。' : '请先完成上方验证。'}</span>
                  <button className="btn btn-primary" type="button" disabled={!canUpdateCaptcha || testingCaptcha || !captchaTestToken} onClick={testCaptcha}><i className="bi bi-cloud-check" />{testingCaptcha ? '测试中...' : '测试完整链路'}</button>
                </div>
              </section>
            ) : null}
          </div>

          {canReadAi ? (
            <div className="mt-8 border-t border-[var(--border-color)] pt-7">
              <div className="admin-settings-heading">
                <div>
                  <h2>AI 帖子审核</h2>
                  <p className="mt-1 text-sm text-muted">内置中文辱骂词库命中后必须人工复审；未命中则通过。OpenAI 兼容接口仅超级管理员可改，Key 只写不回显。</p>
                </div>
                <span className={`badge ${aiForm.configured && aiForm.enabled ? 'status-success' : 'status-warning'}`}>{aiForm.enabled && aiForm.configured ? '词库 + 模型' : `词库 ${aiForm.lexicon_size || 0} 条`}</span>
              </div>
              <form className="admin-settings-form mt-5 max-w-4xl" onSubmit={saveAi}>
                <ToggleRow
                  label="启用模型复检"
                  description="词库未命中时，再把正文发给 OpenAI 兼容接口。模型判定辱骂或接口失败时仍送人工。关闭则只走词库。"
                  checked={aiForm.enabled}
                  disabled={!canUpdateAi || savingAi}
                  onChange={(value) => setAiForm((current) => ({ ...current, enabled: value }))}
                />
                <label className="block space-y-2">
                  <span className="font-bold">OpenAI Base URL</span>
                  <input className="field w-full" value={aiForm.base_url} disabled={!canUpdateAi || savingAi} onChange={(event) => setAiForm((current) => ({ ...current, base_url: event.target.value }))} placeholder="https://api.openai.com/v1" autoComplete="off" />
                </label>
                <label className="block space-y-2">
                  <span className="font-bold">模型名</span>
                  <input className="field w-full" value={aiForm.model} disabled={!canUpdateAi || savingAi} onChange={(event) => setAiForm((current) => ({ ...current, model: event.target.value }))} placeholder="gpt-4o-mini" autoComplete="off" />
                </label>
                <label className="block space-y-2">
                  <span className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>API Key</span><span className="text-xs text-muted">{aiForm.has_api_key ? '已保存；留空表示不替换' : '尚未保存'}</span></span>
                  <input className="field w-full" type="password" value={aiForm.api_key} disabled={!canUpdateAi || savingAi || aiForm.clear_api_key} onChange={(event) => setAiForm((current) => ({ ...current, api_key: event.target.value }))} placeholder={aiForm.has_api_key ? '留空保留现有密钥' : 'sk-...'} autoComplete="new-password" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={aiForm.clear_api_key} disabled={!canUpdateAi || savingAi} onChange={(event) => setAiForm((current) => ({ ...current, clear_api_key: event.target.checked, api_key: '' }))} />
                  清除已保存的 API Key
                </label>
                {!canUpdateAi ? <div className="info-callout"><i className="bi bi-lock" /><span>只有超级管理员可以修改 OpenAI Base URL 和 API Key。</span></div> : null}
                <div className="flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                  {canUpdateAi ? <button className="btn btn-primary" type="submit" disabled={savingAi}><i className="bi bi-robot" />{savingAi ? '保存中...' : '保存 AI 审核'}</button> : null}
                </div>
              </form>
            </div>
          ) : null}
        </>
      ) : null}

    </AdminShell>
  )
}
