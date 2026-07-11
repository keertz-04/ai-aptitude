// server.js
// Express API Server connecting to MongoDB with full schemas and collections seeding.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_aptitude_portal';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(MONGODB_URI)
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
  .catch(err => console.error('MongoDB connection error:', err));

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
  regNo: { type: String, required: true, unique: true, lowercase: true }
});
const Student = mongoose.model('Student', StudentSchema);

const AdminCredSchema = new mongoose.Schema({
  username: { type: String, default: 'admin' },
  password: { type: String, default: 'admin' }
});
const AdminCred = mongoose.model('AdminCred', AdminCredSchema);

const TournamentStateSchema = new mongoose.Schema({
  activeRound: { type: Number, default: 1 },
  qualifiedForRound2: [String],
  qualifiedForRound3: [String],
  winners: { type: mongoose.Schema.Types.Mixed, default: [] },
  roundDurationLimit: { type: Number, default: 10 }
});
const TournamentState = mongoose.model('TournamentState', TournamentStateSchema);

// --- REST API Endpoints ---

// Questions API
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    res.json(newQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Results API
app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const newResult = new Result(req.body);
    await newResult.save();
    res.json(newResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/results', async (req, res) => {
  try {
    await Result.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tournament API
app.get('/api/tournament', async (req, res) => {
  try {
    let state = await TournamentState.findOne();
    if (!state) {
      state = new TournamentState();
      await state.save();
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournament', async (req, res) => {
  try {
    let state = await TournamentState.findOne();
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
    await Result.deleteMany({});
    let state = await TournamentState.findOne();
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

// Student Authentication API
app.post('/api/auth/student/register', async (req, res) => {
  try {
    const { username, password } = req.body;
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
    const { username, regNo } = req.body;
    console.log(`Login attempt received on server: username="${username}", regNo="${regNo}"`);
    if (!username || !regNo) {
      return res.status(400).json({ error: 'Username and Registration Number are required.' });
    }
    const normalizedRegNo = regNo.trim().toLowerCase();
    const cleanUsername = username.trim();
    
    let student = await Student.findOne({ regNo: normalizedRegNo });
    if (!student) {
      // Auto-create/register student under this registration number and username
      student = new Student({ username: cleanUsername, regNo: normalizedRegNo });
      await student.save();
      console.log(`Auto-registered new student: ${cleanUsername} (Reg No: ${normalizedRegNo})`);
    } else {
      // Update username if they logged in with a different name
      if (student.username !== cleanUsername) {
        student.username = cleanUsername;
        await student.save();
      }
    }
    res.json({ username: student.username, regNo: student.regNo });
  } catch (err) {
    console.error('Login error caught on server:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Credentials API
app.get('/api/auth/admin/credentials', async (req, res) => {
  try {
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

// Reset questions to defaults
app.post('/api/setup/reset-defaults', async (req, res) => {
  try {
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
  try {
    // 1. Seed Admin credentials
    const adminCount = await AdminCred.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new AdminCred({ username: 'admin', password: 'admin' });
      await defaultAdmin.save();
      console.log('Seeded default administrator credentials: admin/admin.');
    }

    // 2. Seed Tournament state
    const tourCount = await TournamentState.countDocuments();
    if (tourCount === 0) {
      const defaultState = new TournamentState();
      await defaultState.save();
      console.log('Seeded initial tournament settings (Round 1 active).');
    }

    // 3. Seed Default questions
    const questionsCount = await Question.countDocuments();
    if (questionsCount === 0) {
      await Question.insertMany(DEFAULT_QUESTIONS);
      console.log(`Seeded ${DEFAULT_QUESTIONS.length} default aptitude questions.`);
    }

    // 4. Seed Default Student credentials
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      const defaultStudent = new Student({ username: 'Default Student', regNo: 'reg12345' });
      await defaultStudent.save();
      console.log('Seeded default student credentials: Default Student / reg12345.');
    }
  } catch (err) {
    console.error('Seeding database failed:', err);
  }
}
