const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// Ensure data folder and db file exist with initial mock data
function initDB() {
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      user: {
        name: 'Champ',
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
          color: '#06b6d4',
          history: {}, // Format: { "YYYY-MM-DD": true }
          streak: 0,
          bestStreak: 0
        },
        {
          id: 'habit-2',
          title: 'Read 10 Pages',
          frequency: 'daily',
          color: '#a855f7',
          history: {},
          streak: 0,
          bestStreak: 0
        }
      ],
      journal: {} // Format: { "YYYY-MM-DD": { mood: 'Good', morning: '...', evening: '...' } }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

initDB();

// Read Database API
app.get('/api/state', (req, res) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading database file:', err);
    res.status(500).json({ error: 'Failed to load app data state.' });
  }
});

// Write Database API
app.post('/api/state', (req, res) => {
  try {
    const state = req.body;
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    res.json({ success: true, message: 'App state updated successfully.' });
  } catch (err) {
    console.error('Error writing database file:', err);
    res.status(500).json({ error: 'Failed to save app data state.' });
  }
});

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Sankalp Server Running!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`========================================`);
});
