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

// NO core instruction - user provides EVERYTHING via /settings
const CORE_INSTRUCTION = '';

// Default instruction when user hasn't set anything yet
const DEFAULT_INSTRUCTION = `Analyze this image in detail and convert it into a perfect AI image generation prompt. Focus on: photo type, subject, appearance, clothing, pose, background, lighting, and camera style. Output ONLY the prompt text, nothing else.`;

// Get user's custom instruction (or default if not set)
function getUserInstruction(userId) {
  return userSettings[userId]?.customInstruction || DEFAULT_INSTRUCTION;
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
    
    // Use ONLY user's instruction (no core instruction)
    const userInstruction = getUserInstruction(userId);
    
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
            content: userInstruction
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
                text: 'Follow the system instruction exactly. Output only the final result with no additional text.'
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Groq API error');
    }

    const result = await response.json();
    let prompt = result.choices[0].message.content.trim();
    
    // Clean up any potential formatting artifacts
    prompt = prompt
      .replace(/^["']|["']$/g, '') // Remove quotes at start/end
      .replace(/^Here's the prompt:?\s*/i, '') // Remove "Here's the prompt:"
      .replace(/^Prompt:?\s*/i, '') // Remove "Prompt:"
      .replace(/^\*\*.*?\*\*:?\s*/i, '') // Remove markdown headers
      .trim();
    
    return prompt;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `🎨 *SyntheticGood Bot*

Convert images to AI prompts with YOUR custom instructions.

*Quick Start:*
📸 Send photo → Get prompt

*Control Everything:*
⚙️ /settings - Set YOUR system instruction
🔄 /reset - Back to default
❓ /help - Full guide

*How it works:*
You control 100% of the prompt generation by setting your own instruction via /settings.

Default instruction is basic. Customize it for best results!

Send a photo or use /settings first! 🚀`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `❓ *Help Guide*

*Basic Usage:*
Send photo → Bot uses your instruction → Sends result

*Commands:*
/start - Welcome
/help - This guide
/settings - View/set your instruction
/settings <text> - Set new instruction
/reset - Back to default

*System Instruction:*

YOU control everything via /settings.

**Default (if you don't set custom):**
Basic instruction for simple prompt generation.

**Custom (recommended):**
Set your own complete instruction for full control.

*Example custom instruction:*
\`\`\`
Analyze the image in detail. Create a perfect AI image generation prompt. Include: photo type, subject (use woman/man/girl/boy only, no ages), hair, face, outfit, accessories, pose, background, lighting, camera style. Format as one flowing paragraph. Start with photo type. Add: ((Keep face, skin tone, body proportions exactly the same as reference image)) after subject. Output ONLY the prompt, no explanations.
\`\`\`

*Set it with:*
/settings <paste your instruction>

*Output:*
✓ 100% based on YOUR instruction
✓ Copy-paste ready
✓ No formatting, pure text`, { parse_mode: 'Markdown' });
});

// Command: /settings
bot.onText(/\/settings(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const newInstruction = match[1]?.trim();
  
  if (newInstruction) {
    // Set new instruction
    setUserInstruction(userId, newInstruction);
    bot.sendMessage(chatId, `✅ *System instruction updated!*

Your instruction:
"${newInstruction}"

This is now the ONLY instruction the bot will use for analyzing your images.

Send a photo to test it!`, { parse_mode: 'Markdown' });
  } else {
    // Show current instruction
    const current = getUserInstruction(userId);
    const isDefault = !userSettings[userId]?.customInstruction;
    
    if (isDefault) {
      bot.sendMessage(chatId, `⚙️ *System Instruction (Default)*

Current instruction:
"${current}"

This is the default basic instruction.

*To set your own instruction:*
/settings <your full instruction here>

*Example:*
/settings Analyze the image and create a detailed prompt. Focus on: photo type, subject (use woman/man/girl/boy only), appearance, outfit, pose, background, lighting, camera style. Format as one paragraph starting with photo type. Output ONLY the prompt, no extra text.

Your custom instruction will COMPLETELY REPLACE the default.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `⚙️ *Your Current System Instruction:*

"${current}"

*To update:*
/settings <your new instruction>

*To reset to default:*
/reset`, { parse_mode: 'Markdown' });
    }
  }
});

// Command: /reset
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userSettings[userId]?.customInstruction) {
    delete userSettings[userId].customInstruction;
    bot.sendMessage(chatId, `🔄 *Reset to default instruction!*

Now using: "${DEFAULT_INSTRUCTION}"

You can set your own instruction anytime with:
/settings <your instruction>`, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `ℹ️ Already using default instruction.

Current: "${DEFAULT_INSTRUCTION}"`, { parse_mode: 'Markdown' });
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
    
    // Send result - CLEAN PROMPT ONLY, NO MARKDOWN, NO FORMATTING
    await bot.sendMessage(chatId, prompt);
    
  } catch (error) {
    console.error('Photo processing error:', error);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}\n\nPlease try again.`, { parse_mode: 'Markdown' });
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
    await bot.sendMessage(chatId, prompt);
    
  } catch (error) {
    console.error('Document processing error:', error);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Bot is running...');
