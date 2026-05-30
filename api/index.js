const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;
const crypto = require('crypto');

// GitHub Gist Database setup
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.Github_Token || process.env.GITHUB_Token;
const GIST_ID = process.env.GIST_ID || process.env.Gist_ID || process.env.Gist_Id;

function isGistDbConfigured() {
  return !!(GITHUB_TOKEN && GIST_ID);
}

// Fetch database from Gist
async function fetchGistDb() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Sankalp-App'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gist: ${response.statusText}`);
    }

    const data = await response.json();
    const fileContent = data.files['db.json']?.content || '{}';
    const db = JSON.parse(fileContent);

    // Initialize collections
    if (!db.users) db.users = {};
    if (!db.states) db.states = {};

    return db;
  } catch (err) {
    console.error('Error fetching Gist database:', err);
    throw err;
  }
}

// Save database to Gist
async function saveGistDb(db) {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Sankalp-App'
      },
      body: JSON.stringify({
        description: 'Update Sankalp database state',
        files: {
          'db.json': {
            content: JSON.stringify(db, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to update Gist: ${response.statusText} - ${errText}`);
    }
  } catch (err) {
    console.error('Error saving Gist database:', err);
    throw err;
  }
}

// MongoDB connection setup
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('💚 Connected to MongoDB successfully!');
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB, falling back to JSON files:', err);
    });
} else {
  console.log('ℹ️ No MONGODB_URI detected. Running with local file-based database.');
}

// User Schema for Authentication
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  originalName: { type: String, required: true },
  hash: { type: String, required: true },
  salt: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// UserState Schema for storing tasks, habits, etc.
const userStateSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  state: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const UserState = mongoose.models.UserState || mongoose.model('UserState', userStateSchema);

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

const dataDir = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const USERS_REGISTRY_FILE = path.join(dataDir, 'users.json');
const USERS_DIR = path.join(dataDir, 'users');

// Ensure database directories exist
function ensureDirs() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_REGISTRY_FILE)) {
    fs.writeFileSync(USERS_REGISTRY_FILE, JSON.stringify({}), 'utf-8');
  }
}

ensureDirs();

// Helper to hash password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
}

// Generate default template data for new user
function getNewUserState(username) {
  return {
    user: {
      name: username,
      theme: 'dark',
      focusMinutes: 0,
      streakCount: 0,
      lastActiveDate: null
    },
    tasks: [
      {
        id: 'task-1',
        title: 'Plan the Day with Sankalp',
        description: 'Explore the dashboard, set focus goals, and log daily habits.',
        category: 'Personal',
        priority: 'high',
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
        subtasks: [
          { id: 'sub-1', title: 'Set primary focus', completed: false },
          { id: 'sub-2', title: 'Check habit tracker', completed: false }
        ]
      },
      {
        id: 'task-2',
        title: 'Practice Mindful Breathing',
        description: 'Use the Zen view breathing bubble for a 4-minute box breathing cycle.',
        category: 'Health',
        priority: 'medium',
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
        subtasks: []
      }
    ],
    habits: [
      {
        id: 'habit-1',
        title: 'Hydrate 3L Water',
        frequency: 'daily',
        color: '#34d399', // Soothing green
        history: {},
        streak: 0,
        bestStreak: 0
      },
      {
        id: 'habit-2',
        title: 'Read 10 Pages',
        frequency: 'daily',
        color: '#c084fc', // Soothing lavender
        history: {},
        streak: 0,
        bestStreak: 0
      }
    ],
    journal: {},
    studyPlans: [] // Added for Study Planner!
  };
}

// Authentication APIs
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    
    const lowerUsername = username.toLowerCase().trim();

    if (isGistDbConfigured()) {
      const db = await fetchGistDb();
      if (db.users[lowerUsername]) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);

      db.users[lowerUsername] = { salt, hash, originalName: username };
      db.states[lowerUsername] = getNewUserState(username);

      await saveGistDb(db);
      return res.json({ success: true, message: 'User registered successfully!' });
    } else if (isDbConnected()) {
      const existingUser = await User.findOne({ username: lowerUsername });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);

      const newUser = new User({
        username: lowerUsername,
        originalName: username,
        hash,
        salt
      });
      await newUser.save();

      const newUserState = new UserState({
        username: lowerUsername,
        state: getNewUserState(username)
      });
      await newUserState.save();

      return res.json({ success: true, message: 'User registered successfully!' });
    } else {
      const users = JSON.parse(fs.readFileSync(USERS_REGISTRY_FILE, 'utf-8'));

      if (users[lowerUsername]) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);

      users[lowerUsername] = { salt, hash, originalName: username };
      fs.writeFileSync(USERS_REGISTRY_FILE, JSON.stringify(users, null, 2), 'utf-8');

      // Create default user profile state file
      const userStateFile = path.join(USERS_DIR, `${lowerUsername}.json`);
      fs.writeFileSync(userStateFile, JSON.stringify(getNewUserState(username), null, 2), 'utf-8');

      res.json({ success: true, message: 'User registered successfully!' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const lowerUsername = username.toLowerCase().trim();

    if (isGistDbConfigured()) {
      const db = await fetchGistDb();
      const user = db.users[lowerUsername];
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      const computedHash = hashPassword(password, user.salt);
      if (computedHash !== user.hash) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      res.json({ success: true, username: user.originalName, normalizedUsername: lowerUsername });
    } else if (isDbConnected()) {
      const user = await User.findOne({ username: lowerUsername });
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      const computedHash = hashPassword(password, user.salt);
      if (computedHash !== user.hash) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      res.json({ success: true, username: user.originalName, normalizedUsername: lowerUsername });
    } else {
      const users = JSON.parse(fs.readFileSync(USERS_REGISTRY_FILE, 'utf-8'));

      if (!users[lowerUsername]) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      const { salt, hash, originalName } = users[lowerUsername];
      const computedHash = hashPassword(password, salt);

      if (computedHash !== hash) {
        return res.status(400).json({ error: 'Invalid username or password.' });
      }

      res.json({ success: true, username: originalName, normalizedUsername: lowerUsername });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Read User Specific Database API
app.get('/api/state', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ error: 'Username parameter is required.' });
    }

    const lowerUsername = username.toLowerCase().trim();

    if (isGistDbConfigured()) {
      const db = await fetchGistDb();
      let state = db.states[lowerUsername];
      if (!state) {
        state = getNewUserState(username);
        db.states[lowerUsername] = state;
        await saveGistDb(db);
      }
      res.json(state);
    } else if (isDbConnected()) {
      let userState = await UserState.findOne({ username: lowerUsername });
      if (!userState) {
        // Initialize if missing
        userState = new UserState({
          username: lowerUsername,
          state: getNewUserState(username)
        });
        await userState.save();
      }
      res.json(userState.state);
    } else {
      const userStateFile = path.join(USERS_DIR, `${lowerUsername}.json`);

      if (!fs.existsSync(userStateFile)) {
        // Initialize if missing
        fs.writeFileSync(userStateFile, JSON.stringify(getNewUserState(username), null, 2), 'utf-8');
      }

      const data = fs.readFileSync(userStateFile, 'utf-8');
      res.json(JSON.parse(data));
    }
  } catch (err) {
    console.error('Error reading user state:', err);
    res.status(500).json({ error: 'Failed to load user state.' });
  }
});

// Write User Specific Database API
app.post('/api/state', async (req, res) => {
  try {
    const { username, state } = req.body;
    if (!username || !state) {
      return res.status(400).json({ error: 'Username and state are required.' });
    }

    const lowerUsername = username.toLowerCase().trim();

    if (isGistDbConfigured()) {
      const db = await fetchGistDb();
      db.states[lowerUsername] = state;
      await saveGistDb(db);
      res.json({ success: true, message: 'User state saved successfully.' });
    } else if (isDbConnected()) {
      await UserState.findOneAndUpdate(
        { username: lowerUsername },
        { state: state },
        { upsert: true, new: true }
      );
      res.json({ success: true, message: 'User state saved successfully.' });
    } else {
      const userStateFile = path.join(USERS_DIR, `${lowerUsername}.json`);

      fs.writeFileSync(userStateFile, JSON.stringify(state, null, 2), 'utf-8');
      res.json({ success: true, message: 'User state saved successfully.' });
    }
  } catch (err) {
    console.error('Error writing user state:', err);
    res.status(500).json({ error: 'Failed to save user state.' });
  }
});

function cleanJsonString(str) {
  if (!str) return '';
  return str.replace(/^```(json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

// Saarthi AI generation API
app.post('/api/saarthi/generate', async (req, res) => {
  try {
    const { prompt, days, subject, apiKey } = req.body;
    if (!prompt || !days || !subject) {
      return res.status(400).json({ error: 'Prompt, days, and subject are required.' });
    }

    const targetDays = parseInt(days) || 10;
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    let generatedPlansText = null;

    if (finalApiKey) {
      try {
        // Call Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are Saarthi, a friendly syllabus planner assistant.
Take this subject: "${subject}"
Syllabus details/User goals: "${prompt}"
Target days: ${targetDays}

Split the syllabus into exactly ${targetDays} day-by-day learning plans.
For each day, provide:
- topic: A specific subtopic to learn.
- hours: Study hours required (between 1 and 4).
- subtasks: A list of 3 checklist task strings. Detail the study goals, video lectures references, and practice QA problems.
  Example checklist tasks:
  1. "Watch YouTube lecture on ${subject} fundamentals"
  2. "Read MIT OCW study guide notes"
  3. "Solve 3 practice coding questions on LeetCode"

Output ONLY a valid JSON object matching this structure:
{
  "plans": [
    {
      "day": 1,
      "subject": "${subject}",
      "topic": "Topic Name",
      "hours": 2,
      "subtasks": ["Checklist item 1", "Checklist item 2", "Checklist item 3"]
    }
  ]
}
Ensure you return ONLY raw JSON matching this structure. Do not wrap in markdown or block backticks.`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        const result = await response.json();
        if (response.ok && result.candidates?.[0]?.content?.parts?.[0]?.text) {
          generatedPlansText = result.candidates[0].content.parts[0].text;
        } else {
          console.warn('Gemini API call failed, falling back to Pollinations AI:', result.error?.message || 'Unknown error');
        }
      } catch (geminiErr) {
        console.warn('Gemini API connection error, falling back to Pollinations AI:', geminiErr.message);
      }
    }

    // Call Pollinations AI if Gemini wasn't used or failed
    if (!generatedPlansText) {
      try {
        console.log('Attempting study roadmap generation using Pollinations AI keyless API...');
        const response = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `You are Saarthi, a friendly syllabus planner assistant.
Take this subject: "${subject}"
Syllabus details/User goals: "${prompt}"
Target days: ${targetDays}

Split the syllabus into exactly ${targetDays} day-by-day learning plans.
For each day, provide:
- topic: A specific subtopic to learn.
- hours: Study hours required (between 1 and 4).
- subtasks: A list of 3 checklist task strings. Detail the study goals, video lectures references, and practice QA problems.
  Example checklist tasks:
  1. "Watch YouTube lecture on ${subject} fundamentals"
  2. "Read MIT OCW study guide notes"
  3. "Solve 3 practice coding questions on LeetCode"

Output ONLY a valid JSON object matching this structure:
{
  "plans": [
    {
      "day": 1,
      "subject": "${subject}",
      "topic": "Topic Name",
      "hours": 2,
      "subtasks": ["Checklist item 1", "Checklist item 2", "Checklist item 3"]
    }
  ]
}
Ensure you return ONLY raw JSON matching this structure. Do not wrap in markdown or block backticks.`
              }
            ],
            json: true
          })
        });

        if (response.ok) {
          generatedPlansText = await response.text();
        } else {
          console.warn(`Pollinations AI failed with status: ${response.status}`);
        }
      } catch (pollinationsErr) {
        console.warn('Pollinations AI connection error, falling back to local heuristic:', pollinationsErr.message);
      }
    }

    if (generatedPlansText) {
      try {
        const cleanText = cleanJsonString(generatedPlansText);
        const parsedData = JSON.parse(cleanText);
        if (parsedData && Array.isArray(parsedData.plans)) {
          return res.json(parsedData);
        }
      } catch (parseErr) {
        console.error('Failed to parse AI generated plans JSON:', parseErr.message, 'Raw text:', generatedPlansText);
      }
    }

    // Heuristic Local Fallback if no API key is present and AI calls both failed
    const topics = prompt.split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
    const mockPlans = [];
    const subjectsList = topics.length > 0 ? topics : ['Core concepts', 'Practical implementation', 'Revision and Mock Q&A'];

    for (let i = 0; i < targetDays; i++) {
      const topicIndex = i % subjectsList.length;
      const currentTopic = subjectsList[topicIndex];
      
      mockPlans.push({
        day: i + 1,
        subject: subject,
        topic: `Day ${i + 1}: ${currentTopic}`,
        hours: Math.floor(Math.random() * 2) + 2, // 2-3 hours
        subtasks: [
          `Watch YouTube - ${currentTopic} Guide`,
          `Read notes/PDFs on Github for ${currentTopic}`,
          `Complete practice Q/A on GeeksforGeeks for ${currentTopic}`
        ]
      });
    }

    res.json({ plans: mockPlans });

  } catch (err) {
    console.error('Saarthi generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate study roadmap.' });
  }
});

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..') });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Sankalp Server Running!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`========================================`);
});
