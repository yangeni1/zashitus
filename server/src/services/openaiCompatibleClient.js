import { config } from '../config.js'
import { getLocale } from '../locales/index.js'
import { readLimitedJson } from './readLimitedResponse.js'

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
      ? `КРИТИЧЕСКИЙ ФАКТ: Пароль найден в базе утечек ${pwned.count} раз. Это делает его крайне уязвимым.`
      : 'ФАКТ: Пароль не найден в базах утечек.';

    const userPrompt = `
Проведи экспертный разбор пароля: "${password}"

ДАННЫЕ:
- Длина: ${localSignals.length}
- Уникальность: ${localSignals.uniqueChars}
- ${leakStatus}
- Паттерны: ${localSignals.detectedPatterns.join(', ') || 'не обнаружены'}

ТВОЯ ЗАДАЧА:
1. Дай оценку от 0 до 100 и укажи риск.
2. Напиши 2-3 предложения развернутого анализа (почему такая оценка, что именно плохо или хорошо).
3. Дай 2 конкретных совета.

ПИШИ СТРОГО НА РУССКОМ (КИРИЛЛИЦЕ). Не используй латиницу в анализе.
Твой развернутый ответ:`.trim()

    const MAX_RETRIES = 1
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
            messages: [
              { role: 'system', content: this.passwordReviewPrompt },
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

        return this.simplifyResponse(content)
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

  simplifyResponse(content) {
    console.log('[AI] Raw response:', content);

    const scoreMatch = content.match(/(\d+)\/100/) || content.match(/Оценка:\s*(\d+)/i) || content.match(/(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

    let riskLevel = 'medium';
    const low = content.toLowerCase();
    if (low.includes('critical') || low.includes('критич')) riskLevel = 'critical';
    else if (low.includes('high') || low.includes('высок')) riskLevel = 'high';
    else if (low.includes('low') || low.includes('низк')) riskLevel = 'low';

    return {
      score: Math.min(100, Math.max(0, score)),
      riskLevel,
      summary: content.trim(),
      recommendations: [],
      text: content.trim(),
    }
  }
}
