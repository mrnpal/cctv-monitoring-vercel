require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const ping = require('ping');
const cron = require('node-cron');
const expressWs = require('express-ws');

const app = express();
expressWs(app); 

app.use(express.static('public'));

// database
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
            // Update status in database
            await dbClient.query(
                'UPDATE ip_port_monitor SET status = $1, last_checked = $2, last_status = $3 WHERE id = $4',
                [status, now, status, id]
            );

            // Broadcast update to WebSocket clients
            app.ws.getWss().clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({ ip: ip_address, port, status }));
                }
            });
        }
    }
};

// Endpoint untuk mendapatkan data IP dan status dari database
app.get('/api/ping-status', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT ip_address, port, status, last_checked, location FROM ip_port_monitor');
        res.json(result.rows); // Mengembalikan data dalam format JSON
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Schedule the ping every minute
cron.schedule('* * * * *', pingAllIPs);

// Start server
// const PORT = process.env.PORT || 8081; 
// const server = app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

app.use((req, res, next) => {
    res.setTimeout(20000); // Set timeout ke 20 detik
    next();
  });
  

module.exports = app;
