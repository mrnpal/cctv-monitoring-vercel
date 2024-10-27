const twilio = require('twilio');
require('dotenv').config();

// Ambil informasi dari variabel lingkungan
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM;
const yourWhatsAppNumber = process.env.YOUR_WHATSAPP_NUMBER;

// Inisialisasi Twilio Client
const client = new twilio(accountSid, authToken);

// Fungsi untuk mengirim pesan WhatsApp
const sendWhatsAppNotification = async (ip, port) => {
    const message = `Timeout detected! IP: ${ip}, Port: ${port} is unreachable.`;
    try {
        const response = await client.messages.create({
            body: message,
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${yourWhatsAppNumber}`
        });
        console.log('WhatsApp notification sent successfully!', response.sid);
    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error.message);
    }
};

module.exports = sendWhatsAppNotification;
