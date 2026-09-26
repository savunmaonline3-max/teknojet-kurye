require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Render Environment Variables'dan bilgileri alıyoruz
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Telegram Bot Başlatma (Polling opsiyonu)
let bot = null;
if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
} else {
    console.error("HATA: TELEGRAM_BOT_TOKEN tanımlanmamış!");
}

// Siparişleri bellekte tutma
const orders = {};

// Yeni Sipariş Bildirimi Fonksiyonu
async function notifyCourierOfNewOrder(order) {
    const { orderId, customerName, phone, address, paymentMethod, items, total } = order;

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

    if (bot && CHAT_ID) {
        await bot.sendMessage(CHAT_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚀 Siparişi Üstlendim', callback_data: `accept_${orderId}` }],
                    [{ text: '✅ Teslim Edildi', callback_data: `complete_${orderId}` }]
                ]
            }
        });
    } else {
        throw new Error("Bot veya Chat ID eksik!");
    }
}

// Telegram Buton Tıklamalarını Dinleme (Üstlendim / Teslim Edildi)
if (bot) {
    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        if (data.startsWith('accept_')) {
            const orderId = data.split('_')[1];
            if (orders[orderId]) orders[orderId].status = 'Kurye Yolda';
            
            await bot.answerCallbackQuery(query.id, { text: 'Siparişi üstlendiniz!' });
            await bot.editMessageText(query.message.text + '\n\n🟡 <b>DURUM: Kurye Yolda!</b>', {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: '✅ Teslim Edildi Yap', callback_data: `complete_${orderId}` }]]
                }
            });
        } else if (data.startsWith('complete_')) {
            const orderId = data.split('_')[1];
            if (orders[orderId]) orders[orderId].status = 'Teslim Edildi';

            await bot.answerCallbackQuery(query.id, { text: 'Sipariş tamamlandı!' });
            await bot.editMessageText(query.message.text + '\n\n🟢 <b>DURUM: Teslim Edildi!</b>', {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
        }
    });
}

// POST Endpoint: Siteden gelen siparişi yakalar
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, phone, address, paymentMethod, items, total } = req.body;
        const orderId = Math.floor(100000 + Math.random() * 900000);

        const newOrder = {
            orderId, customerName, phone, address, paymentMethod, items, total,
            status: 'Hazırlanıyor',
            createdAt: new Date()
        };

        orders[orderId] = newOrder;

        // Telegram bildirimi gönder
        await notifyCourierOfNewOrder(newOrder);

        res.status(200).json({ success: true, orderId });
    } catch (error) {
        console.error("Sipariş Hatanın Detayı:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TeknoJet Plus Sunucusu ${PORT} portunda aktif!`);
});
