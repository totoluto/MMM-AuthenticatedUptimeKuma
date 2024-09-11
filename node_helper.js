var NodeHelper = require("node_helper");
const { io } = require("socket.io-client");

class UptimeKuma extends require("events").EventEmitter {
    constructor(url, token) {
        super();
        this.url = url;
        this.token = token;
        this.socket = null;
    }

    // Connect to the Uptime Kuma server
    connect() {
        if (this.isConnected()) {
            this.disconnect();
        }

        this.socket = io(this.url, {
            reconnection: true,
        });

        // Event listeners for the uptime kuma socket

        this.socket.on("connect", () => {
            this.emit("connected");
            this.authenticate();
        });

        this.socket.on("disconnect", (reason) => {
            this.emit("disconnect", `Disconnected: ${reason}`);
        });

        this.socket.on("heartbeat", (heartbeat) => {
            this.emit("heartbeat", heartbeat);
        });

        this.socket.on("heartbeatList", (monitorID, heartbeatList) => {
            const intMonitorID = parseInt(monitorID);
            this.emit("heartbeatList", {
                monitorID: intMonitorID,
                heartbeatList,
            });
        });

        this.socket.on("monitorList", (monitorslist) => {
            this.emit("monitorList", monitorslist);
        });

        this.socket.on("uptime", (monitorID, period, percent) => {
            const intMonitorID = parseInt(monitorID);
            this.emit("uptime", {
                monitorID: intMonitorID,
                period,
                percent,
            });
        });

        this.socket.on("avgPing", (monitorID, avgPing) => {
            const intMonitorID = parseInt(monitorID);
            this.emit("avgPing", {
                monitorID: intMonitorID,
                avgPing,
            });
        });

        // DEBUG: fetch all importent events
        // this.socket.onAny((eventName) => {
        //   console.log(eventName);
        // });
    }

    authenticate() {
        this.socket.emit("loginByToken", this.token, (response) => {
            if (response.ok) {
                this.emit("authenticated");
            } else {
                this.emit("error", response.msg || "Authentication failed");
            }
        });
    }

    isConnected() {
        return !!this.socket?.connected;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

module.exports = NodeHelper.create({
    start: function () {
        console.log("Starting MMM-AuthenticatedUptimeKuma node_helper");
        this.uptimeKuma = null;
    },

    socketNotificationReceived: function (notification, payload) {
        /*
        // DEBUG: log function for the module
        if (notification === "log") {
            console.log(payload);
        }
        */

        if (notification === "START_CONNECTION") {
            const { url, token } = payload;
            this.uptimeKuma = new UptimeKuma(url, token);
            this.uptimeKuma.connect();

            // Set up listeners for emitted data
            this.uptimeKuma.on("monitorList", (monitorList) => {
                this.sendSocketNotification("MONITOR_LIST", monitorList);
            });

            this.uptimeKuma.on("heartbeat", (heartbeat) => {
                this.sendSocketNotification("HEARTBEAT", heartbeat);
            });

            this.uptimeKuma.on("uptime", (uptimeData) => {
                this.sendSocketNotification("UPTIME", uptimeData);
            });

            this.uptimeKuma.on("avgPing", (avgPingData) => {
                this.sendSocketNotification("AVG_PING", avgPingData);
            });

            this.uptimeKuma.on("heartbeatList", (heartbeatListData) => {
                this.sendSocketNotification("HEARTBEAT_LIST", heartbeatListData);
            });
        }
    }
});
