export default function Pager({ label, loading = false, page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pager" aria-label={label}>
      <button className="btn btn-outline btn-sm" type="button" disabled={loading || page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
        <i className="bi bi-chevron-left" aria-hidden="true" />上一页
      </button>
      <span aria-live="polite">第 {page} / {totalPages} 页</span>
      <button className="btn btn-outline btn-sm" type="button" disabled={loading || page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
        下一页<i className="bi bi-chevron-right" aria-hidden="true" />
      </button>
    </nav>
  )
}
