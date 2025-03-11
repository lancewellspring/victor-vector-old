const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 40000;

class ConnectionManager {
    constructor(wss) {
        this.wss = wss;
        this.heartbeatInterval = null;
    }

    startHeartbeatChecks() {
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (Date.now() - ws.lastHeartbeat > CONNECTION_TIMEOUT) {
                    console.log('Client timed out, terminating connection');
                    ws.terminate();
                    return;
                }
                
                if (ws.isAlive === false) {
                    ws.terminate();
                    return;
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, HEARTBEAT_INTERVAL);

        // Clean up interval on server close
        this.wss.on('close', () => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        });
    }

    initializeClient(ws) {
        ws.isAlive = true;
        ws.lastHeartbeat = Date.now();
    }
}

module.exports = ConnectionManager;