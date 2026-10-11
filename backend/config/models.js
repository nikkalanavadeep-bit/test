// Supported Gemini Models & Configurations
const SUPPORTED_MODELS = [
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    badge: 'Recommended • Fast & Smart' 
  },
  { 
    id: 'gemini-1.5-pro', 
    name: 'Gemini 1.5 Pro', 
    badge: 'Complex Reasoning & Code' 
  },
  { 
    id: 'gemini-2.0-flash', 
    name: 'Gemini 2.0 Flash', 
    badge: 'Next-Gen Ultra Fast' 
  }
];

const DEFAULT_MODEL = 'gemini-1.5-flash';

module.exports = {
  SUPPORTED_MODELS,
  DEFAULT_MODEL
};
