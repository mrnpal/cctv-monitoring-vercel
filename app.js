require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const ping = require('ping');
const cron = require('node-cron');
const expressWs = require('express-ws');

const app = express();
expressWs(app); 

app.use(express.static('public'));

// Database configuration
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

const connectWithRetry = async () => {
    let retries = 5; // Coba 5 kali
    while (retries) {
      try {
        await dbClient.connect(); // Coba koneksi ke database
        console.log('Connected to the database!');
        break; // Koneksi sukses, keluar dari loop
      } catch (err) {
        console.log(`Connection to database failed. Retrying in 5 seconds... (${retries} attempts left)`);
        retries -= 1;
        await new Promise(res => setTimeout(res, 5000)); // Tunggu 5 detik sebelum mencoba lagi
      }
    }
  };
  
  connectWithRetry();
  
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

// Ping function with reduced timeout
const pingIPAndPort = async (ip, port) => {
    const res = await ping.promise.probe(ip, { timeout: 5 }); // Reduced timeout to 5 seconds
    return res.alive;
};

// Variable to control overlapping cron executions
let isRunning = false;

// Ping all IPs and Ports from the database in parallel
const pingAllIPs = async () => {
    if (isRunning) {
        console.log("Ping process already running, skipping this execution.");
        return;
    }
    
    isRunning = true;
    try {
        console.time('PingAllIPs'); // Start timer for debugging
        const res = await dbClient.query('SELECT * FROM ip_port_monitor');
        const now = new Date();

        const pingPromises = res.rows.map(async (row) => {
            const { id, ip_address, port, last_status } = row;
            const isAlive = await pingIPAndPort(ip_address, port);

            let status = isAlive ? 'connected' : 'timeout';

            if (status !== last_status) {
                // Update status in the database
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
        });

        // Wait for all pings to complete
        await Promise.all(pingPromises);
        console.timeEnd('PingAllIPs'); // End timer for debugging
    } catch (error) {
        console.error('Error during ping:', error);
    } finally {
        isRunning = false; // Allow the next cron job to run
    }
};

// Endpoint to get IP and status data from the database
app.get('/api/ping-status', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT ip_address, port, status, last_checked, location FROM ip_port_monitor');
        res.json(result.rows); // Return the data as JSON
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Schedule the ping to run every minute
cron.schedule('* * * * *', pingAllIPs);

// Add timeout for all routes to prevent long-running requests
app.use((req, res, next) => {
    res.setTimeout(20000); // Set timeout to 20 seconds
    next();
});

// Start server
// Uncomment this section if running locally, Vercel handles this in production
// const PORT = process.env.PORT || 8081;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// Export the app for Vercel
module.exports = app;
