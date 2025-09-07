import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Load environment variables from env.config
function loadEnvConfig() {
  try {
    const envPath = path.join(process.cwd(), '..', 'env.config');
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
const JWT_SECRET = envConfig.JWT_SECRET || process.env.JWT_SECRET || 'topphysics_secret';
const MONGO_URI = envConfig.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/topphysics';
const DB_NAME = envConfig.DB_NAME || process.env.DB_NAME || 'topphysics';

console.log('🔗 Using Mongo URI:', MONGO_URI);

async function authMiddleware(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Unauthorized - No Bearer token');
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token - ' + error.message);
  }
}

export default async function handler(req, res) {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    // Verify authentication
    const user = await authMiddleware(req);
    
    if (req.method === 'GET') {
      // Get all students
      console.log('Fetching students from database...');
      const students = await db.collection('students').find().toArray();
      console.log(`Found ${students.length} students`);
      
      // Map the fields to match the new weeks structure
      const mappedStudents = students.map(student => {
        // Find the current week (last attended week or week 1 if none)
        const currentWeek = student.weeks ? 
          student.weeks.find(w => w.attended) || student.weeks[0] : 
          { week: 1, attended: false, lastAttendance: null, lastAttendanceCenter: null, hwDone: false, quizDegree: null, message_state: false };
        
        return {
          id: student.id,
          name: student.name,
          grade: student.grade,
          phone: student.phone,
          parents_phone: student.parentsPhone,
          center: student.center,
          main_center: student.main_center,
          attended_the_session: currentWeek.attended,
          lastAttendance: currentWeek.lastAttendance,
          lastAttendanceCenter: currentWeek.lastAttendanceCenter,
          attendanceWeek: `week ${String(currentWeek.week).padStart(2, '0')}`,
          hwDone: currentWeek.hwDone,
          quizDegree: currentWeek.quizDegree,
          school: student.school || null,
          age: student.age || null,
          message_state: currentWeek.message_state,
          weeks: student.weeks || [] // Include the full weeks array
        };
      });
      console.log('Sending students response');
      res.json(mappedStudents);
    } else if (req.method === 'POST') {
      // Add new student
      const { id, name, grade, phone, parents_phone, main_center, age, school } = req.body;
      if (!id || !name || !grade || !phone || !parents_phone || !main_center || age === undefined || !school) {
        return res.status(400).json({ error: 'All fields including ID are required' });
      }
      
      // Check if the custom ID already exists
      const existingStudent = await db.collection('students').findOne({ id: id });
      if (existingStudent) {
        return res.status(409).json({ error: 'Student ID already exists' });
      }
      
      // Create weeks array for new student
      const weeks = [];
      for (let i = 1; i <= 20; i++) {
        weeks.push({
          week: i,
          attended: false,
          lastAttendance: null,
          lastAttendanceCenter: null,
          hwDone: false,
          quizDegree: null,
          message_state: false
        });
      }
      
      const student = {
        id: parseInt(id), // Convert custom ID to number for consistency
        name,
        age,
        grade,
        school,
        phone,
        parentsPhone: parents_phone,
        main_center,
        weeks: weeks
      };
      await db.collection('students').insertOne(student);
      res.json({ id: parseInt(id) }); // Return the custom ID as number
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
      res.status(401).json({ error: error.message });
    } else {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    if (client) await client.close();
  }
} 