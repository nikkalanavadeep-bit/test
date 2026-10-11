const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service handling all Google Gemini API interactions
 */
class GeminiService {
  /**
   * Formats chat history into Google Generative AI expected structure:
   * Array of { role: 'user' | 'model', parts: [{ text }] }
   */
  static formatHistory(history) {
    if (!Array.isArray(history)) return [];
    const validHistory = [];

    for (const item of history) {
      const role = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
      const text = item.text || item.content || '';
      if (text.trim()) {
        validHistory.push({
          role: role,
          parts: [{ text: text }]
        });
      }
    }

    // Gemini requires conversation history to start with a 'user' turn
    while (validHistory.length > 0 && validHistory[0].role !== 'user') {
      validHistory.shift();
    }

    return validHistory;
  }

  /**
   * Initializes Gemini chat session with specified model and config
   */
  static initializeChat({ apiKey, model = 'gemini-1.5-flash', systemInstruction, temperature = 0.7, history = [] }) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelConfig = {
      model: model,
      generationConfig: {
        temperature: parseFloat(temperature) || 0.7
      }
    };

    if (systemInstruction && systemInstruction.trim()) {
      modelConfig.systemInstruction = systemInstruction.trim();
    }

    const generativeModel = genAI.getGenerativeModel(modelConfig);
    const formattedHistory = this.formatHistory(history);

    return generativeModel.startChat({
      history: formattedHistory
    });
  }

  /**
   * Generates a non-streaming response for a user message
   */
  static async sendMessage({ apiKey, model, systemInstruction, temperature, history, message }) {
    const chat = this.initializeChat({ apiKey, model, systemInstruction, temperature, history });
    const result = await chat.sendMessage(message.trim());
    const response = await result.response;
    return response.text();
  }

  /**
   * Generates a streaming response for a user message
   */
  static async sendMessageStream({ apiKey, model, systemInstruction, temperature, history, message }) {
    const chat = this.initializeChat({ apiKey, model, systemInstruction, temperature, history });
    return await chat.sendMessageStream(message.trim());
  }
}

module.exports = GeminiService;
