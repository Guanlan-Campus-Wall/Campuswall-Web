import test from 'node:test'
import assert from 'node:assert/strict'
import { createHeartCloud, heartField } from '../src/utils/heartGeometry.js'

test('particle heart has real front/back volume, two lobes and a lower tip', () => {
  const { positions, sizes, phases } = createHeartCloud(8500)
  let front = 0, back = 0, leftLobe = 0, rightLobe = 0, tip = 0
  for (let i = 0; i < sizes.length; i += 1) {
    const [x, centeredY, z] = positions.subarray(i * 3, i * 3 + 3)
    const y = centeredY + 0.12
    assert.ok([x, y, z, sizes[i], phases[i]].every(Number.isFinite))
    assert.ok(heartField(x, y, z) < 0.00001, 'particle must lie inside the heart volume')
    if (z > 0.35) front += 1
    if (z < -0.35) back += 1
    if (x < -0.35 && y > 0.8) leftLobe += 1
    if (x > 0.35 && y > 0.8) rightLobe += 1
    if (y < -0.8) tip += 1
  }
  assert.ok(front > 500 && back > 500, 'a thin 2D heart cannot pass the depth check')
  assert.ok(leftLobe > 100 && rightLobe > 100 && tip > 100)
})

test('scene remounts preserve the particle distribution', () => {
  assert.deepEqual(createHeartCloud(128), createHeartCloud(128))
  assert.notDeepEqual(createHeartCloud(128).positions, createHeartCloud(128, 20).positions)
})
