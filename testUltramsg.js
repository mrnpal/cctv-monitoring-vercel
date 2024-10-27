require('dotenv').config();
const axios = require('axios');

(async () => {
    try {
        const response = await axios.post(`https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`, {
            token: process.env.ULTRAMSG_API_TOKEN,
            to: process.env.YOUR_WHATSAPP_NUMBER,
            body: 'Test message from Ultramsg API'
        });
        
        console.log('Test message sent successfully:', response.data);
    } catch (error) {
        console.error('Error in test message:', error.response ? error.response.data : error.message);
    }
})();
