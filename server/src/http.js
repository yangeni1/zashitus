export function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  res.end(JSON.stringify(payload))
}

export function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || ''

    if (!contentType.toLowerCase().includes('application/json')) {
      const error = new Error('Content-Type must be application/json')
      error.statusCode = 415
      error.code = 'UNSUPPORTED_MEDIA_TYPE'
      reject(error)
      return
    }

    let size = 0
    const chunks = []
    let rejected = false

    req.on('data', (chunk) => {
      if (rejected) {
        return
      }

      size += chunk.length

      if (size > maxBytes) {
        const error = new Error('Request body is too large')
        error.statusCode = 413
        error.code = 'REQUEST_BODY_TOO_LARGE'
        rejected = true
        reject(error)
        req.destroy()
        return
      }

      chunks.push(chunk)
    })

    req.on('end', () => {
      if (rejected) {
        return
      }

      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        const error = new Error('Request body must be valid JSON')
        error.statusCode = 400
        error.code = 'INVALID_JSON'
        reject(error)
      }
    })

    req.on('error', (error) => {
      if (!rejected) {
        reject(error)
      }
    })
  })
}

export function parseCookies(cookieHeader = '') {
  const cookies = new Map()

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')

    if (!rawName || rawValue.length === 0) {
      continue
    }

    try {
      cookies.set(rawName, decodeURIComponent(rawValue.join('=')))
    } catch {
      continue
    }
  }

  return cookies
}

export function createCookie(name, value, { maxAge, httpOnly = true, sameSite = 'Strict', secure = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${sameSite}`]

  if (httpOnly) {
    parts.push('HttpOnly')
  }

  if (maxAge !== undefined) {
    parts.push(`Max-Age=${maxAge}`)
  }

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function getClientIp(req, { trustProxy = false } = {}) {
  const forwardedFor = req.headers['x-forwarded-for']

  if (trustProxy && typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return req.socket.remoteAddress || 'unknown'
}
