
import mqtt from "mqtt";
import { pool } from "../config/database.js";

const TELEMETRY_TOPIC = "pyroalert/devices/+/telemetry";

export function initializeMqtt(io) {
  const options = {
    clientId: process.env.MQTT_CLIENT_ID || "pyroalert_backend",
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  };

  // Add credentials only when configured
  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
  }

  if (process.env.MQTT_PASSWORD) {
    options.password = process.env.MQTT_PASSWORD;
  }

  const client = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    options
  );

  client.on("connect", () => {
    console.log("Connected to MQTT broker.");

    client.subscribe(TELEMETRY_TOPIC, { qos: 1 }, (error) => {
      if (error) {
        console.error("MQTT subscription failed:", error.message);
        return;
      }

      console.log(`Subscribed to MQTT topic: ${TELEMETRY_TOPIC}`);
    });
  });

  client.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
  });

  client.on("offline", () => {
    console.log("MQTT client is offline.");
  });

  client.on("error", (error) => {
    console.error("MQTT connection error:", error.message);
  });

  client.on("message", async (topic, message) => {
    try {
      const topicParts = topic.split("/");

      if (
        topicParts.length !== 4 ||
        topicParts[0] !== "pyroalert" ||
        topicParts[1] !== "devices" ||
        topicParts[3] !== "telemetry"
      ) {
        return;
      }

      const deviceCode = topicParts[2];
      const data = JSON.parse(message.toString());

      const { temperature, humidity, smoke_value, flame_detected } = data;

      // Validate sensor data
      if (
        !Number.isFinite(temperature) ||
        temperature < -40 ||
        temperature > 125 ||
        !Number.isFinite(humidity) ||
        humidity < 0 ||
        humidity > 100 ||
        !Number.isInteger(smoke_value) ||
        smoke_value < 0 ||
        smoke_value > 4095 ||
        typeof flame_detected !== "boolean"
      ) {
        console.error("Invalid sensor data:", deviceCode);
        return;
      }

      // Update device status and insert its sensor reading
      const result = await pool.query(
        `
        WITH updated_device AS (
          UPDATE devices
          SET status = 'online',
              last_seen = CURRENT_TIMESTAMP
          WHERE device_code = $1
          RETURNING device_id
        )
        INSERT INTO sensor_readings (
          device_id,
          temperature,
          humidity,
          smoke_value,
          flame_detected
        )
        SELECT
          device_id,
          $2,
          $3,
          $4,
          $5
        FROM updated_device
        RETURNING *
        `,
        [
          deviceCode,
          temperature,
          humidity,
          smoke_value,
          flame_detected
        ]
      );

      if (result.rowCount === 0) {
        console.error(`Unregistered device: ${deviceCode}`);
        return;
      }

      const reading = result.rows[0];

      console.log("Sensor reading saved:", {
        deviceCode,
        readingId: reading.reading_id,
        temperature,
        humidity,
        smoke_value,
        flame_detected
      });

      // Broadcast the saved reading to connected dashboards
      io.emit("sensor:reading", {
        device_code: deviceCode,
        ...reading
      });

    } catch (error) {
      console.error("MQTT message processing failed:", error.message);
    }
  });

  return client;
}
