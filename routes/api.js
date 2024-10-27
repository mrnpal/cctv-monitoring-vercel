const express = require('express');
const router = express.Router();
const dbClient = require('../config/db');
const { pingAllIPs } = require('../services/pingService');

router.get('/ping-status', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT ip_address, port, status, last_checked, location FROM ip_port_monitor');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint untuk melakukan ping manual (optional)
router.get('/ping', async (req, res) => {
    try {
        await pingAllIPs();
        res.send('Ping executed');
    } catch (error) {
        console.error('Error during pinging IPs:', error);
        res.status(500).send('Error executing ping');
    }
});
module.exports = router;
