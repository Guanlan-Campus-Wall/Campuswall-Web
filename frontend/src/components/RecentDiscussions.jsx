import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../services/api'
import { messageAuthor, handleAvatarError } from '../utils/user'

export default function RecentDiscussions() {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setStatus('loading')
    api.getMessages({ s: 'newest', f: 'all', start: 0, end: 8 }).then(({ data }) => {
      if (!active) return
      setMessages(Array.isArray(data?.data) ? data.data : [])
      setStatus('ready')
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [attempt])

  return (
    <section className="forum-panel" aria-labelledby="recent-title" aria-busy={status === 'loading'}>
      <header className="forum-panel-heading"><h2 id="recent-title">最新讨论</h2><Link to="/wall">全部动态 <i className="bi bi-arrow-right" aria-hidden="true" /></Link></header>
      {status === 'loading' ? <p className="forum-state" role="status">正在加载讨论…</p> : null}
      {status === 'error' ? <div className="forum-state" role="status"><p>暂时无法加载讨论</p><button className="btn btn-sm btn-outline" onClick={() => setAttempt((value) => value + 1)}>重新加载</button></div> : null}
      {status === 'ready' && !messages.length ? <div className="forum-state"><i className="bi bi-chat-square-text" aria-hidden="true" /><p>还没有公开的讨论</p><Link to="/wall">去校园动态看看</Link></div> : null}
      {status === 'ready' ? messages.map((message) => {
        const author = messageAuthor(message)
        const date = dayjs(message.timestamp)
        const text = String(message.text || message.poll?.question || '查看图片与附件').trim()
        const replies = Array.isArray(message.comments) ? message.comments.length : 0
        return (
          <article className="forum-topic" key={message.id}>
            <img className="forum-avatar" src={author.avatar_url} alt="" width="36" height="36" loading="lazy" onError={handleAvatarError} />
            <div className="forum-topic-copy">
              <Link className="forum-topic-title" to={`/wall/message/${message.id}`}>{message.pinned ? <span className="forum-pin">置顶</span> : null}{text}</Link>
              <div className="forum-topic-meta"><span>{author.nickname}</span>{message.tags?.slice(0, 2).map((tag) => <Link to={`/p/${encodeURIComponent(tag)}`} key={tag}>{tag}</Link>)}{message.timestamp && date.isValid() ? <time dateTime={date.toISOString()}>{date.format('MM-DD HH:mm')}</time> : null}</div>
            </div>
            <Link className="forum-replies" to={`/wall/message/${message.id}`} aria-label={`查看讨论，${replies} 条回复`}>{replies}<small>回复</small></Link>
          </article>
        )
      }) : null}
    </section>
  )
}
