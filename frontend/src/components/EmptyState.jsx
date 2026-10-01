export default function EmptyState({ icon = 'bi-inbox', title, children, action = null, role }) {
  return (
    <div className="empty-state-card" role={role}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      {title ? <h3>{title}</h3> : null}
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}
