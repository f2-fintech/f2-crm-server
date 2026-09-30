const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function reset() {
  await mongoose.connect('mongodb://localhost:27017/f2_crm');
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash('password123', 10);
  await db.collection('users').updateOne({ email: 'admin@gmail.com' }, { $set: { password: hash } });
  console.log('Reset admin password to password123');
  process.exit(0);
}
reset();
