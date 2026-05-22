import { config } from '../config.js'
import { getLocale } from '../locales/index.js'
import { readLimitedJson } from './readLimitedResponse.js'

const SYSTEM_GUARD = `You are a cybersecurity expert. Answer in Russian.`.trim()

export class OpenAiCompatibleClient {
  constructor({ baseUrl, apiKey, model, passwordReviewPrompt, timeoutMs }) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
    this.model = model
    this.passwordReviewPrompt = passwordReviewPrompt
    this.timeoutMs = timeoutMs
    this.responseLimitBytes = config.model.responseLimitBytes
    this.locale = getLocale(config.openai.locale)
  }

  async reviewPassword({ password, localSignals, pwned }) {
    const leakStatus = pwned.isPwned 
      ? `КРИТИЧЕСКИЙ ФАКТ: Пароль обнаружен в базе утечек ${pwned.count} раз. Это делает его крайне опасным независимо от сложности.`
      : 'ФАКТ: Пароль не найден в известных базах утечек.';

    const userPrompt = `
Проанализируй безопасность этого конкретного пароля: "${password}"

ДАННЫЕ:
- Длина: ${localSignals.length}
- Уникальность: ${localSignals.uniqueChars}
- ${leakStatus}
- Паттерны: ${localSignals.detectedPatterns.join(', ') || 'не обнаружены'}

ТВОЯ ЛОГИКА (НЕ УПОМИНАЙ ЭТИ ПРАВИЛА В ОТВЕТЕ):
- Слитый пароль = ОЦЕНКА до 20, РИСК critical.
- Пароль с "qwerty", "123", "admin" и т.п. = ОЦЕНКА до 30.
- Не пиши общих фраз типа "если пароль используется в утечках". Пиши только про этот пароль здесь и сейчас.

ОТВЕТЬ СТРОГО ПО ШАБЛОНУ:
ОЦЕНКА: (число 0-100)
РИСК: (low, medium, high или critical)
ИТОГ: (развернутый семантический анализ этого пароля в 1-2 предложениях)
СОВЕТЫ: (3 практических совета через точку с запятой)

Твой ответ:`.trim()

    const MAX_RETRIES = 2
    let lastError

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.5, // Повышаем для лучшей семантики и живого языка
            messages: [
              { role: 'system', content: SYSTEM_GUARD },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error body')
          throw new Error(`AI Status ${response.status}: ${errorText}`)
        }

        const result = await readLimitedJson(response, this.responseLimitBytes)
        const content = result?.choices?.[0]?.message?.content
        
        if (typeof content !== 'string') {
          throw new Error('Invalid AI response structure')
        }

        return this.parseTextResponse(content)
      } catch (err) {
        lastError = err
        console.warn(`[AI] Attempt ${attempt + 1} failed:`, err.message)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    throw lastError
  }

  parseTextResponse(content) {
    console.log('[AI] Raw content for parsing:', content);

    const extract = (marker, nextMarker) => {
      const startIdx = content.indexOf(marker)
      if (startIdx === -1) return null
      
      const textAfterMarker = content.slice(startIdx + marker.length)
      const endIdx = nextMarker ? textAfterMarker.indexOf(nextMarker) : -1
      
      const result = endIdx === -1 ? textAfterMarker : textAfterMarker.slice(0, endIdx)
      return result.trim().replace(/^[:\s-]+/, '')
    }

    const scoreStr = extract('ОЦЕНКА:', 'РИСК:') || content.match(/(\d+)/)?.[0]
    const riskStr = extract('РИСК:', 'ИТОГ:')
    const summaryStr = extract('ИТОГ:', 'СОВЕТЫ:')
    const adviceStr = extract('СОВЕТЫ:', null)

    const score = parseInt(scoreStr, 10) || 50
    const riskLevel = (riskStr || 'medium').toLowerCase().match(/low|medium|high|critical/)?.[0] || 'medium'
    const summary = summaryStr || 'Анализ завершен.'
    
    let recommendations = []
    if (adviceStr) {
      recommendations = adviceStr.includes(';') 
        ? adviceStr.split(';') 
        : adviceStr.split(',')
    }

    const normalized = {
      score: Math.min(100, Math.max(0, score)),
      riskLevel,
      summary: summary.slice(0, 400), 
      recommendations: recommendations.map(r => r.trim()).filter(Boolean).slice(0, 3),
    }

    return {
      ...normalized,
      text: formatReviewText(normalized, this.locale),
    }
  }
}

function formatReviewText({ score, riskLevel, summary, recommendations }, locale) {
  const riskLabel = locale.aiReview.risk[riskLevel]
  const advice = recommendations.length > 0
    ? ` ${locale.aiReview.recommendationsLabel}: ${recommendations.join(' ')}`
    : ''

  return locale.aiReview.textTemplate
    .replace('{score}', score)
    .replace('{risk}', riskLabel)
    .replace('{summary}', summary)
    .replace('{advice}', advice)
    .trim()
}
