import { assertPasswordCheckConfigured, config } from '../config.js'
import { OpenAiCompatibleClient } from './openaiCompatibleClient.js'
import { PwnedPasswordsClient } from './pwnedPasswordsClient.js'

export class PasswordCheckService {
  constructor({
    pwnedClient = new PwnedPasswordsClient({
      apiUrl: config.pwnedPasswords.apiUrl,
      timeoutMs: config.externalRequestTimeoutMs,
    }),
    aiClient,
  } = {}) {
    this.pwnedClient = pwnedClient
    this.aiClient = aiClient
  }

  async checkPwned(password) {
    return this.pwnedClient.check(password)
  }

  async reviewWithAi({ password, pwned }) {
    assertPasswordCheckConfigured()

    const aiClient =
      this.aiClient ||
      new OpenAiCompatibleClient({
        ...config.openai,
        timeoutMs: config.externalRequestTimeoutMs,
      })

    return aiClient.reviewPassword({
      password,
      localSignals: getLocalSignals(password),
      pwned,
    })
  }
}

export function validatePasswordInput(body) {
  if (!body || typeof body.password !== 'string') {
    const error = new Error('Field "password" is required')
    error.statusCode = 400
    error.code = 'PASSWORD_REQUIRED'
    throw error
  }

  const password = body.password

  if (password.length === 0) {
    const error = new Error('Password cannot be empty')
    error.statusCode = 400
    error.code = 'PASSWORD_EMPTY'
    throw error
  }

  if (password.length > config.passwordCheck.maxPasswordLength) {
    const error = new Error(`Password length must be ${config.passwordCheck.maxPasswordLength} characters or less`)
    error.statusCode = 400
    error.code = 'PASSWORD_TOO_LONG'
    throw error
  }

  return password
}

function getLocalSignals(password) {
  const lower = password.toLowerCase()
  const uniqueChars = new Set([...password]).size
  const patterns = []

  if (/qwerty|asdf|zxcv|password|admin|letmein|welcome/.test(lower)) {
    patterns.push('common_word_or_keyboard_pattern')
  }

  if (/12345|123456|23456|34567|98765|11111|00000/.test(password)) {
    patterns.push('simple_digit_sequence')
  }

  if (/(.)\1{2,}/u.test(password)) {
    patterns.push('repeated_characters')
  }

  if (/\b(19|20)\d{2}\b/.test(password)) {
    patterns.push('year_like_value')
  }

  return {
    length: [...password].length,
    uniqueChars,
    hasLowercase: /[a-z]/u.test(password),
    hasUppercase: /[A-Z]/u.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^\p{L}\p{N}]/u.test(password),
    detectedPatterns: patterns,
  }
}
