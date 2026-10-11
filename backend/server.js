const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables from backend/.env (preferred), then root .env as fallback
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', chatRoutes);

// Static Frontend Hosting
app.use(express.static(FRONTEND_DIR));

// Root fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Gemini Chatbot Backend Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Frontend served from: ${FRONTEND_DIR}`);
  console.log(`======================================================\n`);
});
