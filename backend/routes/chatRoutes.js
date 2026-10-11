const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');

// Status & diagnostics
router.get('/status', ChatController.getStatus);

// Configuration updates
router.post('/save-key', ChatController.saveApiKey);
router.post('/save-supabase', ChatController.saveSupabaseConfig);

// Supabase Conversations & History
router.get('/conversations', ChatController.listConversations);
router.get('/conversations/:id', ChatController.getConversation);
router.post('/conversations', ChatController.createConversation);
router.delete('/conversations/:id', ChatController.deleteConversation);

// Gemini Chat LLM endpoints
router.post('/chat', ChatController.handleChat);
router.post('/chat/stream', ChatController.handleChatStream);

module.exports = router;
