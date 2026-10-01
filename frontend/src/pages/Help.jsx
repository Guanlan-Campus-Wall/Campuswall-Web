import { Link } from 'react-router-dom'

const cards = [
  { to: '/help/form', icon: 'bi-chat-left-heart-fill', tone: 'sky', title: '提交反馈与建议', text: '向管理员提交功能建议、网站 Bug、账号解封或其它求助支持。', cta: '前往填写表单' },
  { to: '/wall', icon: 'bi-shield-exclamation', tone: 'fig', title: '举报违规内容', text: '发现人身攻击、违规广告或不良信息？可在帖子的「更多」菜单里一键举报。', cta: '前往校园动态' },
  { to: '/rules', icon: 'bi-shield-check', tone: 'olive', title: '社区公约', text: '查看当前交流准则、互动开放状态以及校园社区内容规范。', cta: '查看社区规则' }
]

export default function Help() {
  return (
    <div className="page page--narrow">
      <header className="page-head">
        <div className="page-head__text">
          <h1>帮助与反馈</h1>
          <p>遇到问题、有想法，或者想举报违规内容，都可以从这里开始。</p>
        </div>
      </header>

      <div className="support-grid">
        {cards.map((card) => (
          <Link className="support-card card" to={card.to} key={card.to}>
            <span className={`tile-icon tile-icon--lg tone-${card.tone}`}><i className={`bi ${card.icon}`} aria-hidden="true" /></span>
            <div>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </div>
            <span className="support-card__cta">{card.cta}<i className="bi bi-arrow-right" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>

      <div className="info-callout mt-6">
        <i className="bi bi-info-circle-fill" aria-hidden="true" />
        <span>反馈问题时，请附上具体的操作步骤或截图，方便管理员排查。</span>
      </div>
    </div>
  )
}
