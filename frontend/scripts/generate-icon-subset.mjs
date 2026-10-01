// 扫描 src 中用到的 bi-* 图标类名，从 bootstrap-icons 取码位，生成 src/bootstrap-icons-subset.css。
// 新增图标后运行：node scripts/generate-icon-subset.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const require = createRequire(import.meta.url)
const iconMap = require('bootstrap-icons/font/bootstrap-icons.json')

const used = new Set()
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx?|html)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8')
      for (const match of text.matchAll(/\bbi-([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) used.add(match[1])
    }
  }
}
walk(srcDir)
used.add('x') // 提示关闭按钮

const missing = []
const rules = [...used].sort().flatMap((name) => {
  if (!(name in iconMap)) {
    missing.push(name)
    return []
  }
  const codepoint = iconMap[name].toString(16)
  return `.bi-${name}::before { content: "\\${codepoint}"; }`
})

const header = `/* 由 scripts/generate-icon-subset.mjs 生成，请勿手改。 */
@font-face {
  font-family: "bootstrap-icons";
  src: url("@bootstrap-icons-font") format("woff2");
  font-display: block;
}

.bi::before,
[class^="bi-"]::before,
[class*=" bi-"]::before {
  display: inline-block;
  font-family: "bootstrap-icons" !important;
  font-style: normal;
  font-weight: normal !important;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  vertical-align: -0.125em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

`
fs.writeFileSync(path.join(srcDir, 'bootstrap-icons-subset.css'), `${header}${rules.join('\n')}\n`)
console.log(`${rules.length} icons written`)
if (missing.length) console.warn('Not found in bootstrap-icons (ignored):', missing.join(', '))
