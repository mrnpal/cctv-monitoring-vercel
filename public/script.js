const ws = new WebSocket('ws://localhost:8087/realtime');
const ipTableBody = document.querySelector('#ipTable tbody');

// Fungsi untuk menambahkan atau memperbarui baris di tabel
function updateRow(ip, port, status, lastChecked, location) {
    // Cek apakah baris sudah ada
    const existingRow = Array.from(ipTableBody.rows).find(row => {
        return row.cells[0].textContent === ip && row.cells[1].textContent == port;
    });

    if (existingRow) {
        // Jika sudah ada, perbarui status dan waktu terakhir diperiksa
        existingRow.cells[2].textContent = status;
        existingRow.cells[3].textContent = lastChecked;
        existingRow.cells[4].textContent = location;
        // Update kelas status
        existingRow.cells[2].className = status === 'connected' ? 'connected' : 'timeout';
    } else {
        // Jika belum ada, tambahkan baris baru
        addRow(ip, port, status, lastChecked, location);
    }
}

// Fungsi untuk menambahkan baris baru ke tabel
function addRow(ip, port, status, lastChecked, location) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${ip}</td>
        <td>${port}</td>
        <td class="${status === 'connected' ? 'connected' : 'timeout'}">${status}</td>
        <td>${lastChecked}</td>
        <td>${location}</td>
    `;
    ipTableBody.appendChild(row);
}

// Fungsi untuk mengambil data awal dari API
async function fetchPingStatus() {
    try {
        const response = await fetch('/api/ping-status');
        const data = await response.json();
        ipTableBody.innerHTML = ''; // Clear existing rows
        data.forEach(item => {
            addRow(item.ip_address, item.port, item.status, new Date(item.last_checked).toLocaleString(), item.location);
        });
    } catch (error) {
        console.error('Error fetching ping status:', error);
    }
}

// Ambil data saat halaman dimuat
fetchPingStatus();

// Menerima pesan dari server melalui WebSocket
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateRow(data.ip, data.port, data.status, new Date().toLocaleString(), data.location);
};

// Refresh data setiap 60 detik (60000 ms)
setInterval(() => {
    fetchPingStatus();
}, 60000);
