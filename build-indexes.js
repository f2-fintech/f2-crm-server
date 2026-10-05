const { MongoClient } = require('mongodb');
require('dotenv').config();

async function buildIndexes() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/f2_crm";
  console.log("Connecting to MongoDB:", uri);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const pages = db.collection('notion_pages');

    console.log("Building index { isDeleted: 1, parentPageId: 1 }...");
    await pages.createIndex({ isDeleted: 1, parentPageId: 1 }, { background: true });

    console.log("Building index { isDeleted: 1, pageType: 1 }...");
    await pages.createIndex({ isDeleted: 1, pageType: 1 }, { background: true });

    console.log("Building index { assignedMemberId: 1, isDeleted: 1, parentPageId: 1 }...");
    await pages.createIndex({ assignedMemberId: 1, isDeleted: 1, parentPageId: 1 }, { background: true });

    console.log("Building index { teamId: 1, isDeleted: 1 }...");
    await pages.createIndex({ teamId: 1, isDeleted: 1 }, { background: true });

    console.log("✅ All indexes initiated successfully!");
    console.log("Note: Indexes are building in the background. It may take a few minutes on a large database.");
  } catch (error) {
    console.error("❌ Error building indexes:", error);
  } finally {
    await client.close();
  }
}

buildIndexes();
