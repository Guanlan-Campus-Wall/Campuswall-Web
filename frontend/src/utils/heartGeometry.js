// Implicit 3D heart: vertical axis y, depth axis z. Sampling a volume rather
// than extruding a 2D outline keeps both lobes and the cleft visible in depth.
export const heartField = (x, y, z) => (
  (x * x + 2.25 * z * z + y * y - 1) ** 3
  - x * x * y ** 3 - (9 / 80) * z * z * y ** 3
)

export function createHeartCloud(count, seed = 831) {
  let state = seed >>> 0
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    const vertical = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const ring = Math.sqrt(1 - vertical * vertical)
    const x = ring * Math.cos(angle)
    const y = vertical
    const z = ring * Math.sin(angle)
    let low = 0
    let high = 2
    for (let step = 0; step < 24; step += 1) {
      const radius = (low + high) / 2
      if (heartField(x * radius, y * radius, z * radius) <= 0) low = radius
      else high = radius
    }
    // Most particles trace the surface; the remainder reveal the interior.
    const fill = i % 4 === 0 ? Math.cbrt(random()) : 0.965 + random() * 0.035
    const radius = low * fill
    positions.set([x * radius, y * radius - 0.12, z * radius], i * 3)
    sizes[i] = 1.4 + random() * 2.1
    phases[i] = random() * Math.PI * 2
  }
  return { positions, sizes, phases }
}
