const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://localhost:27017"; 
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db('f2_crm');
    const teams = database.collection('teams');
    
    const result = await teams.find().toArray();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
