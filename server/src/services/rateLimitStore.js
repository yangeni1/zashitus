import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export class RateLimitStore {
  constructor(dbPath) {
    mkdirSync(dirname(dbPath), { recursive: true })

    this.db = new DatabaseSync(dbPath)
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket TEXT NOT NULL,
        identifier_hash TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (bucket, identifier_hash, day)
      );
    `)

    this.selectStatement = this.db.prepare(`
      SELECT count FROM rate_limits
      WHERE bucket = ? AND identifier_hash = ? AND day = ?
    `)
    this.insertStatement = this.db.prepare(`
      INSERT INTO rate_limits (bucket, identifier_hash, day, count, updated_at)
      VALUES (?, ?, ?, 1, ?)
    `)
    this.updateStatement = this.db.prepare(`
      UPDATE rate_limits
      SET count = count + 1, updated_at = ?
      WHERE bucket = ? AND identifier_hash = ? AND day = ?
    `)
    this.cleanupStatement = this.db.prepare(`
      DELETE FROM rate_limits
      WHERE day < ?
    `)
  }

  getStatus({ bucket, identifierHash, day, limit }) {
    const row = this.selectStatement.get(bucket, identifierHash, day)
    const count = row?.count || 0

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        used: count,
      }
    }

    return {
      allowed: true,
      limit,
      remaining: limit - count,
      used: count,
    }
  }

  increment({ bucket, identifierHash, day }) {
    const row = this.selectStatement.get(bucket, identifierHash, day)
    const count = row?.count || 0
    const now = Date.now()

    if (count === 0) {
      this.insertStatement.run(bucket, identifierHash, day, now)
    } else {
      this.updateStatement.run(now, bucket, identifierHash, day)
    }

    return {
      used: count + 1,
    }
  }

  cleanupBefore(day) {
    this.cleanupStatement.run(day)
  }

  close() {
    this.db.close()
  }
}
