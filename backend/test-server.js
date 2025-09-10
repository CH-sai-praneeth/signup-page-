const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is working!', port: PORT });
});

// OAuth test routes
app.get('/auth/google', (req, res) => {
  res.send(`
    <h1>🔍 Google OAuth Route Working!</h1>
    <p>Backend is responding correctly.</p>
    <a href="http://localhost:3000">← Go back to frontend</a>
  `);
});

app.get('/auth/facebook', (req, res) => {
  res.send(`
    <h1>📘 Facebook OAuth Route Working!</h1>
    <p>Backend is responding correctly.</p>
    <a href="http://localhost:3000">← Go back to frontend</a>
  `);
});

app.get('/auth/github', (req, res) => {
  res.send(`
    <h1>🐙 GitHub OAuth Route Working!</h1>
    <p>Backend is responding correctly.</p>
    <a href="http://localhost:3000">← Go back to frontend</a>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Frontend should be at: http://localhost:3000`);
});
