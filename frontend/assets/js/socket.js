
// =========================================
// PYROALERT - SOCKET.IO CLIENT
// =========================================

const BACKEND_URL = "http://192.168.0.100:5000";

let pyroSocket = null;

// =========================================
// CONNECT DASHBOARD TO BACKEND
// =========================================

function connectToBackend() {
    if (typeof io === "undefined") {
        console.error("Socket.IO client library is not loaded.");
        return;
    }

    pyroSocket = io(BACKEND_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000
    });

    // Successful connection
    pyroSocket.on("connect", () => {
        console.log("Connected to PyroAlert backend:", pyroSocket.id);

        window.updateConnectionStatus("connected");

        // Load existing alerts and current device status
        loadActiveAlerts();
        loadDeviceStatus();
    });

    // Disconnection
    pyroSocket.on("disconnect", (reason) => {
        console.warn("Disconnected from backend:", reason);

        window.updateConnectionStatus("disconnected");
    });

    // Connection error
    pyroSocket.on("connect_error", (error) => {
        console.error("Backend connection error:", error.message);

        window.updateConnectionStatus("disconnected");
    });

    // Receive live sensor readings
    pyroSocket.on("sensor:reading", (reading) => {
        console.log("Live sensor reading received:", reading);

        window.updateSensorCards(reading);
    });

    // Receive device status updates
    pyroSocket.on("device:status", (device) => {
        console.log("Device status updated:", device);

        if (typeof window.updateDeviceStatus === "function") {
            window.updateDeviceStatus(device.status);
        }
    });

    // Receive new alert
    pyroSocket.on("alert:new", (alert) => {
        console.log("New alert received:", alert);

        loadActiveAlerts();
    });

    // Receive resolved alert
    pyroSocket.on("alert:resolved", (alert) => {
        console.log("Alert resolved:", alert);

        loadActiveAlerts();
    });
}

// =========================================
// FETCH CURRENT DEVICE STATUS
// =========================================

async function loadDeviceStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/devices`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error("Invalid device response");
        }

        const device = result.data.find(
            (item) => item.device_code === "PYRO-ESP32-001"
        );

        if (!device) {
            console.warn("PyroAlert device was not found.");
            return;
        }

        if (typeof window.updateDeviceStatus === "function") {
            window.updateDeviceStatus(device.status);
        }

        console.log("Current device status loaded:", device.status);

    } catch (error) {
        console.error("Error loading device status:", error.message);
    }
}

// =========================================
// FETCH ACTIVE ALERTS
// =========================================

async function loadActiveAlerts() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/alerts`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Failed to load alerts");
        }

        if (typeof window.renderAlerts === "function") {
            window.renderAlerts(result.data);
        }

        console.log("Active alerts loaded:", result.count);

    } catch (error) {
        console.error("Error loading active alerts:", error.message);
    }
}

// =========================================
// EXPOSE FUNCTIONS
// =========================================

window.connectToBackend = connectToBackend;
window.loadActiveAlerts = loadActiveAlerts;
window.loadDeviceStatus = loadDeviceStatus;
