const { MongoClient } = require('mongodb');

async function mock() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://kietthetran123_db_user:kiet090502@ather-labs.gcf6ytb.mongodb.net/?appName=ather-labs";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test'); // Replace with actual DB name if different
    const collection = db.collection('seasons');
    
    await collection.deleteMany({}); // clear old ones
    
    const now = new Date();
    const mockSeasons = [
      {
        name: 'Mùa Cuối Năm 2025 (Finished)',
        startTime: new Date(now.getFullYear() - 1, 10, 1), 
        endTime: new Date(now.getFullYear() - 1, 11, 31),
        targetScore: 50000,
        status: 'CLOSED',
        currentScore: 50000,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mùa Valentine 2026 (Finished)',
        startTime: new Date(now.getFullYear(), 0, 15),
        endTime: new Date(now.getFullYear(), 1, 28),
        targetScore: 20000,
        status: 'CLOSED',
        currentScore: 20000,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mùa Hè Sinh Tử 2026 (ACTIVE NOW)',
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
        targetScore: 150000,
        status: 'ACTIVE',
        currentScore: 12050,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mùa Halloween Kinh Dị 2026 (Upcoming)',
        startTime: new Date(now.getFullYear(), 9, 1),
        endTime: new Date(now.getFullYear(), 9, 31),
        targetScore: 75000,
        status: 'PENDING',
        currentScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const result = await collection.insertMany(mockSeasons);
    console.log(`${result.insertedCount} seasons have been mocked successfully!`);
    
  } finally {
    await client.close();
  }
}
mock().catch(console.dir);
