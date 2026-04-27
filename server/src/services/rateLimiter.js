import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'zashitus_sid'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function hashIdentifier(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export class PasswordCheckRateLimiter {
  constructor({ store, secret, dailyLimit, bucketPrefix = 'default' }) {
    this.store = store
    this.secret = secret
    this.dailyLimit = dailyLimit
    this.bucketPrefix = bucketPrefix
  }

  getSessionCookieName() {
    return SESSION_COOKIE_NAME
  }

  getSessionMaxAgeSeconds() {
    return SESSION_MAX_AGE_SECONDS
  }

  ensureSessionId(cookies) {
    const existing = cookies.get(SESSION_COOKIE_NAME)

    if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
      return { sessionId: existing, isNew: false }
    }

    return { sessionId: crypto.randomUUID(), isNew: true }
  }

  consume({ ip, userAgent, sessionId }) {
    const day = todayKey()
    const checks = [
      ['ip', ip],
      ['session', sessionId],
      ['ip_user_agent', `${ip}:${userAgent || 'unknown'}`],
    ].map(([bucket, identifier]) => ({
      bucket: `${this.bucketPrefix}:${bucket}`,
      identifierHash: hashIdentifier(this.secret, identifier),
    }))

    const results = []

    for (const check of checks) {
      const result = this.store.getStatus({
        ...check,
        day,
        limit: this.dailyLimit,
      })

      results.push({ bucket: check.bucket, ...result })

      if (!result.allowed) {
        return {
          allowed: false,
          day,
          limit: this.dailyLimit,
          remaining: 0,
          blockedBy: check.bucket,
          results,
        }
      }
    }

    const consumed = checks.map((check) => {
      const result = this.store.increment({
        ...check,
        day,
      })

      return {
        bucket: check.bucket,
        allowed: true,
        limit: this.dailyLimit,
        remaining: this.dailyLimit - result.used,
        used: result.used,
      }
    })

    return {
      allowed: true,
      day,
      limit: this.dailyLimit,
      remaining: Math.min(...consumed.map((result) => result.remaining)),
      results: consumed,
    }
  }

  peek({ ip, userAgent, sessionId }) {
    const day = todayKey()
    const checks = [
      ['ip', ip],
      ['session', sessionId],
      ['ip_user_agent', `${ip}:${userAgent || 'unknown'}`],
    ].map(([bucket, identifier]) => ({
      bucket: `${this.bucketPrefix}:${bucket}`,
      identifierHash: hashIdentifier(this.secret, identifier),
    }))

    const results = checks.map((check) => ({
      bucket: check.bucket,
      ...this.store.getStatus({
        ...check,
        day,
        limit: this.dailyLimit,
      }),
    }))

    const blocked = results.find((result) => !result.allowed)

    return {
      allowed: !blocked,
      day,
      limit: this.dailyLimit,
      remaining: blocked ? 0 : Math.min(...results.map((result) => result.remaining)),
      blockedBy: blocked?.bucket,
      results,
    }
  }
}
