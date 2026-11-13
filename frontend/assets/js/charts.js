
// =========================================
// PYROALERT - SENSOR CHART
// =========================================

let sensorChart = null;

const MAX_CHART_POINTS = 10;

const chartHistory = {
    labels: [],
    temperature: [],
    humidity: [],
    smoke: []
};

// Initialize Chart.js
function initializeSensorChart() {
    const canvas = document.getElementById("sensorChart");

    if (!canvas) {
        console.error("Sensor chart canvas not found.");
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js library is not loaded.");
        return;
    }

    sensorChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: chartHistory.labels,

            datasets: [
                {
                    label: "Temperature (°C)",
                    data: chartHistory.temperature,
                    borderColor: "#e85d4a",
                    backgroundColor: "rgba(232, 93, 74, 0.10)",
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false,
                    yAxisID: "y"
                },
                {
                    label: "Humidity (%)",
                    data: chartHistory.humidity,
                    borderColor: "#3185d8",
                    backgroundColor: "rgba(49, 133, 216, 0.10)",
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false,
                    yAxisID: "y"
                },
                {
                    label: "Smoke Level",
                    data: chartHistory.smoke,
                    borderColor: "#d99a24",
                    backgroundColor: "rgba(217, 154, 36, 0.10)",
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false,
                    yAxisID: "y1"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: "Temperature / Humidity"
                    },
                    beginAtZero: true
                },

                y1: {
                    type: "linear",
                    position: "right",
                    title: {
                        display: true,
                        text: "Smoke Sensor Value"
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });

    console.log("Sensor chart initialized.");
}

// Add a new sensor reading
function updateSensorChart(reading) {
    if (!sensorChart || !reading) {
        return;
    }

    const timeLabel = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    chartHistory.labels.push(timeLabel);
    chartHistory.temperature.push(Number(reading.temperature));
    chartHistory.humidity.push(Number(reading.humidity));
    chartHistory.smoke.push(Number(reading.smoke_value));

    // Keep only the latest 10 readings
    if (chartHistory.labels.length > MAX_CHART_POINTS) {
        chartHistory.labels.shift();
        chartHistory.temperature.shift();
        chartHistory.humidity.shift();
        chartHistory.smoke.shift();
    }

    sensorChart.update("none");
}

// Make functions accessible to other frontend scripts
window.initializeSensorChart = initializeSensorChart;
window.updateSensorChart = updateSensorChart;
