require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Telegram Bot Bilgileri
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8771105373:AAHCLCXbuhmUpCPa6EUXaGjRKIjLUURqemw';
// Senin şahsi Telegram ID'n (RawDataBot'tan aldığımız):
const CHAT_ID = '23762709';

let bot = null;
if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN);
}

const orders = {};

app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, phone, address, paymentMethod, items, total } = req.body;
        const orderId = Math.floor(100000 + Math.random() * 900000);

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' Gaziantep')}`;

        const message = 
`🚨 <b>YENİ TEKNOJET SİPARİŞİ!</b> 🚨

<b>Sipariş No:</b> #${orderId}
<b>Müşteri:</b> ${customerName}
<b>Telefon:</b> ${phone}
<b>Adres:</b> ${address}
<b>Ödeme Yöntemi:</b> ${paymentMethod}

📦 <b>Ürünler:</b>
${items.map(i => `• ${i}`).join('\n')}

💰 <b>Toplam Tutar:</b> ${total} ₺

📍 <a href="${mapsUrl}">Google Maps Konumunda Aç</a>`;

        if (bot) {
            await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
        }

        res.status(200).json({ success: true, orderId });
    } catch (error) {
        console.error("Sipariş Hatası:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TeknoJet Plus Sunucusu ${PORT} portunda aktif!`);
});
