Module.register("MMM-AuthenticatedUptimeKuma", {
    defaults: {
        url: "",
        token: "",
        monitors: []
    },

    start: function () {
        this.monitors = {}; // To store monitor information
        this.error = null;

        // Initiate the connection with node_helper
        this.sendSocketNotification("START_CONNECTION", {
            url: this.config.url,
            token: this.config.token,
        });
    },

    // Handle incoming data from node_helper.js
    socketNotificationReceived: function (notification, payload) {
        switch (notification) {
            case "MONITOR_LIST":
                this.updateMonitors(payload);
                break;
            case "HEARTBEAT":
                this.updateHeartbeat(payload);
                break;
            case "UPTIME":
                this.updateUptime(payload);
                break;
            case "AVG_PING":
                this.updateAvgPing(payload);
                break;
            case "HEARTBEAT_LIST":
                this.updateHeartbeatList(payload);
                break;
            case "DISCONNECTED":
            case "ERROR":
                this.error = payload;
                break;
        }
        
        this.updateDom();
    },

    // Update monitor data
    updateMonitors: function (monitorList) {
        for (let monitorId in monitorList) {
            monitorId = parseInt(monitorId);
            const monitor = monitorList[monitorId];
    
            if (!this.monitors[monitorId]) {
              this.monitors[monitorId] = {
                id: monitorId,
                name: monitor.name,
                active: monitor.active,
              };
            } else {
                this.monitors[monitorId].name = monitor.name;
                this.monitors[monitorId].id = monitorId;
                this.monitors[monitorId].active = monitor.active;
            }
        }
    },

    // Update monitor heartbeat data
    updateHeartbeat: function (heartbeat) {
        const monitorId = parseInt(heartbeat.monitorID);
        if (this.monitors[monitorId]) {
            this.monitors[monitorId].heartbeat = heartbeat;
        }
    },

    // Update monitor uptime data
    updateAvgPing: function (avgPingData) {
        if (this.monitors[avgPingData.monitorID]) {
            this.monitors[avgPingData.monitorID].avgPing = avgPingData.avgPing;
        }
    },

    // Update monitor uptime data
    updateUptime: function (uptimeData) {
        if (this.monitors[uptimeData.monitorID]) {
            const period = uptimeData.period;
            const percent = uptimeData.percent * 100;

            if (period === 24) {
                this.monitors[uptimeData.monitorID].uptime24 = percent;
            } else if (period === 720) {
                this.monitors[uptimeData.monitorID].uptime30 = percent;
            }
        }
    },

    // Update monitor heartbeat list
    updateHeartbeatList: function (heartbeatListData) {
        if (this.monitors[heartbeatListData.monitorID]) {
            if (heartbeatListData.heartbeatList.length > 0) {
                this.monitors[heartbeatListData.monitorID].heartbeat = heartbeatListData.heartbeatList.at(-1);
            }
        }
    },

    // Generate the DOM for display
    getDom: function () {
        var wrapper = document.createElement("div");

        if (this.error) {
            wrapper.innerHTML = `Error: ${this.error}`;
            return wrapper;
        }

        if (!Object.keys(this.monitors).length) {
            wrapper.innerHTML = "Loading monitor data...";
            return wrapper;
        }

        var table = document.createElement("table");
        table.classList.add("small");

        // Iterate through the configured monitors
        this.config.monitors.forEach((monitorConfig) => {
            const monitor = monitorConfig.id ? this.monitors[monitorConfig.id] : false;
            if (!monitor) {
                return;
            }

            // Create a table row for each monitor
            var row = document.createElement("tr");

            // Current state indicator (circle)
            var stateCell = document.createElement("td");
            stateCell.classList.add("state-indicator");
            stateCell.appendChild(this.getStateIndicator(monitor));
            row.appendChild(stateCell);

            // Monitor name
            var nameCell = document.createElement("td");
            nameCell.innerHTML = monitorConfig.name ?? monitor.name;
            row.appendChild(nameCell);

            // Monitor data (ping, uptime, etc.)
            var dataCell = document.createElement("td");
            dataCell.style.paddingLeft = "20px"; // Add padding for better alignment
            dataCell.innerHTML = this.getMonitorData(monitorConfig, monitor);
            row.appendChild(dataCell);

            table.appendChild(row);
        });

        wrapper.appendChild(table);
        return wrapper;
    },

    // Get the color-coded circle based on the status
    getStateIndicator: function (monitor) {
        var indicator = document.createElement("div");
        indicator.classList.add("circle-indicator");

        if (!monitor) {
            indicator.style.backgroundColor = "gray";
            return indicator;
        }

        if (!monitor.active) {
            indicator.style.backgroundColor = "orange";
            return indicator;
        }

        if (monitor.heartbeat) {
            if (monitor.heartbeat.status) {
                indicator.style.backgroundColor = "green";
                return indicator;
            } else {
                indicator.style.backgroundColor = "red";
                return indicator;
            }
        }

        indicator.style.backgroundColor = "gray";

        return indicator;
    },

    // Get the monitor data based on the configuration
    getMonitorData: function (monitorConfig, monitor) {
        const isEnabled = monitor && monitor.active && monitor.heartbeat && monitor.heartbeat.status;

        if (!isEnabled) {
            return "N/A";
        }

        switch (monitorConfig.display) {
            case "ping":
                return `${monitor.heartbeat.ping || "N/A"} ms`;
            case "avgPing":
                return `${monitor.avgPing || "N/A"} ms (⌀24h)`;
            case "uptime24":
                return `${monitor.uptime24 || "N/A"}% (24h)`;
            case "uptime30":
                return `${monitor.uptime30 || "N/A"}% (30 days)`;
            default:
                return "N/A";
        }
    },

    getStyles: function () {
        return ["MMM-AuthenticatedUptimeKuma.css"];
    },
});
