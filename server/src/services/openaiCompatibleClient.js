import { config } from '../config.js'
import { getLocale } from '../locales/index.js'
import { readLimitedJson } from './readLimitedResponse.js'

const SYSTEM_GUARD = `
You are a password security evaluator. Answer in Russian only.
Return ONLY a valid JSON object. No SQL, no markdown, no explanations.
`.trim()

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
    // Формируем максимально четкую инструкцию для user-сообщения
    const userPrompt = `
${this.passwordReviewPrompt}

Оцени этот пароль: "${password}"
Данные о взломах: ${pwned.isPwned ? `найден ${pwned.count} раз` : 'не найден'}
Технические сигналы: длина ${localSignals.length}, уникальных символов ${localSignals.uniqueChars}

ВАЖНО: Ответь СТРОГО в формате JSON на русском языке.
Пример ответа:
{
  "score": 50,
  "riskLevel": "medium",
  "summary": "Краткое описание на русском.",
  "recommendations": ["Рекомендация 1", "Рекомендация 2"]
}

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
            temperature: 0.1,
            // Убираем жесткий json_object, так как он может ломать дешевые модели
            messages: [
              {
                role: 'system',
                content: SYSTEM_GUARD,
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error body')
          console.error(`[AI] Request failed with status ${response.status}: ${errorText}`)
          const error = new Error(`OpenAI-compatible model request failed with status ${response.status}`)
          error.statusCode = 502
          error.code = 'MODEL_UNAVAILABLE'
          throw error
        }

        let result
        try {
          result = await readLimitedJson(response, this.responseLimitBytes)
        } catch (err) {
          console.error('[AI] Failed to read or parse model JSON response:', err.message)
          const error = new Error('OpenAI-compatible model returned invalid JSON')
          error.statusCode = 502
          error.code = 'INVALID_MODEL_RESPONSE'
          throw error
        }

        const content = result?.choices?.[0]?.message?.content
        if (typeof content !== 'string') {
          console.error('[AI] Model returned invalid structure:', JSON.stringify(result))
          const error = new Error('Model returned an invalid response')
          error.statusCode = 502
          error.code = 'INVALID_MODEL_RESPONSE'
          throw error
        }

        return normalizeAiReview(content, this.locale)
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
}

function normalizeAiReview(content, locale) {
  let parsed

  try {
    // Ищем JSON внутри ответа (на случай если модель добавила текст)
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No JSON object found in content')
    }
    const jsonStr = content.slice(start, end + 1)
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    console.error('[AI] Raw content from model:', content)
    const error = new Error('Model response must be valid JSON')
    error.statusCode = 502
    error.code = 'INVALID_MODEL_JSON'
    throw error
  }

  const score = Number(parsed.score)
  const riskLevel = parsed.riskLevel
  const summary = parsed.summary
  const recommendations = parsed.recommendations

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100 ||
    !['low', 'medium', 'high', 'critical'].includes(riskLevel) ||
    typeof summary !== 'string' ||
    !Array.isArray(recommendations)
  ) {
    console.error('[AI] Model response failed schema validation:', JSON.stringify(parsed))
    const error = new Error('Model response has an invalid schema')
    error.statusCode = 502
    error.code = 'INVALID_MODEL_SCHEMA'
    throw error
  }

  const normalizedRecommendations = recommendations
    .map((item) => typeof item === 'string' ? limitSentences(item.trim(), 2) : '')
    .filter(Boolean)
    .slice(0, 3)

  const normalized = {
    score: Math.round(score),
    riskLevel,
    summary: limitSentences(summary.trim(), 1),
    recommendations: normalizedRecommendations,
  }

  return {
    ...normalized,
    text: formatReviewText(normalized, locale),
  }
}

function limitSentences(value, maxSentences) {
  const sentences = value.match(/[^.!?]+[.!?]?/g) || [value]
  return sentences
    .slice(0, maxSentences)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatReviewText({ score, riskLevel, summary, recommendations }, locale) {
  const riskLabel = locale.aiReview.risk[riskLevel]
  const advice =
    recommendations.length > 0
      ? ` ${locale.aiReview.recommendationsLabel}: ${recommendations.join(' ')}`
      : ''

  return locale.aiReview.textTemplate
    .replace('{score}', score)
    .replace('{risk}', riskLabel)
    .replace('{summary}', summary)
    .replace('{advice}', advice)
    .trim()
}
