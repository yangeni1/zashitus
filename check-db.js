import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const dbPath = resolve('./server/data/rate-limits.sqlite');
const db = new DatabaseSync(dbPath);

const rows = db.prepare('SELECT * FROM rate_limits').all();
console.log('Rate limits table content:');
console.table(rows);

db.close();
