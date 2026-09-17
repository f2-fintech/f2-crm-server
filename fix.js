const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('f2_crm');
    const users = db.collection('users');
    const result = await users.updateMany({}, { $set: { role: 'SUPER_ADMIN' } });
    console.log(`Updated ${result.modifiedCount} users to SUPER_ADMIN`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
