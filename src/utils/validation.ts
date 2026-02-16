const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test((value || '').trim())
}

export function validatePassword(value: string): { valid: boolean; message?: string } {
  const v = value || ''
  if (v.length < 6) return { valid: false, message: 'Password must be at least 6 characters' }
  return { valid: true }
}

export function validateLogin(email: string, password: string): { valid: boolean; message: string } {
  const e = (email || '').trim()
  const p = password || ''
  if (!e) return { valid: false, message: 'Please enter your email' }
  if (!isValidEmail(e)) return { valid: false, message: 'Please enter a valid email address' }
  if (!p) return { valid: false, message: 'Please enter your password' }
  const pw = validatePassword(p)
  if (!pw.valid) return { valid: false, message: pw.message || 'Invalid password' }
  return { valid: true, message: '' }
}
