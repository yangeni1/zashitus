import { config, isPasswordAiConfigured } from './config.js'
import { createCookie, getClientIp, parseCookies, readJsonBody, sendJson } from './http.js'
import { PasswordCheckRateLimiter } from './services/rateLimiter.js'
import { RateLimitStore } from './services/rateLimitStore.js'
import { PasswordCheckService, validatePasswordInput } from './services/passwordCheckService.js'

let resources

export async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/password/check') {
    await handlePasswordCheck(req, res)
    return
  }

  sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } })
}

async function handlePasswordCheck(req, res) {
  const body = await readJsonBody(req, config.passwordCheck.bodyLimitBytes)
  const password = validatePasswordInput(body)

  const { aiRateLimiter, passwordCheckService, pwnedRateLimiter } = getResources()
  const cookies = parseCookies(req.headers.cookie)
  const { sessionId, isNew } = pwnedRateLimiter.ensureSessionId(cookies)
  const cookieHeaders = isNew
    ? {
        'Set-Cookie': createCookie(pwnedRateLimiter.getSessionCookieName(), sessionId, {
          maxAge: pwnedRateLimiter.getSessionMaxAgeSeconds(),
          secure: config.secureCookies,
        }),
      }
    : {}

  const clientIdentity = {
    ip: getClientIp(req, { trustProxy: config.trustProxy }),
    userAgent: req.headers['user-agent'] || '',
    sessionId,
  }
  const pwnedLimit = pwnedRateLimiter.consume(clientIdentity)

  if (!pwnedLimit.allowed) {
    sendJson(
      res,
      429,
      {
        error: {
          code: 'PWNED_PASSWORDS_RATE_LIMITED',
          message: 'Daily leaked password database check limit exceeded',
        },
        rateLimit: {
          pwned: {
            limit: pwnedLimit.limit,
            remaining: 0,
          },
          resetDay: nextUtcDay(),
        },
      },
      {
        ...cookieHeaders,
        'Retry-After': secondsUntilNextUtcDay().toString(),
      },
    )
    return
  }

  const pwned = await passwordCheckService.checkPwned(password)
  const ai = await maybeReviewWithAi({
    password,
    pwned,
    passwordCheckService,
    aiRateLimiter,
    clientIdentity,
  })

  sendJson(
    res,
    200,
    {
      pwned,
      ai: ai.result,
      rateLimit: {
        pwned: {
          limit: pwnedLimit.limit,
          remaining: pwnedLimit.remaining,
        },
        ai: ai.rateLimit,
        resetDay: nextUtcDay(),
      },
    },
    cookieHeaders,
  )
}

export function closeRouterResources() {
  resources?.rateLimitStore.close()
}

function getResources() {
  if (!resources) {
    const rateLimitStore = new RateLimitStore(config.rateLimit.dbPath)
    const pwnedRateLimiter = new PasswordCheckRateLimiter({
      store: rateLimitStore,
      secret: config.rateLimit.secret,
      dailyLimit: config.passwordCheck.pwnedDailyLimit,
      bucketPrefix: 'pwned',
    })
    const aiRateLimiter = new PasswordCheckRateLimiter({
      store: rateLimitStore,
      secret: config.rateLimit.secret,
      dailyLimit: config.passwordCheck.aiDailyLimit,
      bucketPrefix: 'ai',
    })

    resources = {
      rateLimitStore,
      pwnedRateLimiter,
      aiRateLimiter,
      passwordCheckService: new PasswordCheckService(),
    }
  }

  return resources
}

async function maybeReviewWithAi({ password, pwned, passwordCheckService, aiRateLimiter, clientIdentity }) {
  if (!isPasswordAiConfigured()) {
    return {
      result: {
        status: 'skipped',
        reason: 'not_configured',
      },
      rateLimit: {
        limit: config.passwordCheck.aiDailyLimit,
        remaining: null,
      },
    }
  }

  const aiLimit = aiRateLimiter.consume(clientIdentity)

  if (!aiLimit.allowed) {
    return {
      result: {
        status: 'skipped',
        reason: 'daily_limit_exceeded',
      },
      rateLimit: {
        limit: aiLimit.limit,
        remaining: 0,
      },
    }
  }

  try {
    return {
      result: {
        status: 'completed',
        review: await passwordCheckService.reviewWithAi({ password, pwned }),
      },
      rateLimit: {
        limit: aiLimit.limit,
        remaining: aiLimit.remaining,
      },
    }
  } catch (error) {
    if (error.statusCode === 502) {
      return {
        result: {
          status: 'failed',
          reason: error.code || 'MODEL_UNAVAILABLE',
        },
        rateLimit: {
          limit: aiLimit.limit,
          remaining: aiLimit.remaining,
        },
      }
    }

    throw error
  }
}

function nextUtcDay() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return next.toISOString().slice(0, 10)
}

function secondsUntilNextUtcDay() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000))
}
