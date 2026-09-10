import { getAvatarUrl, getGenderIcon, handleAvatarError, truncateText } from '../utils/user'

export default function UserCard({ user, compact = false, hideDescription = false, subtitle = '' }) {
  const data = user || { id: 0, nickname: '匿名同学', description: '' }
  const isAnonymous = !data.id || data.nickname === '匿名同学' || data.nickname === '匿名用户'
  const secondaryText = subtitle || (
    hideDescription
      ? ''
      : truncateText(data.description || (isAnonymous ? '发表于匿名空间' : '这个人还没有写个人简介'), 32)
  )

  const body = (
    <>
      <span className={`user-card-avatar ${compact ? 'is-compact' : ''} relative`}>
        <img
          src={getAvatarUrl(data.id, data.avatar_url)}
          alt={data.nickname}
          onError={handleAvatarError}
          className="rounded-full object-cover"
        />
        {isAnonymous ? (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-600 text-white text-[9px]">
            <i className="bi bi-incognito" />
          </span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="truncate text-sm text-[var(--text-primary)]">
            {data.nickname || `同学 ${data.id}`}
          </span>
          {data.gender ? <i className={`${getGenderIcon(data.gender)} user-card-gender text-xs`} /> : null}
        </div>
        {secondaryText ? (
          <p className="truncate text-xs text-[var(--text-muted)]">
            {secondaryText}
          </p>
        ) : null}
      </div>
    </>
  )

  return <div className={`user-card ${compact ? 'is-compact' : ''}`}>{body}</div>
}
