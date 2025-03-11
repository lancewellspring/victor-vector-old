import { playerManager } from './entities/player.js';

const RECONNECT_INTERVAL = 3000; // Time between reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 5;

export const networkManager = {
    ws: null,
    connectionAttempts: 0,
    reconnectTimeout: null,
    isConnected: false,
    lastMessageTime: Date.now(),
    
    init() {
        this.connect();
        this.setupHeartbeat();
    },

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);
        this.setupEventHandlers();
    },

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.connectionAttempts = 0;
            this.lastMessageTime = Date.now();
            this.ws.send(JSON.stringify({ type: 'join' }));
        };

        this.ws.onmessage = (event) => {
            this.lastMessageTime = Date.now();
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            console.log('Connection closed');
            this.isConnected = false;
            this.reconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
        };
    },

    handleMessage(message) {
        switch(message.type) {
            case 'id':
                playerManager.myPlayerId = message.id;
                playerManager.addPlayer(message.id);
                break;
            case 'newPlayer':
                if (message.id !== playerManager.myPlayerId) {
                    playerManager.addPlayer(message.id);
                }
                break;
            case 'position':
                playerManager.updatePlayerPosition(message.id, message.x, message.y);
                break;
            case 'playerLeft':
                playerManager.removePlayer(message.id);
                break;
            case 'heartbeat_ack':
                // Handle heartbeat acknowledgment
                this.lastMessageTime = Date.now();
                break;
        }
    },

    setupHeartbeat() {
        // Send heartbeat every 30 seconds
        setInterval(() => {
            if (this.isConnected) {
                this.sendHeartbeat();
            }
        }, 30000);

        // Check connection status every 35 seconds
        setInterval(() => {
            const timeSinceLastMessage = Date.now() - this.lastMessageTime;
            if (this.isConnected && timeSinceLastMessage > 40000) {
                console.log('Connection appears stale, reconnecting...');
                this.reconnect();
            }
        }, 35000);
    },

    sendHeartbeat() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
    },

    sendPosition(x, y) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'position',
                id: playerManager.myPlayerId,
                x: x,
                y: y
            }));
        }
    },

    reconnect() {
        const MAX_RECONNECT_ATTEMPTS = 5;
        const RECONNECT_INTERVAL = 3000;

        if (this.connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            return;
        }

        if (this.ws) {
            this.ws.close();
        }

        this.connectionAttempts++;
        console.log(`Reconnection attempt ${this.connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, RECONNECT_INTERVAL);
    }
};