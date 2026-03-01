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

// Core system instruction (always applied - BASIC VERSION)
const CORE_INSTRUCTION = `Analyze the image in extreme detail and convert it into a perfect AI image generation prompt.

ANALYZE EVERYTHING:
- Photo type, subject, hair, face, expression, outfit, accessories, pose, background, lighting, camera style

CRITICAL RULES:
- Use "woman/man/girl/boy" only, NO age numbers or body measurements
- NO sensitive or explicit terms
- Focus on style, fashion, mood, artistic elements

OUTPUT FORMAT:
Single flowing paragraph: [Photo type] of [subject], ((Keep face, skin tone, body proportions exactly the same as the reference image)), [all details]...

OUTPUT RULES - EXTREMELY IMPORTANT:
- Return ONLY the prompt text
- NO explanations, NO preamble, NO markdown, NO "Here's the prompt:", NO extra sentences
- Just the raw prompt that can be copied and pasted directly into an AI image generator
- Start directly with the photo type (e.g., "Candid photo of..." or "Professional portrait of...")`;

// Default custom instruction (empty - user can modify via /settings)
const DEFAULT_CUSTOM_INSTRUCTION = '';

// Get user's custom instruction
function getUserInstruction(userId) {
  return userSettings[userId]?.customInstruction || DEFAULT_CUSTOM_INSTRUCTION;
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
                text: 'Analyze this image and output ONLY the final prompt. No introduction, no explanation, no markdown formatting. Just the pure prompt text starting directly with the photo type.'
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

Convert images into perfect AI generation prompts.

*Quick Start:*
📸 Send any photo → Get instant prompt (ready to copy-paste)

*Commands:*
⚙️ /settings - Add your custom instructions
🔄 /reset - Clear custom instructions
❓ /help - Full guide

*How it works:*
✓ Built-in: Detailed image analysis
✓ Custom: Add your own requirements via /settings
✓ Output: 100% pure prompt, no extra text

Just send a photo! 🚀`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `❓ *Help Guide*

*Basic Usage:*
Send any photo → Bot analyzes → Sends pure prompt text (ready to copy-paste)

*Commands:*
/start - Welcome & info
/help - This guide
/settings - View/update custom instructions
/settings <text> - Set custom instruction
/reset - Clear custom instructions

*System Instructions:*

**Built-in (always active):**
- Deep image analysis
- Detail extraction
- Perfect prompt structure
- Safe output (no sensitive terms)

**Custom (you control via /settings):**
Add your own requirements like:
• "Always use cinematic language"
• "Focus on lighting and atmosphere"
• "Mention camera settings"
• "Use dramatic descriptions"

Custom instructions are ADDED to the built-in system.

*Output:*
✓ 100% prompt only
✓ No formatting, no extras
✓ Copy-paste ready for any AI image generator

*Tips:*
• Clear photos = better prompts
• One photo at a time
• Use /settings to fine-tune style`, { parse_mode: 'Markdown' });
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
