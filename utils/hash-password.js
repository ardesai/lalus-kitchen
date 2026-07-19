// One-off CLI helper to generate a bcrypt hash for ADMIN_PASSWORD_HASH.
// Usage: node utils/hash-password.js "yourPassword"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node utils/hash-password.js "yourPassword"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
