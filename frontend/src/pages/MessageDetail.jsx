import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/EmptyState.jsx'
import MessageCard from '../components/MessageCard.jsx'

export default function MessageDetail() {
  const { id } = useParams()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.getMessageDetail(id)
      .then((response) => {
        if (response.data?.success) setMessage(response.data.message)
        else setError(response.data?.error || '消息不存在或已被删除')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page-center" role="status">
        <div className="spinner" />
        <p>正在加载留言详情…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page page--narrow">
        <EmptyState
          icon="bi-exclamation-circle"
          title={error}
          action={<Link className="btn btn-primary" to="/wall"><i className="bi bi-arrow-left" aria-hidden="true" />返回校园动态</Link>}
        />
      </div>
    )
  }

  return (
    <div className="page page--narrow">
      <Link to="/wall" className="back-link"><i className="bi bi-arrow-left" aria-hidden="true" />返回全部动态</Link>
      <header className="page-head">
        <div className="page-head__text">
          <h1>留言详情</h1>
          <p className="tabular">#{id}</p>
        </div>
      </header>
      {message ? <MessageCard message={message} /> : null}
    </div>
  )
}
