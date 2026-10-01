import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'
import Pager from '../components/Pager.jsx'

const topicPageSize = 24
const messagePageSize = 15
const topicTones = ['clay', 'kraft', 'olive', 'sky', 'fig', 'heather']

const topicDateTime = (value) => value ? String(value).replace(' ', 'T') : undefined
const toneFor = (tag) => topicTones[[...String(tag)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % topicTones.length]

export default function Partition() {
  const { tag = '' } = useParams()
  const selectedTag = String(tag || '').trim()
  const directoryMode = !selectedTag
  const loadSequence = useRef(0)
  const [topics, setTopics] = useState([])
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const pageSize = directoryMode ? topicPageSize : messagePageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
    setTotal(0)
    setError('')
    setTopics([])
    setMessages([])
  }, [selectedTag])

  useEffect(() => {
    const sequence = ++loadSequence.current
    let cancelled = false
    const start = (page - 1) * pageSize
    const end = start + pageSize

    setLoading(true)
    setError('')
    if (directoryMode) setTopics([])
    else setMessages([])

    const load = async () => {
      try {
        const response = directoryMode
          ? await api.getTopics({ q: appliedQuery, s: sort, start, end })
          : await api.getTopicMessages(selectedTag, { s: 'newest', start, end })
        if (cancelled || sequence !== loadSequence.current) return

        const nextTotal = Math.max(0, Number(response.data?.total) || 0)
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize))
        setTotal(nextTotal)
        if (page > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }

        if (directoryMode) setTopics(Array.isArray(response.data?.data) ? response.data.data : [])
        else setMessages(Array.isArray(response.data?.data) ? response.data.data : [])
      } catch (loadError) {
        if (!cancelled && sequence === loadSequence.current) {
          setError(loadError.message || '话题加载失败，请稍后重试')
          setTotal(0)
        }
      } finally {
        if (!cancelled && sequence === loadSequence.current) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appliedQuery, directoryMode, page, pageSize, reloadKey, selectedTag, sort])

  const submitSearch = (event) => {
    event.preventDefault()
    setAppliedQuery(query.trim())
    setPage(1)
  }

  const clearSearch = () => {
    setQuery('')
    setAppliedQuery('')
    setPage(1)
  }

  const changeSort = (event) => {
    setSort(event.target.value)
    setPage(1)
  }

  const retry = () => setReloadKey((value) => value + 1)

  return (
    <div className="page">
      <Link to={directoryMode ? '/wall' : '/p'} className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {directoryMode ? '返回校园动态' : '返回全部话题'}
      </Link>

      <header className="page-head">
        <div className="page-head__text">
          <h1>{directoryMode ? '话题广场' : `#${selectedTag}`}</h1>
          <p role="status" aria-live="polite">
            {loading
              ? (directoryMode ? '正在整理公开话题…' : '正在加载该话题的公开动态…')
              : (directoryMode ? `共 ${total} 个公开话题，按标签找到感兴趣的讨论。` : `共 ${total} 条公开动态`)}
          </p>
        </div>
      </header>

      {directoryMode ? (
        <div className="toolbar card topic-toolbar">
          <form className="searchbox" role="search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="topic-search">搜索话题名称</label>
            <i className="bi bi-search" aria-hidden="true" />
            <input id="topic-search" type="search" value={query} maxLength={50} onChange={(event) => setQuery(event.target.value)} placeholder="搜索话题名称" />
            {query ? (
              <button className="searchbox__clear" type="button" aria-label="清空话题搜索" onClick={clearSearch}>
                <i className="bi bi-x-circle-fill" aria-hidden="true" />
              </button>
            ) : null}
            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>搜索</button>
          </form>
          <div className="toolbar__side">
            <label className="sr-only" htmlFor="topic-sort">话题排序方式</label>
            <select id="topic-sort" className="field field--compact" value={sort} onChange={changeSort}>
              <option value="popular">动态最多</option>
              <option value="newest">最近更新</option>
              <option value="name">名称排序</option>
            </select>
            <button className="btn btn-ghost btn-icon btn-sm" type="button" disabled={loading} onClick={retry} aria-label="刷新">
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        directoryMode ? (
          <div className="topic-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <div className="skeleton topic-card" style={{ minHeight: 120 }} key={i} />)}
          </div>
        ) : (
          <div className="page-center" role="status"><div className="spinner" /><p>正在加载该话题动态…</p></div>
        )
      ) : null}

      {!loading && error ? (
        <EmptyState
          icon="bi-exclamation-octagon-fill"
          title="暂时无法加载话题"
          role="alert"
          action={(
            <div className="chip-row" style={{ justifyContent: 'center' }}>
              {/登录/.test(error) ? <Link to="/login" className="btn btn-primary">去登录</Link> : null}
              <button className="btn btn-outline" type="button" onClick={retry}><i className="bi bi-arrow-clockwise" aria-hidden="true" />重试</button>
            </div>
          )}
        >
          {error}
        </EmptyState>
      ) : null}

      {!loading && !error && directoryMode && topics.length === 0 ? (
        <EmptyState
          icon="bi-tags"
          title={appliedQuery ? '没有匹配的话题' : '暂时还没有公开话题'}
          action={appliedQuery ? <button className="btn btn-primary" type="button" onClick={clearSearch}>查看全部话题</button> : null}
        >
          {appliedQuery ? `没有找到包含“${appliedQuery}”的话题，请换个关键词试试。` : '公开动态添加标签后，会自动出现在这里。'}
        </EmptyState>
      ) : null}

      {!loading && !error && directoryMode && topics.length > 0 ? (
        <section aria-label="话题列表">
          <ul className="topic-grid">
            {topics.map((topic) => (
              <li key={topic.tag}>
                <Link
                  className={`topic-card tone-${toneFor(topic.tag)}`}
                  to={`/p/${encodeURIComponent(topic.tag)}`}
                  aria-label={`话题 ${topic.tag}，${topic.count} 条公开动态`}
                >
                  <span className="topic-card__tag">#{topic.tag}</span>
                  <span className="topic-card__foot">
                    <span className="topic-card__count"><b>{topic.count}</b> 条动态</span>
                    {topic.latest_at ? <time dateTime={topicDateTime(topic.latest_at)}>{String(topic.latest_at).slice(5, 16)}</time> : <span>暂无</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pager label="话题目录分页" loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}

      {!loading && !error && !directoryMode && messages.length === 0 ? (
        <EmptyState
          icon="bi-tags"
          title="该话题下暂无公开内容"
          action={<Link to="/wall" className="btn btn-primary"><i className="bi bi-pencil-square" aria-hidden="true" />发布动态</Link>}
        >
          发布动态时带上 #{selectedTag}，审核通过后即可出现在这里。
        </EmptyState>
      ) : null}

      {!directoryMode && !error && messages.length > 0 ? (
        <section className="page--reading" aria-label={`话题 ${selectedTag} 的动态`}>
          <div className="feed-list">
            {messages.map((message) => <MessageCard key={message.id} message={message} variant="moments" />)}
          </div>
          <Pager label={`话题 ${selectedTag} 分页`} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      ) : null}
    </div>
  )
}
