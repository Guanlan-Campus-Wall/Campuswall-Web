export const STUDENT_ID_LENGTH = 10
export const STUDENT_ID_PATTERN = /^\d{10}$/

export const normalizeStudentId = (value = '') => String(value || '').normalize('NFKC').trim()

export const validateStudentId = (value = '') => {
  const studentId = normalizeStudentId(value)
  if (!STUDENT_ID_PATTERN.test(studentId) || studentId.length !== STUDENT_ID_LENGTH) {
    return {
      success: false,
      error: '学号格式不正确'
    }
  }
  return { success: true, studentId }
}

export const looksLikeStudentId = (value = '') => STUDENT_ID_PATTERN.test(normalizeStudentId(value))
