const WebSocket = require('ws');

class MessageHandlers {
    constructor(wss, players) {
        this.wss = wss;
        this.players = players;
        this.nextPlayerId = 1;
        this.playerPositions = new Map(); // Track latest positions
    }

    handleJoin(ws) {
        const playerId = this.nextPlayerId++;
        this.players.set(ws, playerId);
        
        // Send ID to new player
        ws.send(JSON.stringify({
            type: 'id',
            id: playerId
        }));
        
        // Send existing players and their positions to new player
        this.players.forEach((existingPlayerId, client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                // First send that the player exists
                ws.send(JSON.stringify({
                    type: 'newPlayer',
                    id: existingPlayerId
                }));
                
                // Then send their current position if we have it
                const position = this.playerPositions.get(existingPlayerId);
                if (position) {
                    ws.send(JSON.stringify({
                        type: 'position',
                        id: existingPlayerId,
                        x: position.x,
                        y: position.y
                    }));
                }
            }
        });
        
        // Notify other players of new player
        this.broadcast(ws, {
            type: 'newPlayer',
            id: playerId
        });
    }

    handlePosition(ws, data) {
        // Store the latest position
        this.playerPositions.set(data.id, {
            x: data.x,
            y: data.y
        });

        // Broadcast position to other clients
        this.broadcast(ws, {
            type: 'position',
            id: data.id,
            x: data.x,
            y: data.y
        });
    }

    handleHeartbeat(ws) {
        ws.lastHeartbeat = Date.now();
        ws.isAlive = true;
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
    }

    handleDisconnect(ws) {
        const playerId = this.players.get(ws);
        console.log('Client disconnected:', playerId);
        
        // Clean up stored position
        this.playerPositions.delete(playerId);
        
        this.broadcast(ws, {
            type: 'playerLeft',
            id: playerId
        });
        
        this.players.delete(ws);
    }

    // Utility method for broadcasting to all clients except sender
    broadcast(sender, message) {
        this.wss.clients.forEach((client) => {
            if (client !== sender && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = MessageHandlers;