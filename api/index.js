require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const ping = require('ping');
const cron = require('node-cron');
const expressWs = require('express-ws');
const axios = require('axios');

const app = express();
expressWs(app); 

app.use(express.static('public'));

// Database connection
const dbClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});
dbClient.connect();

// WebSocket route
app.ws('/realtime', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (msg) => {
        console.log(`Received message: ${msg}`);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Ultramsg WhatsApp Notification
const sendWhatsAppNotification = async (ip, port) => {
    const message = `Timeout detected! IP: ${ip}, Port: ${port} is unreachable.`;
    try {
        await axios.post(`https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`, {
            token: process.env.ULTRAMSG_API_TOKEN,
            to: process.env.YOUR_WHATSAPP_NUMBER,
            body: message
        });
        console.log('WhatsApp notification sent via Ultramsg');
    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
    }
};

// Ping function
const pingIPAndPort = async (ip, port) => {
    const res = await ping.promise.probe(ip, { timeout: 10 });
    return res.alive;
};

// Ping all IPs and Ports from DB
const pingAllIPs = async () => {
    const res = await dbClient.query('SELECT * FROM ip_port_monitor');
    const now = new Date();

    for (const row of res.rows) {
        const { id, ip_address, port, last_status } = row;
        const isAlive = await pingIPAndPort(ip_address, port);

        let status = isAlive ? 'connected' : 'timeout';

        if (status !== last_status) {
            await dbClient.query(
                'UPDATE ip_port_monitor SET status = $1, last_checked = $2, last_status = $3 WHERE id = $4',
                [status, now, status, id]
            );

            app.ws.getWss().clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({ ip: ip_address, port, status }));
                }
            });

            // Send WhatsApp notification if status is 'timeout'
            if (status === 'timeout') {
                await sendWhatsAppNotification(ip_address, port);
            }
        }
    }
};

// Endpoint untuk mendapatkan data IP dan status dari database
app.get('/api/ping-status', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT ip_address, port, status, last_checked, location FROM ip_port_monitor');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Schedule ping every 1 minute
cron.schedule('* * * * *', pingAllIPs);

// Start server
const PORT = process.env.PORT || 8081; 
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
