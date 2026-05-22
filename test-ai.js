import { PasswordCheckService } from './server/src/services/passwordCheckService.js'
import { config } from './server/src/config.js'

async function testAi() {
  console.log('Testing AI with config:', {
    baseUrl: config.openai.baseUrl,
    model: config.openai.model,
  })

  const service = new PasswordCheckService()
  try {
    const result = await service.reviewWithAi({
      password: 'TestPassword123!',
      pwned: { isPwned: false, count: 0 }
    })
    console.log('AI Result Success:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('AI Result Error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    })
  }
}

testAi()
