import crypto from 'node:crypto'
import { config } from '../config.js'
import { readLimitedText } from './readLimitedResponse.js'

export class PwnedPasswordsClient {
  constructor({ apiUrl, timeoutMs }) {
    this.apiUrl = apiUrl.replace(/\/$/, '')
    this.timeoutMs = timeoutMs
    this.responseLimitBytes = config.pwnedPasswords.responseLimitBytes
  }

  async check(password) {
    const hash = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    let response

    try {
      response = await fetch(`${this.apiUrl}/${prefix}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'zashitus-password-check',
          'Add-Padding': 'true',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch {
      const error = new Error('Pwned Passwords API request failed')
      error.statusCode = 502
      error.code = 'PWNED_PASSWORDS_UNAVAILABLE'
      throw error
    }

    if (!response.ok) {
      const error = new Error('Pwned Passwords API request failed')
      error.statusCode = 502
      error.code = 'PWNED_PASSWORDS_UNAVAILABLE'
      throw error
    }

    let body

    try {
      body = await readLimitedText(response, this.responseLimitBytes)
    } catch {
      const error = new Error('Pwned Passwords API request failed')
      error.statusCode = 502
      error.code = 'PWNED_PASSWORDS_UNAVAILABLE'
      throw error
    }
    const match = body
      .split('\n')
      .map((line) => line.trim().split(':'))
      .find(([candidate]) => candidate === suffix)

    const count = match ? Number(match[1]) || 0 : 0

    return {
      isPwned: count > 0,
      count,
    }
  }
}
