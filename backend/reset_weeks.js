const { MongoClient } = require('mongodb');

// Load environment variables from env.config
const fs = require('fs');
const path = require('path');

// Read env.config file
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
      
    });
  }
  return weeks;
}

async function resetAllStudentWeeks() {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    console.log('🔄 Resetting all student weeks...');
    
    // Get count of students before reset
    const studentCount = await db.collection('students').countDocuments();
    console.log(`📊 Found ${studentCount} students`);
    
    // Reset weeks array for all students
    const resetWeeks = createWeeksArray();
    const result = await db.collection('students').updateMany(
      {},
      { $set: { weeks: resetWeeks } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} students`);
    
    // Also clear all history records
    const historyResult = await db.collection('history').deleteMany({});
    console.log(`🗑️ Cleared ${historyResult.deletedCount} history records`);
    
    console.log('🎉 All student weeks have been reset successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${result.modifiedCount} students had their weeks reset`);
    console.log(`- ${historyResult.deletedCount} history records cleared`);
    console.log('- All students now have 20 empty weeks with attended: false');
    
  } catch (error) {
    console.error('❌ Error resetting student weeks:', error);
  } finally {
    if (client) await client.close();
  }
}

resetAllStudentWeeks();


