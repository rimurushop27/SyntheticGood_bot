const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const { IMG_TO_PROMPT_INSTRUCTION, CAPTION_INSTRUCTION } = require('./config');

// Configuration
const BOT_TOKEN = '8618918114:AAESoFPKtD6SNKZh_ygPhO-CjD0ETAVKE8A';
const GROQ_API_KEY = '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';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store pending images (waiting for user choice)
const pendingImages = {};

// Generate prompt from image
async function generatePrompt(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
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
            content: IMG_TO_PROMPT_INSTRUCTION
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
                text: 'Analyze this image and generate the prompt following the exact structure. Output only the final prompt with no additional text.'
              }
            ]
          }
        ],
        max_tokens: 2000,
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
    console.error('Prompt generation error:', error);
    throw error;
  }
}

// Generate captions from image
async function generateCaptions(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
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
            content: CAPTION_INSTRUCTION
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
                text: 'Generate 5 creative social media captions for this image. Use ---CAPTION_SEPARATOR--- between each caption.'
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.9
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Groq API error');
    }

    const result = await response.json();
    const rawOutput = result.choices[0].message.content.trim();
    
    // Split by separator
    const captions = rawOutput.split('---CAPTION_SEPARATOR---').map(c => c.trim()).filter(c => c);
    
    return captions;
    
  } catch (error) {
    console.error('Caption generation error:', error);
    throw error;
  }
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🎨 *SyntheticGood Bot*

Two powerful features:
📝 IMG to PROMPT - Generate detailed AI prompts
✨ CAPTION - Get 5 social media captions

*How to use:*
Send any photo → Choose what you need

Simple as that! 🚀`, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `❓ *Help Guide*

*Usage:*
1. Send a photo
2. Choose: PROMPT or CAPTION
3. Get clean output (copy-paste ready)

*PROMPT Feature:*
Generates ultra-detailed AI image generation prompts with strict formatting and safety rules.

*CAPTION Feature:*
Creates 5 playful social media captions:
- 2 without hashtags
- 3 with relevant hashtags
- Each caption sent separately with copy button

*Output:*
Always clean text, no formatting, ready to copy.

Just send a photo to start!`, { parse_mode: 'Markdown' });
});

// Handle photos
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Get highest quality photo
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    // Download photo
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);
    const imageBuffer = await response.buffer();
    
    // Store image for later processing
    pendingImages[userId] = {
      buffer: imageBuffer,
      timestamp: Date.now()
    };
    
    // Send choice buttons
    bot.sendMessage(chatId, '📸 *Choose output type:*', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📝 PROMPT', callback_data: 'generate_prompt' },
            { text: '✨ CAPTION', callback_data: 'generate_caption' }
          ]
        ]
      }
    });
    
  } catch (error) {
    console.error('Photo handling error:', error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Handle button callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  // Answer callback to remove loading state
  bot.answerCallbackQuery(query.id);
  
  // Check if image exists
  if (!pendingImages[userId]) {
    return bot.sendMessage(chatId, '⚠️ Image expired. Please send a new photo.');
  }
  
  const imageBuffer = pendingImages[userId].buffer;
  
  try {
    // Delete the choice message
    bot.deleteMessage(chatId, query.message.message_id);
    
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, '🔄 Processing... (10-15 seconds)');
    
    if (data === 'generate_prompt') {
      // Generate PROMPT
      const prompt = await generatePrompt(imageBuffer);
      await bot.deleteMessage(chatId, processingMsg.message_id);
      await bot.sendMessage(chatId, prompt);
      
    } else if (data === 'generate_caption') {
      // Generate CAPTIONS
      const captions = await generateCaptions(imageBuffer);
      await bot.deleteMessage(chatId, processingMsg.message_id);
      
      // Send each caption separately
      for (let i = 0; i < Math.min(captions.length, 5); i++) {
        await bot.sendMessage(chatId, captions[i]);
        // Small delay to ensure order
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Clean up stored image
    delete pendingImages[userId];
    
  } catch (error) {
    console.error('Processing error:', error);
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    delete pendingImages[userId];
  }
});

// Handle documents (images sent as files)
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const document = msg.document;
  
  if (!document.mime_type?.startsWith('image/')) {
    return bot.sendMessage(chatId, '⚠️ Please send images as photos, not files.');
  }
  
  bot.sendMessage(chatId, '💡 Tip: Send images as photos (not files) for better results.');
});

// Clean up old pending images every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(pendingImages).forEach(userId => {
    if (now - pendingImages[userId].timestamp > 300000) { // 5 minutes
      delete pendingImages[userId];
    }
  });
}, 300000);

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ SyntheticGood Bot is running...');
