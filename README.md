# SyntheticGood Telegram Bot

Bot Telegram untuk convert image ke AI prompt menggunakan Groq API.

## ✨ Features

- 🤖 **Auto-detect foto** - Kirim foto langsung diproses
- 🎯 **System instruction built-in** - Analisis detail otomatis
- ⚙️ **Custom instructions** - Tambah requirement sendiri via `/settings`
- 🚀 **Fast response** - Powered by Groq LPU
- 💾 **User preferences** - Setting tersimpan per user

## 📋 Commands

- `/start` - Welcome message
- `/help` - Bantuan & info
- `/settings` - Lihat/ubah custom instruction
- `/settings <text>` - Set custom instruction baru
- `/reset` - Hapus custom instruction

## 🚀 Cara Deploy

### Option 1: Railway (Recommended - Paling Gampang)

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login Railway:**
```bash
railway login
```

3. **Deploy:**
```bash
cd telegram-bot
railway init
railway up
```

4. **Done!** Bot langsung jalan 24/7 gratis.

---

### Option 2: Vercel (Serverless)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Buat file `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

3. **Deploy:**
```bash
cd telegram-bot
vercel --prod
```

---

### Option 3: Cloudflare Workers

1. **Install Wrangler:**
```bash
npm install -g wrangler
```

2. **Setup:**
```bash
wrangler init
```

3. **Deploy:**
```bash
wrangler deploy
```

---

### Option 4: Lokal (Testing)

```bash
cd telegram-bot
npm install
npm start
```

**Note:** Untuk production, JANGAN jalankan lokal. Pakai Railway/Vercel.

---

## 🔑 Environment Variables

Kalau deploy ke platform yang support env vars (Railway, Vercel):

```env
BOT_TOKEN=8618918114:AAESoFPKtD6SNKZh_ygPhO-CjD0ETAVKE8A
GROQ_API_KEY=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
```

Tapi karena udah hardcoded di `index.js`, gak wajib set env vars.

---

## 📝 Cara Pakai

1. **Deploy bot** (pilih salah satu option di atas)
2. **Buka bot** di Telegram: `@your_bot_username`
3. **Kirim foto** → Bot langsung analyze
4. **Custom instruction** (optional):
   ```
   /settings Always use cinematic language and mention lighting details
   ```
5. **Done!** Bot siap dipakai.

---

## 🛠️ Troubleshooting

**Bot gak respon:**
- Cek apakah bot sudah jalan (Railway/Vercel dashboard)
- Cek logs untuk error

**"Groq API error":**
- Cek API key masih valid
- Cek quota belum habis (14k/hari)

**Foto gak ke-detect:**
- Pastikan kirim sebagai foto, bukan file/document
- Telegram compress foto, kualitas tetap cukup bagus

---

## 📊 Tech Stack

- **Bot Framework:** node-telegram-bot-api
- **AI Provider:** Groq (Llama 4 Scout Vision)
- **Deployment:** Railway / Vercel / Cloudflare
- **Storage:** In-memory (production pakai Redis/Database)

---

## 🔒 Security Notes

- API keys sudah hardcoded (untuk simplicity)
- Untuk production serius, pindahin ke environment variables
- User settings currently in-memory (hilang saat restart)
- Untuk scale, pakai database (MongoDB, Redis, Supabase)

---

## 📈 Limits

- **Groq Free Tier:** 14,400 requests/day
- **Bot Response Time:** 5-10 seconds per image
- **Image Quality:** Telegram auto-compress (masih bagus)

---

## 💡 Tips

- Foto berkualitas tinggi = prompt lebih akurat
- Subjek yang jelas = hasil lebih detail
- Custom instruction untuk fine-tune output style

---

**Support:** Kalau ada masalah, cek logs atau contact admin.
