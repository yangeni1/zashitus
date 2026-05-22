import { config } from '../config.js'
import { getLocale } from '../locales/index.js'
import { readLimitedJson } from './readLimitedResponse.js'

const SYSTEM_GUARD = `You are a security expert. Answer in Russian.`.trim()

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
    // Уходим от слова JSON, просим просто текст по строкам
    const userPrompt = `
Оцени безопасность пароля: "${password}"
${pwned.isPwned ? `Этот пароль уже был взломан ${pwned.count} раз.` : 'Пароль пока не найден в базах утечек.'}

Ответь строго по этому шаблону (4 строки на русском):
ОЦЕНКА: (число от 0 до 100)
РИСК: (одно слово: low, medium, high или critical)
ИТОГ: (одно предложение)
СОВЕТЫ: (максимум 3 совета через запятую)

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

    // Если она всё еще пишет SELECT, попробуем вытащить данные регулярками
    const scoreMatch = content.match(/ОЦЕНКА:\s*(\d+)/i) || content.match(/(\d+)/)
    const riskMatch = content.match(/РИСК:\s*(low|medium|high|critical)/i) || content.match(/(low|medium|high|critical)/i)
    const summaryMatch = content.match(/ИТОГ:\s*([^\n]+)/i)
    const adviceMatch = content.match(/СОВЕТЫ:\s*([^\n]+)/i)

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50
    const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : 'medium'
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Требуется улучшение безопасности.'
    const recommendations = adviceMatch 
        ? adviceMatch[1].split(',').map(s => s.trim()).filter(Boolean)
        : []

    const normalized = {
      score: Math.min(100, Math.max(0, score)),
      riskLevel: ['low', 'medium', 'high', 'critical'].includes(riskLevel) ? riskLevel : 'medium',
      summary: limitSentences(summary, 1),
      recommendations: recommendations.slice(0, 3).map(r => limitSentences(r, 2)),
    }

    return {
      ...normalized,
      text: formatReviewText(normalized, this.locale),
    }
  }
}

function limitSentences(value, maxSentences) {
  const sentences = value.match(/[^.!?]+[.!?]?/g) || [value]
  return sentences.slice(0, maxSentences).join(' ').replace(/\s+/g, ' ').trim()
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
