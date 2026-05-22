import { PasswordCheckService } from './server/src/services/passwordCheckService.js';
import { config } from './server/src/config.js';

async function testRouterLogic() {
  const service = new PasswordCheckService();
  const password = 'SimulatedTest123!';
  
  console.log('Testing AI review logic...');
  try {
    const review = await service.reviewWithAi({
      password,
      pwned: { isPwned: false, count: 0 }
    });
    console.log('Review success:', review.status);
  } catch (error) {
    console.error('Review error:', error.message);
  }
}

testRouterLogic();
