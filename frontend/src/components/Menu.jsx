import { useEffect, useId, useRef, useState } from 'react'

// 轻量弹出菜单：点击外部、按 Esc 或选择菜单项后自动关闭。
export default function Menu({
  label = '更多操作',
  icon = 'bi-three-dots',
  triggerClassName = 'btn btn-ghost btn-icon btn-sm',
  triggerContent = null,
  up = false,
  disabled = false,
  children
}) {
  const [open, setOpen] = useState(false)
  const hostRef = useRef(null)
  const triggerRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutside = (event) => {
      if (!hostRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="menu" ref={hostRef}>
      <button
        ref={triggerRef}
        className={triggerClassName}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerContent || <i className={`bi ${icon}`} aria-hidden="true" />}
      </button>
      {open ? (
        <div
          id={panelId}
          className={`menu__panel${up ? ' is-up' : ''}`}
          role="menu"
          onClick={(event) => {
            if (event.target.closest('.menu__item')) setOpen(false)
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
