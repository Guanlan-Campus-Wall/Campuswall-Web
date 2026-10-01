import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import { genderText, getAvatarUrl, getGenderIcon, handleAvatarError, publicUserFromProfile } from '../utils/user'
import { useAlert } from '../contexts/AlertContext.jsx'

export default function UserProfile() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const alert = useAlert()

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.allSettled([api.getUserProfile(id), api.getUserMessages(id)])
      .then(([profileResult, messagesResult]) => {
        if (!alive) return
        if (profileResult.status === 'fulfilled' && profileResult.value.data?.success) {
          setProfile(publicUserFromProfile(profileResult.value.data.user))
        } else {
          setProfile(null)
        }
        setMessages(messagesResult.status === 'fulfilled' ? (messagesResult.value.data?.messages || []) : [])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert.showTopRightAlert('个人主页链接已复制到剪贴板', 'success', '分享成功')
    } catch {
      alert.showTopRightAlert(window.location.href, 'info', '主页链接')
    }
  }

  if (loading) {
    return (
      <div className="page page--account" aria-busy="true">
        <section className="profile card">
          <div className="profile__cover" />
          <div className="profile__body">
            <div className="skeleton profile__avatar" />
            <div className="profile__main"><div className="skeleton h-8 w-48" /><div className="skeleton mt-3 h-4 w-64" /></div>
          </div>
        </section>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page page--form">
        <EmptyState
          icon="bi-people"
          title="用户不存在或资料不可用"
          action={<Link to="/wall" className="btn btn-primary">返回校园动态</Link>}
        />
      </div>
    )
  }

  return (
    <div className="page page--account">
      <section className="profile card">
        <div className="profile__cover" aria-hidden="true" />
        <div className="profile__body">
          <img className="profile__avatar" src={getAvatarUrl(profile.id, profile.avatar_url)} alt={profile.nickname} onError={handleAvatarError} />
          <div className="profile__main">
            <h1>{profile.nickname}</h1>
            <ul className="profile__meta">
              <li><i className={getGenderIcon(profile.gender)} aria-hidden="true" />{genderText(profile.gender)}</li>
              <li><i className="bi bi-chat-quote" aria-hidden="true" />{messages.length} 条公开分享</li>
              {profile.created_at ? <li><i className="bi bi-clock" aria-hidden="true" />{dayjs(profile.created_at).format('YYYY年M月')}加入</li> : null}
            </ul>
            {profile.bio ? <p className="profile__bio">{profile.bio}</p> : null}
          </div>
          <div className="profile__actions">
            <button className="btn btn-outline btn-sm" type="button" onClick={share}><i className="bi bi-share" aria-hidden="true" />分享主页</button>
          </div>
        </div>
      </section>

      <section className="page--reading" aria-labelledby="timeline-title">
        <div className="section-head">
          <h2 id="timeline-title">公开留言</h2>
          <small>仅展示非匿名发表的内容</small>
        </div>

        {!messages.length ? (
          <EmptyState icon="bi-chat-square-dots" title="还没有公开留言">该同学可能习惯匿名发布内容哦 ~</EmptyState>
        ) : null}

        <div className="feed-list">
          {messages.map((message) => <MessageCard key={message.id} message={message} />)}
        </div>
      </section>
    </div>
  )
}
