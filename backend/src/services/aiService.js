const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

/**
 * Get AI response from Claude
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options
 * @returns {String} AI response
 */
async function getClaudeResponse(messages, options = {}) {
  try {
    const {
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 1024,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not set - AI features disabled');
      return 'AI service is currently unavailable. Please contact embassy staff for assistance.';
    }

    const requestParams = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages
    };

    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }

    const response = await anthropic.messages.create(requestParams);

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    return textContent ? textContent.text : 'Unable to generate response';

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('AI service error: ' + error.message);
  }
}

/**
 * Citizen assistance - help users with consular questions
 * @param {String} userQuestion - User's question
 * @param {String} language - Preferred language
 * @returns {String} AI response
 */
async function citizenAssistant(userQuestion, language = 'en') {
  const systemPrompt = `You are a helpful consular assistance AI assistant for the Global Consular Collaboration Platform.

Your role is to:
- Answer questions about consular services clearly and professionally
- Guide citizens through the process of filing cases (lost passports, visa issues, emergencies)
- Provide general information about required documents and procedures
- Recommend they contact their embassy directly for case-specific questions
- Be empathetic to citizens who may be in stressful situations

Important guidelines:
- Never make promises or commitments on behalf of embassies
- If you're unsure, recommend contacting embassy staff
- Keep responses concise and actionable
- Be culturally sensitive and professional
${language !== 'en' ? `- Respond in ${language} language` : ''}

Always maintain a helpful, respectful tone.`;

  const messages = [
    {
      role: 'user',
      content: userQuestion
    }
  ];

  return await getClaudeResponse(messages, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1024
  });
}

/**
 * Staff assistant - help embassy staff with case management
 * @param {String} task - Task type (summarize, translate, etc.)
 * @param {String} content - Content to process
 * @param {Object} options - Additional options
 * @returns {String} AI response
 */
async function staffAssistant(task, content, options = {}) {
  let systemPrompt = 'You are an AI assistant helping embassy staff with case management.';
  let userMessage = '';

  switch (task) {
    case 'summarize':
      systemPrompt += ' Provide clear, concise summaries of case histories and updates.';
      userMessage = `Please summarize the following case information:\n\n${content}`;
      break;

    case 'translate':
      const targetLang = options.targetLanguage || 'en';
      systemPrompt += ` Translate text accurately to ${targetLang}.`;
      userMessage = `Translate the following to ${targetLang}:\n\n${content}`;
      break;

    case 'analyze':
      systemPrompt += ' Analyze case details and provide insights or recommendations for embassy staff.';
      userMessage = `Analyze this case and provide insights:\n\n${content}`;
      break;

    case 'draft':
      const docType = options.documentType || 'response';
      systemPrompt += ` Help draft professional ${docType} documents for consular services.`;
      userMessage = `Draft a ${docType} based on:\n\n${content}`;
      break;

    default:
      userMessage = content;
  }

  const messages = [
    {
      role: 'user',
      content: userMessage
    }
  ];

  return await getClaudeResponse(messages, {
    systemPrompt,
    temperature: task === 'translate' ? 0.3 : 0.7,
    maxTokens: 2048
  });
}

/**
 * Detect urgency level from case description
 * @param {String} description - Case description
 * @returns {String} Urgency level (Low, Normal, High, Critical)
 */
async function detectUrgency(description) {
  const systemPrompt = `You are analyzing consular case descriptions to determine urgency level.

Classify as:
- Critical: Life-threatening emergencies, serious crimes, immediate medical needs
- High: Lost passport with imminent travel, detained persons, time-sensitive legal issues
- Normal: Standard visa questions, routine document requests, general inquiries
- Low: Information requests, non-urgent administrative matters

Respond with ONLY ONE WORD: Critical, High, Normal, or Low`;

  const messages = [
    {
      role: 'user',
      content: `Classify the urgency of this case:\n\n${description}`
    }
  ];

  try {
    const response = await getClaudeResponse(messages, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 10
    });

    const urgency = response.trim();
    const validLevels = ['Critical', 'High', 'Normal', 'Low'];

    return validLevels.includes(urgency) ? urgency : 'Normal';
  } catch (error) {
    console.error('Error detecting urgency:', error);
    return 'Normal'; // Default fallback
  }
}

/**
 * Generate case summary from updates
 * @param {Array} updates - Array of case updates
 * @returns {String} Summary
 */
async function generateCaseSummary(updates) {
  const updatesText = updates.map((u, i) =>
    `${i + 1}. [${u.created_at}] ${u.author_name}: ${u.message}`
  ).join('\n');

  return await staffAssistant('summarize', updatesText);
}

/**
 * Check if AI service is available
 * @returns {Boolean}
 */
function isAIAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

module.exports = {
  getClaudeResponse,
  citizenAssistant,
  staffAssistant,
  detectUrgency,
  generateCaseSummary,
  isAIAvailable
};
