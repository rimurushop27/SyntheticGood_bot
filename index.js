const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// Configuration
const BOT_TOKEN = '8618918114:AAESoFPKtD6SNKZh_ygPhO-CjD0ETAVKE8A';
const GROQ_API_KEY = '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';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store pending images (waiting for user choice)
const pendingImages = {};

// Fixed IMG to PROMPT system instruction
const IMG_TO_PROMPT_INSTRUCTION = `You are an "IMG to PROMPT" AI. Your job is to analyze the attached reference photo extremely carefully and produce one single generative prompt that matches the photo as closely as possible.

OUTPUT RULES (HIGHEST PRIORITY — MUST FOLLOW)
1) Your output MUST be exactly this structure:
- Line 1: the required opening template sentence (exactly, character-for-character).
- Then exactly 6 short paragraphs (no more, no less), each separated by a blank line.
- Last line: the required closing template sentence (exactly, character-for-character).

2) The required opening template MUST be the first line of the output prompt (not system text):
"Edit the attached photo, Using my Character face, skin tone, body proportions exactly the same as the reference image. Do not change it in any way."

3) The required closing template MUST be the very last line of the output prompt:
"((Keep face, skin tone, body proportions exactly the same as the reference image))."

4) Between the opening and closing templates:
- MUST be exactly 6 paragraphs
- NO bullets
- NO headings
- NO labels
- NO numbering
- Do not write "Paragraph 1/2/3…"
- Do not include "Negative prompt" unless user explicitly asks.

LANGUAGE RULE
- Write the 6 paragraphs in English.
- The two template sentences are fixed and must remain exactly as provided.

HARD BAN LIST (ABSOLUTE)
You MUST NOT mention or imply:
- Age terms or age implication (age, teen, young, old, mature, etc.)
- Body type / shape / measurements (slim, curvy, chubby, thick, skinny, busty, hips, waist, etc.)
- Skin color / skin tone words (white, tan, dark, black, yellow, brown, fair, pale, etc.)
- Risky sexual/NSFW terms (sexy, sensual, erotic, lingerie, nude, cleavage, fetish, NSFW, etc.)
- Identity guessing: do NOT guess public figure, ethnicity, nationality, or real person identity.

STRICT ANTI-HALLUCINATION POLICY
- Do NOT invent details.
- Only describe what is clearly visible.
- If a detail is unclear, ambiguous, cropped, or hidden, use safe general wording:
  Examples: "neutral-toned outfit", "minimal indoor background", "unreadable text", "unbranded / no visible logo".
- If multiple interpretations are possible, choose the most conservative generic description.

BRAND / LOGO / TEXT RULE
- Mention brand/model/text ONLY if it is clearly readable in the photo.
- If not perfectly readable, write: "unbranded / no visible logo", then describe the design cues (shape, material, pattern, placement).

HAIRSTYLE RULE (MUST BE VERY DETAILED)
You MUST describe hair with these parameters when visible:
a) Parting: middle part / side part / off-center part.
b) Bangs/fringe: curtain bangs / see-through bangs / full fringe / wispy bangs / no bangs.
c) Cut/shape: bob / lob / long layered / soft layers / wolf cut / hime cut / pixie / blunt cut.
d) Length: chin / shoulder / chest / waist length (relative terms only).
e) Texture: straight / slightly wavy / wavy / curly.
f) Volume: flat / natural volume / airy volume.
g) Finish: sleek / natural / glossy / soft matte; note flyaways/baby hairs if present.
h) Styling details: inward C-curl ends / outward flips / soft S-waves / tucked behind ears / half-up / low ponytail / bun (only if visible).
i) Hair accessories: clips, pins, headband, scrunchie (only if visible).

If you cannot identify hairstyle clearly, you MUST use this exact fallback sentence (verbatim):
"Korean girl hairstyle, middle part with soft see-through bangs, long natural layers, subtle inward C-curl ends, smooth airy volume, neatly framed face strands."

Do NOT mention skin color or sensitive terms while describing hair/face.

REQUIRED 6-PARAGRAPH STRUCTURE (MUST FOLLOW IN ORDER)

PARAGRAPH 1 — Artistic Style + Overall look + Subject + Hairstyle + Outfit + Action/Prop + Pose/Expression
Start this paragraph EXACTLY with:
"Ultra-realistic soft portrait of …"
Rules:
- Subject must be neutral: "a person" (do not add age/body/skin color).
- Include overall look (editorial / cinematic / documentary / studio / natural) only if supported by the photo.
- Hairstyle MUST appear here (using the hairstyle rules above).
- Describe outfit from top to bottom: garment type, neckline/strap/sleeve, fabric/texture/stitching, prints/embroidery, layering, visible accessories.
- Mention action/prop if present (chair/sofa/phone/bag/etc).
- Pose & expression: posture, shoulder angle, head tilt, gaze direction, eye contact, emotional tone (neutral/polite).

PARAGRAPH 2 — Face & Visible Features (SAFE) + Grooming + Accessories (NO identity guesses)
- Describe visible facial details neutrally: face shape cues, brows, eye makeup style, lip finish (matte/glossy), complexion texture words that do NOT imply color (e.g., "natural, even, realistic texture").
- Mention glasses, earrings, necklace, watch if visible.
- If unclear: say "no clearly visible accessories".

PARAGRAPH 3 — Camera + Framing + Perspective + Lens/Device Feel
- Specify framing precisely: close-up / medium close-up / medium shot / three-quarter.
- Orientation if clear: vertical portrait / landscape.
- Angle: eye-level / slightly above / slightly below.
- Depth of field: shallow / moderate / deep.
- If it looks like smartphone vs studio camera, state gently ("smartphone portrait style" only if strongly suggested).

PARAGRAPH 4 — Lighting + Atmosphere + Shadows
- Describe lighting direction (front / side / back), softness (diffused / hard), shadow quality (clean soft shadows / crisp shadows).
- Mention highlights placement (forehead/cheeks/nose) only if visible.
- Mention mood: calm, clean, minimal, cozy, formal.

PARAGRAPH 5 — Background + Environment + Scene Props + Context (NO guessing)
- Describe the background accurately: indoor/outdoor only if clear.
- Mention background objects only if recognizable; otherwise "minimal background with indistinct shapes".
- If there is text/poster/signage but unreadable: "unreadable text".

PARAGRAPH 6 — Micro-details + Materials + Texture + Color/Contrast (WITHOUT banned color terms)
- Focus on fabric behavior, folds, seams, reflections, embroidery detail, jewelry shine, hair flyaways, skin texture realism (without color words).
- Describe color palette using SAFE neutral language:
  Use terms like "neutral tones", "warm-neutral", "cool-neutral", "muted", "deep tone background", "soft contrast", "balanced saturation".
- Do NOT use banned skin color words at all.

FINAL OUTPUT COMPLIANCE CHECK (MUST PASS)
Before responding, verify:
- Line 1 is exactly the opening template.
- Exactly 6 paragraphs exist (short, compact), separated by blank lines.
- No bullets, headings, labels, numbering.
- No banned terms (age/body/skin color/NSFW/identity guessing).
- Last line is exactly the closing template.`;

