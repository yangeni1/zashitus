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
    score += Math.min(password.length * 6, 45); // Длина: до 45 баллов
    score += Math.min(localSignals.uniqueChars * 5, 25); // Уникальность: до 25 баллов
    if (localSignals.hasUppercase) score += 10;
    if (localSignals.hasDigit) score += 10;
    if (localSignals.hasSymbol) score += 10;

    // Штрафы
    if (localSignals.detectedPatterns.length > 0) score -= 35;
    if (pwned.isPwned) score = Math.min(score, 15); // Если слит — жесткий лимит

    score = Math.min(100, Math.max(0, score));

    let riskLevel = 'low';
    if (score < 30) riskLevel = 'critical';
    else if (score < 55) riskLevel = 'high';
    else if (score < 80) riskLevel = 'medium';

    const riskRus = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[riskLevel];

    // 2. ФОРМИРУЕМ ПРОМПТ С ПРИМЕРАМИ
    const userPrompt = `
Ты — эксперт по безопасности. Твоя задача: кратко ОБОСНОВАТЬ готовую оценку пароля.
Высокая оценка (80-100) — это ПОХВАЛА за длину и сложность.
Низкая оценка (0-40) — это ПРЕДУПРЕЖДЕНИЕ об опасности.

ПРИМЕР 1 (Плохо):
Данные: Пароль "qwerty", Оценка 5, Риск Критический.
Ответ: Крайне небезопасный вариант. Такие комбинации взламываются за доли секунды автоматическими скриптами. Обязательно выберите что-то более непредсказуемое.

ПРИМЕР 2 (Отлично):
Данные: Пароль "K9#fL29!pXzQ", Оценка 100, Риск Низкий.
Ответ: Идеальный уровень защиты. Большая длина в сочетании со спецсимволами и случайным набором знаков делает перебор практически невозможным. Так держать!

ТЕКУЩЕЕ ЗАДАНИЕ:
Данные: Пароль "${password}", Оценка ${score}, Риск ${riskRus}.
(Доп. факт: ${pwned.isPwned ? 'пароль найден в утечках' : 'пароль не найден в утечках'}).
Твой экспертный вердикт на русском (до 250 символов):`.trim()

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
              { role: 'system', content: "Ты — лаконичный эксперт по безопасности. Отвечаешь только на русском языке." },
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
