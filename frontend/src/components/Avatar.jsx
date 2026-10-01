import { getAvatarUrl, handleAvatarError } from '../utils/user'

export default function Avatar({ user, size = 'md', anonymous = false, className = '' }) {
  const data = user || {}
  return (
    <span className={`avatar avatar-${size} ${className}`}>
      <img
        src={getAvatarUrl(data.id, data.avatar_url)}
        alt={data.nickname || ''}
        width="96"
        height="96"
        loading="lazy"
        onError={handleAvatarError}
      />
      {anonymous ? <span className="avatar__anon" aria-hidden="true"><i className="bi bi-incognito" /></span> : null}
    </span>
  )
}
