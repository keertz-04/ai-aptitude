// server.js
// Express API Server connecting to MongoDB with full schemas and collections seeding.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI === 'undefined' || MONGODB_URI.trim() === '') {
  MONGODB_URI = 'mongodb://localhost:27017/ai_aptitude_portal';
}

let useInMemoryDb = false;
const InMemoryDb = {
  questions: [], // Seeded below
  results: [],
  students: [],
  adminCred: { username: 'admin', password: 'admin' },
  tournamentState: {
    department: 'IT',
    activeRound: 1,
    qualifiedForRound2: [],
    qualifiedForRound3: [],
    winners: [],
    roundDurationLimit: 10,
    round1Name: 'Round 1',
    round2Name: 'Round 2',
    round3Name: 'Round 3',
    institutionName: "Ganadipathy Tulsi's Jain Engineering College",
    departmentName: "Department of Information Technology"
  },
  tournamentStates: {
    IT: {
      department: 'IT',
      activeRound: 1,
      qualifiedForRound2: [],
      qualifiedForRound3: [],
      winners: [],
      roundDurationLimit: 10,
      round1Name: 'Round 1',
      round2Name: 'Round 2',
      round3Name: 'Round 3',
      institutionName: "Ganadipathy Tulsi's Jain Engineering College",
      departmentName: "Department of Information Technology"
    },
    AIDS: {
      department: 'AIDS',
      activeRound: 1,
      qualifiedForRound2: [],
      qualifiedForRound3: [],
      winners: [],
      roundDurationLimit: 10,
      round1Name: 'Round 1',
      round2Name: 'Round 2',
      round3Name: 'Round 3',
      institutionName: "Ganadipathy Tulsi's Jain Engineering College",
      departmentName: "Department of Artificial Intelligence and Data Science"
    },
    CSBS: {
      department: 'CSBS',
      activeRound: 1,
      qualifiedForRound2: [],
      qualifiedForRound3: [],
      winners: [],
      roundDurationLimit: 10,
      round1Name: 'Round 1',
      round2Name: 'Round 2',
      round3Name: 'Round 3',
      institutionName: "Ganadipathy Tulsi's Jain Engineering College",
      departmentName: "Department of Computer Science and Business Systems"
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000 // Fast fail in 5 seconds to fallback
})
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    // Drop legacy unique index on username if present to prevent validation issues
    try {
      await mongoose.connection.db.collection('students').dropIndex('username_1');
      console.log('Successfully dropped old unique username index.');
    } catch (e) {
      // Index might not exist or collection not created yet, ignore
    }
    seedDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error. Switching to in-memory database mode:', err);
    useInMemoryDb = true;
    seedDatabase();
  });

// --- Database Schemas & Models ---

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  round: { type: Number, default: 1 },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct: { type: Number, required: true },
  explanation: { type: String, default: '' }
});
const Question = mongoose.model('Question', QuestionSchema);

const ResultSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  regNo: { type: String, default: '' },
  department: { type: String, default: 'IT', uppercase: true },
  timestamp: { type: Date, default: Date.now },
  round: { type: Number, required: true },
  answers: [Number],
  questions: { type: mongoose.Schema.Types.Mixed },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  timeTakenSeconds: { type: Number, required: true },
  avgTimePerQuestion: { type: Number, required: true },
  cognitiveProfile: { type: String, required: true },
  categoryStats: { type: mongoose.Schema.Types.Mixed },
  insights: { type: mongoose.Schema.Types.Mixed },
  narrativeReport: { type: String, required: true },
  violations: { type: Number, default: 0 }
});
const Result = mongoose.model('Result', ResultSchema);

const StudentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  regNo: { type: String, required: true, unique: true, lowercase: true },
  department: { type: String, default: 'IT', uppercase: true },
  winner: { type: Boolean, default: false },
  finalRank: { type: Number },
  finalScore: { type: Number }
});
const Student = mongoose.model('Student', StudentSchema);

const AdminCredSchema = new mongoose.Schema({
  username: { type: String, default: 'admin' },
  password: { type: String, default: 'admin' }
});
const AdminCred = mongoose.model('AdminCred', AdminCredSchema);

