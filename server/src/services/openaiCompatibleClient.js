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
    // 1. РАССЧИТЫВАЕМ ОБЪЕКТИВНУЮ ОЦЕНКУ В КОДЕ
    let score = 0;
    score += Math.min(password.length * 5, 40); // Длина: до 40 баллов
    score += Math.min(localSignals.uniqueChars * 5, 30); // Уникальность: до 30 баллов
    if (localSignals.hasUppercase) score += 10;
    if (localSignals.hasDigit) score += 10;
    if (localSignals.hasSymbol) score += 10;

    // Штрафы
    if (localSignals.detectedPatterns.length > 0) score -= 40;
    if (pwned.isPwned) score = Math.min(score, 15); // Если слит — максимум 15 баллов

    score = Math.min(100, Math.max(0, score));

    let riskLevel = 'low';
    if (score < 30) riskLevel = 'critical';
    else if (score < 50) riskLevel = 'high';
    else if (score < 80) riskLevel = 'medium';

    const riskRus = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[riskLevel];

    // 2. ФОРМИРУЕМ ПРОМПТ С ПРИМЕРАМИ (FEW-SHOT)
    const userPrompt = `
Инструкция: Ты — помощник по безопасности. Твоя задача — кратко прокомментировать уже рассчитанную оценку пароля.
Пиши ТОЛЬКО на русском языке. Будь кратким (до 250 символов).

ПРИМЕР 1:
Данные: Пароль "123456", Оценка 5, Риск Критический.
Ответ: Этот пароль слишком прост и возглавляет списки самых популярных. Его взломают мгновенно. Срочно замените его на что-то более длинное и уникальное.

ПРИМЕР 2:
Данные: Пароль "Sun!Rise9922", Оценка 85, Риск Низкий.
Ответ: Хороший, устойчивый пароль. Использование разных регистров и цифр делает его надежным. Совет: не используйте его повторно на других сайтах.

ТЕКУЩЕЕ ЗАДАНИЕ:
Данные: Пароль "${password}", Оценка ${score}, Риск ${riskRus}.
(Помни: статус утечки — ${pwned.isPwned ? 'СЛИТ В СЕТЬ' : 'чист'}).
Твой краткий ответ на русском:`.trim()

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
            temperature: 0.3,
            messages: [
              { role: 'system', content: "Ты — лаконичный ассистент по безопасности. Отвечаешь только на русском." },
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

        // Возвращаем честные цифры и текст от ИИ
        return {
          score,
          riskLevel,
          summary: content.trim(),
          recommendations: [],
          text: `Оценка: ${score}/100. Риск: ${riskRus.toLowerCase()}.\n\n${content.trim()}`,
        }
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
