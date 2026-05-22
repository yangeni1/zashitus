import { DatabaseSync } from 'node:sqlite'
import { config } from './server/src/config.js'

function checkStats() {
  const db = new DatabaseSync(config.rateLimit.dbPath)
  const rows = db.prepare('SELECT bucket, COUNT(*) as count, SUM(count) as total_uses FROM rate_limits GROUP BY bucket').all()
  console.log('Rate Limit Stats:', JSON.stringify(rows, null, 2))
  
  const topBuckets = db.prepare('SELECT bucket, day, count FROM rate_limits WHERE count > 0 ORDER BY count DESC LIMIT 10').all()
  console.log('Top Buckets:', JSON.stringify(topBuckets, null, 2))
  db.close()
}

try {
  checkStats()
} catch (e) {
  console.error(e)
}
