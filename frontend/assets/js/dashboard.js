
// =========================================
// PYROALERT - DASHBOARD CONTROLLER
// =========================================

// Update the current date
function displayCurrentDate() {
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString(
            "en-PH",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
    }
}

// Safely update an element's text
function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// Update a sensor card's status
function updateStatus(id, message, status) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;
    element.classList.remove("warning", "danger");

    if (status === "warning" || status === "danger") {
        element.classList.add(status);
    }
}

// Update sensor readings
function updateSensorCards(reading) {
    if (!reading) return;

    const temperature = Number(reading.temperature);
    const humidity = Number(reading.humidity);
    const smoke = Number(reading.smoke_value);
    const flameDetected = reading.flame_detected === true;

    if (
        !Number.isFinite(temperature) ||
        !Number.isFinite(humidity) ||
        !Number.isFinite(smoke)
    ) {
        console.error("Invalid sensor reading received:", reading);
        return;
    }
    // Update device status after receiving valid telemetry
    updateDeviceStatus("online");

    // Temperature
    setText("temperatureValue", temperature.toFixed(1));

    if (temperature >= 45) {
        updateStatus("temperatureStatus", "High Temperature", "danger");
    } else {
        updateStatus("temperatureStatus", "Normal", "normal");
    }

    // Humidity
    setText("humidityValue", humidity.toFixed(1));

    updateStatus("humidityStatus", "Monitoring", "normal");

    // Smoke
    setText("smokeValue", smoke);

    if (smoke >= 1800) {
        updateStatus("smokeStatus", "High Smoke Level", "danger");
    } else {
        updateStatus("smokeStatus", "Normal", "normal");
    }

    // Flame
    setText(
        "flameValue",
        flameDetected ? "DETECTED" : "CLEAR"
    );

    if (flameDetected) {
        updateStatus("flameStatus", "Flame Detected", "danger");
    } else {
        updateStatus("flameStatus", "No Flame Detected", "normal");
    }

    // Last reading timestamp
    const timestamp = reading.recorded_at || reading.created_at;

    setText(
        "lastReading",
        timestamp
            ? new Date(timestamp).toLocaleString()
            : new Date().toLocaleString()
    );

    // Update chart
    if (typeof window.updateSensorChart === "function") {
        window.updateSensorChart(reading);
    }
}

// Update connection indicator
function updateConnectionStatus(status) {
    const dot = document.getElementById("connectionDot");
    const label = document.getElementById("connectionStatus");

    if (!dot || !label) return;

    dot.classList.remove("connected", "disconnected", "offline");

    if (status === "connected") {
        dot.classList.add("connected");
        label.textContent = "Connected";
    } else if (status === "offline") {
        dot.classList.add("offline");
        label.textContent = "Offline";
    } else {
        dot.classList.add("disconnected");
        label.textContent = "Disconnected";
    }
}

// Update ESP32 device status indicator
function updateDeviceStatus(status) {
    const dot = document.getElementById("deviceStatusDot");
    const label = document.getElementById("deviceStatus");

    if (!dot || !label) return;

    dot.classList.remove("online", "offline");

    if (status === "online") {
        dot.classList.add("online");
        label.textContent = "Online";
    } else {
        dot.classList.add("offline");
        label.textContent = "Offline";
    }
}

// Render active alerts
function renderAlerts(alerts) {
    const alertList = document.getElementById("alertList");

    if (!alertList) return;

    alertList.replaceChildren();

    const activeAlerts = Array.isArray(alerts) ? alerts : [];

    setText("activeAlertCount", activeAlerts.length);
    setText("sidebarAlertCount", activeAlerts.length);

    if (activeAlerts.length === 0) {
        const emptyMessage = document.createElement("div");

        emptyMessage.className = "empty-alerts";
        emptyMessage.textContent = "No active alerts. System is monitoring.";

        alertList.appendChild(emptyMessage);
        return;
    }

    activeAlerts.forEach((alert) => {
        const item = document.createElement("div");
        item.className = "alert-item";

        const icon = document.createElement("div");
        icon.className = "alert-icon";

        const iconElement = document.createElement("i");
        iconElement.className = "bi bi-exclamation-triangle-fill";
        icon.appendChild(iconElement);

        const content = document.createElement("div");

        const title = document.createElement("div");
        title.className = "alert-title";
        title.textContent = formatAlertType(alert.alert_type);

        const description = document.createElement("div");
        description.textContent =
            alert.message || "An abnormal sensor condition was detected.";

        const time = document.createElement("div");
        time.className = "alert-time";

        const timestamp = alert.created_at || alert.triggered_at;

        time.textContent = timestamp
            ? new Date(timestamp).toLocaleString()
            : "Time unavailable";

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(time);

        item.appendChild(icon);
        item.appendChild(content);

        alertList.appendChild(item);
    });
}

// Convert alert codes into readable labels
function formatAlertType(type) {
    const labels = {
        FLAME_DETECTED: "Flame Detected",
        HIGH_SMOKE: "High Smoke Level",
        HIGH_TEMPERATURE: "High Temperature"
    };

    return labels[type] || String(type || "System Alert")
        .replaceAll("_", " ");
}

// Initialize dashboard
function initializeDashboard() {
    displayCurrentDate();

    if (typeof window.initializeSensorChart === "function") {
        window.initializeSensorChart();
    }

    renderAlerts([]);

    // Initial backend connection status
    updateConnectionStatus("disconnected");

    // Initial device status
    updateDeviceStatus("offline");
}

// Expose functions to other scripts
window.initializeDashboard = initializeDashboard;
window.updateSensorCards = updateSensorCards;
window.updateConnectionStatus = updateConnectionStatus;
window.renderAlerts = renderAlerts;
window.updateDeviceStatus = updateDeviceStatus;