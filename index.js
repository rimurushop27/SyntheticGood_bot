const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const BOT_TOKEN = '8618918114:AAESoFPKtD6SNKZh_ygPhO-CjD0ETAVKE8A';
const GROQ_API_KEY = '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';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store user settings (in production, use database)
const userSettings = {};

// Core system instruction (always applied)
const CORE_INSTRUCTION = `You are an expert AI prompt engineer. Your task is to analyze images and convert them into highly detailed, accurate AI image generation prompts.

ANALYSIS REQUIREMENTS:
- Examine every visible detail thoroughly
- Photo type (realistic, candid, selfie, portrait, studio shot, etc.)
- Subject: use only "woman" or "man" or "girl" or "boy" — never mention age numbers, body measurements, or explicit terms
- Hair: color, length, texture, style (wavy, straight, bun, ponytail, braided, etc.)
- Face: expression, makeup style, skin tone (neutral descriptive terms only)
- Outfit: specific style name, clothing type, color, pattern, fabric
- Accessories: jewelry, bag, hat, glasses, shoes with style and color
- Pose and body language
- Setting/background: location, environment, lighting, time of day, atmosphere
- Photography style: lens feel, depth of field, color grading, film style

STRICT RULES:
- NEVER use sensitive terms that could trigger safety filters
- NO body measurements, body part sizes, age numbers, or explicit content
- Focus on style, fashion, mood, and artistic elements
- Replace sensitive descriptors with neutral alternatives

OUTPUT FORMAT (CRITICAL):
Write as ONE flowing paragraph in this structure:
[Photo type] of [woman/man/girl/boy], ((Keep face, skin tone, body proportions exactly the same as the reference image)), [hair], [expression & makeup], [outfit with specific details], [accessories], [pose], [background & setting], [lighting & atmosphere], [photography style], [color grading]

OUTPUT ONLY THE FINAL PROMPT. No explanations, no preamble, no additional text.`;

// Get user's custom instruction
function getUserInstruction(userId) {
  return userSettings[userId]?.customInstruction || '';
}

// Set user's custom instruction
function setUserInstruction(userId, instruction) {
  if (!userSettings[userId]) {
    userSettings[userId] = {};
  }
  userSettings[userId].customInstruction = instruction;
}

// Analyze image with Groq
async function analyzeImage(imageBuffer, userId) {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
    // Combine core + custom instructions
    const customInstruction = getUserInstruction(userId);
    const fullInstruction = customInstruction 
      ? `${CORE_INSTRUCTION}\n\nADDITIONAL USER REQUIREMENTS:\n${customInstruction}`
      : CORE_INSTRUCTION;
    
    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: fullInstruction
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              },
              {
                type: 'text',
                text: 'Analyze this image and output ONLY the final prompt. No explanations.'
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Groq API error');
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `🎨 *Welcome to SyntheticGood Bot!*

I convert images into detailed AI generation prompts.

*How to use:*
📸 Send or forward any photo → I'll analyze it automatically
⚙️ /settings - Add custom instructions
🔄 /reset - Clear custom instructions
❓ /help - Show this message

*Built-in Analysis:*
✓ Detailed visual description
✓ Photography style & composition
✓ Safe, filter-friendly output
✓ Professional prompt format

Just send a photo to start! 🚀`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `❓ *Help & Commands*

*Basic Usage:*
Just send any photo! I'll automatically analyze it.

*Commands:*
/start - Welcome message
/help - This help message
/settings - View or update custom instructions
/reset - Clear custom instructions

*Custom Instructions:*
Add your own requirements like:
• Specific art style preferences
• Output language
• Extra details to include/exclude
• Format preferences

Custom instructions are added ON TOP of my core analysis system.

*Tips:*
✓ High quality photos = better prompts
✓ Clear subjects work best
✓ One photo at a time for accuracy`, { parse_mode: 'Markdown' });
});

// Command: /settings
bot.onText(/\/settings(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const newInstruction = match[1]?.trim();
  
  if (newInstruction) {
    // Set new custom instruction
    setUserInstruction(userId, newInstruction);
    bot.sendMessage(chatId, `✅ *Custom instruction saved!*

Your instruction:
"${newInstruction}"

This will be applied on top of the core analysis system.

Send a photo to test it!`, { parse_mode: 'Markdown' });
  } else {
    // Show current instruction
    const current = getUserInstruction(userId);
    if (current) {
      bot.sendMessage(chatId, `⚙️ *Your Current Custom Instruction:*

"${current}"

*To update:*
/settings <your new instruction>

*To clear:*
/reset`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `⚙️ *Custom Instructions*

You haven't set any custom instructions yet.

*To add custom instructions:*
/settings <your instruction>

*Example:*
/settings Always mention camera settings and use cinematic language

This will be added on top of the built-in analysis system.`, { parse_mode: 'Markdown' });
    }
  }
});

// Command: /reset
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userSettings[userId]?.customInstruction) {
    delete userSettings[userId].customInstruction;
    bot.sendMessage(chatId, '🔄 Custom instructions cleared! Using default system only.', { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, 'ℹ️ You don\'t have any custom instructions set.', { parse_mode: 'Markdown' });
  }
});

// Handle photos (auto-detect)
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, '🔄 *Analyzing image...*\nThis may take 5-10 seconds.', { parse_mode: 'Markdown' });
    
    // Get highest quality photo
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    // Download photo
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);
    const imageBuffer = await response.buffer();
    
    // Analyze with Groq
    const prompt = await analyzeImage(imageBuffer, userId);
    
    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
    // Send result
    await bot.sendMessage(chatId, `✨ *Generated Prompt:*

${prompt}

_Use /settings to add custom instructions_`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Photo processing error:', error);
    await bot.sendMessage(chatId, `❌ *Error:* ${error.message}\n\nPlease try again or contact support.`, { parse_mode: 'Markdown' });
  }
});

// Handle documents (images sent as files)
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const document = msg.document;
  
  // Check if it's an image
  if (!document.mime_type?.startsWith('image/')) {
    return bot.sendMessage(chatId, '⚠️ Please send images as photos, not files.');
  }
  
  try {
    const processingMsg = await bot.sendMessage(chatId, '🔄 *Analyzing image...*', { parse_mode: 'Markdown' });
    
    const fileId = document.file_id;
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);
    const imageBuffer = await response.buffer();
    
    const prompt = await analyzeImage(imageBuffer, userId);
    
    await bot.deleteMessage(chatId, processingMsg.message_id);
    await bot.sendMessage(chatId, `✨ *Generated Prompt:*

${prompt}

_Use /settings to add custom instructions_`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Document processing error:', error);
    await bot.sendMessage(chatId, `❌ *Error:* ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Bot is running...');
