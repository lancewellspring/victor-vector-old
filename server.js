const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const express = require('express');
const app = express();

const db = new sqlite3.Database('game.db');

const MessageHandlers = require('./server/websocket/messageHandlers');
const ConnectionManager = require('./server/websocket/connectionManager');
const PhysicsManager = require('./static/physicsManager.js');

// Middleware
app.use(express.static('static'));
app.use(express.json());

// HTTP endpoints
app.get('/api/characters', (req, res) => {
  db.all('SELECT * FROM characters', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '/static/client/index.html'));
});

const server = require('http').createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ 
    server,
    clientTracking: true 
});

const players = new Map();
const messageHandlers = new MessageHandlers(wss, players);
const connectionManager = new ConnectionManager(wss);

var p = new PhysicsManager(); 
p.createPhysicsWorld().then(world => {
  console.log('Physics world created successfully');
  // Continue with your code
}).catch(err => {
  console.error('Physics initialization failed:', err);
});

wss.on('connection', (ws) => {
    console.log('New client connected');
    connectionManager.initializeClient(ws);
    
    ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastHeartbeat = Date.now();
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    messageHandlers.handleJoin(ws);
                    break;
                case 'position':
                    messageHandlers.handlePosition(ws, data);
                    break;
                case 'heartbeat':
                    messageHandlers.handleHeartbeat(ws);
                    break;
                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });
    
    ws.on('close', () => messageHandlers.handleDisconnect(ws));
});

connectionManager.startHeartbeatChecks();

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
});

