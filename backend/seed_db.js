const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Load environment variables from env.config
const fs = require('fs');
const path = require('path');

function loadEnvConfig() {
  try {
    const envPath = path.join(__dirname, '..', 'env.config');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          value = value.replace(/^"|"$/g, ''); // strip quotes
          envVars[key] = value;
        }
      }
    });

    return envVars;
  } catch (error) {
    console.log('⚠️  Could not read env.config, using process.env as fallback');
    return {};
  }
}

const envConfig = loadEnvConfig();
const MONGO_URI =
  envConfig.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/topphysics';
const DB_NAME =
  envConfig.DB_NAME || process.env.DB_NAME || 'topphysics';

console.log('🔗 Using Mongo URI:', MONGO_URI);

function createWeeksArray() {
  const weeks = [];
  for (let i = 1; i <= 20; i++) {
    weeks.push({
      week: i,
      attended: false,
      lastAttendance: null,
      lastAttendanceCenter: null,
      hwDone: false,
      paidSession: false,
      quizDegree: null,
      message_state: false
    });
  }
  return weeks;
}

async function ensureCollectionsExist(db) {
  console.log('🔍 Checking if collections exist...');
  
  // Get list of existing collections
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(col => col.name);
  
  // Check and create students collection if it doesn't exist
  if (!collectionNames.includes('students')) {
    console.log('📚 Creating students collection...');
    await db.createCollection('students');
    console.log('✅ Students collection created');
  } else {
    console.log('✅ Students collection already exists');
  }
  
  // Check and create assistants collection if it doesn't exist
  if (!collectionNames.includes('assistants')) {
    console.log('👥 Creating assistants collection...');
    await db.createCollection('assistants');
    console.log('✅ Assistants collection created');
  } else {
    console.log('✅ Assistants collection already exists');
  }
  
  // Check and create history collection if it doesn't exist
  if (!collectionNames.includes('history')) {
    console.log('📖 Creating history collection...');
    await db.createCollection('history');
    console.log('✅ History collection created');
  } else {
    console.log('✅ History collection already exists');
  }
  
  // Check and create centers collection if it doesn't exist
  if (!collectionNames.includes('centers')) {
    console.log('🏢 Creating centers collection...');
    await db.createCollection('centers');
    console.log('✅ Centers collection created');
  } else {
    console.log('✅ Centers collection already exists');
  }
}

async function seedDatabase() {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    // Ensure collections exist before proceeding
    await ensureCollectionsExist(db);
    
    console.log('🗑️ Clearing existing data...');
    await db.collection('students').deleteMany({});
    await db.collection('assistants').deleteMany({});
    await db.collection('history').deleteMany({});
    await db.collection('centers').deleteMany({});
    
    console.log('✅ Database cleared');
    
    // Create assistants with unique passwords
    const assistants = [
      {
        id: 'admin',
        name: 'Admin',
        phone: "01275584931",
        role: 'admin',
        password: await bcrypt.hash('#$admin$#', 10)
      },
      {
        id: 'tony',
        name: 'Tony Joseph',
        phone: "01211172756",
        role: 'admin',
        password: await bcrypt.hash('#$tony$#', 10)
      }
    ];
    
    console.log('👥 Creating assistants...');
    await db.collection('assistants').insertMany(assistants);
    console.log(`✅ Created ${assistants.length} assistants`);
    
    // Create centers collection with data from centers.js
    const centersData = [
      { id: 1, name: 'Future Center', createdAt: new Date() },
      { id: 2, name: 'MCC Center', createdAt: new Date() },
      { id: 3, name: 'Gaint Center', createdAt: new Date() },
      { id: 4, name: 'St. Mary Ch. Nozha Center', createdAt: new Date() },
      { id: 5, name: 'St. Mary Ch. Amiryah Center', createdAt: new Date() },
    ];
    
    console.log('🏢 Creating centers...');
    await db.collection('centers').insertMany(centersData);
    console.log(`✅ Created ${centersData.length} centers`);
    
    console.log('👨‍🎓 Students collection left empty (no demo students created)');
    

    
    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${assistants.length} assistants created (no center field)`);
    console.log('- 0 students created (students collection is empty)');
    console.log(`- ${centersData.length} centers created`);
    console.log('- History collection cleared (no initial records)');
    console.log('\n🔑 Demo Login Credentials:');
    console.log('Admin ID: admin, Password: #$admin$#');
    console.log('Tony ID: tony, Password: #$tony77$#');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    if (client) await client.close();
  }
}

seedDatabase();