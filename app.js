require('dotenv').config();
const express = require('express');
const expressWs = require('express-ws');
const cron = require('node-cron');
const apiRoutes = require('./routes/api');
const { pingAllIPs } = require('./services/pingService');

const app = express();
expressWs(app); 

app.use(express.static('public'));
app.use('/api', apiRoutes);

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

// Schedule ping every 1 minute
cron.schedule('* * * * *', async () => {
    console.log('Running scheduled ping to all IPs');
    await pingAllIPs();
});

// Start server
const PORT = process.env.PORT || 8081; 
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
