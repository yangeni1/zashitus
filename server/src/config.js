import { existsSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(serverRoot, '.env')

if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

function readNumber(name, fallback, { min = 0 } = {}) {
  const raw = process.env[name]

  if (raw === undefined || raw === '') {
    return fallback
  }

  const value = Number(raw)

  if (!Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be a number greater than or equal to ${min}`)
  }

  return value
}

function readString(name, fallback = '') {
  return process.env[name]?.trim() || fallback
}

function readHttpUrl(name, fallback = '') {
  const value = readString(name, fallback)

  if (!value) {
    return value
  }

  let url

  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`)
  }

  return value
}

function readBoolean(name, fallback = false) {
  const raw = process.env[name]?.trim().toLowerCase()

  if (raw === undefined || raw === '') {
    return fallback
  }

  if (['1', 'true', 'yes', 'on'].includes(raw)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(raw)) {
    return false
  }

  throw new Error(`${name} must be a boolean`)
}

export const config = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readNumber('PORT', 3000, { min: 1 }),
  trustProxy: readBoolean('TRUST_PROXY', false),
  secureCookies: readBoolean('SECURE_COOKIES', false),
  openai: {
    baseUrl: readHttpUrl('OPENAI_BASE_URL'),
    apiKey: readString('OPENAI_API_KEY'),
    model: readString('OPENAI_MODEL'),
    passwordReviewPrompt: readString('PASSWORD_REVIEW_PROMPT'),
    locale: readString('PASSWORD_REVIEW_LOCALE', 'ru'),
  },
  passwordCheck: {
    maxPasswordLength: readNumber('PASSWORD_MAX_LENGTH', 256, { min: 1 }),
    pwnedDailyLimit: readNumber('PWNED_PASSWORDS_DAILY_LIMIT', 100, { min: 1 }),
    aiDailyLimit: readNumber('PASSWORD_AI_DAILY_LIMIT', readNumber('PASSWORD_CHECK_DAILY_LIMIT', 3, { min: 1 }), {
      min: 1,
    }),
    bodyLimitBytes: readNumber('PASSWORD_CHECK_BODY_LIMIT_BYTES', 4096, { min: 256 }),
  },
  pwnedPasswords: {
    apiUrl: readHttpUrl('PWNED_PASSWORDS_API_URL', 'https://api.pwnedpasswords.com/range'),
    responseLimitBytes: readNumber('PWNED_PASSWORDS_RESPONSE_LIMIT_BYTES', 1024 * 1024, { min: 1024 }),
  },
  model: {
    responseLimitBytes: readNumber('MODEL_RESPONSE_LIMIT_BYTES', 64 * 1024, { min: 1024 }),
  },
  externalRequestTimeoutMs: readNumber('EXTERNAL_REQUEST_TIMEOUT_MS', 15000, { min: 1000 }),
  rateLimit: {
    secret: readString('RATE_LIMIT_SECRET', 'dev-rate-limit-secret-change-me'),
    dbPath: resolveFromServerRoot(readString('RATE_LIMIT_DB_PATH', 'data/rate-limits.sqlite')),
  },
}

if (config.nodeEnv === 'production' && config.rateLimit.secret === 'dev-rate-limit-secret-change-me') {
  throw new Error('RATE_LIMIT_SECRET must be set to a strong random value in production')
}

function resolveFromServerRoot(path) {
  return isAbsolute(path) ? path : resolve(serverRoot, path)
}

export function assertPasswordCheckConfigured() {
  const missing = []

  if (!config.openai.baseUrl) missing.push('OPENAI_BASE_URL')
  if (!config.openai.apiKey) missing.push('OPENAI_API_KEY')
  if (!config.openai.model) missing.push('OPENAI_MODEL')
  if (!config.openai.passwordReviewPrompt) missing.push('PASSWORD_REVIEW_PROMPT')

  if (missing.length > 0) {
    const error = new Error(`Missing password check configuration: ${missing.join(', ')}`)
    error.statusCode = 503
    error.code = 'PASSWORD_CHECK_NOT_CONFIGURED'
    throw error
  }
}

export function isPasswordAiConfigured() {
  return Boolean(
    config.openai.baseUrl &&
      config.openai.apiKey &&
      config.openai.model &&
      config.openai.passwordReviewPrompt,
  )
}
