import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer } from 'three'
import { createHeartCloud } from '../utils/heartGeometry'

const noteTimeLabel = (value) => {
  const date = new Date(String(value || '').replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? '发布时间未知' : new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const vertexShader = `
  attribute float size;
  attribute float phase;
  uniform float time;
  uniform float pixelRatio;
  uniform float motion;
  varying float brightness;
  varying float tint;
  void main() {
    float beat = 1.0 + motion * 0.018 * sin(time * 2.0);
    vec3 p = position * beat;
    p += motion * 0.003 * vec3(sin(time + phase), cos(time * 0.8 + phase), sin(time * 0.7 + phase));
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(size * pixelRatio * 5.0 / -viewPosition.z, 1.0, 9.0);
    brightness = clamp(1.8 + viewPosition.z * 0.19, 0.35, 1.0);
    tint = 0.5 + 0.5 * sin(phase);
  }
`
const fragmentShader = `
  varying float brightness;
  varying float tint;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    if (radius > 0.5) discard;
    float glow = exp(-radius * radius * 16.0);
    vec3 color = mix(vec3(0.95, 0.12, 0.32), vec3(1.0, 0.64, 0.72), tint * 0.65);
    gl_FragColor = vec4(color, glow * brightness * 0.9);
  }
`

export default function HeartParticles({ notes = [], activeId = null, onSelect, reducedMotion = false }) {
  const hostRef = useRef(null)
  const controllerRef = useRef(null)
  const motionRef = useRef(reducedMotion)
  const [webgl, setWebgl] = useState('loading')
  const visibleNotes = useMemo(() => notes.slice(0, 72), [notes])

  useEffect(() => {
    motionRef.current = reducedMotion
    controllerRef.current?.refresh()
  }, [reducedMotion])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let renderer
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' })
    } catch {
      setWebgl('unavailable')
      return undefined
    }
    let disposed = false
    let lost = false
    let inView = true
    let frame = 0
    let previous = 0
    let elapsed = 0
    let pointer = null
    let width = 1
    let height = 1
    renderer.setClearColor(0x120e18, 1)
    const scene = new Scene()
    const camera = new PerspectiveCamera(38, 1, 0.1, 30)
    const heart = new Group()
    heart.rotation.set(-0.08, -0.28, 0)
    scene.add(heart)
    const cloud = createHeartCloud(window.matchMedia('(max-width: 600px)').matches ? 8500 : 16000)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(cloud.positions, 3))
    geometry.setAttribute('size', new Float32BufferAttribute(cloud.sizes, 1))
    geometry.setAttribute('phase', new Float32BufferAttribute(cloud.phases, 1))
    const material = new ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { time: { value: 0 }, pixelRatio: { value: 1 }, motion: { value: motionRef.current ? 0 : 1 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending
    })
    const points = new Points(geometry, material)
    heart.add(points)
    const canvas = renderer.domElement
    canvas.className = 'confession-particle-canvas volumetric-heart-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)
    const available = () => !disposed && !lost && inView && !document.hidden
    const render = () => {
      if (!available()) return
      material.uniforms.time.value = elapsed
      material.uniforms.motion.value = motionRef.current ? 0 : 1
      renderer.render(scene, camera)
    }
    const tick = (now) => {
      frame = 0
      if (!available()) return
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0
      previous = now
      if (!motionRef.current && !pointer) {
        elapsed += delta
        heart.rotation.y += delta * 0.12
      }
      render()
      if (!motionRef.current && !pointer) frame = requestAnimationFrame(tick)
    }
    const refresh = () => {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      render()
      if (available() && !motionRef.current && !pointer) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      width = Math.max(1, host.clientWidth)
      height = Math.max(1, host.clientHeight)
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75)
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      material.uniforms.pixelRatio.value = ratio
      camera.aspect = width / height
      // Fit a bounding sphere. Narrow phones use a tighter radius so the heart
      // fills the full-bleed square instead of sitting in a padded strip.
      const radius = Math.min(width, height) < 520 ? 1.16 : 1.32
      camera.position.z = radius / Math.sin(Math.atan(Math.tan(19 * Math.PI / 180) * Math.min(camera.aspect, 1)))
      camera.updateProjectionMatrix()
      refresh()
    }
    const reset = () => { heart.rotation.set(-0.08, -0.28, 0); refresh() }
    const down = (event) => {
      if (pointer || (event.pointerType === 'mouse' && event.button !== 0)) return
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
      host.setPointerCapture(event.pointerId)
      host.dataset.dragging = 'true'
      refresh()
    }
    const move = (event) => {
      if (!pointer || pointer.id !== event.pointerId) return
      heart.rotation.y += (event.clientX - pointer.x) / width * Math.PI * 2
      heart.rotation.x = Math.max(-1.1, Math.min(1.1, heart.rotation.x + (event.clientY - pointer.y) / height * Math.PI))
      pointer.x = event.clientX
      pointer.y = event.clientY
      render()
    }
    const up = (event) => {
      if (!pointer || pointer.id !== event.pointerId) return
      pointer = null
      host.dataset.dragging = 'false'
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
      refresh()
    }
    const keydown = (event) => {
      const turns = { ArrowLeft: [0, -0.16], ArrowRight: [0, 0.16], ArrowUp: [-0.12, 0], ArrowDown: [0.12, 0] }
      if (event.key === 'Home') { event.preventDefault(); reset(); return }
      if (!turns[event.key]) return
      event.preventDefault()
      const [x, y] = turns[event.key]
      heart.rotation.x = Math.max(-1.1, Math.min(1.1, heart.rotation.x + x))
      heart.rotation.y += y
      refresh()
    }
    const contextLost = (event) => {
      event.preventDefault()
      lost = true
      cancelAnimationFrame(frame)
      setWebgl('unavailable')
    }
    const contextRestored = () => { lost = false; setWebgl('available'); resize() }
    canvas.addEventListener('webglcontextlost', contextLost)
    canvas.addEventListener('webglcontextrestored', contextRestored)
    host.addEventListener('pointerdown', down)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', up)
    host.addEventListener('lostpointercapture', up)
    host.addEventListener('keydown', keydown)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; refresh() })
    observer.observe(host)
    document.addEventListener('visibilitychange', refresh)
    controllerRef.current = { refresh, reset }
    setWebgl('available')
    resize()
    return () => {
      disposed = true
      controllerRef.current = null
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      observer.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
      host.removeEventListener('lostpointercapture', up)
      host.removeEventListener('keydown', keydown)
      canvas.removeEventListener('webglcontextlost', contextLost)
      canvas.removeEventListener('webglcontextrestored', contextRestored)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [])

  return (
    <div className="confession-note-heart volumetric-heart-layout">
      <div className="volumetric-heart-frame">
        <div ref={hostRef} className="volumetric-heart-viewport" data-webgl={webgl} tabIndex={0} role="group" aria-label="3D 粒子爱心，可拖动或使用方向键旋转，Home 键复位" aria-describedby="heart-controls-hint">
          {webgl !== 'available' ? <div className="volumetric-heart-fallback" role="status"><span aria-hidden="true">♥</span><p>{webgl === 'loading' ? '正在加载粒子爱心…' : '当前设备无法显示 3D 爱心，仍可阅读公开便签。'}</p></div> : null}
        </div>
        <div className="volumetric-heart-caption"><span id="heart-controls-hint">拖动旋转 · 方向键也可操作</span><button type="button" onClick={() => controllerRef.current?.reset()} disabled={webgl !== 'available'}>恢复视角</button></div>
      </div>
      <section className="confession-note-browser" aria-labelledby="confession-note-browser-title">
        <div className="confession-note-browser-heading"><h2 id="confession-note-browser-title">公开便签</h2><span className="confession-note-count">{visibleNotes.length} 张</span></div>
        {visibleNotes.length ? <div className="confession-note-list">{visibleNotes.map((note) => <button className={`confession-note-list-item${String(note.id) === String(activeId) ? ' is-featured' : ''}`} type="button" key={note.id} onClick={() => onSelect?.(note)} aria-label={`查看 ${noteTimeLabel(note.timestamp)} 发布的表白便签`}><span className="confession-note-list-pin" aria-hidden="true" /><span className="confession-note-list-text">{note.text}</span><time className="confession-note-list-time" dateTime={String(note.timestamp || '')}>{noteTimeLabel(note.timestamp)}</time></button>)}</div> : <div className="confession-note-empty" role="status"><i className="bi bi-heart" aria-hidden="true" /><b>还没有公开便签</b><span>审核通过的便签会显示在这里。</span></div>}
      </section>
    </div>
  )
}
