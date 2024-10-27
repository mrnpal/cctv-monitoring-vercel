const ping = require('ping');
const dbClient = require('../config/db');
const { sendWhatsAppNotification } = require('../controllers/notification');

const pingIPAndPort = async (ip) => {
    const res = await ping.promise.probe(ip, { timeout: 10 });
    return res.alive;
};

const pingAllIPs = async () => {
    console.log('Starting to ping all IPs...');
    const res = await dbClient.query('SELECT * FROM ip_port_monitor');
    const now = new Date();

    for (const row of res.rows) {
        const { id, ip_address, port, last_status } = row;
        const isAlive = await ping.promise.probe(ip_address, { timeout: 10 });

        let status = isAlive.alive ? 'connected' : 'timeout';

        if (status !== last_status) {
            await dbClient.query(
                'UPDATE ip_port_monitor SET status = $1, last_checked = $2, last_status = $3 WHERE id = $4',
                [status, now, status, id]
            );

            console.log(`Status updated for IP: ${ip_address}, Port: ${port}, Status: ${status}`);

            // Kirim notifikasi jika statusnya 'timeout'
            if (status === 'timeout') {
                console.log(`Sending notification for IP: ${ip_address}, Port: ${port}`);
                await sendWhatsAppNotification(ip_address, port);
            }
        }
    }
};

module.exports = { pingAllIPs };
