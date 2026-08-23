/**
 * Utility script: prints a real bcrypt hash for a given password.
 * Use this to replace the placeholder hashes in db/seed.sql, or just
 * register fresh accounts through the UI instead (recommended).
 *
 * Usage:
 *   node db/generate-seed-hash.js "Password123!"
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'Password123!';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Bcrypt hash:', hash);
console.log('\nReplace the placeholder hash(es) in db/seed.sql with this value.');
