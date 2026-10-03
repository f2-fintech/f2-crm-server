const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb://localhost:27017'); 
  await client.connect(); 
  const db = client.db('crm'); 
  const lead = await db.collection('notion_leads').findOne({}); 
  console.log(JSON.stringify(lead, null, 2));
  await client.close(); 
} 
run().catch(console.error);
