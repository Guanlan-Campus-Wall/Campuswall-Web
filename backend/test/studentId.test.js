import assert from 'node:assert/strict'
import test from 'node:test'
import { STUDENT_ID_LENGTH, looksLikeStudentId, validateStudentId } from '../src/services/studentId.js'

test('school student IDs are exactly ten digits', () => {
  assert.equal(STUDENT_ID_LENGTH, 10)
  assert.equal(validateStudentId('2025532136').success, true)
  assert.equal(validateStudentId('2025532136').studentId, '2025532136')
  assert.equal(validateStudentId('202553213').success, false)
  assert.equal(validateStudentId('20255321361').success, false)
  assert.equal(validateStudentId('202553213a').success, false)
  assert.equal(validateStudentId('202553213').error, '学号格式不正确')
  assert.doesNotMatch(validateStudentId('202553213').error, /\d+\s*位/)
  assert.equal(looksLikeStudentId('2025532136'), true)
  assert.equal(looksLikeStudentId('root'), false)
})
