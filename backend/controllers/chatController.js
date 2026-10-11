const path = require('path');
const fs = require('fs');
const GeminiService = require('../services/geminiService');
const SupabaseService = require('../services/supabaseService');
const { getSupabaseStatus, isSupabaseConfigured, initSupabase } = require('../config/supabase');
const { SUPPORTED_MODELS, DEFAULT_MODEL } = require('../config/models');

/**
 * Extracts Gemini API key from request headers or environment variables
 */
function resolveApiKey(req) {
  const headerKey = req.headers['x-gemini-api-key'];
  if (headerKey && typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }
  return process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
}

/**
 * Saves/updates an environment variable across backend/.env and root .env
 */
function saveVariableToEnv(keyName, value) {
  const targetPaths = [
    path.resolve(__dirname, '../.env'), // backend/.env
    path.resolve(__dirname, '../../.env') // root .env
  ];

  for (const envPath of targetPaths) {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const regex = new RegExp(`^${keyName}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${keyName}=${value}`);
    } else {
      content = content ? `${content.trim()}\n${keyName}=${value}\n` : `${keyName}=${value}\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
  }
}

/**
 * Chat & Supabase Controller
 */
const ChatController = {
  // GET /api/status
  getStatus(req, res) {
    const envKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    const isKeyConfigured = Boolean(envKey && envKey !== 'your_gemini_api_key_here');

    res.json({
      status: 'online',
      isKeyConfigured,
      maskedKey: isKeyConfigured ? `${envKey.slice(0, 4)}...${envKey.slice(-4)}` : null,
      defaultModel: DEFAULT_MODEL,
      supportedModels: SUPPORTED_MODELS,
      supabase: getSupabaseStatus()
    });
  },

  // POST /api/save-key (Gemini API Key)
  saveApiKey(req, res) {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
        return res.status(400).json({ error: 'Please provide a valid Gemini API key.' });
      }

      const trimmedKey = apiKey.trim();
      saveVariableToEnv('GEMINI_API_KEY', trimmedKey);
      process.env.GEMINI_API_KEY = trimmedKey;

      res.json({
        success: true,
        message: 'Gemini API key successfully saved to .env',
        maskedKey: `${trimmedKey.slice(0, 4)}...${trimmedKey.slice(-4)}`
      });
    } catch (err) {
      console.error('Error saving API key:', err);
      res.status(500).json({ error: 'Failed to write key to .env file: ' + err.message });
    }
  },

  // POST /api/save-supabase (Supabase Credentials)
  saveSupabaseConfig(req, res) {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.body;
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({ error: 'Both Supabase URL and Anon Key are required.' });
      }

      const cleanUrl = supabaseUrl.trim();
      const cleanKey = supabaseAnonKey.trim();

      saveVariableToEnv('SUPABASE_URL', cleanUrl);
      saveVariableToEnv('SUPABASE_ANON_KEY', cleanKey);

      process.env.SUPABASE_URL = cleanUrl;
      process.env.SUPABASE_ANON_KEY = cleanKey;

      initSupabase(cleanUrl, cleanKey);

      res.json({
        success: true,
        message: 'Supabase configuration saved to .env and initialized',
        supabase: getSupabaseStatus()
      });
    } catch (err) {
      console.error('Error saving Supabase configuration:', err);
      res.status(500).json({ error: 'Failed to write Supabase config to .env: ' + err.message });
    }
  },

  // GET /api/conversations
  async listConversations(req, res) {
    try {
      if (!isSupabaseConfigured()) {
        return res.json({ conversations: [], isConnected: false });
      }
      const conversations = await SupabaseService.listConversations();
      res.json({ conversations, isConnected: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load conversations: ' + err.message });
    }
  },

  // GET /api/conversations/:id
  async getConversation(req, res) {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({ error: 'Supabase is not configured' });
      }
      const conversation = await SupabaseService.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load conversation: ' + err.message });
    }
  },

  // POST /api/conversations
  async createConversation(req, res) {
    try {
      if (!isSupabaseConfigured()) {
        return res.json({
          id: 'local-' + Date.now(),
          title: req.body?.title || 'New Chat',
          isLocal: true
        });
      }
      const { title, model, id } = req.body || {};
      const conv = await SupabaseService.createConversation({ title, model, id });
      res.json(conv);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create conversation: ' + err.message });
    }
  },

  // DELETE /api/conversations/:id
  async deleteConversation(req, res) {
    try {
      if (!isSupabaseConfigured()) {
        return res.json({ success: true, isLocal: true });
      }
      await SupabaseService.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete conversation: ' + err.message });
    }
  },

  // POST /api/chat (Synchronous)
  async handleChat(req, res) {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'Gemini API Key is missing. Please set it in Settings or in the .env file.',
        code: 'API_KEY_REQUIRED'
      });
    }

    const {
      message,
      history = [],
      model = DEFAULT_MODEL,
      systemInstruction = '',
      temperature = 0.7,
      conversationId
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    try {
      // Save user prompt to Supabase if conversationId is provided
      if (conversationId && isSupabaseConfigured()) {
        await SupabaseService.saveMessage({
          conversationId,
          role: 'user',
          content: message.trim()
        }).catch(e => console.warn('Supabase save user message warning:', e.message));
      }

      const text = await GeminiService.sendMessage({
        apiKey,
        message,
        history,
        model,
        systemInstruction,
        temperature
      });

      // Save model response to Supabase
      if (conversationId && isSupabaseConfigured()) {
        await SupabaseService.saveMessage({
          conversationId,
          role: 'model',
          content: text
        }).catch(e => console.warn('Supabase save model message warning:', e.message));
      }

      res.json({
        text,
        role: 'model',
        model,
        conversationId
      });
    } catch (err) {
      console.error('Gemini API Error:', err);
      res.status(500).json({
        error: err?.message || 'Error occurred communicating with Gemini API'
      });
    }
  },

  // POST /api/chat/stream (SSE Streaming)
  async handleChatStream(req, res) {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'Gemini API Key is missing. Please set it in Settings or in the .env file.',
        code: 'API_KEY_REQUIRED'
      });
    }

    const {
      message,
      history = [],
      model = DEFAULT_MODEL,
      systemInstruction = '',
      temperature = 0.7,
      conversationId
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // Save user prompt to Supabase if conversationId is provided
    if (conversationId && isSupabaseConfigured()) {
      await SupabaseService.saveMessage({
        conversationId,
        role: 'user',
        content: message.trim()
      }).catch(e => console.warn('Supabase save user message warning:', e.message));
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullAccumulatedText = '';

    try {
      const resultStream = await GeminiService.sendMessageStream({
        apiKey,
        message,
        history,
        model,
        systemInstruction,
        temperature
      });

      for await (const chunk of resultStream.stream) {
        const text = chunk.text();
        if (text) {
          fullAccumulatedText += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      // Save full model response to Supabase
      if (conversationId && isSupabaseConfigured() && fullAccumulatedText) {
        await SupabaseService.saveMessage({
          conversationId,
          role: 'model',
          content: fullAccumulatedText
        }).catch(e => console.warn('Supabase save model message warning:', e.message));
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('Gemini Streaming Error:', err);
      const errorMessage = err?.message || 'Error occurred communicating with Gemini API';
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
};

module.exports = ChatController;