const TournamentStateSchema = new mongoose.Schema({
  department: { type: String, default: 'IT', uppercase: true, unique: true },
  activeRound: { type: Number, default: 1 },
  qualifiedForRound2: [String],
  qualifiedForRound3: [String],
  winners: { type: mongoose.Schema.Types.Mixed, default: [] },
  roundDurationLimit: { type: Number, default: 10 },
  round1Name: { type: String, default: 'Round 1' },
  round2Name: { type: String, default: 'Round 2' },
  round3Name: { type: String, default: 'Round 3' },
  institutionName: { type: String, default: "Ganadipathy Tulsi's Jain Engineering College" },
  departmentName: { type: String, default: "Department of Information Technology" }
});
const TournamentState = mongoose.model('TournamentState', TournamentStateSchema);

// --- REST API Endpoints ---

// Questions API
app.get('/api/questions', async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json(InMemoryDb.questions);
    }
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    if (useInMemoryDb) {
      const newQuestion = { _id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), ...req.body };
      InMemoryDb.questions.push(newQuestion);
      return res.json(newQuestion);
    }
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    res.json(newQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    if (useInMemoryDb) {
      const idx = InMemoryDb.questions.findIndex(q => q._id === req.params.id);
      if (idx !== -1) {
        InMemoryDb.questions[idx] = { ...InMemoryDb.questions[idx], ...req.body };
        return res.json(InMemoryDb.questions[idx]);
      }
      return res.status(404).json({ error: 'Question not found' });
    }
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    if (useInMemoryDb) {
      InMemoryDb.questions = InMemoryDb.questions.filter(q => q._id !== req.params.id);
      return res.json({ success: true });
    }
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Results API
app.get('/api/results', async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json(InMemoryDb.results);
    }
    const results = await Result.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Registered Students API
app.get('/api/admin/students', async (req, res) => {
  try {
    let students = [];
    let states = [];
    if (useInMemoryDb) {
      students = InMemoryDb.students || [];
      const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
      states = DEPARTMENTS.map(dept => {
        const s = (InMemoryDb.tournamentStates && InMemoryDb.tournamentStates[dept]) || {};
        return {
          department: dept,
          activeRound: s.activeRound || 1,
          qualifiedForRound2: s.qualifiedForRound2 || [],
          qualifiedForRound3: s.qualifiedForRound3 || [],
          winners: s.winners || []
        };
      });
    } else {
      students = await Student.find();
      states = await TournamentState.find();
    }

    const studentsWithStatus = students.map(student => {
      const sDept = (student.department || 'IT').toUpperCase();
      const sReg = (student.regNo || '').toLowerCase();
      const state = states.find(st => st.department === sDept);
      
      let status = "Active - Round 1";
      if (student.winner) {
        const medal = student.finalRank === 1 ? "🥇" : (student.finalRank === 2 ? "🥈" : "🥉");
        status = `${medal} ${student.finalRank === 1 ? '1st' : (student.finalRank === 2 ? '2nd' : '3rd')} Place Winner`;
      } else if (state) {
        const isCompleted = state.winners && state.winners.length > 0;
        if (isCompleted) {
          status = "Eliminated / Did not place";
        } else if (state.activeRound === 3) {
          const q3 = (state.qualifiedForRound3 || []).map(r => r.toLowerCase());
          if (q3.includes(sReg)) {
            status = "Active - " + (state.round3Name || "Round 3");
          } else {
            status = "Eliminated in " + (state.round2Name || "Round 2");
          }
        } else if (state.activeRound === 2) {
          const q2 = (state.qualifiedForRound2 || []).map(r => r.toLowerCase());
          if (q2.includes(sReg)) {
            status = "Active - " + (state.round2Name || "Round 2");
          } else {
            status = "Eliminated in " + (state.round1Name || "Round 1");
          }
        } else {
          status = "Active - " + (state.round1Name || "Round 1");
        }
      }

      return {
        _id: student._id,
        username: student.username,
        regNo: student.regNo,
        department: sDept,
        winner: student.winner,
        finalRank: student.finalRank,
        finalScore: student.finalScore,
        status: status
      };
    });

    res.json(studentsWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    if (useInMemoryDb) {
      const newResult = { _id: 'mem_' + Date.now(), timestamp: new Date(), ...req.body };
      InMemoryDb.results.push(newResult);
      return res.json(newResult);
    }
    const newResult = new Result(req.body);
    await newResult.save();
    res.json(newResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/results', async (req, res) => {
  try {
    if (useInMemoryDb) {
      InMemoryDb.results = [];
      return res.json({ success: true });
    }
    await Result.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tournament API
app.get('/api/tournament', async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json(InMemoryDb.tournamentStates);
    }
    const states = await TournamentState.find();
    // Build a map of department -> state
    const stateMap = {};
    states.forEach(s => {
      stateMap[s.department] = s;
    });
    // Seed any missing department state
    const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
    for (const dept of DEPARTMENTS) {
      if (!stateMap[dept]) {
        const defaultState = new TournamentState({
          department: dept,
          departmentName: dept === 'IT' ? 'Department of Information Technology' : (dept === 'AIDS' ? 'Department of Artificial Intelligence and Data Science' : 'Department of Computer Science and Business Systems')
        });
        await defaultState.save();
        stateMap[dept] = defaultState;
      }
    }
    res.json(stateMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournament', async (req, res) => {
  try {
    const { department } = req.body;
    if (!department) {
      return res.status(400).json({ error: 'Department is required.' });
    }
    const cleanDept = department.toUpperCase();

    if (useInMemoryDb) {
      InMemoryDb.tournamentStates[cleanDept] = { ...InMemoryDb.tournamentStates[cleanDept], ...req.body };
      return res.json(InMemoryDb.tournamentStates[cleanDept]);
    }

    let state = await TournamentState.findOne({ department: cleanDept });
    if (!state) {
      state = new TournamentState(req.body);
    } else {
      Object.assign(state, req.body);
    }
    await state.save();
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/reset', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ error: 'Department is required.' });
    }
    const cleanDept = department.trim().toUpperCase();

    if (useInMemoryDb) {
      InMemoryDb.results = InMemoryDb.results.filter(r => r.department !== cleanDept);
      if (InMemoryDb.tournamentStates[cleanDept]) {
        InMemoryDb.tournamentStates[cleanDept].activeRound = 1;
        InMemoryDb.tournamentStates[cleanDept].qualifiedForRound2 = [];
        InMemoryDb.tournamentStates[cleanDept].qualifiedForRound3 = [];
        InMemoryDb.tournamentStates[cleanDept].winners = [];
      }
      return res.json({ success: true });
    }

    await Result.deleteMany({ department: cleanDept });
    let state = await TournamentState.findOne({ department: cleanDept });
    if (state) {
      state.activeRound = 1;
      state.qualifiedForRound2 = [];
      state.qualifiedForRound3 = [];
      state.winners = [];
      await state.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournament/reset-all', async (req, res) => {
  try {
    if (useInMemoryDb) {
      InMemoryDb.results = [];
      const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
      for (const dept of DEPARTMENTS) {
        if (InMemoryDb.tournamentStates[dept]) {
          InMemoryDb.tournamentStates[dept].activeRound = 1;
          InMemoryDb.tournamentStates[dept].qualifiedForRound2 = [];
          InMemoryDb.tournamentStates[dept].qualifiedForRound3 = [];
          InMemoryDb.tournamentStates[dept].winners = [];
        }
      }
      return res.json({ success: true });
    }

    await Result.deleteMany({});
    await TournamentState.updateMany({}, {
      $set: {
        activeRound: 1,
        qualifiedForRound2: [],
        qualifiedForRound3: [],
        winners: []
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Authentication API
app.post('/api/auth/student/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (useInMemoryDb) {
      const exists = InMemoryDb.students.some(s => s.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'Student username already exists.' });
      }
      const newStudent = { username, password };
      InMemoryDb.students.push(newStudent);
      return res.json({ username: newStudent.username });
    }
    const exists = await Student.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: 'Student username already exists.' });
    }
    const student = new Student({ username, password });
    await student.save();
    res.json({ username: student.username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/student/login', async (req, res) => {
  try {
    const { username, regNo, department } = req.body;
    const cleanDept = (department || 'IT').trim().toUpperCase();
    console.log(`Login attempt received on server: username="${username}", regNo="${regNo}", department="${cleanDept}"`);
    if (!username || !regNo) {
      return res.status(400).json({ error: 'Username and Registration Number are required.' });
    }
    const normalizedRegNo = regNo.trim().toLowerCase();
    const cleanUsername = username.trim();
    
    if (useInMemoryDb) {
      let student = InMemoryDb.students.find(s => s.regNo === normalizedRegNo);
      if (!student) {
        student = { username: cleanUsername, regNo: normalizedRegNo, department: cleanDept };
        InMemoryDb.students.push(student);
        console.log(`Auto-registered new student in-memory: ${cleanUsername} (Reg No: ${normalizedRegNo}, Dept: ${cleanDept})`);
      } else {
        if (student.username !== cleanUsername) {
          student.username = cleanUsername;
        }
        student.department = cleanDept;
      }
      return res.json({ username: student.username, regNo: student.regNo, department: student.department });
    }

    let student = await Student.findOne({ regNo: normalizedRegNo });
    if (!student) {
      // Auto-create/register student under this registration number and username
      student = new Student({ username: cleanUsername, regNo: normalizedRegNo, department: cleanDept });
      await student.save();
      console.log(`Auto-registered new student: ${cleanUsername} (Reg No: ${normalizedRegNo}, Dept: ${cleanDept})`);
    } else {
      // Update username or department if different
      let changed = false;
      if (student.username !== cleanUsername) {
        student.username = cleanUsername;
        changed = true;
      }
      if (student.department !== cleanDept) {
        student.department = cleanDept;
        changed = true;
      }
      if (changed) {
        await student.save();
      }
    }
    res.json({ username: student.username, regNo: student.regNo, department: student.department });
  } catch (err) {
    console.error('Login error caught on server:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Credentials API
app.get('/api/auth/admin/credentials', async (req, res) => {
  try {
    if (useInMemoryDb) {
      return res.json(InMemoryDb.adminCred);
    }
    let creds = await AdminCred.findOne();
    if (!creds) {
      creds = new AdminCred();
      await creds.save();
    }
    res.json({ username: creds.username, password: creds.password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/admin/credentials', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (useInMemoryDb) {
      InMemoryDb.adminCred.username = username;
      InMemoryDb.adminCred.password = password;
      return res.json({ success: true });
    }
    let creds = await AdminCred.findOne();
    if (!creds) {
      creds = new AdminCred({ username, password });
    } else {
      creds.username = username;
      creds.password = password;
    }
    await creds.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Secure questions fetch for students
app.get('/api/student/questions', async (req, res) => {
  try {
    const { regNo, department } = req.query;
    if (!regNo || !department) {
      return res.status(400).json({ error: 'Student registration number and department are required.' });
    }
    const cleanRegNo = regNo.trim().toLowerCase();
    const cleanDept = department.trim().toUpperCase();

    // 1. Validate student
    let student;
    if (useInMemoryDb) {
      student = InMemoryDb.students.find(s => s.regNo === cleanRegNo && s.department === cleanDept);
    } else {
      student = await Student.findOne({ regNo: cleanRegNo, department: cleanDept });
    }
    if (!student) {
      return res.status(403).json({ error: 'Access Denied: Student is not registered in this department.' });
    }

    // 2. Resolve active round
    let state;
    if (useInMemoryDb) {
      state = InMemoryDb.tournamentStates[cleanDept];
    } else {
      state = await TournamentState.findOne({ department: cleanDept });
    }
    if (!state) {
      return res.status(404).json({ error: 'Tournament state not found for this department.' });
    }

    const activeRound = state.activeRound;

    // 3. Check qualification for round 2 or 3
    if (activeRound === 2) {
      const isQualified = state.qualifiedForRound2.some(r => r.toLowerCase() === cleanRegNo || r.toLowerCase() === student.username.toLowerCase());
      if (!isQualified) {
        return res.status(403).json({ error: `Access Denied: You did not qualify for ${state.round2Name || 'Round 2'}.` });
      }
    } else if (activeRound === 3) {
      const isQualified = state.qualifiedForRound3.some(r => r.toLowerCase() === cleanRegNo || r.toLowerCase() === student.username.toLowerCase());
      if (!isQualified) {
        return res.status(403).json({ error: `Access Denied: You did not qualify for ${state.round3Name || 'Round 3'}.` });
      }
    }

    // 4. Return only this round's questions
    let questions;
    if (useInMemoryDb) {
      questions = InMemoryDb.questions.filter(q => q.round === activeRound);
    } else {
      questions = await Question.find({ round: activeRound });
    }

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conclude round server-side endpoint
app.post('/api/tournament/conclude-round', async (req, res) => {
  try {
    const { department } = req.body;
    if (!department) {
      return res.status(400).json({ error: 'Department is required.' });
    }
    const cleanDept = department.trim().toUpperCase();

    if (useInMemoryDb) {
      const state = InMemoryDb.tournamentStates[cleanDept];
      if (!state) {
        return res.status(404).json({ error: 'Tournament state not found.' });
      }
      if (state.winners && state.winners.length > 0) {
        return res.status(400).json({ error: 'Tournament already completed.' });
      }

      const activeRound = state.activeRound;
      const results = InMemoryDb.results.filter(r => r.department === cleanDept && r.round === activeRound);

      const uniqueStudentAttempts = {};
      results.forEach(att => {
        const key = att.regNo ? att.regNo.toLowerCase() : att.studentName.toLowerCase();
        if (!uniqueStudentAttempts[key] || att.score > uniqueStudentAttempts[key].score) {
          uniqueStudentAttempts[key] = att;
        }
      });

      const sortedAttempts = Object.values(uniqueStudentAttempts).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTakenSeconds - b.timeTakenSeconds;
      });

      if (sortedAttempts.length === 0) {
        return res.status(400).json({ error: `No student attempts recorded for ${cleanDept} in Round ${activeRound}.` });
      }

      if (activeRound === 1) {
        const countToQualify = Math.ceil(sortedAttempts.length / 2);
        const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.regNo || a.studentName);
        state.qualifiedForRound2 = promoted;
        state.activeRound = 2;
        return res.json({ success: true, activeRound: 2, promoted, state });
      } else if (activeRound === 2) {
        const countToQualify = Math.ceil(sortedAttempts.length / 2);
        const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.regNo || a.studentName);
        state.qualifiedForRound3 = promoted;
        state.activeRound = 3;
        return res.json({ success: true, activeRound: 3, promoted, state });
      } else if (activeRound === 3) {
        const winners = sortedAttempts.slice(0, 3).map((a, idx) => ({
          username: a.studentName,
          regNo: a.regNo || "",
          score: a.score,
          total: a.total,
          accuracy: a.accuracy,
          archetype: a.cognitiveProfile,
          rank: idx + 1,
          department: cleanDept
        }));
        state.winners = winners;
        winners.forEach(w => {
          const student = InMemoryDb.students.find(s => s.regNo === w.regNo.toLowerCase() && s.department === cleanDept);
          if (student) {
            student.winner = true;
            student.finalRank = w.rank;
            student.finalScore = (w.score / w.total) * 100;
          }
        });
        return res.json({ success: true, activeRound: 4, winners, state });
      }
    }

    let state = await TournamentState.findOne({ department: cleanDept });
    if (!state) {
      state = new TournamentState({ department: cleanDept });
    }

    if (state.winners && state.winners.length > 0) {
      return res.status(400).json({ error: 'Tournament for this department has already concluded.' });
    }

    const activeRound = state.activeRound;
    const results = await Result.find({ department: cleanDept, round: activeRound });

    const uniqueStudentAttempts = {};
    results.forEach(att => {
      const key = att.regNo ? att.regNo.toLowerCase() : att.studentName.toLowerCase();
      if (!uniqueStudentAttempts[key] || att.score > uniqueStudentAttempts[key].score) {
        uniqueStudentAttempts[key] = att;
      }
    });

    const sortedAttempts = Object.values(uniqueStudentAttempts).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });

    if (sortedAttempts.length === 0) {
      return res.status(400).json({ error: `No student attempts recorded for ${cleanDept} in Round ${activeRound}. Cannot conclude the round.` });
    }

    if (activeRound === 1) {
      const countToQualify = Math.ceil(sortedAttempts.length / 2);
      const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.regNo || a.studentName);
      
      state.qualifiedForRound2 = promoted;
      state.activeRound = 2;
      await state.save();

      res.json({ success: true, activeRound: 2, promoted, state });
    } else if (activeRound === 2) {
      const countToQualify = Math.ceil(sortedAttempts.length / 2);
      const promoted = sortedAttempts.slice(0, countToQualify).map(a => a.regNo || a.studentName);

      state.qualifiedForRound3 = promoted;
      state.activeRound = 3;
      await state.save();

      res.json({ success: true, activeRound: 3, promoted, state });
    } else if (activeRound === 3) {
      // Crown top 3 winners using precise tie handling
      // 1. Higher final round score (att.score)
      // 2. If equal, higher previous-round (round 2) score
      // 3. If still equal, earlier final submission time
      const attemptsWithR2 = [];
      for (const att of sortedAttempts) {
        let r2Score = 0;
        if (att.regNo) {
          const r2Res = await Result.findOne({ regNo: att.regNo, department: cleanDept, round: 2 }).sort({ score: -1 });
          if (r2Res) r2Score = r2Res.score;
        }
        attemptsWithR2.push({ att, r2Score });
      }

      attemptsWithR2.sort((x, y) => {
        const a = x.att;
        const b = y.att;
        if (b.score !== a.score) return b.score - a.score;
        if (y.r2Score !== x.r2Score) return y.r2Score - x.r2Score;
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      const finalSorted = attemptsWithR2.map(item => item.att);
      const winners = finalSorted.slice(0, 3).map((a, idx) => ({
        username: a.studentName,
        regNo: a.regNo || "",
        score: a.score,
        total: a.total,
        accuracy: a.accuracy,
        archetype: a.cognitiveProfile,
        rank: idx + 1,
        department: cleanDept
      }));

      state.winners = winners;
      await state.save();

      // Reset all students in this department's winner statuses first
      await Student.updateMany({ department: cleanDept }, { $set: { winner: false }, $unset: { finalRank: 1, finalScore: 1 } });

      // Save top 3 winners with winner: true
      for (const w of winners) {
        if (w.regNo) {
          await Student.updateOne(
            { regNo: w.regNo.toLowerCase(), department: cleanDept },
            { $set: { winner: true, finalRank: w.rank, finalScore: (w.score / w.total) * 100 } }
          );
        }
      }

      res.json({ success: true, activeRound: 4, winners, state });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin stats summary by department
app.get('/api/admin/department-summary', async (req, res) => {
  try {
    const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];
    const summaries = {};

    if (useInMemoryDb) {
      for (const dept of DEPARTMENTS) {
        const state = InMemoryDb.tournamentStates[dept];
        const totalStudents = InMemoryDb.students.filter(s => s.department === dept).length;
        const completedCount = InMemoryDb.results.filter(r => r.department === dept && r.round === state.activeRound).length;
        let qualifiedCount = 0;
        if (state.activeRound === 1) {
          qualifiedCount = totalStudents;
        } else if (state.activeRound === 2) {
          qualifiedCount = state.qualifiedForRound2.length;
        } else if (state.activeRound === 3) {
          qualifiedCount = state.qualifiedForRound3.length;
        }
        summaries[dept] = {
          activeRound: state.activeRound,
          activeRoundName: state.activeRound === 1 ? state.round1Name : (state.activeRound === 2 ? state.round2Name : state.round3Name),
          totalStudents,
          completedCount,
          idleCount: Math.max(0, qualifiedCount - completedCount),
          qualifiedCount,
          winners: state.winners || []
        };
      }
      return res.json(summaries);
    }

    for (const dept of DEPARTMENTS) {
      let state = await TournamentState.findOne({ department: dept });
      if (!state) {
        state = new TournamentState({ department: dept });
        await state.save();
      }
      const activeRound = state.activeRound;
      const totalStudents = await Student.countDocuments({ department: dept });
      const completedCount = await Result.countDocuments({ department: dept, round: activeRound });

      let qualifiedCount = 0;
      if (activeRound === 1) {
        qualifiedCount = totalStudents;
      } else if (activeRound === 2) {
        qualifiedCount = state.qualifiedForRound2.length;
      } else if (activeRound === 3) {
        qualifiedCount = state.qualifiedForRound3.length;
      }

      summaries[dept] = {
        activeRound,
        activeRoundName: activeRound === 1 ? state.round1Name : (activeRound === 2 ? state.round2Name : state.round3Name),
        totalStudents,
        completedCount,
        idleCount: Math.max(0, qualifiedCount - completedCount),
        qualifiedCount,
        winners: state.winners || []
      };
    }
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset questions to defaults
app.post('/api/setup/reset-defaults', async (req, res) => {
  try {
    if (useInMemoryDb) {
      InMemoryDb.questions = DEFAULT_QUESTIONS.map((q, idx) => ({ _id: `q_${idx + 1}`, ...q }));
      return res.json({ success: true });
    }
    await Question.deleteMany({});
    await Question.insertMany(DEFAULT_QUESTIONS);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Bootstrap ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

// --- Default Database Seeding ---

const DEFAULT_QUESTIONS = [
  {
    category: "Quantitative",
    round: 1,
    question: "A machine learning training process takes 120 minutes on a single GPU. If the workload can be perfectly parallelized across 4 identical GPUs with an efficiency loss of 10% (i.e. overhead adds 10% to total computing time needed), how long will the parallel training take?",
    options: ["30 minutes", "33 minutes", "27 minutes", "40 minutes"],
    correct: 1,
    explanation: "The total training workload increases by 10% due to overhead: 120 min * 1.10 = 132 minutes of total compute time. Parallelizing this evenly across 4 GPUs yields: 132 / 4 = 33 minutes."
  },
  {
    category: "Logical",
    round: 2,
    question: "Identify the next pattern in the sequence: GPT-1, GPT-2, GPT-3, GPT-3.5, GPT-4. If the size of training parameters increases exponentially, and the sequence of releases follows a specific architectural progression, which of the following is most likely to represent the next phase in specialized reasoning models?",
    options: [
      "A larger monolithic model with 100x parameters",
      "A Mixture-of-Experts (MoE) system routing tokens to specialized subnetworks",
      "A return to simple linear regression",
      "A purely rule-based expert system"
    ],
    correct: 1,
    explanation: "Modern scaling laws and computational efficiency constraints have led state-of-the-art models (like GPT-4 and beyond) to adopt Mixture-of-Experts (MoE) architectures, which route tokens dynamically to specialized subnetworks rather than activating the entire monolithic parameter set."
  },
  {
    category: "Verbal",
    round: 1,
    question: "Read the analogy: 'NEURON is to BRAIN as NODE is to ________'. Choose the term that best completes the relationship in the context of network architectures.",
    options: ["Computer", "Synapse", "Graph", "Connection"],
    correct: 2,
    explanation: "A neuron is the fundamental structural unit of a biological brain. Similarly, a node is the fundamental structural unit of a mathematical graph or network architecture."
  },
  {
    category: "Quantitative",
    round: 2,
    question: "If a neural network has a learning rate of 0.1, and after one training step it overshoots the global minimum of the loss function, what adjustment should the optimizer make?",
    options: [
      "Increase learning rate to 0.5 to jump further",
      "Decrease the learning rate to scale down step sizes",
      "Change the activation function to Linear",
      "Increase the batch size to infinity"
    ],
    correct: 1,
    explanation: "Overshooting the minimum is a classic sign of a learning rate that is too high. Decreasing the learning rate helps the optimizer take smaller, more precise steps towards convergence."
  },
  {
    category: "Logical",
    round: 1,
    question: "Three AI agents (Alpha, Beta, Gamma) are sorting files. Alpha is faster than Beta. Gamma is slower than Beta. If Alpha is slower than Delta, which of the following statements must be true?",
    options: [
      "Beta is faster than Delta",
      "Delta is faster than Gamma",
      "Gamma is faster than Alpha",
      "Delta and Beta run at the same speed"
    ],
    correct: 1,
    explanation: "We have: Alpha > Beta, Beta > Gamma (so Alpha > Beta > Gamma). Also Delta > Alpha. Combining them: Delta > Alpha > Beta > Gamma. Therefore, Delta is faster than Gamma."
  },
  {
    category: "AI & Tech",
    round: 2,
    question: "What is the primary function of the 'Self-Attention' mechanism in Transformer models?",
    options: [
      "To speed up training by throwing away older text history",
      "To compute dynamic mathematical weights representing how words in a sentence relate to each other regardless of distance",
      "To run virus checks on the model weights",
      "To optimize the power consumption of GPUs during inference"
    ],
    correct: 1,
    explanation: "Self-attention allows the model to analyze a sequence of tokens and calculate how much focus (weight) should be placed on other parts of the sequence, allowing it to capture contextual relationships regardless of distance."
  },
  {
    category: "Verbal",
    round: 1,
    question: "Choose the word that is most nearly OPPOSITE in meaning to 'STAGNANT' in the context of technological innovation.",
    options: ["Dynamic", "Dormant", "Stable", "Redundant"],
    correct: 0,
    explanation: "'Stagnant' refers to showing no activity, growth, or progress. The opposite is 'Dynamic', which refers to constant change, activity, and progress."
  },
  {
    category: "AI & Tech",
    round: 2,
    question: "In machine learning, what does 'Overfitting' refer to?",
    options: [
      "When a model is too small to fit on a single GPU",
      "When a model learns the training data, including noise, too well and performs poorly on unseen validation data",
      "When the training dataset size is larger than the hard drive capacity",
      "When the learning rate is exactly zero"
    ],
    correct: 1,
    explanation: "Overfitting occurs when a model fits the training data too closely, capturing noise and specific details rather than general patterns, resulting in poor generalization on new datasets."
  },
  {
    category: "Quantitative",
    round: 3,
    question: "A binary classifier has a Precision of 0.80 and a Recall of 0.60. What is its F1-Score?",
    options: ["0.70", "0.686", "0.75", "0.50"],
    correct: 1,
    explanation: "The F1-score is the harmonic mean of Precision and Recall. F1 = 2 * (Precision * Recall) / (Precision + Recall) = 2 * (0.8 * 0.6) / (0.8 + 0.6) = 0.96 / 1.4 ≈ 0.686."
  },
  {
    category: "Logical",
    round: 3,
    question: "An algorithm is designed to traverse a tree structure. It visits the root node first, then recursively traverses each sub-tree from left to right, visiting parents before their child nodes. What traversal strategy is this?",
    options: [
      "Post-order Depth-First Search",
      "Pre-order Depth-First Search",
      "Breadth-First Search",
      "In-order Depth-First Search"
    ],
    correct: 1,
    explanation: "Pre-order traversal visits the parent (root) node first, then recursively visits the left sub-tree, and then the right sub-tree. This is a form of Depth-First Search."
  }
];

async function seedDatabase() {
  const DEPARTMENTS = ['IT', 'AIDS', 'CSBS'];

  if (useInMemoryDb) {
    InMemoryDb.questions = DEFAULT_QUESTIONS.map((q, idx) => ({ _id: `q_${idx + 1}`, ...q }));
    InMemoryDb.students = [
      { username: 'Default Student', regNo: 'reg12345', department: 'IT' },
      { username: 'AIDS Student', regNo: 'reg54321', department: 'AIDS' },
      { username: 'CSBS Student', regNo: 'reg67890', department: 'CSBS' }
    ];
    console.log('Seeded in-memory fallback database with default questions and students for IT, AIDS, and CSBS.');
    return;
  }
  try {
    // 1. Seed Admin credentials
    const adminCount = await AdminCred.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new AdminCred({ username: 'admin', password: 'admin' });
      await defaultAdmin.save();
      console.log('Seeded default administrator credentials: admin/admin.');
    }

    // 2. Seed Tournament states
    for (const dept of DEPARTMENTS) {
      const existingState = await TournamentState.findOne({ department: dept });
      if (!existingState) {
        const defaultState = new TournamentState({
          department: dept,
          departmentName: dept === 'IT' ? 'Department of Information Technology' : (dept === 'AIDS' ? 'Department of Artificial Intelligence and Data Science' : 'Department of Computer Science and Business Systems')
        });
        await defaultState.save();
        console.log(`Seeded initial tournament settings for department ${dept} (Round 1 active).`);
      }
    }

    // 3. Seed Default questions
    const questionsCount = await Question.countDocuments();
    if (questionsCount === 0) {
      await Question.insertMany(DEFAULT_QUESTIONS);
      console.log(`Seeded ${DEFAULT_QUESTIONS.length} default aptitude questions.`);
    }

    // 4. Seed Default Student credentials
    const defaultStudents = [
      { username: 'Default Student', regNo: 'reg12345', department: 'IT' },
      { username: 'AIDS Student', regNo: 'reg54321', department: 'AIDS' },
      { username: 'CSBS Student', regNo: 'reg67890', department: 'CSBS' }
    ];
    for (const s of defaultStudents) {
      const existing = await Student.findOne({ regNo: s.regNo });
      if (!existing) {
        const newStudent = new Student(s);
        await newStudent.save();
        console.log(`Seeded default student credentials: ${s.username} / ${s.regNo} (${s.department}).`);
      }
    }
  } catch (err) {
    console.error('Seeding database failed:', err);
  }
}
