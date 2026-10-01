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
    <section className="card panel" aria-labelledby="recent-title" aria-busy={status === 'loading'}>
      <header className="panel__head">
        <h2 id="recent-title">最新讨论</h2>
        <Link className="text-link" to="/wall">全部动态 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
      </header>

      {status === 'loading' ? (
        <div className="panel__state" role="status" aria-label="正在加载讨论">
          {[1, 2, 3, 4].map((i) => (
            <div className="topic-row" key={i}>
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/3" /></div>
            </div>
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="panel__state is-center" role="status">
          <p>暂时无法加载讨论</p>
          <button className="btn btn-outline btn-sm" type="button" onClick={() => setAttempt((value) => value + 1)}>重新加载</button>
        </div>
      ) : null}

      {status === 'ready' && !messages.length ? (
        <div className="panel__state is-center">
          <i className="bi bi-chat-square-text" aria-hidden="true" />
          <p>还没有公开的讨论</p>
          <Link className="text-link" to="/wall">去校园动态看看</Link>
        </div>
      ) : null}

      {status === 'ready' ? messages.map((message) => {
        const author = messageAuthor(message)
        const date = dayjs(message.timestamp)
        const text = String(message.text || message.poll?.question || '查看图片与附件').trim()
        const replies = Array.isArray(message.comments) ? message.comments.length : 0
        return (
          <article className="topic-row" key={message.id}>
            <img className="topic-row__avatar" src={author.avatar_url} alt="" width="40" height="40" loading="lazy" onError={handleAvatarError} />
            <div className="topic-row__copy">
              <Link className="topic-row__title" to={`/wall/message/${message.id}`}>
                {message.pinned ? <span className="badge status-warning">置顶</span> : null}
                <span>{text}</span>
              </Link>
              <div className="topic-row__meta">
                <span>{author.nickname}</span>
                {message.tags?.slice(0, 2).map((tag) => <Link className="tag" to={`/p/${encodeURIComponent(tag)}`} key={tag}>#{tag}</Link>)}
                {message.timestamp && date.isValid() ? <time dateTime={date.toISOString()}>{date.format('MM-DD HH:mm')}</time> : null}
              </div>
            </div>
            <Link className="topic-row__replies" to={`/wall/message/${message.id}`} aria-label={`查看讨论，${replies} 条回复`}>
              <i className="bi bi-chat-dots" aria-hidden="true" />{replies}
            </Link>
          </article>
        )
      }) : null}
    </section>
  )
}
