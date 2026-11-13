
// =========================================
// PYROALERT - FRONTEND APPLICATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Starting PyroAlert Dashboard...");

    // Initialize dashboard interface and chart
    if (typeof window.initializeDashboard === "function") {
        window.initializeDashboard();
    }

    // Connect to the Node.js backend
    if (typeof window.connectToBackend === "function") {
        window.connectToBackend();
    }

    console.log("PyroAlert Dashboard initialization complete.");
});
