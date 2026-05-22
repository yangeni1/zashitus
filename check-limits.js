import { RateLimitStore } from './server/src/services/rateLimitStore.js';

async function checkLimits() {
  const store = new RateLimitStore('./server/data/rate-limits.sqlite');
  // We don't know the exact keys, but we can dump the table if we had a way.
  // RateLimitStore uses better-sqlite3 or similar? 
  // Let's check RateLimitStore.js
}
