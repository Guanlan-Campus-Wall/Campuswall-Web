import { memo } from 'react'

// 首页插画：一面贴满便签的墙。纯 SVG，扁平色块 + 细墨线，风格参考 Anthropic 的手绘拼贴。
const INK = '#141413'

const Lines = ({ rows, x = -56, y = 0, gap = 17 }) => (
  <g stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.72">
    {rows.map((width, index) => (
      <line key={index} x1={x} y1={y + index * gap} x2={x + width} y2={y + index * gap} />
    ))}
  </g>
)

const Pin = ({ x, y, color }) => (
  <g>
    <circle cx={x} cy={y} r="8" fill={color} stroke={INK} strokeWidth="1.5" />
    <circle cx={x - 2} cy={y - 2} r="2.2" fill="#fff" opacity="0.7" />
  </g>
)

function Collage({ className = '' }) {
  return (
    <svg className={`collage ${className}`} viewBox="0 0 520 450" role="presentation" aria-hidden="true" focusable="false">
      {/* 背景：一道柔和的弧形 */}
      <path d="M40 330 C 20 160, 150 30, 290 40 C 430 50, 500 170, 470 300 C 445 400, 300 430, 190 410 C 110 396, 55 380, 40 330 Z" fill="#f0eee6" opacity="0.9" className="collage__blob" />

      {/* 串起便签的细线 */}
      <path d="M88 76 C 170 20, 260 96, 360 52 S 470 80, 480 112" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" opacity="0.5" />

      {/* 便签 A：赤陶 + 爱心 */}
      <g transform="translate(150 158) rotate(-6)">
        <rect x="-90" y="-80" width="180" height="160" rx="16" fill="#d97757" stroke={INK} strokeWidth="1.8" />
        <path d="M0 -10 C -2 -34 -40 -34 -40 -8 C -40 14 -6 32 0 44 C 6 32 40 14 40 -8 C 40 -34 2 -34 0 -10 Z" fill="#faf9f5" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <Lines rows={[96, 62]} x={-48} y={54} gap={16} />
        <Pin x={0} y={-80} color="#faf9f5" />
      </g>

      {/* 便签 B：奶油黄 + 文字线 */}
      <g transform="translate(366 118) rotate(5)">
        <rect x="-92" y="-66" width="184" height="132" rx="16" fill="#ebdbbc" stroke={INK} strokeWidth="1.8" />
        <Lines rows={[120, 144, 92, 128]} x={-64} y={-30} gap={22} />
        <Pin x={-62} y={-66} color="#d97757" />
      </g>

      {/* 便签 C：天青 + 放大镜（失物招领） */}
      <g transform="translate(372 270) rotate(-4)">
        <rect x="-86" y="-70" width="172" height="140" rx="16" fill="#a9c7e3" stroke={INK} strokeWidth="1.8" />
        <circle cx="-8" cy="-10" r="28" fill="#faf9f5" stroke={INK} strokeWidth="1.8" />
        <line x1="12" y1="12" x2="40" y2="40" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <Lines rows={[56]} x={-62} y={52} />
        <Pin x={58} y={-70} color="#faf9f5" />
      </g>

      {/* 便签 D：橄榄绿 + # 话题 */}
      <g transform="translate(140 338) rotate(4)">
        <rect x="-84" y="-58" width="168" height="116" rx="16" fill="#bccb9d" stroke={INK} strokeWidth="1.8" />
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <line x1="-34" y1="-22" x2="-40" y2="22" />
          <line x1="-8" y1="-22" x2="-14" y2="22" />
          <line x1="-48" y1="-8" x2="0" y2="-8" />
          <line x1="-52" y1="10" x2="-4" y2="10" />
        </g>
        <Lines rows={[56, 40]} x={22} y={-14} gap={18} />
        <Pin x={-60} y={-58} color="#faf9f5" />
      </g>

      {/* 便签 E：无花果粉，小号 */}
      <g transform="translate(270 372) rotate(-9)">
        <rect x="-52" y="-44" width="104" height="88" rx="14" fill="#e8b8cb" stroke={INK} strokeWidth="1.8" />
        <path d="M-22 6 Q -11 -14 0 6 T 22 6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <Lines rows={[56]} x={-28} y={26} />
      </g>

      {/* 点缀：星芒与圆点 */}
      <g stroke="#d97757" strokeWidth="3.4" strokeLinecap="round">
        <line x1="456" y1="196" x2="456" y2="224" />
        <line x1="442" y1="210" x2="470" y2="210" />
        <line x1="446" y1="200" x2="466" y2="220" />
        <line x1="466" y1="200" x2="446" y2="220" />
      </g>
      <circle cx="52" cy="226" r="6" fill="#d97757" />
      <circle cx="244" cy="40" r="4" fill={INK} />
      <circle cx="490" cy="364" r="5" fill="#788c5d" />
    </svg>
  )
}

export default memo(Collage)
