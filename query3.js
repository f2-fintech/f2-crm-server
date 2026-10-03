const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb://localhost:27017'); 
  await client.connect(); 
  const db = client.db('crm'); 
  const count = await db.collection('notion_pages').countDocuments({ "rows.0": { $exists: true } }); 
  console.log("Pages with rows:", count);
  const page = await db.collection('notion_pages').findOne({ "rows.0": { $exists: true } });
  if (page) console.log(JSON.stringify(page.rows[0], null, 2));
  await client.close(); 
} 
run().catch(console.error);
