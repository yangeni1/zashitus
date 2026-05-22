import { config } from './server/src/config.js'
console.log('AI Daily Limit:', config.passwordCheck.aiDailyLimit)
console.log('Pwned Daily Limit:', config.passwordCheck.pwnedDailyLimit)
