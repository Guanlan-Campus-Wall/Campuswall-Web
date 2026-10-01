import Avatar from './Avatar.jsx'
import { getGenderIcon, truncateText } from '../utils/user'

export default function UserCard({ user, compact = false, hideDescription = false, subtitle = '' }) {
  const data = user || { id: 0, nickname: '匿名同学', description: '' }
  const isAnonymous = !data.id || data.nickname === '匿名同学' || data.nickname === '匿名用户'
  const secondaryText = subtitle || (
    hideDescription
      ? ''
      : truncateText(data.description || (isAnonymous ? '发表于匿名空间' : '这个人还没有写个人简介'), 32)
  )

  return (
    <div className="user-card">
      <Avatar user={data} size={compact ? 'md' : 'lg'} anonymous={isAnonymous} />
      <div className="user-card__body">
        <div className="user-card__name">
          <span>{data.nickname || `同学 ${data.id}`}</span>
          {data.gender ? <i className={`${getGenderIcon(data.gender)} user-card__gender`} aria-hidden="true" /> : null}
        </div>
        {secondaryText ? <p className="user-card__sub">{secondaryText}</p> : null}
      </div>
    </div>
  )
}
