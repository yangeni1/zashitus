import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config, isPasswordAiConfigured } from './config.js'
import { createCookie, getClientIp, parseCookies, readJsonBody, sendJson } from './http.js'
import { PasswordCheckRateLimiter } from './services/rateLimiter.js'
import { RateLimitStore } from './services/rateLimitStore.js'
import { PasswordCheckService, validatePasswordInput } from './services/passwordCheckService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SERVER_ROOT = resolve(__dirname, '..')
const PROJECT_ROOT = resolve(SERVER_ROOT, '..')
const DIST_PATH = resolve(PROJECT_ROOT, 'client/dist')

console.log(`[Router] Initialized. Project Root: ${PROJECT_ROOT}`);
console.log(`[Router] Static files path: ${DIST_PATH}`);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
}

let resources

export async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  
  // Логируем каждый запрос для диагностики
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

  // API Routes
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/api/health') {
    if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end()
    } else {
        sendJson(res, 200, { status: 'ok' })
    }
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/password/check') {
    await handlePasswordCheck(req, res)
    return
  }

  // Static Files (Production)
  // Разрешаем и GET, и HEAD (для curl -I)
  if (req.method === 'GET' || req.method === 'HEAD') {
    const normalizedPath = url.pathname.replace(/^(\.\.[\/\\])+/, '')
    let filePath = join(DIST_PATH, normalizedPath === '/' ? 'index.html' : normalizedPath)
    
    let fileFound = false
    try {
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        fileFound = true
      } else if (normalizedPath === '/' || !extname(normalizedPath)) {
        // SPA Fallback: если запрашивают корень или путь без расширения (роут), отдаем index.html
        filePath = join(DIST_PATH, 'index.html')
        if (existsSync(filePath) && statSync(filePath).isFile()) {
          fileFound = true
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа
    }

    if (fileFound) {
      const ext = extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      
      try {
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end()
        } else {
          const content = readFileSync(filePath)
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(content)
        }
        return
      } catch (e) {
        console.error(`[Router] Error handling static file ${filePath}:`, e)
      }
    } else {
       // Логируем промахи статики только если это не API
       if (!url.pathname.startsWith('/api/')) {
         console.warn(`[Router] File not found: ${url.pathname} (target: ${filePath})`)
       }
    }
  }

  if (req.method === 'HEAD') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end()
  } else {
    sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } })
  }
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
    // Catch everything and log as failed
    console.error(`[Router] AI review failed for user ${clientIdentity.ip}:`, error.message)
    
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
