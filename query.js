const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb://localhost:27017'); 
  await client.connect(); 
  const db = client.db('crm'); 
  const page = await db.collection('notion_pages').findOne({ rows: { $ne: [] } }); 
  console.log(JSON.stringify(page?.rows?.[0], null, 2));
  console.log("Team:", page?.teamId);
  console.log("Assigned:", page?.assignedMemberId);
  await client.close(); 
} 
run().catch(console.error);