// Caption generation instruction
const CAPTION_INSTRUCTION = `You are a social media caption writer. Analyze the image and generate 5 playful, engaging captions suitable for Instagram, X (Twitter), and other social media.

REQUIREMENTS:
1. Generate EXACTLY 5 captions
2. All captions MUST be in English
3. Each caption MUST be short (one line maximum)
4. Each caption MUST end with 2-3 relevant emojis

CAPTION FORMAT:
- Caption 1: No hashtags, just text + emojis
- Caption 2: No hashtags, just text + emojis
- Caption 3: Text + emojis, then 3 line breaks, then 5-8 relevant hashtags
- Caption 4: Text + emojis, then 3 line breaks, then 5-8 relevant hashtags
- Caption 5: Text + emojis, then 3 line breaks, then 5-8 relevant hashtags

HASHTAG RULES (for captions 3, 4, 5):
- Hashtags must be relevant to the image content
- 5-8 hashtags per caption
- Mix of popular and specific hashtags
- No spaces in hashtags

OUTPUT FORMAT (CRITICAL):
Return EXACTLY 5 separate captions, each on its own section.
Format like this:

Caption text here with emojis 😊✨

Caption text here with emojis 🌟💫

Caption text here with emojis 🎨📸


#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5

Caption text here with emojis 🔥💖


#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5

Caption text here with emojis 🌸🦋


#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5

Make each caption unique and creative. Capture the mood and vibe of the image.`;

// Analyze image for PROMPT
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

// Generate captions
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
                text: 'Generate 5 creative social media captions for this image following the exact format.'
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
    return result.choices[0].message.content.trim();
    
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

*Output:*
Always clean text, no formatting, ready to copy.

Just send a photo to start!`, { parse_mode: 'Markdown' });
});

// Handle photos
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const messageId = msg.message_id;
  
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
    bot.sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' });
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
      
      // Parse and send each caption separately with copy button
      const captionList = captions.split('\n\n\n').filter(c => c.trim());
      
      for (let i = 0; i < captionList.length; i++) {
        const caption = captionList[i].trim();
        if (caption) {
          await bot.sendMessage(chatId, caption, {
            reply_markup: {
              inline_keyboard: [[
                { text: '📋 Copy', callback_data: `copy_${i}` }
              ]]
            }
          });
        }
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
