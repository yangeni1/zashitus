import { isPasswordAiConfigured, config } from './server/src/config.js'

console.log('AI Configured:', isPasswordAiConfigured())
console.log('Base URL:', config.openai.baseUrl)
console.log('Model:', config.openai.model)
console.log('API Key length:', config.openai.apiKey?.length || 0)
console.log('Prompt set:', !!config.openai.passwordReviewPrompt)
