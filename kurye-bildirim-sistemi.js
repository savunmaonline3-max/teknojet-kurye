require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Telegram ve Green-API Sabit Bilgileri
const BOT_TOKEN = '8771105373:AAHCLCXbuhmUpCPa6EUXaGjRKIjLUURqemw';
const CHAT_ID = '-1003900873538';
const GREEN_ID_INSTANCE = '710722747828';
const GREEN_API_TOKEN = 'ce58288d5c364e0e834dfd39e5fe731320d3ef2712a3402e86';

let bot = null;
if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN);
}

// Müşteriye Otomatik WhatsApp Mesajı Gönderme
async function sendWhatsAppNotification(phone, customerName, orderId, total, serviceType, distanceKm) {
    try {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '90' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('90')) {
            cleanPhone = '90' + cleanPhone;
        }

        const waUrl = `https://7107.api.greenapi.com/waInstance${GREEN_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`;
        
        const waMessage = 
`🚀 *TEKNOJET PLUS | KURYE SİPARİŞİNİZ ALINDI!*

Merhaba *${customerName}*,

*#TJ-${orderId}* numaralı kurumsal kurye talebiniz başarıyla oluşturulmuştur. ⚡️

📋 *Gönderi Tipi:* ${serviceType}
📍 *Mesafe:* Tahmini ${distanceKm} KM
💰 *Hesaplanan Tutar:* ${total} TL
🛵 *Durum:* Kuryemiz adresinize yönlendirildi!

Gaziantep içi ışık hızında ve güvenli teslimat garantisiyle en kısa sürede adresinizde olacağız.

_Canlı Destek & İletişim: 0507 518 8663_`;

        await fetch(waUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: `${cleanPhone}@c.us`,
                message: waMessage
            })
        });

        console.log(`WhatsApp bildirimi gönderildi: ${cleanPhone}`);
    } catch (err) {
        console.error("WhatsApp Gönderim Hatası:", err.message);
    }
}

app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, phone, pickupAddress, deliveryAddress, serviceType, distanceKm, paymentMethod, note, total } = req.body;
        const orderId = Math.floor(100000 + Math.random() * 900000);
        
        const pickupMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress + ' Gaziantep')}`;
        const deliveryMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress + ' Gaziantep')}`;
        
        let cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '90' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('90')) {
            cleanPhone = '90' + cleanPhone;
        }
        const waContactUrl = `https://wa.me/${cleanPhone}`;

        // 1. TELEGRAM KURYE KANAL BİLDİRİMİ (Kurumsal Detaylı Format)
        const telegramMessage = 
`⚡️ <b>TEKNOJET PLUS | YENİ KURYE TALEBİ</b>
➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖

🆔 <b>SİPARİŞ NO:</b> <code>#TJ-${orderId}</code>
⏰ <b>TARİH/SAAT:</b> <code>${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</code>

👤 <b>MÜŞTERİ BİLGİLERİ</b>
• <b>Ad Soyad:</b> <code>${customerName}</code>
• <b>Telefon:</b> <code>${phone}</code>
• <b>Gönderi Tipi:</b> <code>${serviceType}</code>
• <b>Ödeme Tipi:</b> <code>${paymentMethod}</code>

📦 <b>GÖNDERİ VE MESAFE DETAYI</b>
• <b>Tahmini Mesafe:</b> <code>${distanceKm} KM</code>
• <b>Özel Not:</b> <code>${note || 'Yok'}</code>

🛫 <b>ALIM ADRESİ (Çıkış):</b>
<code>${pickupAddress} / Gaziantep</code>

🛬 <b>TESLİMAT ADRESİ (Varış):</b>
<code>${deliveryAddress} / Gaziantep</code>

💰 <b>TOPLAM TUTAR:</b> <b>${total} TL</b>
➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖
<i>Sipariş kurye operasyon paneline aktarılmıştır.</i>`;

        if (bot) {
            await bot.sendMessage(CHAT_ID, telegramMessage, { 
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📍 Alım Adresi Konumu", url: pickupMaps },
                            { text: "📍 Teslimat Konumu", url: deliveryMaps }
                        ],
                        [
                            { text: "💬 Müşteri WhatsApp İletişim", url: waContactUrl }
                        ]
                    ]
                }
            });
        }

        // 2. OTOMATİK WHATSAPP MESAJI
        sendWhatsAppNotification(phone, customerName, orderId, total, serviceType, distanceKm);

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
