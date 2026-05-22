import { config } from '../config.js'
import { getLocale } from '../locales/index.js'
import { readLimitedJson } from './readLimitedResponse.js'

const SYSTEM_GUARD = `You are a strict cybersecurity auditor. Answer in Russian.`.trim()

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
    const userPrompt = `
${this.passwordReviewPrompt}

Объект анализа: "${password}"
Технические метрики:
- Символов: ${localSignals.length} (уникальных: ${localSignals.uniqueChars})
- Утечки: ${pwned.isPwned ? `найден ${pwned.count} раз` : 'не обнаружен'}
- Локальные паттерны: ${localSignals.detectedPatterns.join(', ') || 'не выявлены'}

КРИТЕРИИ СТРОГОЙ ОЦЕНКИ:
1. Если пароль НАЙДЕН в утечках (даже 1 раз) — оценка НЕ МОЖЕТ быть выше 25. Это критическая уязвимость.
2. Если в пароле есть "qwerty", "123", "password", даты или имена — оценка снижается на 50-70 баллов, даже при наличии спецсимволов.
3. Сложность (символы/регистр) бесполезна, если пароль предсказуем.
4. Будь максимально критичным. Лучше занизить оценку, чем дать пользователю ложное чувство безопасности.

ЗАДАЧА: Проведи глубокий анализ семантики. 
Ответь СТРОГО по шаблону (4 строки, русский язык):
ОЦЕНКА: (число от 0 до 100)
РИСК: (одно слово: low, medium, high или critical)
ИТОГ: (одно емкое предложение с разбором уязвимости)
СОВЕТЫ: (3 коротких совета через запятую)

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
            temperature: 0.1, // Минимальная температура для стабильно жестких ответов
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

    const scoreMatch = content.match(/ОЦЕНКА:\s*(\d+)/i) || content.match(/(\d+)/)
    const riskMatch = content.match(/РИСК:\s*(low|medium|high|critical)/i) || content.match(/(low|medium|high|critical)/i)
    const summaryMatch = content.match(/ИТОГ:\s*([^\n]+)/i)
    const adviceMatch = content.match(/СОВЕТЫ:\s*([^\n]+)/i)

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 10
    const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : 'critical'
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Пароль крайне небезопасен.'
    
    let recommendations = []
    if (adviceMatch) {
      const rawAdvice = adviceMatch[1].trim()
      recommendations = rawAdvice.includes(',') 
        ? rawAdvice.split(',').map(s => s.trim()) 
        : [rawAdvice]
    }

    const normalized = {
      score: Math.min(100, Math.max(0, score)),
      riskLevel: ['low', 'medium', 'high', 'critical'].includes(riskLevel) ? riskLevel : 'medium',
      summary: limitSentences(summary, 1),
      recommendations: recommendations.filter(Boolean).slice(0, 3).map(r => limitSentences(r, 2)),
    }

    return {
      ...normalized,
      text: formatReviewText(normalized, this.locale),
    }
  }
}

function limitSentences(value, maxSentences) {
  if (!value) return ''
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
